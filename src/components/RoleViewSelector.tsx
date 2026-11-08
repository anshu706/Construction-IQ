/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProfile, UserRole } from '../types';
import { USER_PROFILES } from '../data';
import { Briefcase, HardHat, IndianRupee, Award, Shield } from 'lucide-react';

interface RoleViewSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  loggedInRole?: UserRole;
}

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'ProjectManager':
      return <Briefcase className="w-4 h-4 text-[#C5A059]" id="icon-pm" />;
    case 'SiteSupervisor':
      return <HardHat className="w-4 h-4 text-[#A89F91]" id="icon-sup" />;
    case 'FinanceManager':
      return <IndianRupee className="w-4 h-4 text-[#1A1A1A]" id="icon-fin" />;
    case 'Executive':
      return <Award className="w-4 h-4 text-[#C5A059]" id="icon-exec" />;
    case 'SafetyOfficer':
      return <Shield className="w-4 h-4 text-[#B71C1C]" id="icon-safe" />;
  }
};

export const RoleViewSelector: React.FC<RoleViewSelectorProps> = ({ currentRole, onRoleChange, loggedInRole }) => {
  const isAdmin = loggedInRole === 'ProjectManager';

  // If non-admin (crews/employees), they only see other non-admin crew profiles; Admin profile is filtered out
  const visibleProfiles = isAdmin
    ? USER_PROFILES
    : USER_PROFILES.filter(p => p.role !== 'ProjectManager');

  const activeProfile = visibleProfiles.find(p => p.role === currentRole) || visibleProfiles[0] || USER_PROFILES[0];

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full shadow-xs" id="role-view-selector">
      <div className="flex items-center gap-3.5">
        <div className="relative">
          <img
            src={activeProfile.avatar}
            alt={activeProfile.name}
            className="w-12 h-12 rounded-full ring-2 ring-slate-100 object-cover"
            id="active-user-avatar"
          />
          <div className="absolute -bottom-1 -right-1 bg-white border border-slate-200 rounded-full p-1 shadow-xs">
            {getRoleIcon(activeProfile.role)}
          </div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-slate-900 font-sans font-bold text-base" id="active-user-name">{activeProfile.name}</h4>
            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full px-2.5 py-0.5 font-sans font-semibold">
              {activeProfile.role.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
          <p className="text-slate-500 font-sans text-xs mt-0.5">{activeProfile.title} • <span className="text-slate-700 font-medium">{activeProfile.department}</span></p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
        <span className="text-xs text-slate-500 font-semibold font-sans">Perspective:</span>
        <div className="flex flex-wrap gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
          {visibleProfiles.map(profile => {
            const isActive = profile.role === currentRole;
            return (
              <button
                key={profile.role}
                onClick={() => onRoleChange(profile.role)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                id={`btn-role-${profile.role.toLowerCase()}`}
              >
                {getRoleIcon(profile.role)}
                <span>{profile.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
