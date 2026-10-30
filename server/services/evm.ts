/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Earned Value Management (EVM) Calculation Service
 * Implements standard ANSI/PMI Earned Value calculations with exact zero-denominator handling.
 */

import { getCpiStatus, getSpiStatus, CpiStatus, SpiStatus } from '../../shared/evmConfig.js';

export interface EvmTaskInput {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  progress: number; // 0 to 100
  budgetedCostInr: number;
  phase?: string;
}

export interface EvmInvoiceInput {
  id: string;
  amountInr: number;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
}

export interface EvmProjectInput {
  budgetInr: number;
  statusDate: string | Date;
}

export interface EvmMetrics {
  bac: number;
  ev: number;
  pv: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  vac: number | null;
  cpiStatus: CpiStatus | null;
  spiStatus: SpiStatus | null;
  budgetBurnPercentage: number;
  plannedBurnPercentage: number;
  isBudgetHealthy: boolean;
  physicalCompletionPercentage: number;
}

/**
 * Calculates planned percent complete for a single task at statusDate (0 to 100).
 * Linear planned progress between start_date and end_date clamped [0, 100].
 */
export function calculateTaskPlannedPercent(
  startDate: string | Date,
  endDate: string | Date,
  statusDate: string | Date
): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const status = new Date(statusDate).getTime();

  if (isNaN(start) || isNaN(end) || isNaN(status)) {
    return 0;
  }

  if (end <= start) {
    return status >= end ? 100 : 0;
  }

  if (status <= start) {
    return 0;
  }

  if (status >= end) {
    return 100;
  }

  const duration = end - start;
  const elapsed = status - start;
  const percent = (elapsed / duration) * 100;
  return Math.min(100, Math.max(0, percent));
}

/**
 * Computes complete EVM metrics across project tasks, approved/paid invoices, and status date.
 */
export function calculateEVM(
  project: EvmProjectInput,
  tasks: EvmTaskInput[],
  invoices: EvmInvoiceInput[]
): EvmMetrics {
  const bac = Number(project.budgetInr) || 0;
  const statusDate = project.statusDate;

  // 1. Calculate Earned Value (EV) and Planned Value (PV)
  let totalEV = 0;
  let totalPV = 0;
  let totalTaskProgress = 0;

  for (const task of tasks) {
    const cost = Number(task.budgetedCostInr) || 0;
    const progress = Math.min(100, Math.max(0, Number(task.progress) || 0));
    totalTaskProgress += progress;

    // EV = sum(budgeted_cost * progress / 100)
    totalEV += cost * (progress / 100);

    // PV = sum(budgeted_cost * planned_percent / 100)
    const plannedPercent = calculateTaskPlannedPercent(task.startDate, task.endDate, statusDate);
    totalPV += cost * (plannedPercent / 100);
  }

  // 2. Actual Cost (AC) = sum of invoices with status Approved or Paid
  const ac = invoices
    .filter(inv => inv.status === 'Approved' || inv.status === 'Paid')
    .reduce((sum, inv) => sum + (Number(inv.amountInr) || 0), 0);

  // 3. Cost Performance Index (CPI) = EV / AC (null if AC == 0)
  const cpi = ac > 0 ? Number((totalEV / ac).toFixed(3)) : null;

  // 4. Schedule Performance Index (SPI) = EV / PV (null if PV == 0)
  const spi = totalPV > 0 ? Number((totalEV / totalPV).toFixed(3)) : null;

  // 5. Estimate at Completion (EAC) = BAC / CPI (when CPI available)
  const eac = cpi !== null && cpi > 0 ? Number((bac / cpi).toFixed(2)) : null;

  // 6. Variance at Completion (VAC) = BAC - EAC
  const vac = eac !== null ? Number((bac - eac).toFixed(2)) : null;

  // 7. Status Labels from thresholds
  const cpiStatus = getCpiStatus(cpi);
  const spiStatus = getSpiStatus(spi);

  // 8. Budget burn percentage = AC / BAC
  const budgetBurnPercentage = bac > 0 ? Number(((ac / bac) * 100).toFixed(2)) : 0;

  // 9. Planned burn percentage = PV / BAC
  const plannedBurnPercentage = bac > 0 ? Number(((totalPV / bac) * 100).toFixed(2)) : 0;

  // 10. Budget health check: burn % <= planned burn % on status date
  const isBudgetHealthy = budgetBurnPercentage <= plannedBurnPercentage;

  const physicalCompletionPercentage = tasks.length > 0
    ? Number((totalTaskProgress / tasks.length).toFixed(1))
    : 0;

  return {
    bac: Math.round(bac),
    ev: Number(totalEV.toFixed(2)),
    pv: Number(totalPV.toFixed(2)),
    ac: Number(ac.toFixed(2)),
    cpi,
    spi,
    eac,
    vac,
    cpiStatus,
    spiStatus,
    budgetBurnPercentage,
    plannedBurnPercentage,
    isBudgetHealthy,
    physicalCompletionPercentage,
  };
}

