/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Critical Path Method (CPM) and Schedule Analysis Service
 * Implements standard forward/backward pass, float calculation, cycle detection, and auto-delay inference.
 */

export class CyclicDependencyError extends Error {
  public statusCode = 422;
  constructor(message: string) {
    super(message);
    this.name = 'CyclicDependencyError';
  }
}

export interface CpmTaskInput {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  progress: number;
  status: 'NotStarted' | 'InProgress' | 'Complete' | 'Delayed';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface CpmDependencyInput {
  taskId: string;           // The dependent task
  dependsOnTaskId: string;   // The prerequisite task
}

export interface CpmTaskResult {
  id: string;
  name: string;
  durationDays: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
  computedStatus: 'NotStarted' | 'InProgress' | 'Complete' | 'Delayed';
}

export interface CpmScheduleResult {
  tasks: Record<string, CpmTaskResult>;
  criticalPathTaskIds: string[];
  projectDurationDays: number;
  delayedTaskIds: string[];
}

/**
 * Checks for cycles in the dependency graph. Throws CyclicDependencyError on cycle.
 */
export function validateNoCycles(
  taskIds: string[],
  dependencies: CpmDependencyInput[],
  prospectiveDependency?: CpmDependencyInput
): void {
  const allDeps = prospectiveDependency
    ? [...dependencies, prospectiveDependency]
    : dependencies;

  // Build adjacency list: prerequisite -> dependents
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of taskIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  // Also include any ids mentioned in prospective dependency if not present
  if (prospectiveDependency) {
    if (!adj.has(prospectiveDependency.taskId)) {
      adj.set(prospectiveDependency.taskId, []);
      inDegree.set(prospectiveDependency.taskId, 0);
    }
    if (!adj.has(prospectiveDependency.dependsOnTaskId)) {
      adj.set(prospectiveDependency.dependsOnTaskId, []);
      inDegree.set(prospectiveDependency.dependsOnTaskId, 0);
    }
  }

  for (const dep of allDeps) {
    if (dep.taskId === dep.dependsOnTaskId) {
      throw new CyclicDependencyError(
        `Self-dependency cycle detected: Task ${dep.taskId} cannot depend on itself.`
      );
    }
    if (adj.has(dep.dependsOnTaskId)) {
      adj.get(dep.dependsOnTaskId)!.push(dep.taskId);
    }
    if (inDegree.has(dep.taskId)) {
      inDegree.set(dep.taskId, (inDegree.get(dep.taskId) || 0) + 1);
    }
  }

  // Kahn's algorithm for topological sorting
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    visitedCount++;

    for (const neighbor of adj.get(curr) || []) {
      const newDeg = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (visitedCount < inDegree.size) {
    throw new CyclicDependencyError(
      `Cyclic dependency detected: Adding dependency creates a circular relationship that prevents schedule completion.`
    );
  }
}

/**
 * Computes the duration in whole days between start and end dates (minimum 1 day).
 */
export function getTaskDurationDays(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Computes Critical Path, Float, and Auto-Delays across all tasks.
 */
export function calculateCPM(
  tasks: CpmTaskInput[],
  dependencies: CpmDependencyInput[],
  statusDate: string | Date
): CpmScheduleResult {
  const taskIds = tasks.map(t => t.id);
  validateNoCycles(taskIds, dependencies);

  const statusTime = new Date(statusDate).getTime();

  // Map task duration
  const durations = new Map<string, number>();
  const predecessors = new Map<string, string[]>();
  const successors = new Map<string, string[]>();

  for (const t of tasks) {
    durations.set(t.id, getTaskDurationDays(t.startDate, t.endDate));
    predecessors.set(t.id, []);
    successors.set(t.id, []);
  }

  for (const dep of dependencies) {
    if (predecessors.has(dep.taskId)) {
      predecessors.get(dep.taskId)!.push(dep.dependsOnTaskId);
    }
    if (successors.has(dep.dependsOnTaskId)) {
      successors.get(dep.dependsOnTaskId)!.push(dep.taskId);
    }
  }

  // Topological sorting for forward pass
  const inDegree = new Map<string, number>();
  for (const t of tasks) {
    inDegree.set(t.id, predecessors.get(t.id)!.length);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    topoOrder.push(curr);
    for (const succ of successors.get(curr) || []) {
      const deg = (inDegree.get(succ) || 0) - 1;
      inDegree.set(succ, deg);
      if (deg === 0) queue.push(succ);
    }
  }

  // Forward Pass
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  for (const taskId of topoOrder) {
    const preds = predecessors.get(taskId) || [];
    let es = 0;
    if (preds.length > 0) {
      es = Math.max(...preds.map(p => earlyFinish.get(p) || 0));
    }
    const dur = durations.get(taskId) || 1;
    const ef = es + dur;
    earlyStart.set(taskId, es);
    earlyFinish.set(taskId, ef);
  }

  const projectDurationDays = Math.max(0, ...Array.from(earlyFinish.values()));

  // Backward Pass
  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const taskId = topoOrder[i];
    const succs = successors.get(taskId) || [];
    let lf = projectDurationDays;
    if (succs.length > 0) {
      lf = Math.min(...succs.map(s => lateStart.get(s) ?? projectDurationDays));
    }
    const dur = durations.get(taskId) || 1;
    const ls = lf - dur;
    lateFinish.set(taskId, lf);
    lateStart.set(taskId, ls);
  }

  const taskResults: Record<string, CpmTaskResult> = {};
  const criticalPathTaskIds: string[] = [];
  const delayedTaskIds: string[] = [];

  for (const t of tasks) {
    const es = earlyStart.get(t.id) || 0;
    const ef = earlyFinish.get(t.id) || 0;
    const ls = lateStart.get(t.id) || 0;
    const lf = lateFinish.get(t.id) || 0;
    const float = ls - es;
    const isCritical = float <= 0;

    if (isCritical) {
      criticalPathTaskIds.push(t.id);
    }

    // Auto-Delay Rule:
    // A task whose end date is before the status date and progress < 100 is Delayed.
    const endTime = new Date(t.endDate).getTime();
    let computedStatus = t.status;
    if (statusTime > endTime && t.progress < 100) {
      computedStatus = 'Delayed';
      delayedTaskIds.push(t.id);
    }

    taskResults[t.id] = {
      id: t.id,
      name: t.name,
      durationDays: durations.get(t.id) || 1,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloat: float,
      isCritical,
      computedStatus,
    };
  }

  return {
    tasks: taskResults,
    criticalPathTaskIds,
    projectDurationDays,
    delayedTaskIds,
  };
}
