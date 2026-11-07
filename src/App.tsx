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
  Sparkles, FileText, Settings, ShieldAlert, LogOut, WifiOff,
  Shield, HardHat, Users, LayoutDashboard, CalendarDays,
  Receipt, CheckSquare, TrendingUp, Sliders, X, Menu,
  Building2, ChevronRight, AlertTriangle
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

  // Modals & Panels
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulatorDrawerOpen, setIsSimulatorDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
  }, [simulationSpeed, simulationIndex, tasks, invoices, incidents, logs, risks, milestones, punchItems, weather]);

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
    toast(`Updated "${taskName}" to ${progress}%`, 'info');
    if (isAuthenticated) {
      updateTaskProgressMutation.mutate({ id, progress, status, notes });
    }
  }, [tasks, handleLogOperationsFeed, isAuthenticated, updateTaskProgressMutation, toast]);

  const handleDeleteTask = useCallback((id: string) => {
    const taskName = tasks.find(t => t.id === id)?.name || '';
    setTasks(prev => prev.filter(t => t.id !== id));
    handleLogOperationsFeed(`Removed task from ledger: "${taskName}".`, 'task_update', 'warning');
    toast(`Deleted task "${taskName}"`, 'info');
    if (isAuthenticated) {
      deleteTaskMutation.mutate(id);
    }
  }, [tasks, handleLogOperationsFeed, isAuthenticated, deleteTaskMutation, toast]);

  const handleAddInvoice = useCallback((newInv: Omit<Invoice, 'id'>) => {
    const nextId = `INV-${1001 + invoices.length}`;
    const invObj: Invoice = { ...newInv, id: nextId };
    setInvoices(prev => [invObj, ...prev]);
    handleLogOperationsFeed(`Logged Invoice ${nextId} from ${newInv.vendor} for ${formatINR(newInv.amount)}.`, 'financial', 'info');
    toast(`Invoice ${nextId} created for ${newInv.vendor}`, 'success');
    if (isAuthenticated) {
      createInvoiceMutation.mutate(newInv);
    }
  }, [invoices.length, handleLogOperationsFeed, isAuthenticated, createInvoiceMutation, toast]);

  const handleUpdateInvoiceStatus = useCallback((id: string, status: Invoice['status']) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      handleLogOperationsFeed(`Invoice ${id} updated to ${status} for ${inv.vendor}.`, 'financial', status === 'Approved' || status === 'Paid' ? 'success' : 'warning');
      toast(`Invoice ${id} marked as ${status}`, status === 'Approved' || status === 'Paid' ? 'success' : 'info');
    }
    if (isAuthenticated) {
      updateInvoiceStatusMutation.mutate({ id, status });
    }
  }, [invoices, handleLogOperationsFeed, isAuthenticated, updateInvoiceStatusMutation, toast]);

  const handleAddIncident = useCallback((newInc: Omit<SafetyIncident, 'id'>) => {
    const nextId = `INC-${201 + incidents.length}`;
    const incObj: SafetyIncident = { ...newInc, id: nextId };
    setIncidents(prev => [incObj, ...prev]);
    if (newInc.type === 'Lost-Time') {
      handleLogOperationsFeed('⚠ CRITICAL: Lost-Time safety incident reported. Safety days reset.', 'safety', 'alert');
      toast('CRITICAL: Lost-Time Safety Incident Logged', 'error');
    } else {
      handleLogOperationsFeed(`Logged safety case ${nextId}: "${newInc.description}".`, 'safety', 'warning');
      toast(`Safety case ${nextId} logged`, 'info');
    }
    if (isAuthenticated) {
      createIncidentMutation.mutate(newInc);
    }
  }, [incidents.length, handleLogOperationsFeed, isAuthenticated, createIncidentMutation, toast]);

  const handleResolveIncident = useCallback((id: string, actionTaken: string) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'Resolved', actionTaken } : inc));
    handleLogOperationsFeed(`Safety Case ${id} resolved: "${actionTaken}".`, 'safety', 'success');
    toast(`Incident ${id} resolved`, 'success');
    if (isAuthenticated) {
      resolveIncidentMutation.mutate({ id, actionTaken });
    }
  }, [handleLogOperationsFeed, isAuthenticated, resolveIncidentMutation, toast]);

  const handleAddPunchItem = useCallback((newItem: Omit<PunchItem, 'id'>) => {
    const nextId = `P-${101 + punchItems.length}`;
    const itemObj: PunchItem = { ...newItem, id: nextId };
    setPunchItems(prev => [itemObj, ...prev]);
    handleLogOperationsFeed(`Logged QA/QC Defect ${nextId}: "${newItem.item}" at ${newItem.location}.`, 'general', 'warning');
    toast(`Defect ${nextId} recorded`, 'info');
    if (isAuthenticated) {
      createPunchItemMutation.mutate(newItem);
    }
  }, [punchItems.length, handleLogOperationsFeed, isAuthenticated, createPunchItemMutation, toast]);

  const handleUpdatePunchStatus = useCallback((id: string, status: PunchItem['status'], notes?: string) => {
    setPunchItems(prev => prev.map(p => p.id === id ? { ...p, status, resolutionNotes: notes || p.resolutionNotes } : p));
    handleLogOperationsFeed(`QA/QC Defect ${id} updated to ${status}.`, 'general', status === 'Closed' ? 'success' : 'info');
    toast(`Defect ${id} marked ${status}`, status === 'Closed' ? 'success' : 'info');
    if (isAuthenticated) {
      updatePunchStatusMutation.mutate({ id, status, resolutionNotes: notes });
    }
  }, [handleLogOperationsFeed, isAuthenticated, updatePunchStatusMutation, toast]);

  const handleImportState = useCallback((imported: Partial<ProjectState>) => {
    if (imported.tasks)      setTasks(imported.tasks);
    if (imported.invoices)   setInvoices(imported.invoices);
    if (imported.incidents)  setIncidents(imported.incidents);
    if (imported.logs)       setLogs(imported.logs);
    if (imported.punchItems) setPunchItems(imported.punchItems);
    if (imported.weather)    setWeather(imported.weather);
    handleLogOperationsFeed('Imported backup snapshot into live workspace.', 'general', 'success');
    toast('Workspace backup snapshot restored', 'success');
  }, [handleLogOperationsFeed, toast]);

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
    toast('Workspace reset to initial baseline', 'info');
  }, [handleLogOperationsFeed, toast]);

  const handleTriggerEvent = useCallback((eventKey: string) => {
    if (eventKey === 'WIND_HAZARD') {
      setWeather(prev => ({ ...prev, wind: 24, condition: 'Stormy Winds', temp: 73 }));
      handleLogOperationsFeed('⚠ Site Wind Sensor alert: High wind gusts (24mph) exceeded safety thresholds. Tower crane halted.', 'weather', 'alert');
      toast('Crane Halted: High Wind Warning (>20mph)', 'error');
    } else if (eventKey === 'SAFETY_ACCIDENT') {
      handleAddIncident({ date: '2026-08-02', severity: 'Severe', type: 'Lost-Time', description: 'Scaffolding plank joint Level 4 loose slip. Safety lines caught worker safely. Safety days reset.', status: 'Open' });
    } else if (eventKey === 'FRAMING_PROGRESS') {
      handleUpdateTaskProgress('T3', 80, 'In Progress', 'Concrete deck pours Level 4 completed successfully.');
    } else if (eventKey === 'HEAT_HYDRATION') {
      handleLogOperationsFeed('Daily temperature reached 84°F. Mandated hydration rest shift shade cooling zones triggered.', 'safety', 'info');
      toast('Heat Advisory: Mandatory Hydration Breaks', 'info');
    }
  }, [handleLogOperationsFeed, handleAddIncident, handleUpdateTaskProgress, toast]);

  // ── Computed CPI for header display ───────────────────────────────────────
  const headerCpi = apiProject?.evmMetrics?.cpi != null
    ? apiProject.evmMetrics.cpi.toFixed(2)
    : '1.08';

  // Navigation Items
  const NAV_ITEMS = [
    { id: 'overview',   label: 'Site Overview',        icon: LayoutDashboard, section: 'Operations' },
    { id: 'schedule',   label: 'Gantt Scheduler',     icon: CalendarDays,    section: 'Operations' },
    { id: 'punchlist',  label: 'QA / Punch List',      icon: CheckSquare,     section: 'Operations' },
    { id: 'supervisor', label: 'Field Operations',     icon: HardHat,         section: 'Operations' },
    { id: 'budget',     label: 'Budget & Financials',  icon: Receipt,         section: 'Management' },
    { id: 'workforce',  label: 'Workforce & Trades',   icon: Users,           section: 'Management' },
    { id: 'safety',     label: 'Safety & Compliance',  icon: ShieldAlert,     section: 'Management' },
    { id: 'executive',  label: 'Executive Portfolio',  icon: TrendingUp,      section: 'Management' },
  ];

  // ── Loading / Auth gate ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-md animate-pulse">
            <HardHat className="w-6 h-6 text-amber-500" />
          </div>
          <div className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
            Verifying session…
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // ── Main App Shell ────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50 text-slate-900 font-sans" id="application-container">
      {/* Offline banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-semibold shadow-sm">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>API connection lost — running in local offline mode. Data is cached.</span>
        </div>
      )}

      {/* ── Left Sidebar (Desktop) ─────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md text-slate-950">
              <HardHat className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base font-sans">Construct<span className="text-amber-500">IQ</span></span>
                <span className="text-[10px] bg-slate-800 text-amber-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">v0.1</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Autonomous Site Ops</p>
            </div>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Selector Card */}
        <div className="p-3.5 m-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-amber-500" />
              Active Project
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Site Online" />
          </div>
          <p className="text-white font-semibold text-xs truncate">Skyline Metro Tower</p>
          <p className="text-[11px] text-slate-400">Phase 2 • 67% Completed</p>
        </div>

        {/* Portal Mode Switcher */}
        <div className="px-3 mb-2">
          <div className="bg-slate-800/90 p-1 rounded-lg border border-slate-700 flex text-xs">
            <button
              onClick={() => handleSetDashboardMode('admin')}
              className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                dashboardMode === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => handleSetDashboardMode('employee')}
              className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                dashboardMode === 'employee'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>Crew</span>
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-none">
          {dashboardMode === 'admin' ? (
            <>
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Operations</p>
                <div className="space-y-1">
                  {NAV_ITEMS.filter(item => item.section === 'Operations').map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/15 text-amber-400 font-semibold border-l-3 border-amber-500'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Management</p>
                <div className="space-y-1">
                  {NAV_ITEMS.filter(item => item.section === 'Management').map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/15 text-amber-400 font-semibold border-l-3 border-amber-500'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Intelligence & Tools</p>
                <div className="space-y-1">
                  <button
                    onClick={() => setIsCopilotOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>AI Site Copilot</span>
                    <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">NIM</span>
                  </button>
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Executive Dossier</span>
                  </button>
                  <button
                    onClick={() => setIsSimulatorDrawerOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-slate-400" />
                    <span>Simulation & Feeds</span>
                    {simulationSpeed !== 'paused' && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Field Crew Mode</p>
              <div className="p-3 bg-slate-800/60 rounded-lg text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-white">Direct Field Operations</p>
                <p className="text-[11px] text-slate-400">Shift clock-in, punch inspection, safety cases, and crane telemetry.</p>
              </div>
            </div>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.role || 'Staff'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              title="Project Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => logoutMutation.mutate()}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ── Main Viewport ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/90 px-4 lg:px-6 py-3 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="hidden sm:inline">Skyline Metro Tower</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
              <span className="text-slate-900 font-semibold capitalize">
                {dashboardMode === 'employee' ? 'Employee & Field Crew Portal' : activeTab.replace(/([A-Z])/g, ' $1')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Weather & Site Metrics Widget */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 border border-slate-200/80">
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-slate-800">{weather.temp}°F</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-slate-400" />
                <span>{weather.wind} mph</span>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span>CPI: <strong className="text-emerald-700">{headerCpi}</strong></span>
              </div>
            </div>

            {/* Simulation trigger button */}
            <button
              onClick={() => setIsSimulatorDrawerOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors border border-slate-200"
              title="Open Operations Simulator"
            >
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulation</span>
            </button>

            {/* AI Copilot shortcut button */}
            <button
              onClick={() => setIsCopilotOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copilot AI</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 max-w-7xl mx-auto w-full">
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
              {/* Stakeholder View Perspective Bar */}
              <RoleViewSelector currentRole={currentRole} onRoleChange={setCurrentRole} />

              {/* Modern KPI Metric Cards */}
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

              {/* Active Tab Viewport */}
              <div className="w-full">
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-fade-in" id="overview-tab-content">
                    {/* Executive Dispatch Banner */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden" id="overview-banner">
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500" />
                      <div className="pl-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-amber-500" />
                          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Site Telemetry Dispatch</span>
                        </div>
                        <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-2">
                          Operations Command & Health
                        </h2>
                        <p className="text-slate-600 text-sm leading-relaxed max-w-4xl">
                          The 5-story mixed-use commercial tower is currently operating at{' '}
                          <span className="font-semibold text-slate-900 bg-amber-50 px-2 py-0.5 rounded text-xs border border-amber-200/80">
                            67% physical milestone completion
                          </span>.
                          Structural steel frameworks have reached Level 4 decks, while MEP interior rough-ins progress on schedule.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Meteorology</span>
                            <div className="flex items-center gap-2">
                              <CloudRain className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="text-slate-900 font-bold text-sm">{weather.condition}</span>
                            </div>
                            <p className="text-slate-500 text-xs mt-1">{weather.temp}°F • Wind: {weather.wind} mph</p>
                          </div>

                          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Workforce Registry</span>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-slate-900 font-bold text-sm">42 Active Crews</span>
                            </div>
                            <p className="text-emerald-700 font-medium text-xs mt-1">100% EHS Compliant</p>
                          </div>

                          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">INR Spend YTD</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 font-bold text-sm">
                                {formatINR(invoices.filter(i => i.status === 'Paid' || i.status === 'Approved').reduce((a, b) => a + b.amount, 0))}
                              </span>
                            </div>
                            <p className="text-emerald-700 font-medium text-xs mt-1">CPI: {headerCpi} (Under Budget)</p>
                          </div>

                          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Target Milestone</span>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="text-slate-900 font-bold text-sm">Rough-In Signoff</span>
                            </div>
                            <p className="text-amber-800 font-medium text-xs mt-1">Target: Aug 15 • On Track</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Core Scheduled Tasks Ledger */}
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden" id="summary-tasks-ledger">
                      <div className="p-4 px-6 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 font-bold text-sm">Core Scheduled Operations</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Live status from critical path schedule ledger</p>
                        </div>
                        <button
                          onClick={() => setActiveTab('schedule')}
                          className="text-amber-600 hover:text-amber-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Full Gantt View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200/80 bg-slate-50/40 text-slate-500 font-semibold text-[11px]">
                              <th className="p-3.5 pl-6">Operation / Task</th>
                              <th className="p-3.5">Phase</th>
                              <th className="p-3.5 text-center">Priority</th>
                              <th className="p-3.5">Completion Status</th>
                              <th className="p-3.5 pl-4">Assigned Crew</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tasks.slice(0, 5).map(task => (
                              <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3.5 pl-6 font-semibold text-slate-900">{task.name}</td>
                                <td className="p-3.5 text-slate-500">{task.phase}</td>
                                <td className="p-3.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    task.priority === 'Critical' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-900 w-8">{task.progress}%</span>
                                    <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${task.progress}%` }} />
                                    </div>
                                    <span className="text-slate-500 text-[11px]">{task.status}</span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-slate-600 pl-4">{task.assignedCrew}</td>
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
            </>
          )}
        </main>
      </div>

      {/* ── Slide-over Simulator & Operations Feed Drawer ─────────────────── */}
      {isSimulatorDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm">Site Telemetry & Hazard Simulator</h3>
              </div>
              <button
                onClick={() => setIsSimulatorDrawerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SimulatorControl
                logs={logs}
                simulationSpeed={simulationSpeed}
                onSpeedChange={setSimulationSpeed}
                onTriggerEvent={handleTriggerEvent}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        state={{ tasks, invoices, incidents, logs, weather }}
        userRole={currentRole}
      />

      {/* Executive Report Modal */}
      <ExecutiveReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        tasks={tasks}
        invoices={invoices}
        incidents={incidents}
        risks={risks}
        milestones={milestones}
        punchItems={punchItems}
        weather={weather}
      />

      {/* Project Settings Modal */}
      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={{ tasks, invoices, incidents, logs, risks, milestones, punchItems, weather, simulationSpeed }}
        onImportState={handleImportState}
        onResetToDefaults={handleResetToDefaults}
      />
    </div>
  );
}
