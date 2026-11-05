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
  validate: { xForwardedForHeader: false, ip: false },
});

export function resetLoginAttempts(req: Request) {
  const key = `${req.ip || 'ip'}_${req.body?.email || ''}`;
  if (typeof (rateLimitLogin as any).resetKey === 'function') {
    (rateLimitLogin as any).resetKey(key);
  }
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
