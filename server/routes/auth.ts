/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { loginSchema } from '../../shared/schemas.js';
import { createSession, revokeSession, setSessionCookie, clearSessionCookie } from '../auth/session.js';
import { rateLimitLogin, resetLoginAttempts, requireAuth } from '../auth/middleware.js';

const router = Router();

const DEMO_USERS_MAP: Record<string, any> = {
  'pm@constructiq.demo': {
    id: 'user-pm-001',
    email: 'pm@constructiq.demo',
    name: 'Rahul Sharma',
    title: 'Senior Project Manager',
    role: 'ProjectManager',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'ProjectManager' }],
  },
  'supervisor@constructiq.demo': {
    id: 'user-sup-002',
    email: 'supervisor@constructiq.demo',
    name: 'Priya Patel',
    title: 'Site Superintendent',
    role: 'SiteSupervisor',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'SiteSupervisor' }],
  },
  'finance@constructiq.demo': {
    id: 'user-fin-003',
    email: 'finance@constructiq.demo',
    name: 'Project Coordinator',
    title: 'Financial Controller',
    role: 'FinanceManager',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'FinanceManager' }],
  },
  'safety@constructiq.demo': {
    id: 'user-safe-004',
    email: 'safety@constructiq.demo',
    name: 'Vikram Singh',
    title: 'EHS Director',
    role: 'SafetyOfficer',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'SafetyOfficer' }],
  },
  'exec@constructiq.demo': {
    id: 'user-exec-005',
    email: 'exec@constructiq.demo',
    name: 'Neha Gupta',
    title: 'VP Operations',
    role: 'Executive',
    memberships: [{ projectId: 'proj-demo-001', projectName: 'Skyline Metro Tower - Phase 2', role: 'Executive' }],
  },
};

router.post('/login', rateLimitLogin, async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parseResult.error.flatten(),
    });
  }

  const { email, password } = parseResult.data;
  const emailLower = email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
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
      if (DEMO_USERS_MAP[emailLower] && password === (config.DEMO_PASSWORD || 'DemoPass123!')) {
        const demoUser = DEMO_USERS_MAP[emailLower];
        resetLoginAttempts(req);
        const sessionId = await createSession(demoUser.id, demoUser);
        setSessionCookie(res, sessionId);
        return res.json({ user: demoUser });
      }
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
    if (DEMO_USERS_MAP[emailLower] && password === (config.DEMO_PASSWORD || 'DemoPass123!')) {
      const demoUser = DEMO_USERS_MAP[emailLower];
      resetLoginAttempts(req);
      const sessionId = await createSession(demoUser.id, demoUser);
      setSessionCookie(res, sessionId);
      return res.json({ user: demoUser });
    }

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

