/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PunchItem } from '../types';
import { CheckCircle2, AlertCircle, Clock, Plus, Search, Filter, Camera, ShieldAlert, Check, X, FileCheck2 } from 'lucide-react';

interface PunchlistViewProps {
  punchItems: PunchItem[];
  onAddPunchItem: (item: Omit<PunchItem, 'id'>) => void;
  onUpdatePunchStatus: (id: string, status: PunchItem['status'], notes?: string) => void;
  userRole: string;
}

export const PunchlistView: React.FC<PunchlistViewProps> = ({
  punchItems,
  onAddPunchItem,
  onUpdatePunchStatus,
  userRole
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New item form
  const [newItemText, setNewItemText] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPhase, setNewPhase] = useState('Framing');
  const [newSeverity, setNewSeverity] = useState<PunchItem['severity']>('Major');
  const [newSubcontractor, setNewSubcontractor] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Selected for inspection dialog
  const [inspectingItem, setInspectingItem] = useState<PunchItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const filteredItems = punchItems.filter(item => {
    const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.subcontractor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'All' || item.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const totalClosed = punchItems.filter(p => p.status === 'Closed').length;
  const totalCritical = punchItems.filter(p => p.severity === 'Critical' && p.status !== 'Closed').length;
  const totalPendingInspection = punchItems.filter(p => p.status === 'Ready for Inspection').length;

  const handleCreatePunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText || !newLocation || !newSubcontractor) return;
    onAddPunchItem({
      item: newItemText,
      location: newLocation,
      phase: newPhase,
      severity: newSeverity,
      subcontractor: newSubcontractor,
      status: 'Open',
      dateReported: new Date().toISOString().split('T')[0],
      photoUrl: newPhotoUrl || undefined
    });
    setNewItemText('');
    setNewLocation('');
    setNewSubcontractor('');
    setNewPhotoUrl('');
    setShowAddModal(false);
  };

  const handleInspectSubmit = (newStatus: PunchItem['status']) => {
    if (!inspectingItem) return;
    onUpdatePunchStatus(inspectingItem.id, newStatus, resolutionNotes || inspectingItem.resolutionNotes);
    setInspectingItem(null);
    setResolutionNotes('');
  };

  const getSeverityBadge = (severity: PunchItem['severity']) => {
    switch (severity) {
      case 'Critical':
        return <span className="bg-red-500/10 text-red-700 border border-red-500/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-bold">Critical</span>;
      case 'Major':
        return <span className="bg-[#C5A059]/15 text-[#8C6D23] border border-[#C5A059]/30 text-[9px] px-2 py-0.5 uppercase tracking-wider font-bold">Major</span>;
      case 'Minor':
        return <span className="bg-slate-500/10 text-slate-700 border border-slate-500/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-bold">Minor</span>;
    }
  };

  const getStatusBadge = (status: PunchItem['status']) => {
    switch (status) {
      case 'Closed':
        return <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-bold">✓ Closed</span>;
      case 'Ready for Inspection':
        return <span className="bg-blue-500/10 text-blue-700 border border-blue-500/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-bold">● Ready for Review</span>;
      case 'In Progress':
        return <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-bold">In Progress</span>;
      case 'Open':
        return <span className="bg-rose-500/10 text-rose-700 border border-rose-500/20 text-[9px] px-2 py-0.5 uppercase tracking-wider font-bold">Open Defect</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6" id="punchlist-module-container">
      {/* Top QA/QC Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D1CEC6] p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-[#7A756C] uppercase tracking-widest font-bold">Total Items Logged</span>
          <span className="text-2xl font-bold text-[#1A1A1A] mt-2">{punchItems.length}</span>
          <span className="text-[10px] text-[#7A756C] mt-1 font-mono">Site QA/QC Registry</span>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-[#7A756C] uppercase tracking-widest font-bold">Closed & Approved</span>
          <span className="text-2xl font-bold text-emerald-700 mt-2">{totalClosed}</span>
          <span className="text-[10px] text-emerald-600 mt-1 font-mono">{Math.round((totalClosed / (punchItems.length || 1)) * 100)}% Clearance Rate</span>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-[#7A756C] uppercase tracking-widest font-bold">Critical Open Defects</span>
          <span className="text-2xl font-bold text-rose-700 mt-2">{totalCritical}</span>
          <span className="text-[10px] text-rose-600 mt-1 font-mono">High Priority Resolution</span>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-[#7A756C] uppercase tracking-widest font-bold">Awaiting Re-Inspection</span>
          <span className="text-2xl font-bold text-blue-700 mt-2">{totalPendingInspection}</span>
          <span className="text-[10px] text-blue-600 mt-1 font-mono">Ready for Superintendent</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#D1CEC6] shadow-sm overflow-hidden">
        {/* Controls header */}
        <div className="p-4 border-b border-[#D1CEC6] bg-[#F4F1EA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#C5A059]" />
            <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">Quality Inspection & Punch List Ledger</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#7A756C]" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search defect, location, crew..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#D1CEC6] text-xs focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="bg-white border border-[#D1CEC6] px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#C5A059]"
            >
              <option value="All">All Severity</option>
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-white border border-[#D1CEC6] px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#C5A059]"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Ready for Inspection">Ready for Review</option>
              <option value="Closed">Closed</option>
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#1A1A1A] hover:bg-[#333] text-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Log Defect</span>
            </button>
          </div>
        </div>

        {/* List table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D1CEC6] bg-[#E5E2D9]/40 text-[#7A756C] uppercase tracking-widest text-[9px]">
                <th className="p-3 pl-5">Defect ID & Description</th>
                <th className="p-3">Location</th>
                <th className="p-3">Subcontractor</th>
                <th className="p-3 text-center">Severity</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Reported</th>
                <th className="p-3 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1CEC6]">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-[#F4F1EA]/50 transition-colors">
                  <td className="p-3 pl-5">
                    <div className="flex items-start gap-2.5">
                      {item.photoUrl && (
                        <img
                          src={item.photoUrl}
                          alt="Evidence"
                          className="w-9 h-9 object-cover rounded border border-[#D1CEC6] shrink-0 mt-0.5 cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => setInspectingItem(item)}
                        />
                      )}
                      <div>
                        <span className="font-mono text-[10px] text-[#7A756C] block">{item.id} • {item.phase}</span>
                        <span className="font-semibold text-[#1A1A1A] block">{item.item}</span>
                        {item.resolutionNotes && (
                          <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
                            Note: {item.resolutionNotes}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-[#4A4740] font-mono text-[11px]">{item.location}</td>
                  <td className="p-3 text-[#1A1A1A] font-semibold">{item.subcontractor}</td>
                  <td className="p-3 text-center">{getSeverityBadge(item.severity)}</td>
                  <td className="p-3 text-center">{getStatusBadge(item.status)}</td>
                  <td className="p-3 text-[#7A756C] font-mono text-[10px]">{item.dateReported}</td>
                  <td className="p-3 text-right pr-5">
                    <button
                      onClick={() => {
                        setInspectingItem(item);
                        setResolutionNotes(item.resolutionNotes || '');
                      }}
                      className="text-[#C5A059] hover:text-[#1A1A1A] font-bold text-[10px] uppercase tracking-wider underline cursor-pointer"
                    >
                      Audit / Sign-off
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-[#7A756C] italic">
                    No punch list items match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D1CEC6] w-full max-w-lg p-6 shadow-xl relative animate-fade-in">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-[#7A756C] hover:text-[#1A1A1A]"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-[#1A1A1A] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#C5A059]" />
              <span>Log Quality / Punch Defect</span>
            </h3>

            <form onSubmit={handleCreatePunch} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A756C] block mb-1">Defect Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rebar cover clearance deviation on shear wall SW-04"
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  className="w-full p-2 bg-[#F4F1EA] border border-[#D1CEC6] text-xs focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A756C] block mb-1">Location / Grid</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sector 2 - Level 3 Grid B-1"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="w-full p-2 bg-[#F4F1EA] border border-[#D1CEC6] text-xs focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A756C] block mb-1">Responsible Subcontractor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ironworkers Local 4"
                    value={newSubcontractor}
                    onChange={e => setNewSubcontractor(e.target.value)}
                    className="w-full p-2 bg-[#F4F1EA] border border-[#D1CEC6] text-xs focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A756C] block mb-1">Phase</label>
                  <select
                    value={newPhase}
                    onChange={e => setNewPhase(e.target.value)}
                    className="w-full p-2 bg-[#F4F1EA] border border-[#D1CEC6] text-xs focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="Foundation">Foundation</option>
                    <option value="Framing">Framing</option>
                    <option value="HVAC/Electrical">HVAC/Electrical</option>
                    <option value="Exterior">Exterior</option>
                    <option value="Finishing">Finishing</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A756C] block mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={e => setNewSeverity(e.target.value as PunchItem['severity'])}
                    className="w-full p-2 bg-[#F4F1EA] border border-[#D1CEC6] text-xs focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="Critical">Critical (Structural/Safety)</option>
                    <option value="Major">Major (Rework required)</option>
                    <option value="Minor">Minor (Cosmetic/Touch-up)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A756C] block mb-1">Photo Evidence (Optional file upload or URL)</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const objectUrl = URL.createObjectURL(file);
                        setNewPhotoUrl(objectUrl);
                        try {
                          const formData = new FormData();
                          formData.append('photo', file);
                          const resp = await fetch('/api/photos/upload', {
                            method: 'POST',
                            body: formData,
                            credentials: 'include',
                          });
                          if (resp.ok) {
                            const data = await resp.json();
                            if (data.url) setNewPhotoUrl(data.url);
                          }
                        } catch {
                          // keep objectUrl in local mode
                        }
                      }
                    }}
                    className="text-xs font-mono text-[#7A756C]"
                  />
                  <input
                    type="url"
                    placeholder="Or enter direct photo URL..."
                    value={newPhotoUrl}
                    onChange={e => setNewPhotoUrl(e.target.value)}
                    className="w-full p-2 bg-[#F4F1EA] border border-[#D1CEC6] text-xs focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#D1CEC6] text-xs font-semibold uppercase tracking-wider hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-wider"
                >
                  Save Defect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect & Sign-off Dialog */}
      {inspectingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D1CEC6] w-full max-w-lg p-6 shadow-xl relative animate-fade-in">
            <button
              onClick={() => setInspectingItem(null)}
              className="absolute right-4 top-4 text-[#7A756C] hover:text-[#1A1A1A]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-[#7A756C]">{inspectingItem.id}</span>
              {getSeverityBadge(inspectingItem.severity)}
              {getStatusBadge(inspectingItem.status)}
            </div>

            <h3 className="text-base font-bold text-[#1A1A1A] mb-1">{inspectingItem.item}</h3>
            <p className="text-xs text-[#7A756C] font-mono mb-4">Location: {inspectingItem.location} • Subcontractor: {inspectingItem.subcontractor}</p>

            {inspectingItem.photoUrl && (
              <div className="mb-4">
                <img
                  src={inspectingItem.photoUrl}
                  alt="Defect Inspection"
                  className="w-full h-44 object-cover border border-[#D1CEC6] rounded-sm"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A756C] block mb-1">
                Superintendent / QC Engineer Sign-Off Notes
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                placeholder="Document remedial actions taken, non-shrink grout batch, torque tests, or reinspection approvals..."
                className="w-full p-2 bg-[#F4F1EA] border border-[#D1CEC6] text-xs focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#D1CEC6]">
              <button
                type="button"
                onClick={() => handleInspectSubmit('In Progress')}
                className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider hover:bg-amber-200"
              >
                Mark In Progress
              </button>

              <button
                type="button"
                onClick={() => handleInspectSubmit('Ready for Inspection')}
                className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider hover:bg-blue-200"
              >
                Ready for Review
              </button>

              <button
                type="button"
                onClick={() => handleInspectSubmit('Closed')}
                className="px-4 py-1.5 bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-800 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Pass & Close Defect</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
