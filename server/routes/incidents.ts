/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requirePermission, hasProjectAccess } from '../auth/middleware.js';
import { createIncidentSchema, resolveIncidentSchema } from '../../shared/schemas.js';

const router = Router();

// List Incidents
router.get('/', requireAuth, requirePermission('incidents:read'), async (req, res) => {
  const { projectId } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Valid projectId query parameter required' });
  }

  if (!hasProjectAccess(req.user!, projectId)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  try {
    const incidents = await prisma.incident.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
      orderBy: { occurredAt: 'desc' },
    });

    return res.json({ incidents });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve incidents' });
  }
});

// Create Incident - SafetyOfficer, SiteSupervisor, ProjectManager
router.post('/', requireAuth, requirePermission('incidents:create'), async (req, res) => {
  const parseResult = createIncidentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid incident payload',
      details: parseResult.error.flatten(),
    });
  }

  const { projectId, occurredAt, severity, type, description, actionTaken, isLostTime } = parseResult.data;
  const isActuallyLostTime = isLostTime || type === 'LostTime';

  if (!hasProjectAccess(req.user!, projectId)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  try {
    const newIncident = await prisma.incident.create({
      data: {
        projectId,
        occurredAt: new Date(occurredAt),
        severity,
        type,
        description,
        actionTaken,
        isLostTime: isActuallyLostTime,
        status: 'Open',
      },
    });

    const logSeverity = isActuallyLostTime ? 'alert' : severity === 'Severe' ? 'alert' : 'warning';
    await prisma.activityLog.create({
      data: {
        projectId,
        actorId: req.user!.id,
        type: 'safety',
        severity: logSeverity,
        message: isActuallyLostTime
          ? `⚠ CRITICAL SAFETY ALERT: Lost-Time incident logged by ${req.user!.name}: "${description}". Safety streak reset.`
          : `Safety incident logged by ${req.user!.name} (${type}, ${severity}): "${description}".`,
      },
    });

    return res.status(201).json({ incident: newIncident });
  } catch (error) {
    console.error('[Incident Create Error]', error);
    return res.status(500).json({ error: 'Failed to create safety incident' });
  }
});

// Resolve Incident - SafetyOfficer ONLY
router.patch('/:id/resolve', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  if (user.role !== 'SafetyOfficer') {
    return res.status(403).json({
      error: 'Forbidden: Only SafetyOfficer can officially resolve safety incidents.',
    });
  }

  const parseResult = resolveIncidentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid resolve payload',
      details: parseResult.error.flatten(),
    });
  }

  const { actionTaken } = parseResult.data;

  try {
    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    if (!hasProjectAccess(user, existing.projectId)) {
      return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: 'Resolved',
        actionTaken,
        resolvedAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId: existing.projectId,
        actorId: user.id,
        type: 'safety',
        severity: 'success',
        message: `Safety Case resolved by ${user.name}: "${actionTaken}".`,
      },
    });

    return res.json({ incident: updated });
  } catch (error) {
    console.error('[Incident Resolve Error]', error);
    return res.status(500).json({ error: 'Failed to resolve safety incident' });
  }
});

// Soft Delete Incident - SafetyOfficer only
router.delete('/:id', requireAuth, requirePermission('incidents:resolve'), async (req, res) => {
  const { id } = req.params;

  try {
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    await prisma.incident.update({
      where: { id },
      data: { isDeleted: true },
    });

    return res.json({ message: 'Incident archived successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to archive incident' });
  }
});

export default router;

