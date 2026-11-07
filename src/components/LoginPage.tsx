/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLoginMutation } from '../api/queries';
import { HardHat, Shield, ArrowRight, AlertCircle, Lock, Mail } from 'lucide-react';

const ADMIN_ACCOUNTS = [
  { role: 'ProjectManager', email: 'pm@constructiq.demo', label: 'Rahul Sharma (Senior PM)', badge: 'Admin / PM' },
  { role: 'Executive', email: 'exec@constructiq.demo', label: 'Neha Gupta (VP Operations)', badge: 'Admin / Executive' },
  { role: 'FinanceManager', email: 'finance@constructiq.demo', label: 'Project Coordinator (Finance)', badge: 'Admin / Finance' },
  { role: 'SafetyOfficer', email: 'safety@constructiq.demo', label: 'Vikram Singh (EHS Director)', badge: 'Admin / Safety' },
];

const EMPLOYEE_ACCOUNTS = [
  { role: 'SiteSupervisor', email: 'supervisor@constructiq.demo', label: 'Priya Patel (Site Superintendent)', badge: 'Employee Portal' },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('pm@constructiq.demo');
  const [password, setPassword] = useState('DemoPass123!');
  const loginMutation = useLoginMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleQuickSelect = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoPass123!');
    loginMutation.mutate({ email: demoEmail, password: 'DemoPass123!' });
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-[#1A1A1A] flex items-center justify-center shadow-md">
            <HardHat className="w-7 h-7 text-[#C5A059]" />
          </div>
          <span className="font-serif text-3xl font-extrabold tracking-tight text-[#1A1A1A]">
            CONSTRUCT<span className="text-[#C5A059]">IQ</span>
          </span>
        </div>
        <p className="text-xs uppercase tracking-widest text-[#7A756C] font-mono font-medium">
          Autonomous Construction Project Intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E5E0D8] p-8 shadow-sm">
          <h2 className="text-xl font-serif font-bold text-[#1A1A1A] mb-1">Sign in to site operations</h2>
          <p className="text-xs text-[#7A756C] mb-6 font-mono">Role-governed telemetry and schedule ledger</p>

          {loginMutation.isError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{(loginMutation.error as any)?.message || 'Authentication failed. Please verify credentials.'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-[#1A1A1A] mb-1">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7A756C] absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="user@constructiq.demo"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E0D8] bg-[#FAFAF8] focus:outline-none focus:border-[#C5A059] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-[#1A1A1A] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7A756C] absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E0D8] bg-[#FAFAF8] focus:outline-none focus:border-[#C5A059] font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-2.5 px-4 bg-[#1A1A1A] hover:bg-[#2C2C2C] text-white text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loginMutation.isPending ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#E5E0D8]">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#7A756C] mb-3 flex items-center space-x-1 font-bold">
              <Shield className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>1. Admin & Management Dashboard:</span>
            </p>
            <div className="space-y-1.5 mb-4">
              {ADMIN_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickSelect(acc.email)}
                  className="w-full text-left px-3 py-2 text-xs bg-[#FAFAF8] hover:bg-[#F0ECE1] border border-[#E5E0D8] text-[#1A1A1A] font-medium transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-mono text-[11px] font-semibold">{acc.label}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#1A1A1A] text-[#C5A059] font-bold">
                    {acc.badge}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[11px] font-mono uppercase tracking-wider text-[#7A756C] mb-2 flex items-center space-x-1 font-bold">
              <HardHat className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>2. Employee & Field Crew Portal:</span>
            </p>
            <div className="space-y-1.5">
              {EMPLOYEE_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickSelect(acc.email)}
                  className="w-full text-left px-3 py-2 text-xs bg-amber-50/60 hover:bg-amber-100/70 border border-[#C5A059]/40 text-[#1A1A1A] font-medium transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-mono text-[11px] font-semibold">{acc.label}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#C5A059] text-black font-bold">
                    {acc.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

