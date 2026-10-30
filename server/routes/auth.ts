/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { loginSchema } from '../../shared/schemas.js';
import { createSession, revokeSession, setSessionCookie, clearSessionCookie } from '../auth/session.js';
import { rateLimitLogin, resetLoginAttempts, requireAuth } from '../auth/middleware.js';

const router = Router();

router.post('/login', rateLimitLogin, async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parseResult.error.flatten(),
    });
  }

  const { email, password } = parseResult.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    resetLoginAttempts(req);
    const sessionId = await createSession(user.id);
    setSessionCookie(res, sessionId);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        title: user.title,
        role: user.role,
        memberships: user.memberships.map(m => ({
          projectId: m.projectId,
          projectName: m.project.name,
          role: m.role,
        })),
      },
    });
  } catch (error) {
    console.error('[Auth Login Error]', error);
    return res.status(500).json({ error: 'Internal login authentication error' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    if (req.sessionId) {
      await revokeSession(req.sessionId);
    }
    clearSessionCookie(res);
    return res.json({ message: 'Successfully logged out' });
  } catch (error) {
    return res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

export default router;

