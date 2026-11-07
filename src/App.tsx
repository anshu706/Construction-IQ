/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, Task, Invoice, SafetyIncident, OperationLog, ProjectRisk, Milestone, PunchItem, ProjectState } from './types';
import {
  USER_PROFILES, INITIAL_TASKS, INITIAL_INVOICES, INITIAL_INCIDENTS,
  INITIAL_MILESTONES, INITIAL_RISKS, INITIAL_LOGS, INITIAL_PUNCH_ITEMS, SIMULATION_EVENTS
} from './data';
import { formatINR } from './currency';
import { RoleViewSelector } from './components/RoleViewSelector';
import { MetricCard } from './components/MetricCard';
import { GanttChart } from './components/GanttChart';
import { FinancialView } from './components/FinancialView';
import { SafetyView } from './components/SafetyView';
import { SupervisorView } from './components/SupervisorView';
import { ExecutiveView } from './components/ExecutiveView';
import { SimulatorControl } from './components/SimulatorControl';
import { PunchlistView } from './components/PunchlistView';
import { AICopilotDrawer } from './components/AICopilotDrawer';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { LoginPage } from './components/LoginPage';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminWorkforceView } from './components/AdminWorkforceView';
import { useToast } from './components/Toast';
import {
  useCurrentUser, useProjectDetail, useLogoutMutation,
  useUpdateTaskProgressMutation, useCreateTaskMutation, useDeleteTaskMutation,
  useCreateInvoiceMutation, useUpdateInvoiceStatusMutation,
  useCreateIncidentMutation, useResolveIncidentMutation,
  useCreatePunchItemMutation, useUpdatePunchStatusMutation,
  useAddLogMutation,
} from './api/queries';
import {
  CloudRain, Sun, Wind, Activity, Check, Calendar, ArrowRight,
  Sparkles, FileText, Database, Settings, ShieldAlert, CheckCircle2, LogOut, WifiOff,
  Shield, HardHat, Users, Loader2
} from 'lucide-react';

