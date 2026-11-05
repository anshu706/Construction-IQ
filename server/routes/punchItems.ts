/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requirePermission, hasProjectAccess } from '../auth/middleware.js';
import { createPunchItemSchema, updatePunchStatusSchema } from '../../shared/schemas.js';

const router = Router();

router.get('/', requireAuth, requirePermission('punch_items:read'), async (req, res) => {
  const { projectId } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Valid projectId query parameter required' });
  }

  if (!hasProjectAccess(req.user!, projectId)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  try {
    const items = await prisma.punchItem.findMany({
      where: { projectId },
      include: { photo: true },
      orderBy: { reportedAt: 'desc' },
    });

    return res.json({ punchItems: items });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve punch items' });
  }
});

router.post('/', requireAuth, requirePermission('punch_items:create'), async (req, res) => {
  const parseResult = createPunchItemSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid punch item payload',
      details: parseResult.error.flatten(),
    });
  }

  const { projectId, item, location, phase, severity, subcontractor, photoId, resolutionNotes } = parseResult.data;

  if (!hasProjectAccess(req.user!, projectId)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  try {
    const newPunch = await prisma.punchItem.create({
      data: {
        projectId,
        item,
        location,
        phase,
        severity,
        subcontractor,
        photoId: photoId || null,
        resolutionNotes,
        status: 'Open',
      },
      include: { photo: true },
    });

    const logSeverity = severity === 'Critical' ? 'alert' : 'warning';
    await prisma.activityLog.create({
      data: {
        projectId,
        actorId: req.user!.id,
        type: 'general',
        severity: logSeverity,
        message: `${req.user!.name} logged ${severity} punch item: "${item}" at ${location}.`,
      },
    });

    return res.status(201).json({ punchItem: newPunch });
  } catch (error) {
    console.error('[Punch Create Error]', error);
    return res.status(500).json({ error: 'Failed to create punch item' });
  }
});

router.patch('/:id/status', requireAuth, requirePermission('punch_items:update'), async (req, res) => {
  const { id } = req.params;
  const parseResult = updatePunchStatusSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid punch status payload',
      details: parseResult.error.flatten(),
    });
  }

  const { status, resolutionNotes } = parseResult.data;

  try {
    const punch = await prisma.punchItem.findUnique({ where: { id } });
    if (!punch) return res.status(404).json({ error: 'Punch item not found' });

    if (!hasProjectAccess(req.user!, punch.projectId)) {
      return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
    }

    const updated = await prisma.punchItem.update({
      where: { id },
      data: {
        status,
        resolutionNotes: resolutionNotes || punch.resolutionNotes,
      },
      include: { photo: true },
    });

    await prisma.activityLog.create({
      data: {
        projectId: punch.projectId,
        actorId: req.user!.id,
        type: 'general',
        severity: status === 'Closed' ? 'success' : 'info',
        message: `${req.user!.name} updated punch item "${punch.item}" to ${status}.`,
      },
    });

    return res.json({ punchItem: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update punch item' });
  }
});

export default router;

