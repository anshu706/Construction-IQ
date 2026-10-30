/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
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

// Rate limiter for login endpoint
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60_000;

export function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const key = `${req.ip}_${req.body?.email || ''}`;
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now - record.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfter = Math.ceil((LOGIN_WINDOW_MS - (now - record.firstAttempt)) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    return res.status(429).json({
      error: `Too many login attempts. Please wait ${retryAfter} seconds before trying again.`,
    });
  }

  record.count += 1;
  return next();
}

export function resetLoginAttempts(req: Request) {
  const key = `${req.ip}_${req.body?.email || ''}`;
  loginAttempts.delete(key);
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

