/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { prisma, isDatabaseAvailable, markDatabaseUnavailable } from '../db.js';
import { requireAuth, requirePermission, hasProjectAccess } from '../auth/middleware.js';
import { createPunchItemSchema, updatePunchStatusSchema } from '../../shared/schemas.js';
import { demoStore } from '../services/demoStore.js';

const router = Router();

router.get('/', requireAuth, requirePermission('punch_items:read'), async (req, res) => {
  const { projectId } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Valid projectId query parameter required' });
  }

  if (!hasProjectAccess(req.user!, projectId)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  const dbUp = await isDatabaseAvailable();
  if (projectId === 'proj-demo-001' || !dbUp) {
    return res.json({ punchItems: demoStore.getPunchItems(projectId) });
  }

  try {
    const items = await prisma.punchItem.findMany({
      where: { projectId },
      include: { photo: true },
      orderBy: { reportedAt: 'desc' },
    });

    return res.json({ punchItems: items });
  } catch (error) {
    markDatabaseUnavailable();
    return res.json({ punchItems: demoStore.getPunchItems(projectId) });
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

  const dbUp = await isDatabaseAvailable();
  if (projectId === 'proj-demo-001' || !dbUp) {
    const newPunch = demoStore.createPunchItem({
      projectId,
      item,
      location,
      phase,
      severity,
      subcontractor,
      resolutionNotes,
    });
    const logSeverity = severity === 'Critical' ? 'alert' : 'warning';
    demoStore.addLog(projectId, {
      type: 'general',
      severity: logSeverity,
      message: `${req.user!.name} logged ${severity} punch item: "${item}" at ${location}.`,
      user: req.user!.name,
    });
    return res.status(201).json({ punchItem: newPunch });
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
    markDatabaseUnavailable();
    const newPunch = demoStore.createPunchItem({
      projectId,
      item,
      location,
      phase,
      severity,
      subcontractor,
      resolutionNotes,
    });
    return res.status(201).json({ punchItem: newPunch });
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

  const dbUp = await isDatabaseAvailable();
  const demoPunch = demoStore.getPunchItems().find(p => p.id === id);
  if (demoPunch || !dbUp) {
    if (demoPunch) {
      if (!hasProjectAccess(req.user!, demoPunch.projectId)) {
        return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
      }
      const updated = demoStore.updatePunchItemStatus(id, status, resolutionNotes);
      demoStore.addLog(demoPunch.projectId, {
        type: 'general',
        severity: status === 'Closed' ? 'success' : 'info',
        message: `${req.user!.name} updated punch item "${demoPunch.item}" to ${status}.`,
        user: req.user!.name,
      });
      return res.json({ punchItem: updated });
    }
  }

  try {
    const punch = await prisma.punchItem.findUnique({ where: { id } });
    if (!punch) {
      const demoPunch = demoStore.getPunchItems().find(p => p.id === id);
      if (demoPunch) {
        const updated = demoStore.updatePunchItemStatus(id, status, resolutionNotes);
        return res.json({ punchItem: updated });
      }
      return res.status(404).json({ error: 'Punch item not found' });
    }

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
    markDatabaseUnavailable();
    const updated = demoStore.updatePunchItemStatus(id, status, resolutionNotes);
    return res.json({ punchItem: updated });
  }
});

export default router;

