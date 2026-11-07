/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLoginMutation } from '../api/queries';
import { HardHat, Shield, ArrowRight, AlertCircle, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

const ADMIN_ACCOUNTS = [
  { role: 'ProjectManager',  email: 'pm@constructiq.demo',         label: 'Rahul Sharma',       title: 'Senior Project Manager & System Administrator', badge: 'Admin' },
];

const EMPLOYEE_ACCOUNTS = [
  { role: 'SiteSupervisor',  email: 'supervisor@constructiq.demo', label: 'Priya Patel',         title: 'Site Superintendent / Field Operations', badge: 'Supervisor' },
  { role: 'Executive',       email: 'exec@constructiq.demo',       label: 'Neha Gupta',          title: 'VP Operations',                         badge: 'Executive' },
  { role: 'FinanceManager',  email: 'finance@constructiq.demo',    label: 'Project Coordinator', title: 'Financial Controller',                  badge: 'Finance' },
  { role: 'SafetyOfficer',   email: 'safety@constructiq.demo',     label: 'Vikram Singh',        title: 'EHS Director',                         badge: 'Safety' },
];

const ROLE_COLORS: Record<string, string> = {
  Admin:      'bg-[#1A1A1A] text-[#C5A059]',
  Supervisor: 'bg-[#C5A059] text-black',
  Executive:  'bg-blue-900 text-blue-200',
  Finance:    'bg-emerald-900 text-emerald-200',
  Safety:     'bg-red-900 text-red-200',
};

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('pm@constructiq.demo');
  const [password, setPassword] = useState('DemoPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const loginMutation = useLoginMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleQuickSelect = async (demoEmail: string) => {
    setQuickLoading(demoEmail);
    setEmail(demoEmail);
    setPassword('DemoPass123!');
    loginMutation.mutate(
      { email: demoEmail, password: 'DemoPass123!' },
      { onSettled: () => setQuickLoading(null) }
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">

      {/* Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-14 h-14 bg-[#1A1A1A] flex items-center justify-center shadow-lg">
            <HardHat className="w-8 h-8 text-[#C5A059]" />
          </div>
          <div className="text-left">
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[#1A1A1A]">
              CONSTRUCT<span className="text-[#C5A059]">IQ</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#7A756C] font-mono">
              Enterprise · v0.1 · ISO 9001
            </p>
          </div>
        </div>
        <p className="text-xs uppercase tracking-widest text-[#7A756C] font-mono font-medium">
          Autonomous Construction Project Intelligence
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E5E0D8] shadow-sm overflow-hidden">

          {/* Card header */}
          <div className="bg-[#1A1A1A] px-8 py-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Sign in to Site Operations</h2>
            <p className="text-[10px] text-[#7A756C] mt-0.5 font-mono">Role-governed telemetry and schedule ledger</p>
          </div>

          <div className="p-8">
            {/* Error */}
            {loginMutation.isError && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{(loginMutation.error as any)?.message || 'Authentication failed. Please verify credentials.'}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A89F91] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="user@constructiq.demo"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E5E0D8] bg-[#FAFAF8] focus:outline-none focus:border-[#C5A059] font-mono placeholder:text-[#C8C3BA]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A89F91] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-[#E5E0D8] bg-[#FAFAF8] focus:outline-none focus:border-[#C5A059] font-mono placeholder:text-[#C8C3BA]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A89F91] hover:text-[#1A1A1A] cursor-pointer"
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full py-3 px-4 bg-[#1A1A1A] hover:bg-[#2C2C2C] text-white text-xs font-mono uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick access */}
            <div className="mt-8 pt-6 border-t border-[#E5E0D8]">

              <p className="text-[10px] font-mono uppercase tracking-wider text-[#7A756C] mb-3 flex items-center gap-1.5 font-bold">
                <Shield className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span>1. System Administrator</span>
              </p>
              <div className="space-y-1.5 mb-5">
                {ADMIN_ACCOUNTS.map(acc => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickSelect(acc.email)}
                    disabled={loginMutation.isPending}
                    className="w-full text-left px-3 py-2.5 bg-[#FAFAF8] hover:bg-[#F0ECE1] border border-[#E5E0D8] hover:border-[#C5A059]/40 text-[#1A1A1A] transition-all flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-bold truncate">{acc.label}</p>
                      <p className="text-[9px] text-[#7A756C] font-mono uppercase tracking-wider truncate">{acc.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {quickLoading === acc.email
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                        : <ArrowRight className="w-3.5 h-3.5 text-[#A89F91] group-hover:text-[#C5A059] transition-colors" />
                      }
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 font-bold ${ROLE_COLORS[acc.badge] || 'bg-[#E5E0D8] text-[#1A1A1A]'}`}>
                        {acc.badge}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-[10px] font-mono uppercase tracking-wider text-[#7A756C] mb-2.5 flex items-center gap-1.5 font-bold">
                <HardHat className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span>2. Employee Portal &amp; Operations Staff</span>
              </p>
              <div className="space-y-1.5">
                {EMPLOYEE_ACCOUNTS.map(acc => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickSelect(acc.email)}
                    disabled={loginMutation.isPending}
                    className="w-full text-left px-3 py-2.5 bg-amber-50/70 hover:bg-amber-100/80 border border-[#C5A059]/30 hover:border-[#C5A059] text-[#1A1A1A] transition-all flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-bold truncate">{acc.label}</p>
                      <p className="text-[9px] text-[#7A756C] font-mono uppercase tracking-wider truncate">{acc.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {quickLoading === acc.email
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                        : <ArrowRight className="w-3.5 h-3.5 text-[#A89F91] group-hover:text-[#C5A059] transition-colors" />
                      }
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 font-bold ${ROLE_COLORS[acc.badge] || 'bg-[#E5E0D8] text-[#1A1A1A]'}`}>
                        {acc.badge}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <p className="mt-6 text-center text-[9px] text-[#A89F91] font-mono uppercase tracking-widest">
              Demo env · All credentials pre-filled · DemoPass123!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
