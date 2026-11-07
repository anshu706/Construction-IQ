/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConstructIQ – Admin Workforce & Subcontractor Management Console
 */

import React, { useState } from 'react';
import { Task, OperationLog } from '../types';
import { formatINR } from '../currency';
import {
  Users, HardHat, CheckCircle2, AlertTriangle, Clock,
  Briefcase, Search, Filter, ShieldCheck, ArrowUpRight,
  TrendingUp, Award, Phone, Mail, Building2, UserPlus
} from 'lucide-react';

interface AdminWorkforceViewProps {
  tasks: Task[];
  onLogOperationsFeed: (message: string, type: OperationLog['type'], severity: OperationLog['severity']) => void;
}

interface Subcontractor {
  id: string;
  name: string;
  trade: string;
  foreman: string;
  phone: string;
  activeWorkers: number;
  totalContracted: number;
  safetyRating: number;
  contractValueInr: number;
  status: 'Compliant' | 'Caution' | 'Suspended';
}

export const AdminWorkforceView: React.FC<AdminWorkforceViewProps> = ({
  tasks,
  onLogOperationsFeed,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('All');

  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([
    {
      id: 'sub-01',
      name: 'Apex Structural Works',
      trade: 'Steel Framing & Rigging',
      foreman: 'Karan Mehra',
      phone: '+91 98201 44210',
      activeWorkers: 14,
      totalContracted: 15,
      safetyRating: 98,
      contractValueInr: 45000000,
      status: 'Compliant',
    },
    {
      id: 'sub-02',
      name: 'Titan ReadyMix & Concrete',
      trade: 'Concrete & Foundation',
      foreman: 'Suresh Patil',
      phone: '+91 98450 12890',
      activeWorkers: 12,
      totalContracted: 12,
      safetyRating: 95,
      contractValueInr: 68000000,
      status: 'Compliant',
    },
    {
      id: 'sub-03',
      name: 'Delta Electro-Mechanicals',
      trade: 'HVAC & High-Voltage Electrical',
      foreman: 'Anand Verma',
      phone: '+91 99302 78119',
      activeWorkers: 8,
      totalContracted: 10,
      safetyRating: 92,
      contractValueInr: 32000000,
      status: 'Compliant',
    },
    {
      id: 'sub-04',
      name: 'Sterling Facades & Glazing',
      trade: 'Exterior Curtain Wall',
      foreman: 'Rajeev Nambiar',
      phone: '+91 98112 56341',
      activeWorkers: 5,
      totalContracted: 5,
      safetyRating: 88,
      contractValueInr: 28000000,
      status: 'Caution',
    },
    {
      id: 'sub-05',
      name: 'Precision Plumbing Infra',
      trade: 'Piping & Wet Utilities',
      foreman: 'Mohit Rao',
      phone: '+91 97230 45199',
      activeWorkers: 3,
      totalContracted: 3,
      safetyRating: 99,
      contractValueInr: 15000000,
      status: 'Compliant',
    },
  ]);

  const [activeShiftWorkers, setActiveShiftWorkers] = useState([
    { id: 'W-101', name: 'Rajesh Kumar', trade: 'Steel Rigger', subcontractor: 'Apex Structural Works', badge: 'RFID-9021', clockIn: '07:30 AM', zone: 'Level 4 Deck', status: 'Active' },
    { id: 'W-102', name: 'Manoj Singh', trade: 'Welder L3', subcontractor: 'Apex Structural Works', badge: 'RFID-9022', clockIn: '07:45 AM', zone: 'Level 4 Deck', status: 'Active' },
    { id: 'W-103', name: 'Amit Sharma', trade: 'Concrete Finisher', subcontractor: 'Titan ReadyMix', badge: 'RFID-8411', clockIn: '08:00 AM', zone: 'Level 3 East', status: 'Active' },
    { id: 'W-104', name: 'Devendra Gowda', trade: 'Master Electrician', subcontractor: 'Delta Electro-Mechanicals', badge: 'RFID-7102', clockIn: '08:15 AM', zone: 'Basement Sub-station', status: 'Active' },
    { id: 'W-105', name: 'Sunil Jadhav', trade: 'HVAC Duct Fitter', subcontractor: 'Delta Electro-Mechanicals', badge: 'RFID-7109', clockIn: '08:30 AM', zone: 'Level 2 Riser', status: 'Active' },
    { id: 'W-106', name: 'Farhan Akhtar', trade: 'Safety Marshall', subcontractor: 'Sterling Facades', badge: 'RFID-6320', clockIn: '07:15 AM', zone: 'Ground Perimeter', status: 'Active' },
  ]);

  const totalHeadcount = subcontractors.reduce((acc, s) => acc + s.activeWorkers, 0);
  const totalContracted = subcontractors.reduce((acc, s) => acc + s.totalContracted, 0);
  const totalLaborBudget = subcontractors.reduce((acc, s) => acc + s.contractValueInr, 0);

  const filteredSubs = subcontractors.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sub.foreman.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sub.trade.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrade = selectedTrade === 'All' || sub.trade.includes(selectedTrade);
    return matchesSearch && matchesTrade;
  });

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in" id="admin-workforce-view">
      {/* ── Top Workforce Metrics ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D1CEC6] p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#7A756C] mb-2 font-mono text-[9px] uppercase tracking-widest font-bold">
            <span>Active Site Roster</span>
            <Users className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-[#1A1A1A]">
            {totalHeadcount} <span className="text-sm font-normal text-[#7A756C]">/ {totalContracted}</span>
          </div>
          <div className="text-[10px] text-[#2E7D32] font-mono mt-1 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> 93.3% Check-in Rate Today
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#7A756C] mb-2 font-mono text-[9px] uppercase tracking-widest font-bold">
            <span>Contracted Trades</span>
            <Building2 className="w-4 h-4 text-[#1A1A1A]" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-[#1A1A1A]">
            {subcontractors.length}
          </div>
          <div className="text-[10px] text-[#7A756C] font-mono mt-1">
            5 Master Service Agreements
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#7A756C] mb-2 font-mono text-[9px] uppercase tracking-widest font-bold">
            <span>Safety Pass Rate</span>
            <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-[#2E7D32]">
            96.4%
          </div>
          <div className="text-[10px] text-[#7A756C] font-mono mt-1">
            Zero OSHA Stop-Work Orders
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#7A756C] mb-2 font-mono text-[9px] uppercase tracking-widest font-bold">
            <span>Total Labor Outlay</span>
            <Briefcase className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="text-xl font-mono font-extrabold text-[#1A1A1A]">
            {formatINR(totalLaborBudget)}
          </div>
          <div className="text-[10px] text-[#C5A059] font-mono mt-1 font-bold">
            Allotted over 18 Months
          </div>
        </div>
      </div>

      {/* ── Subcontractor Master Ledger ───────────────────────────────────── */}
      <div className="bg-white border border-[#D1CEC6] shadow-sm">
        <div className="p-5 border-b border-[#D1CEC6] bg-[#F4F1EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-sans font-bold text-base text-[#1A1A1A]">Subcontractor Trade Directory & Compliance</h3>
            <p className="text-xs text-[#7A756C] font-sans mt-0.5">Real-time attendance, certified foremen, and compliance auditing</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7A756C] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search contractor or trade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-mono border border-[#D1CEC6] bg-white focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <button
              onClick={() => onLogOperationsFeed('Admin generated complete Subcontractor Audit Dossier.', 'general', 'info')}
              className="bg-[#1A1A1A] hover:bg-[#C5A059] text-white px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Audit Report</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D1CEC6] bg-[#E5E2D9]/30 text-[#7A756C] font-sans uppercase tracking-widest text-[9px]">
                <th className="p-4 pl-6">Subcontractor & Trade</th>
                <th className="p-4">Lead Foreman</th>
                <th className="p-4 text-center">Active / Total</th>
                <th className="p-4 text-center">Safety Score</th>
                <th className="p-4">Contract Committed</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8]">
              {filteredSubs.map(sub => (
                <tr key={sub.id} className="hover:bg-[#F4F1EA]/50 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="font-sans font-bold text-sm text-[#1A1A1A]">{sub.name}</div>
                    <div className="text-[10px] text-[#7A756C] font-mono mt-0.5">{sub.trade}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-mono text-xs text-[#1A1A1A] font-semibold">{sub.foreman}</div>
                    <div className="text-[10px] text-[#7A756C] font-mono">{sub.phone}</div>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-sm">
                    <span className="text-[#1A1A1A]">{sub.activeWorkers}</span>
                    <span className="text-[#A89F91] text-xs"> / {sub.totalContracted}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-xs ${
                      sub.safetyRating >= 95 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sub.safetyRating}%
                    </span>
                  </td>
                  <td className="p-4 font-mono font-semibold text-xs text-[#1A1A1A]">
                    {formatINR(sub.contractValueInr)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${
                      sub.status === 'Compliant'
                        ? 'bg-green-50 text-[#2E7D32] border-green-200'
                        : 'bg-amber-50 text-[#C5A059] border-amber-200'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Live Shift Roster & RFID Check-In Log ─────────────────────────── */}
      <div className="bg-white border border-[#D1CEC6] shadow-sm">
        <div className="p-5 border-b border-[#D1CEC6] bg-[#F4F1EA] flex items-center justify-between">
          <div>
            <h3 className="font-sans font-bold text-base text-[#1A1A1A]">Live RFID Turnstile Gate Telemetry</h3>
            <p className="text-xs text-[#7A756C] font-sans mt-0.5">Real-time gate pass recordings from North & South security gates</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#2E7D32] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-ping" />
            Gates Online
          </span>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeShiftWorkers.map(worker => (
              <div key={worker.id} className="p-3.5 bg-[#FAFAF8] border border-[#E5E0D8] flex items-start justify-between">
                <div>
                  <div className="font-sans font-bold text-sm text-[#1A1A1A]">{worker.name}</div>
                  <div className="text-[10px] text-[#7A756C] font-mono mt-0.5">{worker.trade} • {worker.subcontractor}</div>
                  <div className="text-[10px] text-[#C5A059] font-mono mt-1 font-semibold">Zone: {worker.zone}</div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 font-mono font-bold px-1.5 py-0.5 uppercase block">
                    {worker.badge}
                  </span>
                  <span className="text-[9px] text-[#7A756C] font-mono block mt-1">In: {worker.clockIn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

