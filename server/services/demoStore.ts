/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * In-Memory Demo Data Store for ConstructIQ
 * Provides reliable high-performance data storage for demo mode and offline local operation
 * when PostgreSQL is not running. Automatically synchronizes with EVM and CPM domain engines.
 */

import { calculateEVM, EvmMetrics } from './evm.js';
import { calculateCPM, CpmScheduleResult, validateNoCycles } from './cpm.js';
import { calculateSafetyStreak, countOpenIncidents } from './safety.js';
import { getCachedWeather } from './weather.js';

const USD_TO_INR = 83;
const usdToInr = (usd: number) => usd * USD_TO_INR;

export interface DemoTask {
  id: string;
  projectId: string;
  name: string;
  phase: 'Excavation' | 'Foundation' | 'Framing' | 'HVAC/Electrical' | 'Finishing' | 'Exterior';
  startDate: string;
  endDate: string;
  progress: number;
  assignedCrew: string;
  dependencies: string[]; // task IDs
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Not Started' | 'In Progress' | 'Complete' | 'Delayed';
  budgetedCostInr: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemoInvoice {
  id: string;
  projectId: string;
  number: string;
  vendor: string;
  category: 'Labor' | 'Materials' | 'Equipment' | 'Subcontractors';
  amount: number;
  amountInr: number;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
  date: string;
  invoiceDate: string;
  description: string;
  createdAt: string;
}

export interface DemoIncident {
  id: string;
  projectId: string;
  date: string;
  occurredAt: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  type: 'First Aid' | 'Near-Miss' | 'Lost-Time' | 'Equipment Damage';
  description: string;
  status: 'Open' | 'Under Investigation' | 'Resolved';
  actionTaken?: string;
  isLostTime: boolean;
  createdAt: string;
}

export interface DemoPunchItem {
  id: string;
  projectId: string;
  item: string;
  location: string;
  phase: string;
  severity: 'Critical' | 'Major' | 'Minor';
  subcontractor: string;
  status: 'Open' | 'In Progress' | 'Ready for Inspection' | 'Closed';
  dateReported: string;
  reportedAt: string;
  photoUrl?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface DemoMilestone {
  id: string;
  projectId: string;
  name: string;
  dueDate: string;
  completedDate?: string;
  status: 'On Track' | 'At Risk' | 'Delayed' | 'Complete';
}

export interface DemoRisk {
  id: string;
  projectId: string;
  title: string;
  category: 'Schedule' | 'Financial' | 'Safety' | 'External' | 'Resource';
  probability: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  status: 'Monitored' | 'Mitigating' | 'Resolved';
  mitigationPlan: string;
}

export interface DemoLog {
  id: string;
  projectId: string;
  timestamp: string;
  createdAt: string;
  type: 'safety' | 'task_update' | 'financial' | 'equipment' | 'weather' | 'general';
  severity: 'info' | 'warning' | 'alert' | 'success';
  message: string;
  user: string;
}

export interface DemoProject {
  id: string;
  name: string;
  location: string;
  currency: string;
  budgetInr: number;
  contingencyInr: number;
  startDate: string;
  plannedFinishDate: string;
  statusDate: string;
  craneHalt: boolean;
  createdAt: string;
  updatedAt: string;
}

class DemoStore {
  private project: DemoProject;
  private tasks: DemoTask[] = [];
  private invoices: DemoInvoice[] = [];
  private incidents: DemoIncident[] = [];
  private punchItems: DemoPunchItem[] = [];
  private milestones: DemoMilestone[] = [];
  private risks: DemoRisk[] = [];
  private logs: DemoLog[] = [];

  constructor() {
    this.project = {
      id: 'proj-demo-001',
      name: 'Skyline Metro Tower - Phase 2',
      location: 'BKC Bandra Kurla Complex, Mumbai, MH, India',
      currency: 'INR',
      budgetInr: 166_000_000,
      contingencyInr: 16_600_000,
      startDate: '2026-06-01T00:00:00.000Z',
      plannedFinishDate: '2027-02-15T00:00:00.000Z',
      statusDate: '2026-08-02T00:00:00.000Z',
      craneHalt: false,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    };

    this.resetData();
  }

