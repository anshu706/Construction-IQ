import { describe, it, expect } from 'vitest';
import { PERMISSION_MATRIX, hasPermission, Role, Action } from '../../shared/permissions.js';

describe('Phase C: Authorization Permission Matrix', () => {
  const roles: Role[] = ['ProjectManager', 'SiteSupervisor', 'FinanceManager', 'SafetyOfficer', 'Executive'];

  it('defines permissions for all 5 roles across all actions', () => {
    for (const role of roles) {
      expect(PERMISSION_MATRIX[role]).toBeDefined();
    }
  });

  describe('ProjectManager role permissions', () => {
    it('can manage schedule, tasks, risks, and milestones', () => {
      expect(hasPermission('ProjectManager', 'tasks:read')).toBe(true);
      expect(hasPermission('ProjectManager', 'tasks:create')).toBe(true);
      expect(hasPermission('ProjectManager', 'tasks:update')).toBe(true);
      expect(hasPermission('ProjectManager', 'tasks:delete')).toBe(true);
      expect(hasPermission('ProjectManager', 'risks:manage')).toBe(true);
      expect(hasPermission('ProjectManager', 'milestones:manage')).toBe(true);
    });

    it('cannot approve, reject, or pay invoices (FinanceManager only)', () => {
      expect(hasPermission('ProjectManager', 'invoices:approve')).toBe(false);
      expect(hasPermission('ProjectManager', 'invoices:reject')).toBe(false);
      expect(hasPermission('ProjectManager', 'invoices:pay')).toBe(false);
    });

    it('cannot resolve safety incidents (SafetyOfficer only)', () => {
      expect(hasPermission('ProjectManager', 'incidents:resolve')).toBe(false);
    });
  });

  describe('SiteSupervisor role permissions', () => {
    it('can update task progress, create punch items, and upload photos', () => {
      expect(hasPermission('SiteSupervisor', 'tasks:update_progress')).toBe(true);
      expect(hasPermission('SiteSupervisor', 'punch_items:create')).toBe(true);
      expect(hasPermission('SiteSupervisor', 'photos:upload')).toBe(true);
    });

    it('cannot create, full-update, or delete tasks', () => {
      expect(hasPermission('SiteSupervisor', 'tasks:create')).toBe(false);
      expect(hasPermission('SiteSupervisor', 'tasks:update')).toBe(false);
      expect(hasPermission('SiteSupervisor', 'tasks:delete')).toBe(false);
    });

    it('is forbidden from viewing or approving financial invoices', () => {
      expect(hasPermission('SiteSupervisor', 'invoices:read')).toBe(false);
      expect(hasPermission('SiteSupervisor', 'invoices:approve')).toBe(false);
    });
  });

  describe('FinanceManager role permissions', () => {
    it('can read, create, approve, reject, and pay invoices', () => {
      expect(hasPermission('FinanceManager', 'invoices:read')).toBe(true);
      expect(hasPermission('FinanceManager', 'invoices:create')).toBe(true);
      expect(hasPermission('FinanceManager', 'invoices:approve')).toBe(true);
      expect(hasPermission('FinanceManager', 'invoices:reject')).toBe(true);
      expect(hasPermission('FinanceManager', 'invoices:pay')).toBe(true);
    });

    it('cannot update tasks or resolve incidents', () => {
      expect(hasPermission('FinanceManager', 'tasks:update')).toBe(false);
      expect(hasPermission('FinanceManager', 'incidents:resolve')).toBe(false);
    });
  });

  describe('SafetyOfficer role permissions', () => {
    it('can create and resolve incidents', () => {
      expect(hasPermission('SafetyOfficer', 'incidents:read')).toBe(true);
      expect(hasPermission('SafetyOfficer', 'incidents:create')).toBe(true);
      expect(hasPermission('SafetyOfficer', 'incidents:resolve')).toBe(true);
    });

    it('cannot view financial invoices or approve them', () => {
      expect(hasPermission('SafetyOfficer', 'invoices:read')).toBe(false);
      expect(hasPermission('SafetyOfficer', 'invoices:approve')).toBe(false);
    });
  });

  describe('Executive role permissions', () => {
    it('can read everything and generate executive report', () => {
      expect(hasPermission('Executive', 'tasks:read')).toBe(true);
      expect(hasPermission('Executive', 'invoices:read')).toBe(true);
      expect(hasPermission('Executive', 'incidents:read')).toBe(true);
      expect(hasPermission('Executive', 'reports:executive')).toBe(true);
      expect(hasPermission('Executive', 'backup:export')).toBe(true);
    });

    it('cannot mutate operational records (read-only)', () => {
      expect(hasPermission('Executive', 'tasks:create')).toBe(false);
      expect(hasPermission('Executive', 'invoices:create')).toBe(false);
      expect(hasPermission('Executive', 'invoices:approve')).toBe(false);
      expect(hasPermission('Executive', 'incidents:create')).toBe(false);
      expect(hasPermission('Executive', 'punch_items:create')).toBe(false);
    });
  });
});
