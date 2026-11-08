/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConstructIQ – Dedicated Employee & Field Crew Portal
 */

import React, { useState, useEffect } from 'react';
import { Task, PunchItem, SafetyIncident, OperationLog } from '../types';
import {
  HardHat, Clock, CheckCircle2, AlertTriangle, Camera, Upload,
  ShieldAlert, Sparkles, ChevronRight, Play, Check, Pause,
  Calendar, MapPin, Eye, FileCheck, UserCheck, Flame, Sun, Wind
} from 'lucide-react';

interface EmployeeDashboardProps {
  tasks: Task[];
  punchItems: PunchItem[];
  incidents: SafetyIncident[];
  weather: {
    temp: number;
    condition: string;
    wind: number;
    humidity: number;
    forecast: string;
  };
  craneHaltActive?: boolean;
  onUpdateTaskProgress: (id: string, progress: number, status: Task['status'], notes?: string) => void;
  onAddIncident: (incident: Omit<SafetyIncident, 'id'>) => void;
  onAddPunchItem: (item: Omit<PunchItem, 'id'>) => void;
  onUpdatePunchStatus: (id: string, status: PunchItem['status'], notes?: string) => void;
  onLogOperationsFeed: (message: string, type: OperationLog['type'], severity: OperationLog['severity']) => void;
  currentUser?: any;
  onSwitchToAdmin?: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  tasks,
  punchItems,
  incidents,
  weather,
  craneHaltActive = false,
  onUpdateTaskProgress,
  onAddIncident,
  onAddPunchItem,
  onUpdatePunchStatus,
  onLogOperationsFeed,
  currentUser,
  onSwitchToAdmin,
}) => {
  // ── Shift Clock-In State ─────────────────────────────────────────────────────
  const [isClockedIn, setIsClockedIn] = useState<boolean>(() => {
    return localStorage.getItem('employee_clocked_in') === 'true';
  });
  const [clockInTime, setClockInTime] = useState<string>(() => {
    return localStorage.getItem('employee_clock_in_time') || '07:45 AM';
  });
  const [shiftSeconds, setShiftSeconds] = useState<number>(14280); // ~3h 58m initial

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isClockedIn) {
      timer = setInterval(() => setShiftSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isClockedIn]);

  const handleToggleClock = () => {
    if (!isClockedIn) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setIsClockedIn(true);
      setClockInTime(nowStr);
      localStorage.setItem('employee_clocked_in', 'true');
      localStorage.setItem('employee_clock_in_time', nowStr);
      onLogOperationsFeed(
        `Field Worker ${currentUser?.name || 'Priya Patel'} clocked in for Site Shift 1. RFID Badge authenticated.`,
        'general',
        'success'
      );
    } else {
      setIsClockedIn(false);
      localStorage.setItem('employee_clocked_in', 'false');
      onLogOperationsFeed(
        `Field Worker ${currentUser?.name || 'Priya Patel'} clocked out for break/end-of-shift.`,
        'general',
        'info'
      );
    }
  };

  const formatShiftDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // ── PPE Compliance Checklist ────────────────────────────────────────────────
  const [ppeItems, setPpeItems] = useState([
    { id: 'ppe-1', label: 'Hard Hat (ANSI Z89.1 Certified)', checked: true },
    { id: 'ppe-2', label: 'High-Visibility Class 2 Safety Vest', checked: true },
    { id: 'ppe-3', label: 'Steel-Toe Protective Work Boots', checked: true },
    { id: 'ppe-4', label: 'Safety Eyewear & Impact Goggles', checked: true },
    { id: 'ppe-5', label: 'Fall-Arrest Harness (>6 ft elevation)', checked: true },
  ]);

  const [toolboxSigned, setToolboxSigned] = useState(true);

  const togglePpe = (id: string) => {
    setPpeItems(prev => prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  };

  // ── Task Filter & Management ────────────────────────────────────────────────
  const [taskFilter, setTaskFilter] = useState<'all' | 'in_progress' | 'pending' | 'complete'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskWorkNotes, setTaskWorkNotes] = useState<Record<string, string>>({});

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'in_progress') return task.status === 'In Progress';
    if (taskFilter === 'pending') return task.status === 'Not Started' || task.status === 'Delayed';
    if (taskFilter === 'complete') return task.status === 'Complete';
    return true;
  });

  const handleStartTask = (task: Task) => {
    onUpdateTaskProgress(task.id, Math.max(task.progress, 15), 'In Progress', 'Shift crew deployed on task.');
    onLogOperationsFeed(
      `Worker ${currentUser?.name || 'Priya Patel'} initiated on-site work: "${task.name}".`,
      'task_update',
      'info'
    );
  };

  const handleCompleteTask = (task: Task) => {
    const note = taskWorkNotes[task.id] || 'Field work verified and completed.';
    onUpdateTaskProgress(task.id, 100, 'Complete', note);
    onLogOperationsFeed(
      `Worker ${currentUser?.name || 'Priya Patel'} signed off task: "${task.name}" as COMPLETE.`,
      'task_update',
      'success'
    );
    setTaskWorkNotes(prev => ({ ...prev, [task.id]: '' }));
  };

  const handleSliderProgressChange = (task: Task, newProgress: number) => {
    const newStatus = newProgress >= 100 ? 'Complete' : newProgress > 0 ? 'In Progress' : 'Not Started';
    onUpdateTaskProgress(task.id, newProgress, newStatus);
  };

  // ── Quick Defect / Punch Reporter Modal ──────────────────────────────────────
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [punchItemTitle, setPunchItemTitle] = useState('');
  const [punchLocation, setPunchLocation] = useState('Level 3 - West Wing');
  const [punchSeverity, setPunchSeverity] = useState<'Minor' | 'Major' | 'Critical'>('Major');

  const handleSubmitPunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchItemTitle.trim()) return;

    onAddPunchItem({
      item: punchItemTitle.trim(),
      location: punchLocation,
      phase: 'Framing',
      severity: punchSeverity,
      subcontractor: 'Apex Structural Works',
      status: 'Open',
      dateReported: new Date().toISOString().split('T')[0],
      resolutionNotes: 'Reported directly from field mobile terminal.',
    });

    setPunchItemTitle('');
    setIsPunchModalOpen(false);
  };

  // ── Quick Emergency / Near-Miss Reporter Modal ───────────────────────────────
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentType, setIncidentType] = useState<SafetyIncident['type']>('Near-Miss');
  const [incidentSeverity, setIncidentSeverity] = useState<SafetyIncident['severity']>('Minor');

  const handleSubmitIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDescription.trim()) return;

    onAddIncident({
      date: new Date().toISOString().split('T')[0],
      severity: incidentSeverity,
      type: incidentType,
      description: incidentDescription.trim(),
      status: 'Open',
      actionTaken: 'Flagged by field crew; awaiting EHS inspector arrival.',
    });

    setIncidentDescription('');
    setIsIncidentModalOpen(false);
  };

  // ── Field Evidence Photo Gallery ────────────────────────────────────────────
  const [fieldPhotos, setFieldPhotos] = useState<Array<{ name: string; url: string; time: string; task: string }>>([
    {
      name: 'Joint_Weld_Inspection_L3.jpg',
      url: '/photos/Joint_Weld_Inspection_L3.jpg',
      time: '09:15 AM',
      task: 'Structural Steel Framing'
    },
    {
      name: 'Rebar_Tie_Verification_L4.jpg',
      url: '/photos/Rebar_Tie_Verification_L4.jpg',
      time: '10:45 AM',
      task: 'Deck Pouring Level 4'
    },
    {
      name: 'Conduit_RoughIn_ZoneB.jpg',
      url: '/photos/Conduit_RoughIn_ZoneB.jpg',
      time: '11:30 AM',
      task: 'Electrical Conduit Routing'
    }
  ]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setFieldPhotos(prev => [
        {
          name: file.name,
          url: preview,
          time: timeStr,
          task: 'On-Site Field Evidence'
        },
        ...prev
      ]);
      onLogOperationsFeed(
        `Field worker uploaded progress photo "${file.name}" to QA ledger.`,
        'general',
        'success'
      );
    }
  };

  // ── Calculation Summaries ───────────────────────────────────────────────────
  const myTasksCount = tasks.length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const completedCount = tasks.filter(t => t.status === 'Complete').length;
  const openPunchCount = punchItems.filter(p => p.status !== 'Closed').length;

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in" id="employee-portal-root">
      {/* ── Top Worker Bar & Shift Status ──────────────────────────────────── */}
      <div className="bg-white border border-[#D1CEC6] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 bg-[#1A1A1A] border-2 border-[#C5A059] flex items-center justify-center text-[#C5A059] shadow-sm">
              <HardHat className="w-8 h-8" />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isClockedIn ? 'bg-[#2E7D32]' : 'bg-[#7A756C]'
            }`} title={isClockedIn ? 'Clocked In & Active' : 'Off-Shift'} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[#1A1A1A] font-sans font-bold text-xl tracking-tight">
                {currentUser?.name || 'Priya Patel'}
              </h2>
              <span className="text-[10px] bg-[#C5A059]/15 text-[#8C6D23] border border-[#C5A059]/30 px-2 py-0.5 rounded-xs font-mono font-bold uppercase tracking-wider">
                Field Operations Lead
              </span>
            </div>
            <p className="text-xs text-[#7A756C] font-mono mt-0.5">
              Badge #CQ-8942 • Crew: <span className="text-[#1A1A1A] font-bold">Titan Steel & Concrete</span> • Station: <span className="text-[#C5A059] font-bold">Zone 3 (Levels 3–5)</span>
            </p>
          </div>
        </div>

        {/* Shift Clock & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#F4F1EA] border border-[#D1CEC6] px-4 py-2 flex items-center gap-3">
            <Clock className={`w-5 h-5 ${isClockedIn ? 'text-[#2E7D32] animate-pulse' : 'text-[#7A756C]'}`} />
            <div>
              <div className="text-[9px] uppercase tracking-widest text-[#7A756C] font-mono font-bold">
                {isClockedIn ? 'Current Shift Active' : 'Shift On Hold'}
              </div>
              <div className="text-sm font-mono font-extrabold text-[#1A1A1A]">
                {isClockedIn ? formatShiftDuration(shiftSeconds) : 'Clocked Out'}
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleClock}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors shadow-sm ${
              isClockedIn
                ? 'bg-[#B71C1C] hover:bg-[#921414] text-white'
                : 'bg-[#2E7D32] hover:bg-[#1B5E20] text-white'
            }`}
          >
            {isClockedIn ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isClockedIn ? 'Clock Out / Break' : 'Clock In to Shift'}</span>
          </button>

          {onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="bg-white hover:bg-[#F4F1EA] text-[#1A1A1A] border border-[#D1CEC6] px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Admin Console</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
            </button>
          )}
        </div>
      </div>

      {/* ── Active Site Hazard & Weather Alert (if crane halt or severe weather) ─ */}
      {craneHaltActive && (
        <div className="bg-red-500/10 border-l-4 border-red-600 p-4 flex items-center justify-between gap-3 text-red-900">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 animate-bounce" />
            <div>
              <h4 className="font-sans font-bold text-sm uppercase tracking-wide text-red-800">
                CRANE HALT INTERLOCK ACTIVE — WIND THRESHOLD EXCEEDED ({weather.wind} MPH)
              </h4>
              <p className="text-xs text-red-700 font-sans mt-0.5">
                All overhead crane lifts, hook rigging, and exterior high-elevation deck transfers are suspended by EHS order.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-red-600 text-white font-mono font-bold px-2 py-1 uppercase tracking-widest shrink-0">
            HALT MANDATORY
          </span>
        </div>
      )}

      {/* ── Metric Snapshot Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D1CEC6] p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-[#7A756C] font-mono font-bold block">Assigned Tasks</span>
            <div className="text-2xl font-mono font-extrabold text-[#1A1A1A] mt-1">{myTasksCount}</div>
            <div className="text-[10px] text-[#C5A059] font-mono mt-0.5">{inProgressCount} In Progress</div>
          </div>
          <div className="w-10 h-10 bg-[#F4F1EA] border border-[#D1CEC6] flex items-center justify-center">
            <HardHat className="w-5 h-5 text-[#C5A059]" />
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-[#7A756C] font-mono font-bold block">Completed Today</span>
            <div className="text-2xl font-mono font-extrabold text-[#2E7D32] mt-1">{completedCount}</div>
            <div className="text-[10px] text-[#7A756C] font-mono mt-0.5">Verified on ledger</div>
          </div>
          <div className="w-10 h-10 bg-[#F4F1EA] border border-[#D1CEC6] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-[#7A756C] font-mono font-bold block">Site Telemetry</span>
            <div className="text-xl font-mono font-extrabold text-[#1A1A1A] mt-1">{weather.temp}°F // {weather.wind}mph</div>
            <div className="text-[10px] text-[#7A756C] font-mono mt-0.5">{weather.condition}</div>
          </div>
          <div className="w-10 h-10 bg-[#F4F1EA] border border-[#D1CEC6] flex items-center justify-center">
            <Wind className="w-5 h-5 text-[#A89F91]" />
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-[#7A756C] font-mono font-bold block">Defects in Zone</span>
            <div className="text-2xl font-mono font-extrabold text-[#B71C1C] mt-1">{openPunchCount}</div>
            <div className="text-[10px] text-[#7A756C] font-mono mt-0.5">Actionable QC items</div>
          </div>
          <div className="w-10 h-10 bg-[#F4F1EA] border border-[#D1CEC6] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#B71C1C]" />
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): My Assigned Tasks & Work Progress */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Work Dispatch Panel */}
          <div className="bg-white border border-[#D1CEC6] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D1CEC6] gap-3">
              <div>
                <h3 className="text-[#1A1A1A] font-sans font-bold text-lg flex items-center gap-2">
                  <span>My Active Work Orders & Dispatch</span>
                  <span className="text-xs bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full font-mono font-normal">
                    {filteredTasks.length}
                  </span>
                </h3>
                <p className="text-xs text-[#7A756C] font-sans mt-0.5">
                  Update your daily progress sliders and sign off completions directly
                </p>
              </div>

              {/* Task status filter tabs */}
              <div className="flex items-center bg-[#F4F1EA] p-1 border border-[#D1CEC6] text-[10px] font-mono uppercase font-bold">
                {(['all', 'in_progress', 'pending', 'complete'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    className={`px-2.5 py-1 transition-colors cursor-pointer ${
                      taskFilter === filter ? 'bg-[#1A1A1A] text-white shadow-xs' : 'text-[#7A756C] hover:text-[#1A1A1A]'
                    }`}
                  >
                    {filter.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Task list */}
            <div className="flex flex-col divide-y divide-[#E5E0D8] mt-4">
              {filteredTasks.map(task => {
                const isComplete = task.status === 'Complete';
                const isInProgress = task.status === 'In Progress';
                const isDelayed = task.status === 'Delayed';

                return (
                  <div key={task.id} className="py-5 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                          isComplete ? 'bg-[#2E7D32] text-white' : isInProgress ? 'bg-[#C5A059] text-white' : 'bg-[#D1CEC6] text-[#1A1A1A]'
                        }`}>
                          {isComplete ? <Check className="w-3.5 h-3.5" /> : task.id.replace('task-', '#')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-[#1A1A1A] font-sans font-bold text-sm">{task.name}</h4>
                            <span className={`text-[9px] px-2 py-0.5 uppercase tracking-wider font-mono font-bold border ${
                              isComplete
                                ? 'bg-green-50 text-[#2E7D32] border-green-200'
                                : isInProgress
                                ? 'bg-amber-50 text-[#8C6D23] border-amber-200'
                                : isDelayed
                                ? 'bg-red-50 text-[#B71C1C] border-red-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {task.status}
                            </span>
                            <span className="text-[9px] bg-[#F4F1EA] text-[#7A756C] px-2 py-0.5 font-mono border border-[#D1CEC6]">
                              {task.phase}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#7A756C] font-mono mt-1 flex flex-wrap items-center gap-3">
                            <span>Crew: <strong className="text-[#1A1A1A]">{task.assignedCrew}</strong></span>
                            <span>•</span>
                            <span>Target: <strong className="text-[#1A1A1A]">{task.endDate}</strong></span>
                            <span>•</span>
                            <span>Priority: <strong className={task.priority === 'Critical' ? 'text-red-700' : 'text-[#1A1A1A]'}>{task.priority}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Quick action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!isComplete && !isInProgress && (
                          <button
                            onClick={() => handleStartTask(task)}
                            className="bg-[#1A1A1A] hover:bg-[#C5A059] text-white px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          >
                            <Play className="w-3 h-3" />
                            <span>Start Work</span>
                          </button>
                        )}

                        {!isComplete && (
                          <button
                            onClick={() => handleCompleteTask(task)}
                            className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Complete</span>
                          </button>
                        )}

                        {isComplete && (
                          <span className="text-xs font-mono font-bold text-[#2E7D32] flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Sign-off Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Slider */}
                    <div className="bg-[#FAFAF8] border border-[#E5E0D8] p-3 rounded-xs">
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="text-[#7A756C] uppercase tracking-wider text-[10px]">Completion Progress</span>
                        <span className="font-bold text-[#1A1A1A]">{task.progress}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={task.progress}
                        disabled={isComplete}
                        onChange={(e) => handleSliderProgressChange(task, Number(e.target.value))}
                        className="w-full accent-[#C5A059] cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-[#A89F91] font-mono mt-1">
                        <span>0% (Not Started)</span>
                        <span>50% (In Progress)</span>
                        <span>100% (Complete)</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="py-12 text-center text-[#7A756C] font-mono text-xs">
                  No tasks found in this filter category.
                </div>
              )}
            </div>
          </div>

          {/* Field Photo Gallery & Evidence */}
          <div className="bg-white border border-[#D1CEC6] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#D1CEC6]">
              <div>
                <h3 className="text-[#1A1A1A] font-sans font-bold text-base flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#C5A059]" />
                  <span>Field Verification Photo Ledger</span>
                </h3>
                <p className="text-xs text-[#7A756C] font-sans mt-0.5">
                  Attach date-stamped site photos for QA/QC inspections and progress reporting
                </p>
              </div>

              <label className="bg-[#1A1A1A] hover:bg-[#C5A059] text-white px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {fieldPhotos.map((photo, idx) => (
                <div key={idx} className="border border-[#D1CEC6] bg-[#FAFAF8] overflow-hidden group">
                  <div className="aspect-video relative overflow-hidden bg-black/10">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5">
                      {photo.time}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-mono font-bold text-[#1A1A1A] truncate">{photo.name}</div>
                    <div className="text-[10px] text-[#7A756C] font-mono truncate mt-0.5">{photo.task}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): PPE Checklist, Quick Reporting & Emergency SOS */}
        <div className="flex flex-col gap-6">
          {/* Quick Action Buttons: Report Defect & Emergency Incident */}
          <div className="bg-white border border-[#D1CEC6] p-5 shadow-sm flex flex-col gap-3">
            <h3 className="text-[#1A1A1A] font-sans font-bold text-sm uppercase tracking-wider">
              Field Action Hotlinks
            </h3>

            <button
              onClick={() => setIsPunchModalOpen(true)}
              className="w-full bg-[#1A1A1A] hover:bg-[#C5A059] text-white p-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between cursor-pointer transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C5A059]" />
                <span>Report QA Defect / Punch</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsIncidentModalOpen(true)}
              className="w-full bg-[#B71C1C] hover:bg-[#8F1313] text-white p-3 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between cursor-pointer transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-white" />
                <span>Report Safety Near-Miss / SOS</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Daily PPE Compliance Card */}
          <div className="bg-white border border-[#D1CEC6] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#D1CEC6]">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#2E7D32]" />
                <h3 className="text-[#1A1A1A] font-sans font-bold text-sm uppercase tracking-wider">
                  Daily PPE & Safety Sign-off
                </h3>
              </div>
              <span className="text-[9px] bg-green-50 text-[#2E7D32] border border-green-200 px-2 py-0.5 font-mono font-bold">
                100% OK
              </span>
            </div>

            <p className="text-xs text-[#7A756C] font-sans mt-2 mb-3">
              Mandatory OSHA PPE checks required prior to active field work:
            </p>

            <div className="flex flex-col gap-2">
              {ppeItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-2.5 p-2 bg-[#FAFAF8] border border-[#E5E0D8] text-xs font-mono cursor-pointer hover:bg-white"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => togglePpe(item.id)}
                    className="accent-[#2E7D32] w-4 h-4"
                  />
                  <span className={item.checked ? 'text-[#1A1A1A]' : 'text-[#7A756C] line-through'}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Toolbox Talk confirmation */}
            <div className="mt-4 pt-3 border-t border-[#D1CEC6]">
              <div className="p-3 bg-[#F4F1EA] border border-[#D1CEC6] flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-mono font-bold text-[#1A1A1A]">Daily Toolbox Talk</div>
                  <div className="text-[11px] text-[#7A756C] font-mono">Topic: High-Elevation Fall Protection</div>
                </div>
                <span className="text-[9px] font-mono font-bold bg-[#2E7D32] text-white px-2 py-0.5 uppercase">
                  Attended
                </span>
              </div>
            </div>
          </div>

          {/* Active Punch Items Assigned to this Crew */}
          <div className="bg-white border border-[#D1CEC6] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#D1CEC6]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C5A059]" />
                <h3 className="text-[#1A1A1A] font-sans font-bold text-sm uppercase tracking-wider">
                  Open Punch List in Zone
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#1A1A1A]">{openPunchCount} items</span>
            </div>

            <div className="flex flex-col gap-2.5 mt-3 max-h-72 overflow-y-auto">
              {punchItems.slice(0, 4).map(punch => (
                <div key={punch.id} className="p-3 bg-[#FAFAF8] border border-[#E5E0D8] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-bold text-xs text-[#1A1A1A] truncate">{punch.item}</span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 uppercase ${
                      punch.severity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {punch.severity}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#7A756C] font-mono flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#A89F91]" />
                    <span>{punch.location}</span>
                  </div>
                  {punch.status !== 'Closed' && (
                    <button
                      onClick={() => onUpdatePunchStatus(punch.id, 'Ready for Inspection', 'Rectified by Priya Patel crew.')}
                      className="mt-1 text-[9px] uppercase font-mono font-bold bg-[#1A1A1A] hover:bg-[#C5A059] text-white py-1 px-2 cursor-pointer transition-colors text-center"
                    >
                      Request Re-Inspection
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: Report Defect / Punch ───────────────────────────────────── */}
      {isPunchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D1CEC6] max-w-md w-full p-6 shadow-xl animate-scale-up">
            <h3 className="text-lg font-sans font-bold text-[#1A1A1A] mb-1">Log Field Defect / Punch Item</h3>
            <p className="text-xs text-[#7A756C] font-mono mb-4">Direct field report synced to the master QC ledger</p>

            <form onSubmit={handleSubmitPunch} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A] mb-1">
                  Defect Description
                </label>
                <input
                  type="text"
                  required
                  value={punchItemTitle}
                  onChange={(e) => setPunchItemTitle(e.target.value)}
                  placeholder="e.g. Scaffolding anchor clip missing on Grid 4B"
                  className="w-full border border-[#D1CEC6] p-2 text-xs font-mono bg-[#FAFAF8] focus:border-[#C5A059] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A] mb-1">
                    Location / Floor
                  </label>
                  <input
                    type="text"
                    required
                    value={punchLocation}
                    onChange={(e) => setPunchLocation(e.target.value)}
                    className="w-full border border-[#D1CEC6] p-2 text-xs font-mono bg-[#FAFAF8] focus:border-[#C5A059] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A] mb-1">
                    Severity
                  </label>
                  <select
                    value={punchSeverity}
                    onChange={(e) => setPunchSeverity(e.target.value as any)}
                    className="w-full border border-[#D1CEC6] p-2 text-xs font-mono bg-[#FAFAF8] focus:border-[#C5A059] focus:outline-none"
                  >
                    <option value="Minor">Minor</option>
                    <option value="Major">Major</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D1CEC6]">
                <button
                  type="button"
                  onClick={() => setIsPunchModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-mono font-semibold uppercase border border-[#D1CEC6] text-[#7A756C] hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-mono font-bold uppercase bg-[#1A1A1A] hover:bg-[#C5A059] text-white cursor-pointer transition-colors"
                >
                  Submit Defect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Report Safety Emergency / Near-Miss ─────────────────────── */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#B71C1C] max-w-md w-full p-6 shadow-xl animate-scale-up">
            <div className="flex items-center gap-2 mb-2 text-[#B71C1C]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-lg font-sans font-bold">Report Safety Incident / Near-Miss</h3>
            </div>
            <p className="text-xs text-[#7A756C] font-mono mb-4">
              Dispatches priority alert to Safety Officer Vikram Singh & logs on site ledger
            </p>

            <form onSubmit={handleSubmitIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A] mb-1">
                  Incident Type
                </label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as any)}
                  className="w-full border border-[#D1CEC6] p-2 text-xs font-mono bg-[#FAFAF8] focus:border-[#B71C1C] focus:outline-none"
                >
                  <option value="Near-Miss">Near-Miss (Hazard caught before injury)</option>
                  <option value="First Aid">First Aid (Minor cut / bruise treated on site)</option>
                  <option value="Lost-Time">Lost-Time (Injury requiring medical leave)</option>
                  <option value="Equipment Damage">Equipment Damage (Machinery / hoist failure)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A] mb-1">
                  Severity Rating
                </label>
                <select
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value as any)}
                  className="w-full border border-[#D1CEC6] p-2 text-xs font-mono bg-[#FAFAF8] focus:border-[#B71C1C] focus:outline-none"
                >
                  <option value="Minor">Minor</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A] mb-1">
                  Description & Exact Location
                </label>
                <textarea
                  required
                  rows={3}
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="Detail what occurred, who was present, and what immediate containment was performed..."
                  className="w-full border border-[#D1CEC6] p-2 text-xs font-mono bg-[#FAFAF8] focus:border-[#B71C1C] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D1CEC6]">
                <button
                  type="button"
                  onClick={() => setIsIncidentModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-mono font-semibold uppercase border border-[#D1CEC6] text-[#7A756C] hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-mono font-bold uppercase bg-[#B71C1C] hover:bg-[#8F1313] text-white cursor-pointer transition-colors"
                >
                  Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

