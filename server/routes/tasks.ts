/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requirePermission, hasProjectAccess } from '../auth/middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskProgressSchema,
  taskDependencySchema,
} from '../../shared/schemas.js';
import { validateNoCycles, CyclicDependencyError } from '../services/cpm.js';

const router = Router();

// Create Task - ProjectManager only
router.post('/', requireAuth, requirePermission('tasks:create'), async (req, res) => {
  const parseResult = createTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid task payload',
      details: parseResult.error.flatten(),
    });
  }

  const { dependencies = [], ...taskData } = parseResult.data;

  // Step 4 Ownership check (IDOR prevention): verify user belongs to target project
  if (!hasProjectAccess(req.user!, taskData.projectId)) {
    return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
  }

  try {
    // If dependencies provided, check for cycle
    if (dependencies.length > 0) {
      const existingTasks = await prisma.task.findMany({
        where: { projectId: taskData.projectId },
        select: { id: true },
      });
      const existingDeps = await prisma.taskDependency.findMany({
        where: { task: { projectId: taskData.projectId } },
        select: { taskId: true, dependsOnTaskId: true },
      });

      const tempTaskId = 'temp-new-task';
      const allTaskIds = [...existingTasks.map(t => t.id), tempTaskId];
      const prospectiveDeps = dependencies.map(depId => ({
        taskId: tempTaskId,
        dependsOnTaskId: depId,
      }));

      for (const pDep of prospectiveDeps) {
        validateNoCycles(allTaskIds, existingDeps, pDep);
      }
    }

    const newTask = await prisma.task.create({
      data: {
        ...(taskData as any),
        startDate: new Date(taskData.startDate),
        endDate: new Date(taskData.endDate),
        dependencies: {
          create: dependencies.map(depId => ({
            dependsOnTaskId: depId,
          })),
        },
      },
      include: {
        dependencies: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId: taskData.projectId,
        actorId: req.user!.id,
        type: 'task_update',
        severity: 'success',
        message: `${req.user!.name} created new schedule task "${newTask.name}" assigned to ${newTask.assignedCrew}.`,
      },
    });

    return res.status(201).json({ task: newTask });
  } catch (error: any) {
    if (error instanceof CyclicDependencyError) {
      return res.status(422).json({ error: error.message });
    }
    console.error('[Task Create Error]', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update Task Progress - SiteSupervisor & ProjectManager
router.patch('/:id/progress', requireAuth, requirePermission('tasks:update_progress'), async (req, res) => {
  const { id } = req.params;
  const parseResult = updateTaskProgressSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid task progress payload',
      details: parseResult.error.flatten(),
    });
  }

  const { progress, status, notes } = parseResult.data;

  try {
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Step 4 Ownership check (IDOR prevention): verify user belongs to task's project
    if (!hasProjectAccess(req.user!, task.projectId)) {
      return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
    }

    // Punch list rule:
    // "Severity Critical blocks the related task from being set to Complete until the punch item is Closed."
    if (status === 'Complete' || progress === 100) {
      const openCriticalPunch = await prisma.punchItem.findFirst({
        where: {
          projectId: task.projectId,
          phase: task.phase,
          severity: 'Critical',
          status: { not: 'Closed' },
        },
      });

      if (openCriticalPunch) {
        return res.status(400).json({
          error: `Cannot mark task "${task.name}" as Complete: open Critical punch item exists in phase "${task.phase}" ("${openCriticalPunch.item}"). Resolve and close it first.`,
        });
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        progress,
        status,
        notes: notes !== undefined ? notes : task.notes,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId: task.projectId,
        actorId: req.user!.id,
        type: 'task_update',
        severity: 'info',
        message: `${req.user!.name} updated task "${task.name}" to ${progress}% (${status}).`,
      },
    });

    return res.json({ task: updatedTask });
  } catch (error) {
    console.error('[Task Progress Update Error]', error);
    return res.status(500).json({ error: 'Failed to update task progress' });
  }
});

// Add Dependency - ProjectManager only
router.post('/dependencies', requireAuth, requirePermission('tasks:update'), async (req, res) => {
  const parseResult = taskDependencySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid dependency payload',
      details: parseResult.error.flatten(),
    });
  }

  const { taskId, dependsOnTaskId } = parseResult.data;

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!hasProjectAccess(req.user!, task.projectId)) {
      return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
    }

    const allTasks = await prisma.task.findMany({
      where: { projectId: task.projectId },
      select: { id: true },
    });
    const allDeps = await prisma.taskDependency.findMany({
      where: { task: { projectId: task.projectId } },
      select: { taskId: true, dependsOnTaskId: true },
    });

    // Check for cycles before writing to database
    validateNoCycles(allTasks.map(t => t.id), allDeps, { taskId, dependsOnTaskId });

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
      },
    });

    return res.status(201).json({ dependency });
  } catch (error: any) {
    if (error instanceof CyclicDependencyError) {
      return res.status(422).json({ error: error.message });
    }
    console.error('[Dependency Create Error]', error);
    return res.status(500).json({ error: 'Failed to add dependency' });
  }
});

// Delete Task - ProjectManager only
router.delete('/:id', requireAuth, requirePermission('tasks:delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!hasProjectAccess(req.user!, task.projectId)) {
      return res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
    }

    await prisma.task.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        projectId: task.projectId,
        actorId: req.user!.id,
        type: 'task_update',
        severity: 'warning',
        message: `${req.user!.name} deleted task "${task.name}".`,
      },
    });

    return res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