// Demo project ID (matches seed data)
const DEMO_PROJECT_ID = 'proj-demo-001';

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: authData, isLoading: authLoading } = useCurrentUser();
  const logoutMutation = useLogoutMutation();
  const user = authData?.user ?? null;
  const isAuthenticated = Boolean(user);
  const { toast } = useToast();

  // ── API-backed project data ───────────────────────────────────────────────
  const { data: projectData, isError: apiError } = useProjectDetail(
    isAuthenticated ? DEMO_PROJECT_ID : null
  );
  const apiProject = projectData?.project;
  const isOffline = isAuthenticated && apiError;

  // ── Current role (from auth or UI toggle for demo) ────────────────────────
  const [currentRole, setCurrentRole] = useState<UserRole>('ProjectManager');
  useEffect(() => {
    if (user?.role) setCurrentRole(user.role as UserRole);
  }, [user?.role]);

  // ── 2-in-1 Dual Dashboard Switcher ('admin' | 'employee') ────────────────
  const [dashboardMode, setDashboardMode] = useState<'admin' | 'employee'>(() => {
    const saved = localStorage.getItem('constructiq_dashboard_mode');
    if (saved === 'admin' || saved === 'employee') return saved;
    return 'admin';
  });

  useEffect(() => {
    if (user?.role === 'ProjectManager') {
      setDashboardMode('admin');
    } else if (user?.role) {
      setDashboardMode('employee');
    }
  }, [user?.role]);

  const handleSetDashboardMode = (mode: 'admin' | 'employee') => {
    setDashboardMode(mode);
    localStorage.setItem('constructiq_dashboard_mode', mode);
  };

  // ── Active tab ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    if (currentRole === 'SiteSupervisor') setActiveTab('supervisor');
    else if (currentRole === 'FinanceManager') setActiveTab('budget');
    else if (currentRole === 'SafetyOfficer') setActiveTab('safety');
    else if (currentRole === 'Executive') setActiveTab('executive');
    else setActiveTab('overview');
  }, [currentRole]);

  // ── Local state (seed / fallback for offline) ─────────────────────────────
  const CURRENCY_VERSION = 'inr-v2';
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('const_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const version = localStorage.getItem('const_currency_version');
    if (version !== CURRENCY_VERSION) {
      localStorage.removeItem('const_invoices');
      localStorage.setItem('const_currency_version', CURRENCY_VERSION);
      return INITIAL_INVOICES;
    }
    const saved = localStorage.getItem('const_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });
  const [incidents, setIncidents] = useState<SafetyIncident[]>(() => {
    const saved = localStorage.getItem('const_incidents');
    return saved ? JSON.parse(saved) : INITIAL_INCIDENTS;
  });
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    const saved = localStorage.getItem('const_milestones');
    return saved ? JSON.parse(saved) : INITIAL_MILESTONES;
  });
  const [risks, setRisks] = useState<ProjectRisk[]>(() => {
    const saved = localStorage.getItem('const_risks');
    return saved ? JSON.parse(saved) : INITIAL_RISKS;
  });
  const [punchItems, setPunchItems] = useState<PunchItem[]>(() => {
    const saved = localStorage.getItem('const_punch_items');
    return saved ? JSON.parse(saved) : INITIAL_PUNCH_ITEMS;
  });
  const [logs, setLogs] = useState<OperationLog[]>(() => {
    const saved = localStorage.getItem('const_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });
  const [weather, setWeather] = useState({
    temp: 78, condition: 'Clear Sky', wind: 8, humidity: 52,
    forecast: 'Ideal curing & framing conditions'
  });

  // ── Sync local state from API when online ─────────────────────────────────
  useEffect(() => {
    if (!apiProject) return;
    if (apiProject.tasks?.length)      setTasks(apiProject.tasks);
    if (apiProject.invoices?.length)   setInvoices(apiProject.invoices);
    if (apiProject.incidents?.length)  setIncidents(apiProject.incidents);
    if (apiProject.milestones?.length) setMilestones(apiProject.milestones);
    if (apiProject.risks?.length)      setRisks(apiProject.risks);
    if (apiProject.punchItems?.length) setPunchItems(apiProject.punchItems);
    if (apiProject.logs?.length)       setLogs(apiProject.logs);
    if (apiProject.weather)            setWeather(apiProject.weather);
  }, [apiProject]);

  // ── Persist to localStorage as offline cache ───────────────────────────────
  useEffect(() => { localStorage.setItem('const_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('const_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('const_incidents', JSON.stringify(incidents)); }, [incidents]);
  useEffect(() => { localStorage.setItem('const_milestones', JSON.stringify(milestones)); }, [milestones]);
  useEffect(() => { localStorage.setItem('const_risks', JSON.stringify(risks)); }, [risks]);
  useEffect(() => { localStorage.setItem('const_punch_items', JSON.stringify(punchItems)); }, [punchItems]);
  useEffect(() => { localStorage.setItem('const_logs', JSON.stringify(logs)); }, [logs]);

  // ── API mutations ──────────────────────────────────────────────────────────
  const updateTaskProgressMutation = useUpdateTaskProgressMutation(DEMO_PROJECT_ID);
  const createTaskMutation         = useCreateTaskMutation(DEMO_PROJECT_ID);
  const deleteTaskMutation         = useDeleteTaskMutation(DEMO_PROJECT_ID);
  const createInvoiceMutation      = useCreateInvoiceMutation(DEMO_PROJECT_ID);
  const updateInvoiceStatusMutation = useUpdateInvoiceStatusMutation(DEMO_PROJECT_ID);
  const createIncidentMutation     = useCreateIncidentMutation(DEMO_PROJECT_ID);
  const resolveIncidentMutation    = useResolveIncidentMutation(DEMO_PROJECT_ID);
  const createPunchItemMutation    = useCreatePunchItemMutation(DEMO_PROJECT_ID);
  const updatePunchStatusMutation  = useUpdatePunchStatusMutation(DEMO_PROJECT_ID);
  const addLogMutation             = useAddLogMutation(DEMO_PROJECT_ID);

  // ── Simulation state ───────────────────────────────────────────────────────
  const [simulationSpeed, setSimulationSpeed] = useState<'paused' | 'normal' | 'fast'>('paused');
  const [simulationIndex, setSimulationIndex] = useState(0);

  // Modals
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Simulation loop (offline / demo fallback) ─────────────────────────────
  useEffect(() => {
    if (simulationSpeed === 'paused') return;
    const intervalTime = simulationSpeed === 'normal' ? 7000 : 2500;
    const timer = setInterval(() => {
      const nextEvent = SIMULATION_EVENTS[simulationIndex % SIMULATION_EVENTS.length];
      const updatedState = nextEvent.apply({
        tasks, invoices, incidents, logs, risks, milestones, punchItems, weather, simulationSpeed
      });
      if (updatedState.tasks)    setTasks(updatedState.tasks);
      if (updatedState.invoices) setInvoices(updatedState.invoices);
      if (updatedState.weather)  setWeather(updatedState.weather);
      const newLog: OperationLog = {
        id: `L-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: nextEvent.log.type as any,
        severity: nextEvent.log.severity as any,
        message: nextEvent.log.message,
        user: nextEvent.log.user
      };
      setLogs(prev => [newLog, ...prev]);
      setSimulationIndex(prev => prev + 1);
    }, intervalTime);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationSpeed, simulationIndex]);

  // ── Mutators (try API first, fall back to local) ───────────────────────────
  const handleLogOperationsFeed = useCallback((message: string, type: OperationLog['type'], severity: OperationLog['severity']) => {
    const newLog: OperationLog = {
      id: `L-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      user: USER_PROFILES.find(p => p.role === currentRole)?.name || 'System'
    };
    setLogs(prev => [newLog, ...prev]);
    if (isAuthenticated) {
      addLogMutation.mutate({ type, severity, message });
    }
  }, [currentRole, isAuthenticated, addLogMutation]);

  const handleAddTask = useCallback((newTask: Omit<Task, 'id'>) => {
    const nextId = `T${tasks.length + 1}`;
    const taskObj: Task = { ...newTask, id: nextId };
    setTasks(prev => [...prev, taskObj]);
    handleLogOperationsFeed(`Added operation: "${newTask.name}" assigned to ${newTask.assignedCrew}.`, 'task_update', 'success');
    toast(`Task "${newTask.name}" added`, 'success');
    if (isAuthenticated) {
      createTaskMutation.mutate(newTask);
    }
  }, [tasks.length, handleLogOperationsFeed, isAuthenticated, createTaskMutation, toast]);

  const handleUpdateTaskProgress = useCallback((id: string, progress: number, status: Task['status'], notes?: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, progress, status, notes: notes || t.notes };
      if (id === 'T3' && progress === 100) {
        setMilestones(prevM => prevM.map(m => m.id === 'M3' ? { ...m, status: 'Complete', completedDate: '2026-08-02' } : m));
      }
      if (id === 'T5' && progress >= 100) {
        setMilestones(prevM => prevM.map(m => m.id === 'M4' ? { ...m, status: 'Complete', completedDate: '2026-08-02' } : m));
      }
      return updated;
    }));
    const taskName = tasks.find(t => t.id === id)?.name || '';
    handleLogOperationsFeed(`Updated task "${taskName}" to ${progress}% (${status}).`, 'task_update', 'info');
    if (isAuthenticated) {
      updateTaskProgressMutation.mutate({ id, progress, status, notes });
    }
  }, [tasks, handleLogOperationsFeed, isAuthenticated, updateTaskProgressMutation]);

  const handleDeleteTask = useCallback((id: string) => {
    const taskName = tasks.find(t => t.id === id)?.name || '';
    setTasks(prev => prev.filter(t => t.id !== id));
    handleLogOperationsFeed(`Removed task from ledger: "${taskName}".`, 'task_update', 'warning');
    if (isAuthenticated) {
      deleteTaskMutation.mutate(id);
    }
  }, [tasks, handleLogOperationsFeed, isAuthenticated, deleteTaskMutation]);

  const handleAddInvoice = useCallback((newInv: Omit<Invoice, 'id'>) => {
    const nextId = `INV-${1001 + invoices.length}`;
    const invObj: Invoice = { ...newInv, id: nextId };
    setInvoices(prev => [invObj, ...prev]);
    handleLogOperationsFeed(`Logged Invoice ${nextId} from ${newInv.vendor} for ${formatINR(newInv.amount)}.`, 'financial', 'info');
    if (isAuthenticated) {
      createInvoiceMutation.mutate(newInv);
    }
  }, [invoices.length, handleLogOperationsFeed, isAuthenticated, createInvoiceMutation]);

  const handleUpdateInvoiceStatus = useCallback((id: string, status: Invoice['status']) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      handleLogOperationsFeed(`Invoice ${id} updated to ${status} for ${inv.vendor}.`, 'financial', status === 'Approved' || status === 'Paid' ? 'success' : 'warning');
    }
    if (isAuthenticated) {
      updateInvoiceStatusMutation.mutate({ id, status });
    }
  }, [invoices, handleLogOperationsFeed, isAuthenticated, updateInvoiceStatusMutation]);

  const handleAddIncident = useCallback((newInc: Omit<SafetyIncident, 'id'>) => {
    const nextId = `INC-${201 + incidents.length}`;
    const incObj: SafetyIncident = { ...newInc, id: nextId };
    setIncidents(prev => [incObj, ...prev]);
    if (newInc.type === 'Lost-Time') {
      handleLogOperationsFeed('⚠ CRITICAL: Lost-Time safety incident reported. Safety days reset.', 'safety', 'alert');
    } else {
      handleLogOperationsFeed(`Logged safety case ${nextId}: "${newInc.description}".`, 'safety', 'warning');
    }
    if (isAuthenticated) {
      createIncidentMutation.mutate(newInc);
    }
  }, [incidents.length, handleLogOperationsFeed, isAuthenticated, createIncidentMutation]);

  const handleResolveIncident = useCallback((id: string, actionTaken: string) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'Resolved', actionTaken } : inc));
    handleLogOperationsFeed(`Safety Case ${id} resolved: "${actionTaken}".`, 'safety', 'success');
    if (isAuthenticated) {
      resolveIncidentMutation.mutate({ id, actionTaken });
    }
  }, [handleLogOperationsFeed, isAuthenticated, resolveIncidentMutation]);

  const handleAddPunchItem = useCallback((newItem: Omit<PunchItem, 'id'>) => {
    const nextId = `P-${101 + punchItems.length}`;
    const itemObj: PunchItem = { ...newItem, id: nextId };
    setPunchItems(prev => [itemObj, ...prev]);
    handleLogOperationsFeed(`Logged QA/QC Defect ${nextId}: "${newItem.item}" at ${newItem.location}.`, 'general', 'warning');
    if (isAuthenticated) {
      createPunchItemMutation.mutate(newItem);
    }
  }, [punchItems.length, handleLogOperationsFeed, isAuthenticated, createPunchItemMutation]);

  const handleUpdatePunchStatus = useCallback((id: string, status: PunchItem['status'], notes?: string) => {
    setPunchItems(prev => prev.map(p => p.id === id ? { ...p, status, resolutionNotes: notes || p.resolutionNotes } : p));
    handleLogOperationsFeed(`QA/QC Defect ${id} updated to ${status}.`, 'general', status === 'Closed' ? 'success' : 'info');
    if (isAuthenticated) {
      updatePunchStatusMutation.mutate({ id, status, resolutionNotes: notes });
    }
  }, [handleLogOperationsFeed, isAuthenticated, updatePunchStatusMutation]);

  const handleImportState = useCallback((imported: Partial<ProjectState>) => {
    if (imported.tasks)      setTasks(imported.tasks);
    if (imported.invoices)   setInvoices(imported.invoices);
    if (imported.incidents)  setIncidents(imported.incidents);
    if (imported.logs)       setLogs(imported.logs);
    if (imported.punchItems) setPunchItems(imported.punchItems);
    if (imported.weather)    setWeather(imported.weather);
    handleLogOperationsFeed('Imported backup snapshot into live workspace.', 'general', 'success');
  }, [handleLogOperationsFeed]);

  const handleResetToDefaults = useCallback(() => {
    localStorage.clear();
    setTasks(INITIAL_TASKS);
    setInvoices(INITIAL_INVOICES);
    setIncidents(INITIAL_INCIDENTS);
    setMilestones(INITIAL_MILESTONES);
    setRisks(INITIAL_RISKS);
    setPunchItems(INITIAL_PUNCH_ITEMS);
    setLogs(INITIAL_LOGS);
    handleLogOperationsFeed('Reset workspace database to factory initial state.', 'general', 'warning');
  }, [handleLogOperationsFeed]);

  const handleTriggerEvent = useCallback((eventKey: string) => {
    if (eventKey === 'WIND_HAZARD') {
      setWeather(prev => ({ ...prev, wind: 24, condition: 'Stormy Winds', temp: 73 }));
      handleLogOperationsFeed('⚠ Site Wind Sensor alert: High wind gusts (24mph) exceeded safety thresholds. Tower crane halted.', 'weather', 'alert');
    } else if (eventKey === 'SAFETY_ACCIDENT') {
      handleAddIncident({ date: '2026-08-02', severity: 'Severe', type: 'Lost-Time', description: 'Scaffolding plank joint Level 4 loose slip. Safety lines caught worker safely. Safety days reset.', status: 'Open' });
    } else if (eventKey === 'FRAMING_PROGRESS') {
      handleUpdateTaskProgress('T3', 80, 'In Progress', 'Concrete deck pours Level 4 completed successfully.');
    } else if (eventKey === 'HEAT_HYDRATION') {
      handleLogOperationsFeed('Daily temperature reached 84°F. Mandated hydration rest shift shade cooling zones triggered.', 'safety', 'info');
    }
  }, [handleLogOperationsFeed, handleAddIncident, handleUpdateTaskProgress]);

  // ── Computed CPI for header display ───────────────────────────────────────
  const headerCpi = apiProject?.evmMetrics?.cpi != null
    ? apiProject.evmMetrics.cpi.toFixed(2)
    : '1.08';

  // ── Loading / Auth gate ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#1A1A1A] flex items-center justify-center shadow-md animate-pulse">
            <HardHat className="w-6 h-6 text-[#C5A059]" />
          </div>
          <div className="text-[#7A756C] font-mono text-xs uppercase tracking-widest animate-pulse">
            Verifying session…
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // ── Main App ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#C5A059]/20" id="application-container">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-[#C5A059]/10 border-b border-[#C5A059]/30 px-4 py-2 flex items-center gap-2 text-[11px] font-mono text-[#8C6D23]">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>API unavailable — displaying cached data. Changes will be queued when connectivity is restored.</span>
        </div>
      )}

      {/* Top Professional Banner */}
      <header className="border-b border-[#D1CEC6] bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm" id="main-header">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 border border-[#1A1A1A] bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center font-sans text-sm font-bold shadow-sm">
              <HardHat className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <h1 className="text-[#1A1A1A] text-sm font-bold tracking-tight font-sans uppercase flex items-center gap-2">
                <span>ConstructIQ</span>
                <span className="text-[9px] bg-[#C5A059]/20 text-[#8C6D23] px-1.5 py-0.5 rounded font-mono font-bold">ENTERPRISE</span>
              </h1>
              <p className="text-[10px] text-[#7A756C] font-sans uppercase tracking-[0.1em]">Real-Time Construction Ops & Telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 2-in-1 Dual Dashboard Switcher */}
            <div className="flex items-center bg-[#F4F1EA] p-1 border border-[#D1CEC6] shadow-xs">
              <button
                onClick={() => handleSetDashboardMode('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  dashboardMode === 'admin'
                    ? 'bg-[#1A1A1A] text-white shadow-xs'
                    : 'text-[#7A756C] hover:text-[#1A1A1A]'
                }`}
                id="btn-switch-admin"
                title="Switch to Admin & Management Console"
              >
                <Shield className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>1. Admin</span>
              </button>
              <button
                onClick={() => handleSetDashboardMode('employee')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  dashboardMode === 'employee'
                    ? 'bg-[#1A1A1A] text-white shadow-xs'
                    : 'text-[#7A756C] hover:text-[#1A1A1A]'
                }`}
                id="btn-switch-employee"
                title="Switch to Employee & Field Crew Portal"
              >
                <HardHat className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>2. Employees</span>
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-4 font-sans text-[10px] tracking-wider uppercase text-[#7A756C]">
              <div className="flex items-center gap-1.5 bg-[#E5E2D9]/40 px-2.5 py-1 rounded-sm border border-[#D1CEC6]">
                <Sun className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span className="text-[#1A1A1A] font-semibold">{weather.temp}°F</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#E5E2D9]/40 px-2.5 py-1 rounded-sm border border-[#D1CEC6]">
                <Wind className="w-3.5 h-3.5 text-[#A89F91] shrink-0" />
                <span className="text-[#1A1A1A] font-semibold">{weather.wind} mph</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#E5E2D9]/40 px-2.5 py-1 rounded-sm border border-[#D1CEC6]">
                <span>CPI: <span className="text-[#2E7D32] font-bold">{headerCpi}</span></span>
              </div>
            </div>

            <button
              onClick={() => setIsCopilotOpen(true)}
              className="bg-[#C5A059] hover:bg-[#B38F48] text-[#1A1A1A] px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              title="Open ConstructIQ AI Copilot"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            <button
              onClick={() => setIsReportOpen(true)}
              className="bg-white hover:bg-slate-100 text-[#1A1A1A] border border-[#D1CEC6] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Print Executive Performance Dossier"
            >
              <FileText className="w-3.5 h-3.5 text-[#7A756C]" />
              <span className="hidden sm:inline">Dossier</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="bg-white hover:bg-slate-100 text-[#7A756C] hover:text-[#1A1A1A] border border-[#D1CEC6] p-1.5 rounded-sm cursor-pointer transition-colors"
              title="Project Data & Backups"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logout */}
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="bg-white hover:bg-slate-100 text-[#7A756C] hover:text-[#B71C1C] border border-[#D1CEC6] p-1.5 rounded-sm cursor-pointer transition-colors"
              title={`Signed in as ${user?.name} (${user?.role}) — click to sign out`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 w-full" id="main-content-layout">
        {dashboardMode === 'employee' ? (
          <EmployeeDashboard
            tasks={tasks}
            punchItems={punchItems}
            incidents={incidents}
            weather={weather}
            craneHaltActive={apiProject?.isCraneHalted}
            onUpdateTaskProgress={handleUpdateTaskProgress}
            onAddIncident={handleAddIncident}
            onAddPunchItem={handleAddPunchItem}
            onUpdatePunchStatus={handleUpdatePunchStatus}
            onLogOperationsFeed={handleLogOperationsFeed}
            currentUser={user}
            onSwitchToAdmin={() => handleSetDashboardMode('admin')}
          />
        ) : (
          <>
            <RoleViewSelector currentRole={currentRole} onRoleChange={setCurrentRole} />

            <MetricCard
              tasks={tasks}
              invoices={invoices}
              incidents={incidents}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              evmMetrics={apiProject?.evmMetrics}
              safetyDaysStreak={apiProject?.safetyStreak}
              projectBudget={apiProject?.budgetInr}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full" id="bento-grid-dashboard">
              <section className="lg:col-span-3 flex flex-col gap-6" id="workspace-views-routers">
                {/* Navigation Tabs */}
                <div className="flex border-b border-[#D1CEC6] overflow-x-auto whitespace-nowrap scrollbar-none gap-2" id="nav-tabs">
                  {[
                    { id: 'overview',    label: 'Site Overview' },
                    { id: 'schedule',   label: 'Gantt Scheduler' },
                    { id: 'budget',     label: 'Budget & Financials (INR)' },
                    { id: 'workforce',  label: 'Workforce & Trades' },
                    { id: 'safety',     label: 'Safety & Compliance' },
                    { id: 'punchlist',  label: 'QA / Punch List' },
                    { id: 'supervisor', label: 'Field Operations' },
                    { id: 'executive',  label: 'Executive Portfolio' },
                  ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-4 text-[10px] uppercase tracking-wider font-semibold cursor-pointer transition-all border-b-2 font-sans ${
                          isActive ? 'border-[#C5A059] text-[#1A1A1A] font-bold' : 'border-transparent text-[#7A756C] hover:text-[#1A1A1A]'
                        }`}
                        id={`tab-btn-${tab.id}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="animate-fade-in" id="workspace-view-content">
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-6" id="overview-tab-content">
                  <div className="bg-white border border-[#D1CEC6] p-8 flex flex-col justify-between relative shadow-sm" id="overview-banner">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C5A059]" />
                    <div className="pl-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-[#C5A059]" />
                        <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#7A756C]">Executive Dispatch // Site Health</span>
                      </div>
                      <h2 className="text-[#1A1A1A] text-2xl font-sans font-bold tracking-tight mb-3">Construction Operations Registry</h2>
                      <p className="text-[#4A4740] text-sm font-sans leading-relaxed italic max-w-4xl">
                        "The 5-story mixed-use commercial tower is currently operating at{' '}
                        <span className="text-[#1A1A1A] font-bold font-sans not-italic text-xs bg-[#E5E2D9] px-1.5 py-0.5 rounded">67% physical completion rate</span>.
                        Structural steel frameworks have successfully reached Level 4 decks, while interior rough-in plumbing and electrical works progress steadily."
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8 pl-4">
                      <div className="p-4 bg-[#F4F1EA] border border-[#D1CEC6]">
                        <span className="font-sans text-[9px] uppercase tracking-widest text-[#7A756C] block mb-2">METEOROLOGY</span>
                        <div className="flex items-center gap-2">
                          <CloudRain className="w-4 h-4 text-[#A89F91] shrink-0" />
                          <span className="text-[#1A1A1A] font-sans font-bold text-sm italic">{weather.condition}</span>
                        </div>
                        <p className="text-[#7A756C] text-[10px] font-sans mt-1.5">{weather.temp}°F // Wind: {weather.wind}mph</p>
                      </div>
                      <div className="p-4 bg-[#F4F1EA] border border-[#D1CEC6]">
                        <span className="font-sans text-[9px] uppercase tracking-widest text-[#7A756C] block mb-2">SUBCONTRACTOR REGISTRY</span>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#2E7D32] shrink-0" />
                          <span className="text-[#1A1A1A] font-sans font-bold text-sm italic">42 Active On Site</span>
                        </div>
                        <p className="text-[#7A756C] text-[10px] font-sans mt-1.5">100% EHS compliant</p>
                      </div>
                      <div className="p-4 bg-[#F4F1EA] border border-[#D1CEC6]">
                        <span className="font-sans text-[9px] uppercase tracking-widest text-[#7A756C] block mb-2">INR SPEND YTD</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#1A1A1A] font-sans font-bold text-sm italic">
                            {formatINR(invoices.filter(i => i.status === 'Paid' || i.status === 'Approved').reduce((a, b) => a + b.amount, 0))}
                          </span>
                        </div>
                        <p className="text-[#2E7D32] text-[10px] font-sans font-semibold mt-1.5">CPI: {headerCpi} (Under Budget)</p>
                      </div>
                      <div className="p-4 bg-[#F4F1EA] border border-[#D1CEC6]">
                        <span className="font-sans text-[9px] uppercase tracking-widest text-[#7A756C] block mb-2">PROJECTED MILESTONE</span>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#C5A059] shrink-0" />
                          <span className="text-[#1A1A1A] font-sans font-bold text-sm italic">Rough-In Signoff</span>
                        </div>
                        <p className="text-[#C5A059] text-[10px] font-sans font-semibold mt-1.5">Target: Aug 15 // On Track</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#D1CEC6] overflow-hidden shadow-sm" id="summary-tasks-ledger">
                    <div className="p-5 border-b border-[#D1CEC6] bg-[#F4F1EA] flex items-center justify-between">
                      <h3 className="text-[#1A1A1A] font-sans font-bold text-sm italic">Core Scheduled Operations Ledger</h3>
                      <button onClick={() => setActiveTab('schedule')} className="text-[#C5A059] hover:text-[#1A1A1A] text-[10px] font-sans uppercase tracking-widest font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                        <span>View Gantt Chronology</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#D1CEC6] bg-[#E5E2D9]/30 text-[#7A756C] font-sans uppercase tracking-widest text-[9px]">
                            <th className="p-4 pl-6">Operation / Task</th>
                            <th className="p-4">Phase</th>
                            <th className="p-4 text-center">Priority</th>
                            <th className="p-4">Completion Status</th>
                            <th className="p-4 pl-4">Assigned Crew</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D1CEC6]">
                          {tasks.slice(0, 5).map(task => (
                            <tr key={task.id} className="hover:bg-[#F4F1EA]/30 transition-all">
                              <td className="p-4 pl-6 font-sans font-bold text-[#1A1A1A]">{task.name}</td>
                              <td className="p-4 text-[#7A756C] font-sans text-[10px] uppercase tracking-wider">{task.phase}</td>
                              <td className="p-4 text-center">
                                <span className="bg-[#E5E2D9] text-[#1A1A1A] border border-[#D1CEC6] px-2.5 py-0.5 rounded-sm font-sans text-[9px] uppercase font-bold tracking-wider">{task.priority}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-[#1A1A1A] font-sans font-bold text-sm italic">{task.progress}%</span>
                                  <div className="w-16 bg-[#E5E2D9] h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-[#C5A059] h-full rounded-full" style={{ width: `${task.progress}%` }} />
                                  </div>
                                  <span className="text-[#7A756C] font-sans text-[9px] uppercase tracking-wider">{task.status}</span>
                                </div>
                              </td>
                              <td className="p-4 text-[#4A4740] font-sans italic pl-4">{task.assignedCrew}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <GanttChart tasks={tasks} onAddTask={handleAddTask} onUpdateTaskProgress={handleUpdateTaskProgress} onDeleteTask={handleDeleteTask} userRole={currentRole} />
              )}

              {activeTab === 'budget' && (
                <FinancialView invoices={invoices} onAddInvoice={handleAddInvoice} onUpdateInvoiceStatus={handleUpdateInvoiceStatus} userRole={currentRole} />
              )}

              {activeTab === 'workforce' && (
                <AdminWorkforceView tasks={tasks} onLogOperationsFeed={handleLogOperationsFeed} />
              )}

              {activeTab === 'safety' && (
                <SafetyView incidents={incidents} onAddIncident={handleAddIncident} onResolveIncident={handleResolveIncident} userRole={currentRole} />
              )}

              {activeTab === 'punchlist' && (
                <PunchlistView punchItems={punchItems} onAddPunchItem={handleAddPunchItem} onUpdatePunchStatus={handleUpdatePunchStatus} userRole={currentRole} />
              )}

              {activeTab === 'supervisor' && (
                <SupervisorView tasks={tasks} logs={logs} onUpdateTaskProgress={handleUpdateTaskProgress} onLogOperationsFeed={handleLogOperationsFeed} userRole={currentRole} />
              )}

              {activeTab === 'executive' && (
                <ExecutiveView tasks={tasks} invoices={invoices} incidents={incidents} risks={risks} milestones={milestones} userRole={currentRole} />
              )}
            </div>
          </section>

          <aside className="col-span-1 flex flex-col h-full" id="aside-simulator">
            <SimulatorControl logs={logs} simulationSpeed={simulationSpeed} onSpeedChange={setSimulationSpeed} onTriggerEvent={handleTriggerEvent} />
          </aside>
        </div>
      </>
    )}
  </main>

      {/* Floating AI Copilot */}
      <button
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-6 right-6 bg-[#1A1A1A] hover:bg-[#333] text-white border-2 border-[#C5A059] p-3.5 rounded-full shadow-2xl z-40 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        title="Open ConstructIQ AI Copilot"
      >
        <Sparkles className="w-5 h-5 text-[#C5A059]" />
        <span className="text-xs font-bold uppercase tracking-wider pr-1 hidden sm:inline">Copilot AI</span>
      </button>

      <AICopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} state={{ tasks, invoices, incidents, logs, weather }} userRole={currentRole} />

      <ExecutiveReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} tasks={tasks} invoices={invoices} incidents={incidents} risks={risks} milestones={milestones} punchItems={punchItems} weather={weather} />

      <ProjectSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} state={{ tasks, invoices, incidents, logs, risks, milestones, punchItems, weather, simulationSpeed }} onImportState={handleImportState} onResetToDefaults={handleResetToDefaults} />

      <footer className="border-t border-[#D1CEC6] bg-white mt-12 py-8 text-center text-xs text-[#7A756C] font-sans" id="main-footer">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.2em] font-bold">
            <span className="text-[#1A1A1A]">CONSTRUCTIQ</span>
            <span className="text-[#D1CEC6]">//</span>
            <span className="text-[#1A1A1A]">VOL. IV</span>
            <span className="text-[#D1CEC6]">//</span>
            <span>EST. 2026</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider">All Rights Reserved // Vantage Registry Group // ISO 9001 Audited</p>
          <div className="flex gap-4 text-[10px] uppercase tracking-wider">
            <span className="text-[#C5A059] font-bold">DURABLE SECURE STORE</span>
            <span>Uptime: 99.98%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
