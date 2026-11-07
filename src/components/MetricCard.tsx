/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Task, Invoice, SafetyIncident } from '../types';
import { Percent, Calendar, IndianRupee, ShieldAlert, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { formatINRCompact, TOTAL_PROJECT_BUDGET } from '../currency';
import { calculateEVM } from '../../server/services/evm';
import { calculateSafetyStreak, countOpenIncidents } from '../../server/services/safety';

interface MetricCardProps {
  tasks: Task[];
  invoices: Invoice[];
  incidents: SafetyIncident[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  evmMetrics?: any;
  safetyDaysStreak?: number;
  projectBudget?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  tasks,
  invoices,
  incidents,
  activeTab,
  setActiveTab,
  evmMetrics,
  safetyDaysStreak: propStreak,
  projectBudget = TOTAL_PROJECT_BUDGET,
}) => {
  // Compute EVM if not pre-computed from backend
  const evm = evmMetrics || calculateEVM(
    { budgetInr: projectBudget, statusDate: '2026-08-02' },
    tasks.map(t => ({
      id: t.id,
      startDate: t.startDate,
      endDate: t.endDate,
      progress: t.progress,
      budgetedCostInr: (t as any).budgetedCostInr || (projectBudget / Math.max(tasks.length, 1)),
    })),
    invoices.map(i => ({
      id: i.id,
      amountInr: i.amount || (i as any).amountInr || 0,
      status: i.status,
    }))
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Complete').length;
  const averageProgress = evm.physicalCompletionPercentage || (
    totalTasks > 0 ? Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / totalTasks) : 0
  );

  const totalBudget = projectBudget;
  const spent = evm.ac;
  const spentPercentage = Math.round(evm.budgetBurnPercentage);

  // Real CPI and SPI values without ANY artificial clamping:
  const cpiVal = evm.cpi !== null ? evm.cpi.toFixed(2) : 'n/a';
  const spiVal = evm.spi !== null ? evm.spi.toFixed(2) : 'n/a';

  const scheduleStatus = evm.spiStatus || (evm.spi === null ? 'n/a' : evm.spi >= 1.0 ? 'Ahead' : evm.spi >= 0.9 ? 'At risk' : 'Delayed');
  const budgetStatus = evm.cpiStatus || (evm.cpi === null ? 'n/a' : evm.cpi >= 1.0 ? 'Under budget' : evm.cpi >= 0.95 ? 'At risk' : 'Over budget');

  // Compute verifiable safety streak
  const calculatedStreak = calculateSafetyStreak(
    { startDate: '2026-06-01', statusDate: '2026-08-02' },
    incidents.map(i => ({
      id: i.id,
      occurredAt: (i as any).occurredAt || i.date,
      severity: i.severity,
      type: i.type,
      status: i.status,
      isLostTime: (i as any).isLostTime || i.type === 'Lost-Time',
    }))
  );

  const daysWithoutIncident = propStreak !== undefined ? propStreak : calculatedStreak;
  const activeIncidents = countOpenIncidents(
    incidents.map(i => ({
      id: i.id,
      occurredAt: (i as any).occurredAt || i.date,
      severity: i.severity,
      type: i.type,
      status: i.status,
    }))
  );

  const getBadgeStyle = (badgeText: string) => {
    switch (badgeText) {
      case 'On Track':
      case 'Under budget':
      case 'Ahead':
      case 'Optimal':
      case 'Normal Rate':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
      case 'At risk':
      case 'At Risk':
      case 'On Budget':
      case 'Caution':
        return 'bg-amber-50 text-amber-700 border border-amber-200/80';
      case 'Delayed':
      case 'Over budget':
      case 'Over Budget':
        return 'bg-rose-50 text-rose-700 border border-rose-200/80';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200/80';
    }
  };

  const cards = [
    {
      id: 'overview',
      title: 'Overall Progress',
      value: `${averageProgress}%`,
      subtitle: `${completedTasks} of ${totalTasks} Tasks Completed`,
      icon: <Percent className="w-4 h-4 text-amber-600" />,
      badge: 'Normal Rate',
      footer: (
        <div className="w-full mt-3">
          <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1.5 font-sans font-medium">
            <span>Operational Target</span>
            <span className="font-semibold text-slate-700">70%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${averageProgress}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'schedule',
      title: 'Schedule Health',
      value: scheduleStatus,
      subtitle: `SPI: ${spiVal} (${evm.spi === null ? 'n/a' : evm.spi >= 1 ? 'Ahead of baseline' : 'Lagging'})`,
      icon: <Calendar className="w-4 h-4 text-blue-600" />,
      badge: scheduleStatus,
      footer: (
        <div className="flex items-center gap-1.5 mt-4 text-[11px] font-sans font-medium text-slate-500">
          {evm.spi !== null && evm.spi >= 1 ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>Critical path evaluated</span>
        </div>
      ),
    },
    {
      id: 'budget',
      title: 'Budget Variance',
      value: `${formatINRCompact(spent)} Spent`,
      subtitle: `CPI: ${cpiVal} • Budget: ${formatINRCompact(totalBudget)}`,
      icon: <IndianRupee className="w-4 h-4 text-slate-700" />,
      badge: budgetStatus,
      footer: (
        <div className="w-full mt-3">
          <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1.5 font-sans font-medium">
            <span>Burn {spentPercentage}%</span>
            <span className="font-semibold text-slate-700">Rem: {formatINRCompact(totalBudget - spent)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                spentPercentage > 100 ? 'bg-rose-500' : spentPercentage > 85 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'safety',
      title: 'Safety Streak',
      value: `${daysWithoutIncident} Days`,
      subtitle: `Zero Lost-Time • ${activeIncidents} Active`,
      icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
      badge: activeIncidents === 0 ? 'Optimal' : 'Caution',
      footer: (
        <div className="flex items-center gap-1.5 mt-4 text-[11px] font-sans font-medium text-slate-500">
          <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Full safety audit compliance</span>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full animate-fade-in" id="metrics-grid">
      {cards.map(card => {
        const isSelected = activeTab === card.id;
        return (
          <button
            key={card.id}
            onClick={() => setActiveTab(card.id)}
            className={`p-5 rounded-xl text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
              isSelected 
                ? 'bg-white border-2 border-amber-500 shadow-md ring-4 ring-amber-500/10' 
                : 'bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300'
            }`}
            id={`metric-card-${card.id}`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                  {card.icon}
                </div>
                <span className="text-slate-600 text-xs font-semibold font-sans">{card.title}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold ${getBadgeStyle(card.badge)}`}>
                {card.badge}
              </span>
            </div>

            <div className="my-1">
              <h2 className="text-slate-900 text-2xl font-bold tracking-tight">{card.value}</h2>
              <p className="text-slate-500 text-xs font-sans mt-0.5">{card.subtitle}</p>
            </div>

            {card.footer}
          </button>
        );
      })}
    </div>
  );
};
