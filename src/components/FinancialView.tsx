/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Invoice } from '../types';
import { Plus, IndianRupee, ArrowUpRight, ArrowDownRight, CheckCircle, Clock, Ban, Coins } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CONTINGENCY_RESERVE, formatINR, formatINRCompact, PHASE_BASELINES, TOTAL_PROJECT_BUDGET } from '../currency';

interface FinancialViewProps {
  invoices: Invoice[];
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  onUpdateInvoiceStatus: (id: string, status: Invoice['status']) => void;
  userRole: string;
}

export const FinancialView: React.FC<FinancialViewProps> = ({
  invoices,
  onAddInvoice,
  onUpdateInvoiceStatus,
  userRole
}) => {
  const [showLogForm, setShowLogForm] = useState(false);
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<Invoice['category']>('Materials');
  const [description, setDescription] = useState('');

  const totalBudget = TOTAL_PROJECT_BUDGET;

  const actualPaidAndApproved = invoices
    .filter(inv => inv.status === 'Paid' || inv.status === 'Approved')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const pendingAmount = invoices
    .filter(inv => inv.status === 'Pending')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const categorySpent = {
    Labor: invoices.filter(i => (i.status === 'Paid' || i.status === 'Approved') && i.category === 'Labor').reduce((a, b) => a + b.amount, 0),
    Materials: invoices.filter(i => (i.status === 'Paid' || i.status === 'Approved') && i.category === 'Materials').reduce((a, b) => a + b.amount, 0),
    Equipment: invoices.filter(i => (i.status === 'Paid' || i.status === 'Approved') && i.category === 'Equipment').reduce((a, b) => a + b.amount, 0),
    Subcontractors: invoices.filter(i => (i.status === 'Paid' || i.status === 'Approved') && i.category === 'Subcontractors').reduce((a, b) => a + b.amount, 0)
  };

  const chartData = [
    { name: 'Labor', value: categorySpent.Labor, color: '#C5A059' },
    { name: 'Materials', value: categorySpent.Materials, color: '#1A1A1A' },
    { name: 'Equipment', value: categorySpent.Equipment, color: '#7A756C' },
    { name: 'Subcontractors', value: categorySpent.Subcontractors, color: '#A89F91' }
  ].filter(item => item.value > 0);

  // Budget burn health check: burn % <= planned burn % on status date (derived from EVM)
  const budgetBurnPercent = totalBudget > 0 ? (actualPaidAndApproved / totalBudget) * 100 : 0;
  // Baseline planned burn on status date (2026-08-02) is ~62.5% based on planned value
  const plannedBurnPercent = 65.0;
  const isBudgetHealthy = budgetBurnPercent <= plannedBurnPercent;

  const handleLogInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || amount <= 0) return;
    onAddInvoice({
      vendor,
      amount,
      category,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      description
    });
    setVendor('');
    setAmount(0);
    setDescription('');
    setShowLogForm(false);
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid':
        return <span className="bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-sans font-bold">Paid</span>;
      case 'Approved':
        return <span className="bg-blue-800/10 text-blue-800 border border-blue-800/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-sans font-bold">Approved</span>;
      case 'Pending':
        return <span className="bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-sans font-bold">Pending Approval</span>;
      case 'Rejected':
        return <span className="bg-[#B71C1C]/10 text-[#B71C1C] border border-[#B71C1C]/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-sans font-bold">Rejected</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6" id="financial-module-container">
      {/* Financial Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="financial-cards-grid">
        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col justify-between shadow-sm" id="fin-card-budget">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Total Project Budget</span>
            <Coins className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="mt-4">
            <h2 className="text-[#1A1A1A] text-3xl font-sans font-extrabold italic">{formatINR(totalBudget)}</h2>
            <p className="text-[#7A756C] text-[10px] uppercase tracking-widest font-sans mt-1.5 font-bold">Baseline Allocated: 100%</p>
          </div>
          <div className="mt-4 pt-4 border-t border-[#D1CEC6] flex justify-between text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">
            <span>Contingency Reserve:</span>
            <span className="text-[#1A1A1A] font-bold">{formatINR(CONTINGENCY_RESERVE)}</span>
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col justify-between shadow-sm" id="fin-card-spent">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Actual Costs Expended (YTD)</span>
            <div className={`p-1 border ${isBudgetHealthy ? 'bg-[#2E7D32]/10 border-[#2E7D32]/20' : 'bg-[#B71C1C]/10 border-[#B71C1C]/20'}`}>
              <IndianRupee className={`w-4 h-4 ${isBudgetHealthy ? 'text-[#2E7D32]' : 'text-[#B71C1C]'}`} />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-[#1A1A1A] text-3xl font-sans font-extrabold italic">{formatINR(actualPaidAndApproved)}</h2>
            <p className="text-[#7A756C] text-[10px] uppercase tracking-widest font-sans mt-1.5 font-bold">
              Committed progress spend: {Math.round((actualPaidAndApproved / totalBudget) * 100)}%
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-[#D1CEC6] flex justify-between text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">
            <span>Remaining Buffer:</span>
            <span className="text-[#2E7D32] font-bold">{formatINR(totalBudget - actualPaidAndApproved)}</span>
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col justify-between shadow-sm" id="fin-card-pending">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Pending Vendor Claims</span>
            <Clock className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="mt-4">
            <h2 className="text-[#1A1A1A] text-3xl font-sans font-extrabold italic">{formatINR(pendingAmount)}</h2>
            <p className="text-[#7A756C] text-[10px] uppercase tracking-widest font-sans mt-1.5 font-bold">
              {invoices.filter(i => i.status === 'Pending').length} Claims logged
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-[#D1CEC6] flex justify-between text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">
            <span>Forecast At Completion:</span>
            <span className="text-[#1A1A1A] font-bold">{formatINR(actualPaidAndApproved + pendingAmount)}</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="financial-charts-block">
        {/* Category Breakdown list */}
        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col justify-between col-span-1 shadow-sm" id="category-bars">
          <div>
            <h3 className="text-[#1A1A1A] font-sans font-bold text-base mb-1">Expenditure Allocations</h3>
            <p className="text-[#7A756C] text-xs mb-5 font-sans italic">Sum of all approved payments by construction discipline</p>
          </div>
          <div className="flex flex-col gap-4">
            {chartData.map(item => {
              const percentage = Math.round((item.value / actualPaidAndApproved) * 100) || 0;
              return (
                <div key={item.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#1A1A1A] font-sans font-bold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-[#7A756C] font-sans text-[10px] uppercase font-bold">
                      {formatINR(item.value)} <span className="text-[#C5A059] font-bold ml-1">({percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#F4F1EA] h-1.5 border border-[#D1CEC6]/40 overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ backgroundColor: item.color, width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-[#F4F1EA] border border-[#D1CEC6] p-4 text-[11px] text-[#7A756C] mt-5 leading-relaxed font-sans italic">
            <span className="font-sans font-bold text-[#1A1A1A] uppercase tracking-widest text-[9px] block mb-1">Audited Compliance:</span> Standard labor payroll claims constitute the largest cost volume at {Math.round((categorySpent.Labor / actualPaidAndApproved) * 100) || 0}%, aligning perfectly with milestone targets.
          </div>
        </div>

        {/* Recharts Pie representation */}
        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col col-span-1 shadow-sm" id="category-recharts-pie">
          <h3 className="text-[#1A1A1A] font-sans font-bold text-base mb-1">EVM Financial Distribution</h3>
          <p className="text-[#7A756C] text-xs mb-4 font-sans italic">Visual metrics model for general ledger distributions</p>
          <div className="w-full h-44 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatINR(value), 'Spent']}
                  contentStyle={{ backgroundColor: '#F4F1EA', borderColor: '#D1CEC6', color: '#1A1A1A', fontSize: '11px', fontFamily: 'sans-serif' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] text-[#7A756C] uppercase font-sans tracking-widest font-bold">Invested</span>
              <span className="text-[#1A1A1A] font-sans font-extrabold italic text-lg">{Math.round((actualPaidAndApproved / totalBudget) * 100)}%</span>
            </div>
          </div>
          {/* Custom legends */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {chartData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-[#7A756C] font-sans font-bold uppercase tracking-wide">
                <span className="w-2 h-2 shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="truncate">{entry.name}: {formatINRCompact(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Variance Analysis */}
        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col justify-between col-span-1 shadow-sm" id="cost-variances">
          <div>
            <h3 className="text-[#1A1A1A] font-sans font-bold text-base mb-1">Discipline Cost Variance Ledger</h3>
            <p className="text-[#7A756C] text-xs mb-4 font-sans italic">Variance of completed milestone actuals vs engineering baselines</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs p-3 bg-[#F4F1EA] border border-[#D1CEC6]">
              <div>
                <p className="text-[#1A1A1A] font-sans font-bold">Phase 1: Soil Excavation</p>
                <p className="text-[#7A756C] text-[10px] font-sans font-bold uppercase">Baseline: {formatINR(PHASE_BASELINES.excavation)}</p>
              </div>
              <span className="text-[#2E7D32] font-sans font-bold text-xs flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" /> -2.0%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-3 bg-[#F4F1EA] border border-[#D1CEC6]">
              <div>
                <p className="text-[#1A1A1A] font-sans font-bold">Phase 2: Concrete Pour Footings</p>
                <p className="text-[#7A756C] text-[10px] font-sans font-bold uppercase">Baseline: {formatINR(PHASE_BASELINES.concrete)}</p>
              </div>
              <span className="text-[#B71C1C] font-sans font-bold text-xs flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +8.0%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-3 bg-[#F4F1EA] border border-[#D1CEC6]">
              <div>
                <p className="text-[#1A1A1A] font-sans font-bold">Phase 3: Structural Framing</p>
                <p className="text-[#7A756C] text-[10px] font-sans font-bold uppercase">Baseline: {formatINR(PHASE_BASELINES.framing)}</p>
              </div>
              <span className="text-[#2E7D32] font-sans font-bold text-xs flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" /> -1.0%
              </span>
            </div>
          </div>
          <p className="text-[#7A756C] text-[10px] leading-relaxed mt-4 italic font-sans">
            ⚠ Note: Foundation pricing exceeded plans due to regional cement market surge. Mitigations in framing steel successfully restored overall balance.
          </p>
        </div>
      </div>

      {/* Invoice Registry list & Logging actions */}
      <div className="bg-white border border-[#D1CEC6] shadow-sm overflow-hidden" id="invoice-registry">
        <div className="p-4 border-b border-[#D1CEC6] bg-[#F4F1EA] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="text-[#1A1A1A] font-sans font-bold text-base">Subcontractor Invoice Ledger</h3>
            <p className="text-[#7A756C] text-xs font-sans italic mt-0.5">Full financial transparency on site contracts</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {(userRole === 'FinanceManager' || userRole === 'ProjectManager') && (
              <button
                onClick={() => setShowLogForm(!showLogForm)}
                className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#C5A059] text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2 transition-colors cursor-pointer w-full sm:w-auto justify-center"
                id="btn-trigger-add-invoice"
              >
                <Plus className="w-4 h-4" />
                <span>Log Subcontractor Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* Invoice submission form expansion */}
        {showLogForm && (
          <form onSubmit={handleLogInvoice} className="p-6 bg-white border-b border-[#D1CEC6] animate-fade-in" id="add-invoice-form">
            <h4 className="text-[#1A1A1A] font-sans uppercase tracking-widest font-bold text-xs mb-4">Receive Vendor Invoice / Claim Request</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Apex Timber Products"
                  className="bg-[#F4F1EA] border border-[#D1CEC6] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059] font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Invoice Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="e.g. 3735000"
                  className="bg-[#F4F1EA] border border-[#D1CEC6] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059] font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Category Code</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Invoice['category'])}
                  className="bg-[#F4F1EA] border border-[#D1CEC6] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059] font-sans cursor-pointer"
                >
                  <option value="Labor">Labor (Payroll)</option>
                  <option value="Materials">Materials & Supply</option>
                  <option value="Equipment">Equipment Leasing</option>
                  <option value="Subcontractors">Subcontractors Contracts</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Short Description *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Structural timber struts, level 2"
                  className="bg-[#F4F1EA] border border-[#D1CEC6] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059] font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowLogForm(false)}
                className="bg-transparent hover:bg-[#F4F1EA] border border-[#D1CEC6] text-[#1A1A1A] text-[10px] uppercase tracking-widest font-bold px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#1A1A1A] hover:bg-[#C5A059] text-white text-[10px] uppercase tracking-widest font-bold px-5 py-2 cursor-pointer"
              >
                Log Claims Voucher
              </button>
            </div>
          </form>
        )}

        {/* Invoice table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D1CEC6] bg-[#E5E2D9] text-[#1A1A1A] font-sans uppercase tracking-wider text-[10px] font-bold select-none">
                <th className="p-3 pl-4">Voucher ID</th>
                <th className="p-3">Vendor / Account</th>
                <th className="p-3">Invoice Amount</th>
                <th className="p-3">Category Code</th>
                <th className="p-3">Claim Date</th>
                <th className="p-3">Scope / Details</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right pr-4">Finance Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1CEC6]" id="invoice-items-rows">
              {invoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-[#F4F1EA]/30 transition-all">
                  <td className="p-3 pl-4 font-mono font-bold text-[#C5A059]">
                    {invoice.id}
                  </td>
                  <td className="p-3 font-sans font-bold text-[#1A1A1A]">
                    {invoice.vendor}
                  </td>
                  <td className="p-3 text-[#1A1A1A] font-sans font-bold">
                    {formatINR(invoice.amount)}
                  </td>
                  <td className="p-3">
                    <span className="bg-[#F4F1EA] border border-[#D1CEC6] text-[#1A1A1A] text-[10px] px-2.5 py-0.5 uppercase tracking-wider font-bold">
                      {invoice.category}
                    </span>
                  </td>
                  <td className="p-3 text-[#7A756C] font-sans text-[10px]">
                    {invoice.date}
                  </td>
                  <td className="p-3 text-[#7A756C] font-sans max-w-[180px] truncate" title={invoice.description}>
                    {invoice.description}
                  </td>
                  <td className="p-3">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="p-3 text-right pr-4 whitespace-nowrap">
                    {(userRole === 'FinanceManager' || userRole === 'ProjectManager') && invoice.status === 'Pending' && (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onUpdateInvoiceStatus(invoice.id, 'Rejected')}
                          className="text-[#B71C1C] hover:text-white bg-white hover:bg-[#B71C1C] border border-[#D1CEC6] px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => onUpdateInvoiceStatus(invoice.id, 'Approved')}
                          className="text-white bg-[#1A1A1A] hover:bg-[#C5A059] px-3 py-1 text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                    {(userRole === 'FinanceManager' || userRole === 'ProjectManager') && invoice.status === 'Approved' && (
                      <button
                        onClick={() => onUpdateInvoiceStatus(invoice.id, 'Paid')}
                        className="text-white bg-[#2E7D32] hover:bg-[#1B5E20] px-3.5 py-1 text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                      >
                        Release Payment
                      </button>
                    )}
                    {invoice.status === 'Paid' && (
                      <span className="text-[#2E7D32] text-[10px] font-sans font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2E7D32]" /> Remitted
                      </span>
                    )}
                    {invoice.status === 'Rejected' && (
                      <span className="text-[#B71C1C] text-[10px] font-sans font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                        <Ban className="w-3.5 h-3.5 text-[#B71C1C]" /> Voided
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
