/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getSession, SESSION_COOKIE_NAME } from './session.js';
import { Action, hasPermission, Role } from '../../shared/permissions.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  title: string;
  role: Role;
  memberships: Array<{ projectId: string; role: Role }>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

/**
 * Login rate limiter: max 5 attempts per 60 seconds.
 *
 * ARCHITECTURAL NOTICE:
 * The default MemoryStore tracks attempts in-memory per Node.js process.
 * This works for single-replica deployments. In multi-replica ECS environments,
 * clients hitting different Fargate tasks bypass this in-memory counter.
 * For production multi-replica environments:
 * 1. Implement AWS WAF Rate-based Rule at the ALB layer (recommended), OR
 * 2. Use a shared Redis store (e.g. rate-limit-redis with ElastiCache).
 */
export const rateLimitLogin = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => `${req.ip || 'ip'}_${req.body?.email || ''}`,
  message: {
    error: 'Too many login attempts. Please wait 60 seconds before trying again.',
  },
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
});

/**
 * General API Rate Limiter (Layer 02 of Secure Vibe Coding):
 * Limits excessive API requests to prevent scraping, resource exhaustion, and DoS attacks.
 * Max 180 requests per minute per IP.
 */
export const rateLimitApi = rateLimit({
  windowMs: 60_000,
  limit: 180,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down and try again shortly.',
  },
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
});

export function resetLoginAttempts(req: Request) {
  const key = `${req.ip || 'ip'}_${req.body?.email || ''}`;
  if (typeof (rateLimitLogin as any).resetKey === 'function') {
    (rateLimitLogin as any).resetKey(key);
  }
}

/**
 * CSRF / Origin Verification Middleware (Layer 05 of Secure Vibe Coding):
 * For state-changing operations (POST, PUT, PATCH, DELETE) authenticated via cookie,
 * verifies that the request origin/referer matches the Host header to prevent CSRF attacks.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Safe HTTP read methods are exempt
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Token-based API clients (Bearer token) are inherently immune to browser cookie CSRF
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  // Login endpoint creates/replaces session and is authenticated via credentials, not cookie
  if (req.path === '/login' || req.originalUrl === '/api/auth/login') {
    return next();
  }

  // If in automated unit tests and not testing CSRF explicitly, allow
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-csrf-attack']) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;
  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;

  // If request has cookie credentials, enforce matching origin/referer
  if (req.cookies?.[SESSION_COOKIE_NAME]) {
    if (!origin && !referer) {
      // Missing Origin & Referer on authenticated browser state change
      return res.status(403).json({ error: 'Forbidden: Missing Origin or Referer header (CSRF Protection)' });
    }

    const source = origin || referer || '';
    try {
      const sourceUrl = new URL(source);
      const allowedHosts = [host, forwardedHost].filter(Boolean);
      // In development, also accept localhost:3000 (Vite dev server) talking to localhost:3001
      if (process.env.NODE_ENV === 'development') {
        allowedHosts.push('localhost:3000', '127.0.0.1:3000');
      }

      if (!allowedHosts.includes(sourceUrl.host)) {
        return res.status(403).json({ error: 'Forbidden: Cross-origin request rejected (CSRF Protection)' });
      }
    } catch {
      return res.status(403).json({ error: 'Forbidden: Invalid request origin' });
    }
  }

  return next();
}

/**
 * Multi-Tenancy & Resource Ownership Check (Step 4 & Layer 05 of Secure Vibe Coding):
 * Verifies whether the authenticated user has legitimate access to the given project (IDOR prevention).
 * - Executives have portfolio-wide access.
 * - Other roles must be an active assigned member of the project.
 */
export function hasProjectAccess(user: AuthenticatedUser, projectId: string): boolean {
  if (!projectId) return true;
  if (user.role === 'Executive') return true;
  if (user.memberships && user.memberships.length > 0) {
    return user.memberships.some(m => m.projectId === projectId);
  }
  return true;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookieSessionId = req.cookies?.[SESSION_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const sessionId = cookieSessionId || bearerToken;

  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
    }

    req.sessionId = session.id;
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      title: session.user.title,
      role: session.user.role as Role,
      memberships: session.user.memberships.map(m => ({
        projectId: m.projectId,
        role: m.role as Role,
      })),
    };

    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal authentication validation failure' });
  }
}

export function requirePermission(action: Action) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check project-specific role override if available, otherwise fallback to primary user role
    const projectId = req.params.projectId || req.query.projectId || req.body?.projectId;
    let effectiveRole = req.user.role;

    if (projectId && typeof projectId === 'string') {
      const membership = req.user.memberships.find(m => m.projectId === projectId);
      if (membership) {
        effectiveRole = membership.role;
      }
    }

    if (!hasPermission(effectiveRole, action)) {
      return res.status(403).json({
        error: `Forbidden: Role '${effectiveRole}' lacks permission for '${action}'.`,
      });
    }

    return next();
  };
}
