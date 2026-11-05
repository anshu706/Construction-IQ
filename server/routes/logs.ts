/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, hasProjectAccess } from '../auth/middleware.js';
import { z } from 'zod';

const router = Router();

const createLogSchema = z.object({
  projectId: z.string().uuid(),
  type: z.string(),
  severity: z.enum(['info', 'warning', 'alert', 'success']),
  message: z.string().min(2),
}).strict();

router.get('/', requireAuth, async (req, res) => {
  const { projectId } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Valid projectId required' });
  }

  if (!hasProjectAccess(req.user!, projectId)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  try {
    const logs = await prisma.activityLog.findMany({
      where: { projectId },
      include: { actor: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve activity logs' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const parseResult = createLogSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid log payload', details: parseResult.error.flatten() });
  }

  if (!hasProjectAccess(req.user!, parseResult.data.projectId)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  try {
    const log = await prisma.activityLog.create({
      data: {
        ...(parseResult.data as any),
        actorId: req.user!.id,
      },
      include: { actor: { select: { name: true, role: true } } },
    });
    return res.status(201).json({ log });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to append log entry' });
  }
});

export default router;
