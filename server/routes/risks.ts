/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { createRiskSchema } from '../../shared/schemas.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { projectId } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Valid projectId required' });
  }

  try {
    const risks = await prisma.risk.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ risks });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve risks' });
  }
});

router.post('/', requireAuth, requirePermission('risks:manage'), async (req, res) => {
  const parseResult = createRiskSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid risk payload', details: parseResult.error.flatten() });
  }

  try {
    const risk = await prisma.risk.create({ data: parseResult.data as any });
    return res.status(201).json({ risk });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create risk' });
  }
});

export default router;
