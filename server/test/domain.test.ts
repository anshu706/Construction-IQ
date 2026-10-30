import { describe, it, expect } from 'vitest';
import { calculateEVM, calculateTaskPlannedPercent } from '../services/evm.js';
import { calculateCPM, validateNoCycles, CyclicDependencyError } from '../services/cpm.js';
import { calculateSafetyStreak, evaluateWindSafety, countOpenIncidents } from '../services/safety.js';
import { formatINR, formatINRCompact, usdToInr } from '../../shared/currency.js';
import { getCpiStatus, getSpiStatus } from '../../shared/evmConfig.js';

describe('Phase D: Domain Calculation Services', () => {
  describe('Earned Value Management (EVM)', () => {
    it('calculates linear planned percent correctly for various dates', () => {
      const start = '2026-06-01';
      const end = '2026-06-11'; // 10 days

      // Before start
      expect(calculateTaskPlannedPercent(start, end, '2026-05-30')).toBe(0);
      // Halfway
      expect(calculateTaskPlannedPercent(start, end, '2026-06-06')).toBe(50);
      // After end
      expect(calculateTaskPlannedPercent(start, end, '2026-06-15')).toBe(100);
    });

    it('computes EVM metrics with standard values', () => {
      const project = {
        budgetInr: 10_000_000,
        statusDate: '2026-07-01',
      };
      const tasks = [
        {
          id: 'T1',
          startDate: '2026-06-01',
          endDate: '2026-07-01',
          progress: 100,
          budgetedCostInr: 5_000_000,
        },
        {
          id: 'T2',
          startDate: '2026-07-01',
          endDate: '2026-08-01',
          progress: 50,
          budgetedCostInr: 5_000_000,
        },
      ];
      // T1: EV = 5M * 100% = 5M, PV = 5M * 100% = 5M
      // T2: EV = 5M * 50% = 2.5M, PV = 5M * 0% = 0M
      // Total EV = 7.5M, Total PV = 5M
      const invoices = [
        { id: 'I1', amountInr: 6_000_000, status: 'Paid' as const },
        { id: 'I2', amountInr: 1_000_000, status: 'Pending' as const }, // Pending excluded from AC
      ];
      // AC = 6M

      const metrics = calculateEVM(project, tasks, invoices);
      expect(metrics.bac).toBe(10_000_000);
      expect(metrics.ev).toBe(7_500_000);
      expect(metrics.pv).toBe(5_000_000);
      expect(metrics.ac).toBe(6_000_000);
      expect(metrics.cpi).toBe(1.25); // 7.5 / 6.0
      expect(metrics.spi).toBe(1.5);  // 7.5 / 5.0
      expect(metrics.cpiStatus).toBe('Under budget');
      expect(metrics.spiStatus).toBe('Ahead');
      expect(metrics.eac).toBe(8_000_000); // 10M / 1.25
      expect(metrics.vac).toBe(2_000_000); // 10M - 8M
    });

    it('returns null for CPI when AC is zero (never clamps or invents a number)', () => {
      const project = { budgetInr: 1_000_000, statusDate: '2026-07-01' };
      const tasks = [{ id: 'T1', startDate: '2026-06-01', endDate: '2026-07-01', progress: 50, budgetedCostInr: 1_000_000 }];
      const invoices: any[] = []; // No approved or paid invoices

      const metrics = calculateEVM(project, tasks, invoices);
      expect(metrics.ac).toBe(0);
      expect(metrics.cpi).toBeNull();
      expect(metrics.cpiStatus).toBeNull();
      expect(metrics.eac).toBeNull();
      expect(metrics.vac).toBeNull();
    });

    it('returns null for SPI when PV is zero', () => {
      const project = { budgetInr: 1_000_000, statusDate: '2026-05-01' }; // status before start
      const tasks = [{ id: 'T1', startDate: '2026-06-01', endDate: '2026-07-01', progress: 0, budgetedCostInr: 1_000_000 }];
      const invoices: any[] = [];

      const metrics = calculateEVM(project, tasks, invoices);
      expect(metrics.pv).toBe(0);
      expect(metrics.spi).toBeNull();
      expect(metrics.spiStatus).toBeNull();
    });

    it('classifies CPI and SPI thresholds accurately', () => {
      expect(getCpiStatus(1.05)).toBe('Under budget');
      expect(getCpiStatus(1.00)).toBe('Under budget');
      expect(getCpiStatus(0.97)).toBe('At risk');
      expect(getCpiStatus(0.92)).toBe('Over budget');

      expect(getSpiStatus(1.10)).toBe('Ahead');
      expect(getSpiStatus(1.00)).toBe('Ahead');
      expect(getSpiStatus(0.95)).toBe('At risk');
      expect(getSpiStatus(0.85)).toBe('Delayed');
    });

    it('computes budget burn health correctly using planned burn on status date', () => {
      const project = { budgetInr: 10_000_000, statusDate: '2026-07-01' };
      const tasks = [{ id: 'T1', startDate: '2026-06-01', endDate: '2026-07-01', progress: 100, budgetedCostInr: 10_000_000 }];
      // PV = 10M -> planned burn = 100%
      const invoicesHealthy = [{ id: 'I1', amountInr: 8_000_000, status: 'Paid' as const }];
      const metricsHealthy = calculateEVM(project, tasks, invoicesHealthy);
      expect(metricsHealthy.isBudgetHealthy).toBe(true);

      // Incurred spend exceeds planned burn
      const tasksEarly = [{ id: 'T1', startDate: '2026-06-01', endDate: '2026-08-01', progress: 20, budgetedCostInr: 10_000_000 }];
      // At halfway (July 1), PV is 50%
      const invoicesOver = [{ id: 'I2', amountInr: 7_000_000, status: 'Paid' as const }]; // burn is 70% > 50%
      const metricsOver = calculateEVM(project, tasksEarly, invoicesOver);
      expect(metricsOver.isBudgetHealthy).toBe(false);
    });
  });

  describe('Critical Path Method (CPM)', () => {
    it('calculates early/late dates, float, and critical path in DAG', () => {
      const tasks = [
        { id: 'T1', name: 'Task 1', startDate: '2026-06-01', endDate: '2026-06-10', progress: 100, status: 'Complete' as const }, // 9 days
        { id: 'T2', name: 'Task 2', startDate: '2026-06-10', endDate: '2026-06-20', progress: 50, status: 'InProgress' as const }, // 10 days
        { id: 'T3', name: 'Task 3', startDate: '2026-06-10', endDate: '2026-06-15', progress: 0, status: 'NotStarted' as const }, // 5 days (has float)
      ];
      const dependencies = [
        { taskId: 'T2', dependsOnTaskId: 'T1' },
        { taskId: 'T3', dependsOnTaskId: 'T1' },
      ];

      const cpm = calculateCPM(tasks, dependencies, '2026-06-12');
      expect(cpm.tasks['T1'].isCritical).toBe(true);
      expect(cpm.tasks['T2'].isCritical).toBe(true);
      expect(cpm.tasks['T3'].isCritical).toBe(false);
      expect(cpm.tasks['T3'].totalFloat).toBeGreaterThan(0);
      expect(cpm.criticalPathTaskIds).toContain('T1');
      expect(cpm.criticalPathTaskIds).toContain('T2');
    });

    it('detects cycles and throws CyclicDependencyError with 422 status', () => {
      const tasks = ['T1', 'T2', 'T3'];
      const dependencies = [
        { taskId: 'T2', dependsOnTaskId: 'T1' },
        { taskId: 'T3', dependsOnTaskId: 'T2' },
      ];

      // Prospective cycle: T1 depends on T3
      expect(() => {
        validateNoCycles(tasks, dependencies, { taskId: 'T1', dependsOnTaskId: 'T3' });
      }).toThrowError(CyclicDependencyError);

      try {
        validateNoCycles(tasks, dependencies, { taskId: 'T1', dependsOnTaskId: 'T3' });
      } catch (err: any) {
        expect(err.statusCode).toBe(422);
      }
    });

    it('rejects self-dependencies', () => {
      expect(() => {
        validateNoCycles(['T1'], [], { taskId: 'T1', dependsOnTaskId: 'T1' });
      }).toThrowError(/Self-dependency/);
    });

    it('automatically marks past-due incomplete tasks as Delayed', () => {
      const tasks = [
        { id: 'T1', name: 'Past Due Incomplete', startDate: '2026-06-01', endDate: '2026-06-20', progress: 60, status: 'InProgress' as const },
        { id: 'T2', name: 'Past Due Finished', startDate: '2026-06-01', endDate: '2026-06-20', progress: 100, status: 'Complete' as const },
      ];
      const cpm = calculateCPM(tasks, [], '2026-07-01');
      expect(cpm.tasks['T1'].computedStatus).toBe('Delayed');
      expect(cpm.delayedTaskIds).toContain('T1');
      expect(cpm.tasks['T2'].computedStatus).toBe('Complete');
    });
  });

  describe('Safety Metrics and Wind Safety Guard', () => {
    it('calculates safety streak from project start when no lost-time incidents exist', () => {
      const project = { startDate: '2026-06-01', statusDate: '2026-07-11' };
      const incidents = [
        { id: 'I1', occurredAt: '2026-06-15', severity: 'Minor' as const, type: 'FirstAid' as const, status: 'Resolved' as const, isLostTime: false },
      ];

      const streak = calculateSafetyStreak(project, incidents);
      expect(streak).toBe(40); // 40 days between June 1 and July 11
    });

    it('resets safety streak from the most recent lost-time incident date', () => {
      const project = { startDate: '2026-06-01', statusDate: '2026-08-02' };
      const incidents = [
        { id: 'I1', occurredAt: '2026-06-15', severity: 'Minor' as const, type: 'FirstAid' as const, status: 'Resolved' as const, isLostTime: false },
        { id: 'I2', occurredAt: '2026-07-15', severity: 'Severe' as const, type: 'Lost-Time' as const, status: 'Resolved' as const, isLostTime: true },
      ];

      const streak = calculateSafetyStreak(project, incidents);
      expect(streak).toBe(18); // 18 days between July 15 and Aug 2
    });

    it('triggers crane halt and alert when wind exceeds 20 mph', () => {
      const result = evaluateWindSafety(24.5, false);
      expect(result.shouldHalt).toBe(true);
      expect(result.alertRequired).toBe(true);
      expect(result.message).toContain('CRITICAL SAFETY PROTOCOL');
    });

    it('does NOT auto-clear crane halt when wind drops below 20 mph', () => {
      const result = evaluateWindSafety(14.0, true);
      // Crane halt must remain true until confirmed by SafetyOfficer or ProjectManager!
      expect(result.shouldHalt).toBe(true);
      expect(result.alertRequired).toBe(false);
      expect(result.message).toContain('remains active until cleared');
    });

    it('counts open incidents accurately', () => {
      const incidents: any[] = [
        { id: '1', status: 'Open' },
        { id: '2', status: 'UnderInvestigation' },
        { id: '3', status: 'Resolved' },
      ];
      expect(countOpenIncidents(incidents)).toBe(2);
    });
  });

  describe('Currency and Precision Formatting', () => {
    it('formats INR numbers using Indian numbering grouping', () => {
      expect(formatINR(100000)).toMatch(/₹\s*1,00,000/);
      expect(formatINR(12500000)).toMatch(/₹\s*1,25,00,000/);
    });

    it('formats compact INR using Cr, L, K notation', () => {
      expect(formatINRCompact(166000000)).toBe('₹16.6 Cr');
      expect(formatINRCompact(21580000)).toBe('₹2.16 Cr');
      expect(formatINRCompact(450000)).toBe('₹4.50 L');
      expect(formatINRCompact(50000)).toBe('₹50K');
    });

    it('converts USD to INR accurately', () => {
      expect(usdToInr(100)).toBe(8300);
      expect(usdToInr(120000)).toBe(9960000);
    });
  });
});