  public resetData() {
    this.tasks = [
      {
        id: 'T1',
        projectId: 'proj-demo-001',
        name: 'Site Clearance & Excavation',
        phase: 'Excavation',
        startDate: '2026-06-01',
        endDate: '2026-06-25',
        progress: 100,
        assignedCrew: 'Excavation Crew A',
        dependencies: [],
        priority: 'High',
        status: 'Complete',
        budgetedCostInr: usdToInr(125000),
        notes: 'Successfully cleared all bedrock. Permits finalized.',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-25T00:00:00.000Z',
      },
      {
        id: 'T2',
        projectId: 'proj-demo-001',
        name: 'Pour Concrete Footings & Foundations',
        phase: 'Foundation',
        startDate: '2026-06-26',
        endDate: '2026-07-20',
        progress: 100,
        assignedCrew: 'Concrete Crew B',
        dependencies: ['T1'],
        priority: 'Critical',
        status: 'Complete',
        budgetedCostInr: usdToInr(260000),
        notes: 'Poured 400 cubic yards. Concrete compression tests passed.',
        createdAt: '2026-06-26T00:00:00.000Z',
        updatedAt: '2026-07-20T00:00:00.000Z',
      },
      {
        id: 'T3',
        projectId: 'proj-demo-001',
        name: 'Steel Framing Structure (L1-L5)',
        phase: 'Framing',
        startDate: '2026-07-21',
        endDate: '2026-08-15',
        progress: 75,
        assignedCrew: 'Ironworkers Local 4',
        dependencies: ['T2'],
        priority: 'Critical',
        status: 'In Progress',
        budgetedCostInr: usdToInr(550000),
        notes: 'Framing currently up to Level 4. Minor wind delays last Wednesday.',
        createdAt: '2026-07-21T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
      {
        id: 'T4',
        projectId: 'proj-demo-001',
        name: 'HVAC Ductwork Installation',
        phase: 'HVAC/Electrical',
        startDate: '2026-08-16',
        endDate: '2026-09-10',
        progress: 15,
        assignedCrew: 'Thermal Systems Inc.',
        dependencies: ['T3'],
        priority: 'Medium',
        status: 'In Progress',
        budgetedCostInr: usdToInr(220000),
        notes: 'Early staging completed. Rough-ins starting on Level 1.',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
      {
        id: 'T5',
        projectId: 'proj-demo-001',
        name: 'Plumbing and Sprinklers Rough-in',
        phase: 'HVAC/Electrical',
        startDate: '2026-08-18',
        endDate: '2026-09-15',
        progress: 8,
        assignedCrew: 'Plumbing Subcontractor',
        dependencies: ['T2'],
        priority: 'High',
        status: 'In Progress',
        budgetedCostInr: usdToInr(180000),
        notes: 'Delayed slightly due to copper piping supplier backorder.',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
      {
        id: 'T6',
        projectId: 'proj-demo-001',
        name: 'Main Electrical Feeders & Distribution Panels',
        phase: 'HVAC/Electrical',
        startDate: '2026-08-25',
        endDate: '2026-10-05',
        progress: 0,
        assignedCrew: 'Volt Builders',
        dependencies: ['T3'],
        priority: 'High',
        status: 'Not Started',
        budgetedCostInr: usdToInr(240000),
        notes: 'Switchgear expected to arrive on site August 22.',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
      {
        id: 'T7',
        projectId: 'proj-demo-001',
        name: 'Exterior Insulation and Sheathing',
        phase: 'Exterior',
        startDate: '2026-09-16',
        endDate: '2026-10-20',
        progress: 0,
        assignedCrew: 'CladCraft Co.',
        dependencies: ['T3'],
        priority: 'Medium',
        status: 'Not Started',
        budgetedCostInr: usdToInr(200000),
        notes: 'Scaffolding scheduled for erection on September 14.',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
      {
        id: 'T8',
        projectId: 'proj-demo-001',
        name: 'Drywall & Interior Finishes',
        phase: 'Finishing',
        startDate: '2026-10-10',
        endDate: '2026-11-20',
        progress: 0,
        assignedCrew: 'Drywall Artisans',
        dependencies: ['T4', 'T5'],
        priority: 'Low',
        status: 'Not Started',
        budgetedCostInr: usdToInr(225000),
        notes: 'Requires thermal boundary and rough-in inspection sign-offs.',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ];

    this.invoices = [
      { id: 'INV-1001', projectId: 'proj-demo-001', number: 'INV-1001', vendor: 'Titan Excavation Ltd.', amount: usdToInr(120000), amountInr: usdToInr(120000), category: 'Subcontractors', status: 'Paid', date: '2026-06-15', invoiceDate: '2026-06-15', description: 'Site preparation, mass excavation, and soil removal', createdAt: '2026-06-15T00:00:00.000Z' },
      { id: 'INV-1002', projectId: 'proj-demo-001', number: 'INV-1002', vendor: 'Apex Concrete Supply', amount: usdToInr(280000), amountInr: usdToInr(280000), category: 'Materials', status: 'Paid', date: '2026-07-05', invoiceDate: '2026-07-05', description: 'Bulk supply of high-grade commercial footing concrete', createdAt: '2026-07-05T00:00:00.000Z' },
      { id: 'INV-1003', projectId: 'proj-demo-001', number: 'INV-1003', vendor: 'National Crane Rentals', amount: usdToInr(90000), amountInr: usdToInr(90000), category: 'Equipment', status: 'Paid', date: '2026-07-22', invoiceDate: '2026-07-22', description: 'Monthly tower crane rental and qualified operator fees', createdAt: '2026-07-22T00:00:00.000Z' },
      { id: 'INV-1004', projectId: 'proj-demo-001', number: 'INV-1004', vendor: 'Ironworkers Local 4 union', amount: usdToInr(320000), amountInr: usdToInr(320000), category: 'Labor', status: 'Paid', date: '2026-08-01', invoiceDate: '2026-08-01', description: 'Payroll dispatch for Level 1 to 4 structural steel installation', createdAt: '2026-08-01T00:00:00.000Z' },
      { id: 'INV-1005', projectId: 'proj-demo-001', number: 'INV-1005', vendor: 'United Steel Corp', amount: usdToInr(200000), amountInr: usdToInr(200000), category: 'Materials', status: 'Paid', date: '2026-07-15', invoiceDate: '2026-07-15', description: 'Pre-fabricated structural columns, beams and tension rods', createdAt: '2026-07-15T00:00:00.000Z' },
      { id: 'INV-1006', projectId: 'proj-demo-001', number: 'INV-1006', vendor: 'Concrete Placing & Labor Crew B', amount: usdToInr(230000), amountInr: usdToInr(230000), category: 'Labor', status: 'Paid', date: '2026-07-18', invoiceDate: '2026-07-18', description: 'Rebar tie labor, formwork erection, and pour placing staff', createdAt: '2026-07-18T00:00:00.000Z' },
      { id: 'INV-1007', projectId: 'proj-demo-001', number: 'INV-1007', vendor: 'Atlas Machine Rental', amount: usdToInr(60000), amountInr: usdToInr(60000), category: 'Equipment', status: 'Paid', date: '2026-06-10', invoiceDate: '2026-06-10', description: 'Excavator, dump truck and soil screener rental', createdAt: '2026-06-10T00:00:00.000Z' },
      { id: 'INV-1008', projectId: 'proj-demo-001', number: 'INV-1008', vendor: 'Thermal Systems Inc.', amount: usdToInr(45000), amountInr: usdToInr(45000), category: 'Subcontractors', status: 'Approved', date: '2026-08-01', invoiceDate: '2026-08-01', description: 'HVAC engineering designs and initial ductwork fabrication deposit', createdAt: '2026-08-01T00:00:00.000Z' },
      { id: 'INV-DEMO-009', projectId: 'proj-demo-001', number: 'INV-DEMO-009', vendor: 'Plumbing Subcontractor', amount: usdToInr(32000), amountInr: usdToInr(32000), category: 'Subcontractors', status: 'Pending', date: '2026-08-02', invoiceDate: '2026-08-02', description: 'Copper piping order, rough-in staging, and drain install labor', createdAt: '2026-08-02T00:00:00.000Z' },
      { id: 'INV-1010', projectId: 'proj-demo-001', number: 'INV-1010', vendor: 'Volt Builders Supply', amount: usdToInr(28000), amountInr: usdToInr(28000), category: 'Materials', status: 'Approved', date: '2026-08-02', invoiceDate: '2026-08-02', description: 'Grade-A copper conduits, breaker boxes and distribution lines', createdAt: '2026-08-02T00:00:00.000Z' },
    ];

    this.incidents = [
      { id: 'INC-201', projectId: 'proj-demo-001', date: '2026-06-12', occurredAt: '2026-06-12T10:00:00.000Z', severity: 'Minor', type: 'First Aid', description: 'Worker sustained a minor laceration on left hand from rebar wire. First aid kit applied.', status: 'Resolved', actionTaken: 'First aid applied on-site. Worker returned to duty. Standard hand safety glove review conducted.', isLostTime: false, createdAt: '2026-06-12T10:00:00.000Z' },
      { id: 'INC-202', projectId: 'proj-demo-001', date: '2026-07-08', occurredAt: '2026-07-08T14:30:00.000Z', severity: 'Moderate', type: 'Near-Miss', description: 'Concrete chute hose swung loose during placing due to a fractured clamps lock pin.', status: 'Resolved', actionTaken: 'Clamps inspected, lock pin replaced with rated grade. Safety alert issued to concrete foreman.', isLostTime: false, createdAt: '2026-07-08T14:30:00.000Z' },
      { id: 'INC-203', projectId: 'proj-demo-001', date: '2026-07-15', occurredAt: '2026-07-15T09:15:00.000Z', severity: 'Severe', type: 'Lost-Time', description: 'Scaffolding plank slipped on Level 2, worker slipped but was caught by safety harness.', status: 'Resolved', actionTaken: 'Full scaffolding harness inspection. Defective plank replaced. Retrained scaffold erection crew.', isLostTime: true, createdAt: '2026-07-15T09:15:00.000Z' },
    ];

    this.punchItems = [
      { id: 'P-101', projectId: 'proj-demo-001', item: 'Rebar cover clearance insufficient on Column C4', location: 'Sector 3 - Level 2 Grid D-4', phase: 'Framing', severity: 'Critical', subcontractor: 'Concrete Crew B', status: 'Closed', dateReported: '2026-07-28', reportedAt: '2026-07-28T00:00:00.000Z', photoUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80', resolutionNotes: 'Additional 25mm spacer chairs installed and re-inspected by structural engineer.', createdAt: '2026-07-28T00:00:00.000Z' },
      { id: 'P-102', projectId: 'proj-demo-001', item: 'Fire damper sleeve alignment deviation Level 2', location: 'Core Shaft - Level 2 Corridor East', phase: 'HVAC/Electrical', severity: 'Major', subcontractor: 'Thermal Systems Inc.', status: 'In Progress', dateReported: '2026-08-01', reportedAt: '2026-08-01T00:00:00.000Z', photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80', resolutionNotes: 'Sleeve being repositioned and sealed with 2-hour rated fire caulk.', createdAt: '2026-08-01T00:00:00.000Z' },
      { id: 'P-103', projectId: 'proj-demo-001', item: 'Surface honeycombing on shear wall SW-02', location: 'Basement Level 1 - North Elevation', phase: 'Foundation', severity: 'Minor', subcontractor: 'Concrete Crew B', status: 'Ready for Inspection', dateReported: '2026-07-30', reportedAt: '2026-07-30T00:00:00.000Z', photoUrl: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=80', resolutionNotes: 'Non-shrink structural grout patch applied and cured for 48 hours.', createdAt: '2026-07-30T00:00:00.000Z' },
      { id: 'P-104', projectId: 'proj-demo-001', item: 'Temporary guardrail missing toe-board at stairwell L3', location: 'Stairwell B - Level 3 Landing', phase: 'Framing', severity: 'Critical', subcontractor: 'Ironworkers Local 4', status: 'Closed', dateReported: '2026-07-31', reportedAt: '2026-07-31T00:00:00.000Z', photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80', resolutionNotes: 'Standard 4-inch OSHA timber toe-board fastened firmly.', createdAt: '2026-07-31T00:00:00.000Z' },
      { id: 'P-105', projectId: 'proj-demo-001', item: 'Copper drain trap slope gradient verify', location: 'Restroom Rough-in Core - Level 1', phase: 'HVAC/Electrical', severity: 'Minor', subcontractor: 'Plumbing Subcontractor', status: 'Open', dateReported: '2026-08-02', reportedAt: '2026-08-02T00:00:00.000Z', photoUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80', resolutionNotes: 'Waiting for plumber to recheck 1:50 slope ratio.', createdAt: '2026-08-02T00:00:00.000Z' },
    ];

    this.milestones = [
      { id: 'M1', projectId: 'proj-demo-001', name: 'Excavation Sign-off', dueDate: '2026-06-25', completedDate: '2026-06-23', status: 'Complete' },
      { id: 'M2', projectId: 'proj-demo-001', name: 'Concrete Foundation Cure', dueDate: '2026-07-20', completedDate: '2026-07-19', status: 'Complete' },
      { id: 'M3', projectId: 'proj-demo-001', name: 'Top Out Frame Level 5', dueDate: '2026-08-15', status: 'On Track' },
      { id: 'M4', projectId: 'proj-demo-001', name: 'Interior HVAC & Plumbing Rough-in', dueDate: '2026-09-15', status: 'At Risk' },
      { id: 'M5', projectId: 'proj-demo-001', name: 'Building Enclosure Dry', dueDate: '2026-10-30', status: 'On Track' },
      { id: 'M6', projectId: 'proj-demo-001', name: 'Substantial Completion', dueDate: '2027-02-15', status: 'On Track' },
    ];

    this.risks = [
      { id: 'R1', projectId: 'proj-demo-001', title: 'HVAC Equipment Long Lead Time', category: 'Schedule', probability: 'Medium', impact: 'High', status: 'Mitigating', mitigationPlan: 'Placed early deposits. Thermal Systems is coordinating with secondary local supply distributor.' },
      { id: 'R2', projectId: 'proj-demo-001', title: 'Extreme Heat Waves In August', category: 'Safety', probability: 'High', impact: 'Medium', status: 'Mitigating', mitigationPlan: 'Established shaded cooling zones. Increased water station frequency. Mandatory 15-min hydration breaks.' },
      { id: 'R3', projectId: 'proj-demo-001', title: 'Steel Tariff Pricing Volatility', category: 'Financial', probability: 'Low', impact: 'High', status: 'Monitored', mitigationPlan: 'Bulk locked structural steel order at fixed pricing during contract phase 1.' },
      { id: 'R4', projectId: 'proj-demo-001', title: 'Utility Supply Interconnection Delays', category: 'External', probability: 'Medium', impact: 'Medium', status: 'Monitored', mitigationPlan: 'Engaged municipal city inspector early. Weekly status meetings with electric utility.' },
    ];

    this.logs = [
      { id: 'L100', projectId: 'proj-demo-001', timestamp: '2026-08-02T22:30:10.000Z', createdAt: '2026-08-02T22:30:10.000Z', type: 'weather', severity: 'info', message: 'Site weather station registered: Clear Sky, Temperature: 78°F. Wind: 6mph.', user: 'Weather API' },
      { id: 'L99', projectId: 'proj-demo-001', timestamp: '2026-08-02T21:45:32.000Z', createdAt: '2026-08-02T21:45:32.000Z', type: 'task_update', severity: 'success', message: 'Priya Patel updated progress of Steel Framing (T3) to 75%.', user: 'Priya Patel' },
      { id: 'L98', projectId: 'proj-demo-001', timestamp: '2026-08-02T19:15:00.000Z', createdAt: '2026-08-02T19:15:00.000Z', type: 'equipment', severity: 'warning', message: 'Concrete Mixer Truck #4 scheduled for regular lubrication & valve maintenance on Sunday.', user: 'Equipment Tracker' },
      { id: 'L97', projectId: 'proj-demo-001', timestamp: '2026-08-02T16:22:45.000Z', createdAt: '2026-08-02T16:22:45.000Z', type: 'financial', severity: 'info', message: 'The site coordinator logged a pending plumbing invoice for ₹26,56,000.', user: 'Project Coordinator' },
      { id: 'L96', projectId: 'proj-demo-001', timestamp: '2026-08-02T14:10:12.000Z', createdAt: '2026-08-02T14:10:12.000Z', type: 'safety', severity: 'success', message: 'Vikram Singh completed site-wide PPE inspection. 100% compliance checked on Steel Framing Crew.', user: 'Vikram Singh' },
      { id: 'L95', projectId: 'proj-demo-001', timestamp: '2026-08-02T11:05:18.000Z', createdAt: '2026-08-02T11:05:18.000Z', type: 'general', severity: 'info', message: 'Daily toolbox safety briefing completed. Core topic: Working at heights & heavy crane swings.', user: 'Priya Patel' },
    ];
  }

  // ── Project Summary & Detail ───────────────────────────────────────────────

  public getProjectsList() {
    return [
      {
        ...this.project,
        _count: {
          tasks: this.tasks.length,
          invoices: this.invoices.length,
          incidents: this.incidents.length,
          punchItems: this.punchItems.length,
        },
      },
    ];
  }

  public getProjectDetail(projectId: string = 'proj-demo-001') {
    // 1. Calculate EVM
    const evmMetrics: EvmMetrics = calculateEVM(
      {
        budgetInr: this.project.budgetInr,
        statusDate: this.project.statusDate,
      },
      this.tasks.map(t => ({
        id: t.id,
        startDate: t.startDate,
        endDate: t.endDate,
        progress: t.progress,
        budgetedCostInr: t.budgetedCostInr,
        phase: t.phase,
      })),
      this.invoices.map(i => ({
        id: i.id,
        amountInr: i.amountInr,
        status: i.status,
      }))
    );

    // 2. Calculate CPM
    const dependencies = this.tasks.flatMap(t =>
      t.dependencies.map(depId => ({
        taskId: t.id,
        dependsOnTaskId: depId,
      }))
    );

    const cpmStatusMap: Record<string, 'NotStarted' | 'InProgress' | 'Complete' | 'Delayed'> = {
      'Not Started': 'NotStarted',
      'In Progress': 'InProgress',
      'Complete': 'Complete',
      'Delayed': 'Delayed',
    };

    const cpmResult: CpmScheduleResult = calculateCPM(
      this.tasks.map(t => ({
        id: t.id,
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
        progress: t.progress,
        status: cpmStatusMap[t.status] || 'NotStarted',
      })),
      dependencies,
      this.project.statusDate
    );

    // 3. Safety calculations
    const incidentTypeMap: Record<string, any> = {
      'First Aid': 'FirstAid',
      'Near-Miss': 'NearMiss',
      'Lost-Time': 'LostTime',
      'Equipment Damage': 'EquipmentDamage',
    };

    const incidentStatusMap: Record<string, any> = {
      'Open': 'Open',
      'Under Investigation': 'UnderInvestigation',
      'Resolved': 'Resolved',
    };

    const safetyDaysStreak = calculateSafetyStreak(
      {
        startDate: this.project.startDate,
        statusDate: this.project.statusDate,
        craneHalt: this.project.craneHalt,
      },
      this.incidents.map(i => ({
        id: i.id,
        occurredAt: i.occurredAt,
        severity: i.severity as any,
        type: incidentTypeMap[i.type] || i.type,
        status: incidentStatusMap[i.status] || i.status,
        isLostTime: i.isLostTime,
      }))
    );

    const openIncidentsCount = countOpenIncidents(
      this.incidents.map(i => ({
        id: i.id,
        occurredAt: i.occurredAt,
        severity: i.severity as any,
        type: incidentTypeMap[i.type] || i.type,
        status: incidentStatusMap[i.status] || i.status,
      }))
    );

    const criticalPunchCount = this.punchItems.filter(
      p => p.severity === 'Critical' && p.status !== 'Closed'
    ).length;

    const weather = getCachedWeather() || {
      temp: 78,
      condition: 'Clear Sky',
      wind: 8,
      humidity: 52,
      forecast: 'Ideal curing & framing conditions',
      craneHaltRisk: false,
    };

    return {
      ...this.project,
      tasks: this.tasks,
      invoices: this.invoices,
      incidents: this.incidents,
      punchItems: this.punchItems,
      milestones: this.milestones,
      risks: this.risks,
      logs: this.logs,
      activityLogs: this.logs.map(l => ({
        ...l,
        actor: { name: l.user, role: 'SiteStaff' },
      })),
      weather,
      evm: evmMetrics,
      evmMetrics,
      cpm: cpmResult,
      safetyDaysStreak,
      safetyStreak: safetyDaysStreak,
      openIncidentsCount,
      criticalPunchCount,
      isCraneHalted: this.project.craneHalt,
    };
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  public getTasks(projectId?: string): DemoTask[] {
    return this.tasks;
  }

  public getTaskById(taskId: string): DemoTask | undefined {
    return this.tasks.find(t => t.id === taskId);
  }

  public createTask(data: any): DemoTask {
    const nextId = `T${this.tasks.length + 1}`;
    const newTask: DemoTask = {
      id: nextId,
      projectId: data.projectId || this.project.id,
      name: data.name,
      phase: data.phase || 'Framing',
      startDate: data.startDate,
      endDate: data.endDate,
      progress: data.progress || 0,
      assignedCrew: data.assignedCrew || 'General Trades Crew',
      dependencies: data.dependencies || [],
      priority: data.priority || 'Medium',
      status: data.status || 'Not Started',
      budgetedCostInr: data.budgetedCostInr || 0,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(newTask);
    return newTask;
  }

  public updateTaskProgress(taskId: string, progress: number, status: string, notes?: string): DemoTask | null {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;
    task.progress = progress;
    task.status = status as any;
    if (notes !== undefined) task.notes = notes;
    task.updatedAt = new Date().toISOString();

    if (taskId === 'T3' && progress === 100) {
      const m = this.milestones.find(m => m.id === 'M3');
      if (m) {
        m.status = 'Complete';
        m.completedDate = '2026-08-02';
      }
    }
    if (taskId === 'T5' && progress >= 100) {
      const m = this.milestones.find(m => m.id === 'M4');
      if (m) {
        m.status = 'Complete';
        m.completedDate = '2026-08-02';
      }
    }

    return task;
  }

  public deleteTask(taskId: string): boolean {
    const initialLen = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    // Remove from other dependencies
    this.tasks.forEach(t => {
      t.dependencies = t.dependencies.filter(d => d !== taskId);
    });
    return this.tasks.length < initialLen;
  }

  // ── Invoices ───────────────────────────────────────────────────────────────

  public getInvoices(projectId?: string): DemoInvoice[] {
    return this.invoices;
  }

  public createInvoice(data: any): DemoInvoice {
    const nextNumber = `INV-${1001 + this.invoices.length}`;
    const amount = Number(data.amountInr || data.amount || 0);
    const newInvoice: DemoInvoice = {
      id: nextNumber,
      projectId: data.projectId || this.project.id,
      number: nextNumber,
      vendor: data.vendor,
      category: data.category,
      amount,
      amountInr: amount,
      status: 'Pending',
      date: data.invoiceDate || data.date || new Date().toISOString().slice(0, 10),
      invoiceDate: data.invoiceDate || data.date || new Date().toISOString().slice(0, 10),
      description: data.description,
      createdAt: new Date().toISOString(),
    };
    this.invoices.unshift(newInvoice);
    return newInvoice;
  }

  public updateInvoiceStatus(invoiceId: string, status: string, notes?: string): DemoInvoice | null {
    const inv = this.invoices.find(i => i.id === invoiceId || i.number === invoiceId);
    if (!inv) return null;
    inv.status = status as any;
    return inv;
  }

  public deleteInvoice(invoiceId: string): boolean {
    const initialLen = this.invoices.length;
    this.invoices = this.invoices.filter(i => i.id !== invoiceId && i.number !== invoiceId);
    return this.invoices.length < initialLen;
  }

  // ── Safety Incidents ───────────────────────────────────────────────────────

  public getIncidents(projectId?: string): DemoIncident[] {
    return this.incidents;
  }

  public createIncident(data: any): DemoIncident {
    const nextId = `INC-${201 + this.incidents.length}`;
    const dateStr = data.occurredAt ? new Date(data.occurredAt).toISOString().slice(0, 10) : (data.date || new Date().toISOString().slice(0, 10));
    const newIncident: DemoIncident = {
      id: nextId,
      projectId: data.projectId || this.project.id,
      date: dateStr,
      occurredAt: data.occurredAt || new Date().toISOString(),
      severity: data.severity,
      type: data.type,
      description: data.description,
      status: 'Open',
      actionTaken: data.actionTaken,
      isLostTime: data.isLostTime || data.type === 'Lost-Time' || data.type === 'LostTime',
      createdAt: new Date().toISOString(),
    };
    this.incidents.unshift(newIncident);
    return newIncident;
  }

  public resolveIncident(incidentId: string, actionTaken?: string): DemoIncident | null {
    const inc = this.incidents.find(i => i.id === incidentId);
    if (!inc) return null;
    inc.status = 'Resolved';
    if (actionTaken) inc.actionTaken = actionTaken;
    return inc;
  }

  // ── Punch Items ────────────────────────────────────────────────────────────

  public getPunchItems(projectId?: string): DemoPunchItem[] {
    return this.punchItems;
  }

  public createPunchItem(data: any): DemoPunchItem {
    const nextId = `P-${101 + this.punchItems.length}`;
    const dateStr = data.reportedAt ? new Date(data.reportedAt).toISOString().slice(0, 10) : (data.dateReported || new Date().toISOString().slice(0, 10));
    const newItem: DemoPunchItem = {
      id: nextId,
      projectId: data.projectId || this.project.id,
      item: data.item,
      location: data.location,
      phase: data.phase,
      severity: data.severity,
      subcontractor: data.subcontractor,
      status: 'Open',
      dateReported: dateStr,
      reportedAt: data.reportedAt || new Date().toISOString(),
      photoUrl: data.photoUrl,
      resolutionNotes: data.resolutionNotes,
      createdAt: new Date().toISOString(),
    };
    this.punchItems.unshift(newItem);
    return newItem;
  }

  public updatePunchItemStatus(punchId: string, status: string, resolutionNotes?: string): DemoPunchItem | null {
    const punch = this.punchItems.find(p => p.id === punchId);
    if (!punch) return null;
    punch.status = status as any;
    if (resolutionNotes) punch.resolutionNotes = resolutionNotes;
    return punch;
  }

  // ── Risks & Milestones ─────────────────────────────────────────────────────

  public getRisks(projectId?: string): DemoRisk[] {
    return this.risks;
  }

  public createRisk(data: any): DemoRisk {
    const nextId = `R${this.risks.length + 1}`;
    const newRisk: DemoRisk = {
      id: nextId,
      projectId: data.projectId || this.project.id,
      title: data.title,
      category: data.category,
      probability: data.probability,
      impact: data.impact,
      status: 'Monitored',
      mitigationPlan: data.mitigationPlan,
    };
    this.risks.push(newRisk);
    return newRisk;
  }

  public getMilestones(projectId?: string): DemoMilestone[] {
    return this.milestones;
  }

  public updateMilestone(milestoneId: string, data: any): DemoMilestone | null {
    const m = this.milestones.find(m => m.id === milestoneId);
    if (!m) return null;
    if (data.status) m.status = data.status;
    if (data.completedDate) m.completedDate = data.completedDate;
    return m;
  }

  // ── Activity Logs ──────────────────────────────────────────────────────────

  public getLogs(projectId?: string): DemoLog[] {
    return this.logs;
  }

  public addLog(projectId: string, data: { type: string; severity: string; message: string; user?: string }): DemoLog {
    const newLog: DemoLog = {
      id: `L-${Date.now()}`,
      projectId,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      type: data.type as any,
      severity: data.severity as any,
      message: data.message,
      user: data.user || 'System',
    };
    this.logs.unshift(newLog);
    return newLog;
  }

  // ── Crane Halt ─────────────────────────────────────────────────────────────

  public setCraneHalt(projectId: string, halt: boolean): DemoProject {
    this.project.craneHalt = halt;
    return this.project;
  }

  public clearCraneHalt(projectId: string): DemoProject {
    this.project.craneHalt = false;
    return this.project;
  }
}

export const demoStore = new DemoStore();
export default demoStore;

