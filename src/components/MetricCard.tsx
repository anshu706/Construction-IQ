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
        return 'bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20';
      case 'At risk':
      case 'At Risk':
      case 'On Budget':
      case 'Caution':
        return 'bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20';
      case 'Delayed':
      case 'Over budget':
      case 'Over Budget':
        return 'bg-[#B71C1C]/10 text-[#B71C1C] border border-[#B71C1C]/20';
      default:
        return 'bg-[#7A756C]/10 text-[#7A756C] border border-[#7A756C]/20';
    }
  };

  const cards = [
    {
      id: 'overview',
      title: 'Overall Progress',
      value: `${averageProgress}%`,
      subtitle: `${completedTasks} of ${totalTasks} Tasks Done`,
      icon: <Percent className="w-4 h-4 text-[#C5A059]" />,
      badge: 'Normal Rate',
      footer: (
        <div className="w-full mt-3">
          <div className="flex justify-between items-center text-[9px] text-[#7A756C] mb-1 font-sans uppercase tracking-wider">
            <span>Operational Progress</span>
            <span>Target: 70%</span>
          </div>
          <div className="w-full bg-[#F4F1EA] rounded-full h-1.5 overflow-hidden border border-[#D1CEC6]">
            <div
              className="bg-[#C5A059] h-full rounded-full transition-all duration-500"
              style={{ width: `${averageProgress}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'schedule',
      title: 'Schedule Status',
      value: scheduleStatus,
      subtitle: `SPI: ${spiVal} (${evm.spi === null ? 'n/a' : evm.spi >= 1 ? 'Ahead' : 'Lagging'})`,
      icon: <Calendar className="w-4 h-4 text-[#A89F91]" />,
      badge: scheduleStatus,
      footer: (
        <div className="flex items-center gap-1.5 mt-4 text-[10px] font-sans uppercase tracking-wider text-[#7A756C]">
          {evm.spi !== null && evm.spi >= 1 ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-[#B71C1C] shrink-0" />
          )}
          <span>Critical path evaluated.</span>
        </div>
      ),
    },
    {
      id: 'budget',
      title: 'Budget Status',
      value: `${formatINRCompact(spent)} Spent`,
      subtitle: `CPI: ${cpiVal} • Budget: ${formatINRCompact(totalBudget)}`,
      icon: <IndianRupee className="w-4 h-4 text-[#1A1A1A]" />,
      badge: budgetStatus,
      footer: (
        <div className="w-full mt-3">
          <div className="flex justify-between items-center text-[9px] text-[#7A756C] mb-1 font-sans uppercase tracking-wider">
            <span>Spent {spentPercentage}%</span>
            <span>Rem: {formatINRCompact(totalBudget - spent)}</span>
          </div>
          <div className="w-full bg-[#F4F1EA] rounded-full h-1.5 overflow-hidden border border-[#D1CEC6]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                spentPercentage > 100 ? 'bg-[#B71C1C]' : spentPercentage > 85 ? 'bg-[#C5A059]' : 'bg-[#2E7D32]'
              }`}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'safety',
      title: 'Safety Status',
      value: `${daysWithoutIncident} Days`,
      subtitle: `Without Incident • ${activeIncidents} Active`,
      icon: <ShieldAlert className="w-4 h-4 text-[#B71C1C]" />,
      badge: activeIncidents === 0 ? 'Optimal' : 'Caution',
      footer: (
        <div className="flex items-center gap-1.5 mt-4 text-[10px] font-sans uppercase tracking-wider text-[#7A756C]">
          <TrendingUp className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
          <span>No OSHA non-compliance.</span>
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
            className={`border p-6 text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
              isSelected 
                ? 'bg-white border-[#C5A059] shadow-md ring-1 ring-[#C5A059]' 
                : 'bg-white border-[#D1CEC6] hover:bg-[#F4F1EA]/40 hover:shadow-sm'
            }`}
            id={`metric-card-${card.id}`}
          >
            <div className="flex items-center justify-between w-full mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#F4F1EA] border border-[#D1CEC6] rounded-sm">
                  {card.icon}
                </div>
                <span className="text-[#1A1A1A] text-[10px] uppercase tracking-widest font-bold font-sans">{card.title}</span>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-widest font-sans font-bold ${getBadgeStyle(card.badge)}`}>
                {card.badge}
              </span>
            </div>

            <div className="mt-1 mb-2">
              <h2 className="text-[#1A1A1A] text-3xl font-sans font-extrabold tracking-tight italic">{card.value}</h2>
              <p className="text-[#7A756C] text-[10px] uppercase tracking-widest font-sans mt-1.5">{card.subtitle}</p>
            </div>

            {card.footer}
          </button>
        );
      })}
    </div>
  );
};
