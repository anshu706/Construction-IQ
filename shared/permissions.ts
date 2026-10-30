/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConstructIQ Permission Matrix
 * Typed access control table defining exact capabilities per role across all system resources.
 */

export type Role = 'ProjectManager' | 'SiteSupervisor' | 'FinanceManager' | 'SafetyOfficer' | 'Executive';

export type Resource =
  | 'projects'
  | 'tasks'
  | 'invoices'
  | 'incidents'
  | 'punch_items'
  | 'photos'
  | 'milestones'
  | 'risks'
  | 'reports'
  | 'activity_logs'
  | 'weather'
  | 'copilot';

export type Action =
  // Tasks
  | 'tasks:read'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:update_progress'
  | 'tasks:delete'
  // Invoices
  | 'invoices:read'
  | 'invoices:create'
  | 'invoices:approve'
  | 'invoices:reject'
  | 'invoices:pay'
  // Incidents
  | 'incidents:read'
  | 'incidents:create'
  | 'incidents:resolve'
  // Punch Items
  | 'punch_items:read'
  | 'punch_items:create'
  | 'punch_items:update'
  // Photos
  | 'photos:read'
  | 'photos:upload'
  // Risks & Milestones
  | 'risks:read'
  | 'risks:manage'
  | 'milestones:read'
  | 'milestones:manage'
  // Reports & AI
  | 'reports:executive'
  | 'backup:export'
  | 'backup:import'
  | 'copilot:chat'
  | 'simulation:scenario';

export const PERMISSION_MATRIX: Record<Role, Record<Action, boolean>> = {
  ProjectManager: {
    'tasks:read': true,
    'tasks:create': true,
    'tasks:update': true,
    'tasks:update_progress': true,
    'tasks:delete': true,
    'invoices:read': true,
    'invoices:create': true,
    'invoices:approve': false, // FinanceManager only
    'invoices:reject': false,  // FinanceManager only
    'invoices:pay': false,     // FinanceManager only
    'incidents:read': true,
    'incidents:create': true,
    'incidents:resolve': false, // SafetyOfficer only
    'punch_items:read': true,
    'punch_items:create': true,
    'punch_items:update': true,
    'photos:read': true,
    'photos:upload': true,
    'risks:read': true,
    'risks:manage': true,
    'milestones:read': true,
    'milestones:manage': true,
    'reports:executive': true,
    'backup:export': true,
    'backup:import': true,
    'copilot:chat': true,
    'simulation:scenario': true,
  },
  SiteSupervisor: {
    'tasks:read': true,
    'tasks:create': false,
    'tasks:update': false,
    'tasks:update_progress': true, // update progress and notes on site
    'tasks:delete': false,
    'invoices:read': false, // Field operations does not review company financials
    'invoices:create': false,
    'invoices:approve': false,
    'invoices:reject': false,
    'invoices:pay': false,
    'incidents:read': true,
    'incidents:create': true,
    'incidents:resolve': false,
    'punch_items:read': true,
    'punch_items:create': true,
    'punch_items:update': true,
    'photos:read': true,
    'photos:upload': true,
    'risks:read': true,
    'risks:manage': false,
    'milestones:read': true,
    'milestones:manage': false,
    'reports:executive': false,
    'backup:export': false,
    'backup:import': false,
    'copilot:chat': true,
    'simulation:scenario': false,
  },
  FinanceManager: {
    'tasks:read': true,
    'tasks:create': false,
    'tasks:update': false,
    'tasks:update_progress': false,
    'tasks:delete': false,
    'invoices:read': true,
    'invoices:create': true,
    'invoices:approve': true,
    'invoices:reject': true,
    'invoices:pay': true,
    'incidents:read': true,
    'incidents:create': false,
    'incidents:resolve': false,
    'punch_items:read': true,
    'punch_items:create': false,
    'punch_items:update': false,
    'photos:read': true,
    'photos:upload': false,
    'risks:read': true,
    'risks:manage': false,
    'milestones:read': true,
    'milestones:manage': false,
    'reports:executive': true,
    'backup:export': true,
    'backup:import': false,
    'copilot:chat': true,
    'simulation:scenario': false,
  },
  SafetyOfficer: {
    'tasks:read': true,
    'tasks:create': false,
    'tasks:update': false,
    'tasks:update_progress': false,
    'tasks:delete': false,
    'invoices:read': false, // read-only on safety; finance is restricted
    'invoices:create': false,
    'invoices:approve': false,
    'invoices:reject': false,
    'invoices:pay': false,
    'incidents:read': true,
    'incidents:create': true,
    'incidents:resolve': true,
    'punch_items:read': true,
    'punch_items:create': true,
    'punch_items:update': true,
    'photos:read': true,
    'photos:upload': true,
    'risks:read': true,
    'risks:manage': false,
    'milestones:read': true,
    'milestones:manage': false,
    'reports:executive': false,
    'backup:export': false,
    'backup:import': false,
    'copilot:chat': true,
    'simulation:scenario': true, // can clear wind crane halt
  },
  Executive: {
    'tasks:read': true,
    'tasks:create': false,
    'tasks:update': false,
    'tasks:update_progress': false,
    'tasks:delete': false,
    'invoices:read': true,
    'invoices:create': false,
    'invoices:approve': false,
    'invoices:reject': false,
    'invoices:pay': false,
    'incidents:read': true,
    'incidents:create': false,
    'incidents:resolve': false,
    'punch_items:read': true,
    'punch_items:create': false,
    'punch_items:update': false,
    'photos:read': true,
    'photos:upload': false,
    'risks:read': true,
    'risks:manage': false,
    'milestones:read': true,
    'milestones:manage': false,
    'reports:executive': true,
    'backup:export': true,
    'backup:import': false,
    'copilot:chat': true,
    'simulation:scenario': false,
  },
};

export function hasPermission(role: Role, action: Action): boolean {
  return PERMISSION_MATRIX[role]?.[action] ?? false;
}
