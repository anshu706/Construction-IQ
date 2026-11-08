/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, OperationLog } from '../types';
import { HardHat, Hammer, AlertTriangle, Image as ImageIcon, Check, RefreshCw, Upload, FileText } from 'lucide-react';

interface SupervisorViewProps {
  tasks: Task[];
  logs: OperationLog[];
  onUpdateTaskProgress: (id: string, progress: number, status: Task['status'], notes?: string) => void;
  onLogOperationsFeed: (message: string, type: OperationLog['type'], severity: OperationLog['severity']) => void;
  userRole: string;
}

export const SupervisorView: React.FC<SupervisorViewProps> = ({
  tasks,
  logs,
  onUpdateTaskProgress,
  onLogOperationsFeed,
  userRole
}) => {
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<string[]>([]);
  const [toolboxTopic, setToolboxTopic] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<{ name: string; size: string; preview: string; date: string }[]>([
    { name: 'Deck_Pour_L4.jpg', size: '2.4 MB', preview: '/photos/Rebar_Tie_Verification_L4.jpg', date: 'Aug 2, 2026' },
    { name: 'Steel_Frame_Joints_Level_3.jpg', size: '1.8 MB', preview: '/photos/Joint_Weld_Inspection_L3.jpg', date: 'Aug 1, 2026' }
  ]);

  const [dragActive, setDragActive] = useState(false);

  // Active or ready daily tasks
  const dailyTasks = tasks.filter(t => t.status === 'In Progress' || t.status === 'Not Started');

  const handleToggleDailyTask = (task: Task) => {
    if (task.status === 'Not Started') {
      onUpdateTaskProgress(task.id, 10, 'In Progress', 'Priya Patel dispatched active crew on site.');
      onLogOperationsFeed(`Site Superintendent Priya Patel activated task: ${task.name}.`, 'task_update', 'success');
    } else if (task.status === 'In Progress') {
      onUpdateTaskProgress(task.id, 100, 'Complete', 'Task completed and verified by Priya Patel.');
      onLogOperationsFeed(`Site Superintendent Priya Patel signed off task: ${task.name} as COMPLETE.`, 'task_update', 'success');
    }
  };

  const handleAcknowledgeAlert = (alertId: string, message: string) => {
    setAcknowledgedAlerts(prev => [...prev, alertId]);
    onLogOperationsFeed(`Supervisor acknowledged critical site alert: "${message}".`, 'safety', 'info');
  };

  const handleLogToolboxMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolboxTopic) return;
    onLogOperationsFeed(`Daily toolbox safety meeting completed. Core topic: "${toolboxTopic}". 42 workers registered.`, 'general', 'success');
    setToolboxTopic('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadAndAddPhoto = async (file: File, contextLabel: string) => {
    const previewUrl = URL.createObjectURL(file);
    const dateFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const sizeFormatted = file.size >= 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    const newPhoto = {
      name: file.name,
      size: sizeFormatted,
      preview: previewUrl,
      date: dateFormatted
    };
    setUploadedPhotos(prev => [newPhoto, ...prev]);
    onLogOperationsFeed(`Site Supervisor uploaded ${contextLabel}: "${file.name}" to task ledger.`, 'general', 'success');

    try {
      const formData = new FormData();
      formData.append('photo', file);
      await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
    } catch {
      // Retain local object URL preview in offline mode
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      uploadAndAddPhoto(file, 'drone photo asset');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      uploadAndAddPhoto(file, 'photo');
    }
  };

  // Active alerts mock
  const activeAlerts = [
    { id: 'AL-1', message: 'Scaffolding inspection Level 3 joints warning: structural clips need secondary tightness checks.', severity: 'warning' as const },
    { id: 'AL-2', message: 'Hydration thresholds warning: extreme temperatures registered on site (84°F). Hydration shade mandatory breaks active.', severity: 'alert' as const }
  ].filter(al => !acknowledgedAlerts.includes(al.id));

  return (
    <div className="flex flex-col gap-6" id="supervisor-module-container">
      {/* Overview Site Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="supervisor-status-blocks">
        <div className="bg-white border border-[#D1CEC6] p-6 flex items-center justify-between shadow-sm" id="sup-card-workers">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Workforce Checked In</span>
            <h2 className="text-[#1A1A1A] text-3xl font-sans font-extrabold italic mt-2">42 of 45 Active</h2>
            <p className="text-[#C5A059] text-xs mt-1.5 flex items-center gap-1 font-sans italic">
              <Check className="w-3.5 h-3.5 text-[#2E7D32]" /> RFID badge gates reporting
            </p>
          </div>
          <div className="p-3 bg-[#F4F1EA] border border-[#D1CEC6] rounded-sm">
            <HardHat className="w-6 h-6 text-[#C5A059]" />
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-6 flex items-center justify-between shadow-sm" id="sup-card-equipment">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Heavy Machinery Status</span>
            <h2 className="text-[#1A1A1A] text-3xl font-sans font-extrabold italic mt-2">8 of 9 Online</h2>
            <p className="text-[#7A756C] text-xs mt-1.5 flex items-center gap-1 font-sans font-bold uppercase tracking-wider">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 mr-1" /> Concrete pump #2 in repair
            </p>
          </div>
          <div className="p-3 bg-[#F4F1EA] border border-[#D1CEC6] rounded-sm">
            <Hammer className="w-6 h-6 text-[#1A1A1A]" />
          </div>
        </div>

        <div className="bg-white border border-[#D1CEC6] p-6 flex items-center justify-between shadow-sm" id="sup-card-warnings">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Active Safety Warnings</span>
            <h2 className="text-[#1A1A1A] text-3xl font-sans font-extrabold italic mt-2">{activeAlerts.length} Active</h2>
            <p className="text-[#7A756C] text-xs mt-1.5 font-sans italic">
              Acknowledge alarms immediately
            </p>
          </div>
          <div className={`p-3 border rounded-sm ${activeAlerts.length > 0 ? 'bg-[#B71C1C]/10 border-[#B71C1C]/20' : 'bg-[#F4F1EA] border-[#D1CEC6]'}`}>
            <AlertTriangle className={`w-6 h-6 ${activeAlerts.length > 0 ? 'text-[#B71C1C]' : 'text-[#7A756C]'}`} />
          </div>
        </div>
      </div>

      {/* Daily dispatch work + Alerts acknowledgment block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="daily-supervisor-arena">
        {/* Daily assignments panel */}
        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col justify-between shadow-sm" id="dispatch-assignments">
          <div>
            <h3 className="text-[#1A1A1A] font-sans font-bold text-base mb-1">Today's Site Crew Dispatch Log</h3>
            <p className="text-[#7A756C] text-xs mb-4 font-sans italic">Quickly toggle task states to dispatch workers or record finishes</p>
          </div>

          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {dailyTasks.map(task => {
              const isNotStarted = task.status === 'Not Started';
              return (
                <div key={task.id} className="p-4 bg-[#F4F1EA] border border-[#D1CEC6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#1A1A1A] font-sans font-bold text-sm">{task.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 uppercase tracking-wider font-sans font-bold border ${
                        isNotStarted ? 'bg-[#E5E2D9] text-[#1A1A1A] border-[#D1CEC6]' : 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#7A756C] font-sans uppercase font-bold tracking-wider mt-1.5">
                      Crew: <span className="text-[#1A1A1A]">{task.assignedCrew}</span> • Progress: <span className="text-[#C5A059]">{task.progress}%</span>
                    </div>
                  </div>

                  {/* Dispatch action buttons */}
                  {(userRole === 'SiteSupervisor' || userRole === 'ProjectManager') && (
                    <button
                      onClick={() => handleToggleDailyTask(task)}
                      className={`text-[9px] uppercase tracking-widest font-sans font-bold px-3.5 py-2 rounded-none transition-all cursor-pointer whitespace-nowrap ${
                        isNotStarted
                          ? 'bg-[#1A1A1A] hover:bg-[#C5A059] text-white shadow-sm'
                          : 'bg-[#2E7D32] hover:bg-[#1B5E20] text-white shadow-sm'
                      }`}
                      id={`btn-toggle-task-${task.id}`}
                    >
                      {isNotStarted ? 'Dispatch Crew' : 'Sign Off Complete'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active safety alerts panel */}
        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col justify-between shadow-sm" id="active-warnings-board">
          <div>
            <h3 className="text-[#1A1A1A] font-sans font-bold text-base mb-1">Active EHS Site Alarms</h3>
            <p className="text-[#7A756C] text-xs mb-4 font-sans italic">Immediate field action required. Supervisor must review and sign acknowledgment</p>
          </div>

          <div className="flex flex-col gap-3 min-h-60 justify-start">
            {activeAlerts.length > 0 ? (
              activeAlerts.map(alert => (
                <div key={alert.id} className="p-4 bg-[#B71C1C]/5 border border-[#B71C1C]/25 rounded-none flex flex-col gap-3">
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4.5 h-4.5 text-[#B71C1C] shrink-0 mt-0.5" />
                    <p className="text-[#1A1A1A] leading-relaxed font-sans">{alert.message}</p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id, alert.message)}
                      className="bg-[#B71C1C] hover:bg-[#7F0000] text-white font-sans uppercase tracking-widest font-bold text-[9px] px-3.5 py-1.5 cursor-pointer"
                    >
                      Sign Acknowledgment
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-[#F4F1EA] border border-dashed border-[#D1CEC6] text-[#7A756C] text-center h-full">
                <Check className="w-8 h-8 text-[#2E7D32] mb-2" />
                <p className="font-sans font-bold text-[#1A1A1A] text-sm">All Safety Warnings Cleared</p>
                <p className="text-[11px] font-sans italic mt-1">Site inspections report zero pending hazard alarms.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag & Drop Photo submission logs & Toolbox form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="supervisor-field-uploads">
        {/* Photo uploading drag and drop */}
        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col justify-between shadow-sm" id="site-photo-uploader">
          <div>
            <h3 className="text-[#1A1A1A] font-sans font-bold text-base mb-1">Progress Media Attachments</h3>
            <p className="text-[#7A756C] text-xs mb-4 font-sans italic">Drag and drop progress photos or click to manually browse</p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-36 relative ${
              dragActive ? 'border-[#C5A059] bg-[#F4F1EA]' : 'border-[#D1CEC6] bg-[#F4F1EA] hover:bg-white'
            }`}
          >
            <input
              type="file"
              id="file-photo-upload"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
            <Upload className="w-8 h-8 text-[#7A756C] mb-2" />
            <p className="text-[#1A1A1A] text-xs font-sans font-bold">Drag and drop file here</p>
            <p className="text-[#7A756C] text-[10px] uppercase font-sans font-bold tracking-wider mt-1">Supports JPEG, PNG up to 10MB</p>
          </div>

          <div className="flex flex-col gap-2.5 mt-5">
            <span className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Recent Uploaded Media Assets:</span>
            <div className="grid grid-cols-2 gap-3">
              {uploadedPhotos.map((photo, index) => (
                <div key={index} className="bg-[#F4F1EA] border border-[#D1CEC6] p-2 flex items-center gap-2.5">
                  <img src={photo.preview} alt={photo.name} className="w-10 h-10 rounded-none object-cover border border-[#D1CEC6]" />
                  <div className="overflow-hidden">
                    <p className="text-[#1A1A1A] font-sans font-bold text-xs truncate" title={photo.name}>{photo.name}</p>
                    <p className="text-[#7A756C] text-[9px] font-sans font-bold mt-0.5">{photo.size} • {photo.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Toolbox safety briefing topics logger */}
        <div className="bg-white border border-[#D1CEC6] p-6 flex flex-col justify-between shadow-sm" id="toolbox-logger">
          <div>
            <h3 className="text-[#1A1A1A] font-sans font-bold text-base mb-1">Daily Safety Briefing Registry</h3>
            <p className="text-[#7A756C] text-xs mb-4 font-sans italic">Formal registration of daily morning hazard briefings with crews</p>
          </div>

          <form onSubmit={handleLogToolboxMeeting} className="flex flex-col gap-3 bg-[#F4F1EA] border border-[#D1CEC6] p-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Briefing Safety Topic *</label>
              <input
                type="text"
                required
                value={toolboxTopic}
                onChange={(e) => setToolboxTopic(e.target.value)}
                placeholder="e.g. Tethering handtools during high scaffolding framings"
                className="bg-white border border-[#D1CEC6] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
              />
            </div>
            <div className="flex flex-wrap justify-between items-center gap-2 text-[10px] text-[#7A756C] font-sans italic mt-1">
              <span>Required: All on-site crews to certify attendance</span>
              <button
                type="submit"
                className="bg-[#1A1A1A] hover:bg-[#C5A059] text-white uppercase tracking-widest font-sans font-bold text-[9px] px-4 py-2 cursor-pointer"
              >
                Register Daily Toolbox
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-3 mt-5">
            <span className="text-[10px] text-[#7A756C] font-sans uppercase tracking-widest font-bold">Recent Briefing Ledger:</span>
            <div className="flex flex-col gap-2">
              {[
                { topic: 'Heat exhaustion, cooling shelters & water stations checks', date: 'Aug 2, 2026', attendance: '42 workers' },
                { topic: 'Crane radius clearance barriered warning signs verification', date: 'Aug 1, 2026', attendance: '39 workers' }
              ].map((b, idx) => (
                <div key={idx} className="bg-[#F4F1EA] border border-[#D1CEC6] p-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="text-[#1A1A1A] font-sans font-bold leading-relaxed">{b.topic}</p>
                    <p className="text-[#7A756C] text-[10px] font-sans uppercase font-bold mt-1">{b.date} • Attended: <span className="text-[#2E7D32]">{b.attendance}</span></p>
                  </div>
                  <FileText className="w-5 h-5 text-[#C5A059] shrink-0 opacity-40 ml-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
