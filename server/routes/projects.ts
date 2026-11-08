/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { prisma, isDatabaseAvailable, markDatabaseUnavailable } from '../db.js';
import { requireAuth, requirePermission, hasProjectAccess } from '../auth/middleware.js';
import { calculateEVM } from '../services/evm.js';
import { calculateCPM } from '../services/cpm.js';
import { calculateSafetyStreak, countOpenIncidents } from '../services/safety.js';
import { demoStore } from '../services/demoStore.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const dbUp = await isDatabaseAvailable();
  if (!dbUp) {
    return res.json({ projects: demoStore.getProjectsList() });
  }

  try {
    const user = req.user!;
    // Executives see all projects; other roles are scoped to assigned projects
    const whereClause =
      user.role === 'Executive' || !user.memberships || user.memberships.length === 0
        ? {}
        : { id: { in: user.memberships.map(m => m.projectId) } };

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tasks: true,
            invoices: true,
            incidents: true,
            punchItems: true,
          },
        },
      },
    });

    return res.json({ projects });
  } catch (error) {
    markDatabaseUnavailable();
    return res.json({ projects: demoStore.getProjectsList() });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  if (!hasProjectAccess(req.user!, id)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  const dbUp = await isDatabaseAvailable();
  if (id === 'proj-demo-001' || !dbUp) {
    const demoProject = demoStore.getProjectDetail(id);
    if (demoProject) {
      return res.json({ project: demoProject });
    }
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            dependencies: true,
            dependentOn: true,
          },
          orderBy: { startDate: 'asc' },
        },
        invoices: {
          where: { isDeleted: false },
          orderBy: { invoiceDate: 'desc' },
        },
        incidents: {
          where: { isDeleted: false },
          orderBy: { occurredAt: 'desc' },
        },
        punchItems: {
          include: { photo: true },
          orderBy: { reportedAt: 'desc' },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
        risks: {
          orderBy: { createdAt: 'desc' },
        },
        activityLogs: {
          include: { actor: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!project) {
      const demoProject = demoStore.getProjectDetail(id);
      if (demoProject) {
        return res.json({ project: demoProject });
      }
      return res.status(404).json({ error: 'Project not found' });
    }

    // 1. Calculate EVM metrics from stored data
    const evmMetrics = calculateEVM(
      {
        budgetInr: Number(project.budgetInr),
        statusDate: project.statusDate,
      },
      project.tasks.map(t => ({
        id: t.id,
        startDate: t.startDate,
        endDate: t.endDate,
        progress: t.progress,
        budgetedCostInr: Number(t.budgetedCostInr),
        phase: t.phase,
      })),
      project.invoices.map(i => ({
        id: i.id,
        amountInr: Number(i.amountInr),
        status: i.status as any,
      }))
    );

    // 2. Calculate CPM (Critical Path, Float, Auto-Delays)
    const allDependencies = project.tasks.flatMap(t =>
      t.dependencies.map(d => ({
        taskId: d.taskId,
        dependsOnTaskId: d.dependsOnTaskId,
      }))
    );

    const cpmResult = calculateCPM(
      project.tasks.map(t => ({
        id: t.id,
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
        progress: t.progress,
        status: t.status as any,
      })),
      allDependencies,
      project.statusDate
    );

    // 3. Calculate Safety streak and Open incident counts
    const safetyDaysStreak = calculateSafetyStreak(
      {
        startDate: project.startDate,
        statusDate: project.statusDate,
        craneHalt: project.craneHalt,
      },
      project.incidents.map(i => ({
        id: i.id,
        occurredAt: i.occurredAt,
        severity: i.severity as any,
        type: i.type as any,
        status: i.status as any,
        isLostTime: i.isLostTime,
      }))
    );

    const openIncidentsCount = countOpenIncidents(
      project.incidents.map(i => ({
        id: i.id,
        occurredAt: i.occurredAt,
        severity: i.severity as any,
        type: i.type as any,
        status: i.status as any,
      }))
    );

    // 4. Critical punch items count
    const criticalPunchCount = project.punchItems.filter(
      p => p.severity === 'Critical' && p.status !== 'Closed'
    ).length;

    return res.json({
      project: {
        ...project,
        budgetInr: Number(project.budgetInr),
        contingencyInr: Number(project.contingencyInr),
        evm: evmMetrics,
        evmMetrics,
        cpm: cpmResult,
        safetyDaysStreak,
        safetyStreak: safetyDaysStreak,
        openIncidentsCount,
        criticalPunchCount,
        isCraneHalted: project.craneHalt,
      },
    });
  } catch (error) {
    markDatabaseUnavailable();
    const demoProject = demoStore.getProjectDetail(id);
    if (demoProject) {
      return res.json({ project: demoProject });
    }
    console.error('[Project Detail Error]', error);
    return res.status(500).json({ error: 'Failed to retrieve project details' });
  }
});

// Clear crane halt - permitted for SafetyOfficer and ProjectManager only
router.post('/:id/clear-crane-halt', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user = req.user!;

  if (user.role !== 'SafetyOfficer' && user.role !== 'ProjectManager') {
    return res.status(403).json({
      error: 'Forbidden: Only SafetyOfficer or ProjectManager can clear the Tower Crane Halt.',
    });
  }

  if (!hasProjectAccess(user, id)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  const dbUp = await isDatabaseAvailable();
  if (id === 'proj-demo-001' || !dbUp) {
    const updated = demoStore.clearCraneHalt(id);
    demoStore.addLog(id, {
      type: 'safety',
      severity: 'success',
      message: `Tower Crane Halt was manually confirmed and cleared by ${user.name} (${user.role}). Standard operations resumed.`,
      user: user.name,
    });
    return res.json({ message: 'Tower crane halt successfully cleared', project: updated });
  }

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: { craneHalt: false },
    });

    await prisma.activityLog.create({
      data: {
        projectId: id,
        actorId: user.id,
        type: 'safety',
        severity: 'success',
        message: `Tower Crane Halt was manually confirmed and cleared by ${user.name} (${user.role}). Standard operations resumed.`,
      },
    });

    return res.json({ message: 'Tower crane halt successfully cleared', project: updated });
  } catch (error) {
    markDatabaseUnavailable();
    const updated = demoStore.clearCraneHalt(id);
    return res.json({ message: 'Tower crane halt successfully cleared', project: updated });
  }
});

export default router;

