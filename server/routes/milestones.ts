/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { createMilestoneSchema } from '../../shared/schemas.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { projectId } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Valid projectId required' });
  }

  try {
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' },
    });
    return res.json({ milestones });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve milestones' });
  }
});

router.post('/', requireAuth, requirePermission('milestones:manage'), async (req, res) => {
  const parseResult = createMilestoneSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid milestone payload', details: parseResult.error.flatten() });
  }

  try {
    const milestone = await prisma.milestone.create({
      data: {
        ...(parseResult.data as any),
        dueDate: new Date(parseResult.data.dueDate),
        completedDate: parseResult.data.completedDate ? new Date(parseResult.data.completedDate) : null,
      },
    });
    return res.status(201).json({ milestone });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create milestone' });
  }
});

export default router;
