/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, Task, Invoice, SafetyIncident, OperationLog, ProjectRisk, Milestone, ProjectState } from './types';
import { formatINR, usdToInr } from './currency';

export const USER_PROFILES: UserProfile[] = [
  {
    name: 'Rahul Sharma',
    role: 'ProjectManager',
    title: 'Senior Project Manager',
    avatar: '/photos/avatar-pm.jpg',
    department: 'Operations',
    focus: 'Overall execution, schedule coordination, risk mitigation'
  },
  {
    name: 'Priya Patel',
    role: 'SiteSupervisor',
    title: 'Site Superintendent',
    avatar: '/photos/avatar-sup.jpg',
    department: 'Field Operations',
    focus: 'Daily task dispatch, worker safety, crew productivity'
  },
  {
    name: 'Project Coordinator',
    role: 'FinanceManager',
    title: 'Financial Controller',
    avatar: '/photos/avatar-fin.jpg',
    department: 'Finance & Accounting',
    focus: 'Budget tracking, change orders, invoice approvals'
  },
  {
    name: 'Neha Gupta',
    role: 'Executive',
    title: 'VP of Operations',
    avatar: '/photos/avatar-exec.jpg',
    department: 'Executive Board',
    focus: 'Portfolio health, high-level KPIs, long-term strategic growth'
  },
  {
    name: 'Vikram Singh',
    role: 'SafetyOfficer',
    title: 'EHS Director',
    avatar: '/photos/avatar-safe.jpg',
    department: 'Safety & Compliance',
    focus: 'OSHA compliance, PPE inspections, safety audits'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'T1',
    name: 'Site Clearance & Excavation',
    phase: 'Excavation',
    startDate: '2026-06-01',
    endDate: '2026-06-25',
    progress: 100,
    assignedCrew: 'Excavation Crew A',
    dependencies: [],
    priority: 'High',
    status: 'Complete',
    notes: 'Successfully cleared all bedrock. Permits finalized.'
  },
  {
    id: 'T2',
    name: 'Pour Concrete Footings & Foundations',
    phase: 'Foundation',
    startDate: '2026-06-26',
    endDate: '2026-07-20',
    progress: 100,
    assignedCrew: 'Concrete Crew B',
    dependencies: ['T1'],
    priority: 'Critical',
    status: 'Complete',
    notes: 'Poured 400 cubic yards. Concrete compression tests passed.'
  },
  {
    id: 'T3',
    name: 'Steel Framing Structure (L1-L5)',
    phase: 'Framing',
    startDate: '2026-07-21',
    endDate: '2026-08-15',
    progress: 75,
    assignedCrew: 'Ironworkers Local 4',
    dependencies: ['T2'],
    priority: 'Critical',
    status: 'In Progress',
    notes: 'Framing currently up to Level 4. Minor wind delays last Wednesday.'
  },
  {
    id: 'T4',
    name: 'HVAC Ductwork Installation',
    phase: 'HVAC/Electrical',
    startDate: '2026-08-16',
    endDate: '2026-09-10',
    progress: 15,
    assignedCrew: 'Thermal Systems Inc.',
    dependencies: ['T3'],
    priority: 'Medium',
    status: 'In Progress',
    notes: 'Early staging completed. Rough-ins starting on Level 1.'
  },
  {
    id: 'T5',
    name: 'Plumbing and Sprinklers Rough-in',
    phase: 'HVAC/Electrical',
    startDate: '2026-08-18',
    endDate: '2026-09-15',
    progress: 8,
    assignedCrew: 'Plumbing Subcontractor',
    dependencies: ['T2'],
    priority: 'High',
    status: 'In Progress',
    notes: 'Delayed slightly due to copper piping supplier backorder.'
  },
  {
    id: 'T6',
    name: 'Main Electrical Feeders & Distribution Panels',
    phase: 'HVAC/Electrical',
    startDate: '2026-08-25',
    endDate: '2026-10-05',
    progress: 0,
    assignedCrew: 'Volt Builders',
    dependencies: ['T3'],
    priority: 'High',
    status: 'Not Started',
    notes: 'Switchgear expected to arrive on site August 22.'
  },
  {
    id: 'T7',
    name: 'Exterior Insulation and Sheathing',
    phase: 'Exterior',
    startDate: '2026-09-16',
    endDate: '2026-10-20',
    progress: 0,
    assignedCrew: 'CladCraft Co.',
    dependencies: ['T3'],
    priority: 'Medium',
    status: 'Not Started',
    notes: 'Scaffolding scheduled for erection on September 14.'
  },
  {
    id: 'T8',
    name: 'Drywall & Interior Finishes',
    phase: 'Finishing',
    startDate: '2026-10-10',
    endDate: '2026-11-20',
    progress: 0,
    assignedCrew: 'Drywall Artisans',
    dependencies: ['T4', 'T5'],
    priority: 'Low',
    status: 'Not Started',
    notes: 'Requires thermal boundary and rough-in inspection sign-offs.'
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  // Total Spent YTD: ₹1,03,75,000 (converted from $1,250,000 @ ₹83/USD)
  // Categories: Labor, Materials, Equipment, Subcontractors
  {
    id: 'INV-1001',
    vendor: 'Titan Excavation Ltd.',
    amount: usdToInr(120000),
    category: 'Subcontractors',
    status: 'Paid',
    date: '2026-06-15',
    description: 'Site preparation, mass excavation, and soil removal'
  },
  {
    id: 'INV-1002',
    vendor: 'Apex Concrete Supply',
    amount: usdToInr(280000),
    category: 'Materials',
    status: 'Paid',
    date: '2026-07-05',
    description: 'Bulk supply of high-grade commercial footing concrete'
  },
  {
    id: 'INV-1003',
    vendor: 'National Crane Rentals',
    amount: usdToInr(90000),
    category: 'Equipment',
    status: 'Paid',
    date: '2026-07-22',
    description: 'Monthly tower crane rental and qualified operator fees'
  },
  {
    id: 'INV-1004',
    vendor: 'Ironworkers Local 4 union',
    amount: usdToInr(320000),
    category: 'Labor',
    status: 'Paid',
    date: '2026-08-01',
    description: 'Payroll dispatch for Level 1 to 4 structural steel installation'
  },
  {
    id: 'INV-1005',
    vendor: 'United Steel Corp',
    amount: usdToInr(200000),
    category: 'Materials',
    status: 'Paid',
    date: '2026-07-15',
    description: 'Pre-fabricated structural columns, beams and tension rods'
  },
  {
    id: 'INV-1006',
    vendor: 'Concrete Placing & Labor Crew B',
    amount: usdToInr(230000),
    category: 'Labor',
    status: 'Paid',
    date: '2026-07-18',
    description: 'Rebar tie labor, formwork erection, and pour placing staff'
  },
  {
    id: 'INV-1007',
    vendor: 'Atlas Machine Rental',
    amount: usdToInr(60000),
    category: 'Equipment',
    status: 'Paid',
    date: '2026-06-10',
    description: 'Excavator, dump truck and soil screener rental'
  },
  {
    id: 'INV-1008',
    vendor: 'Thermal Systems Inc.',
    amount: usdToInr(45000),
    category: 'Subcontractors',
    status: 'Approved',
    date: '2026-08-01',
    description: 'HVAC engineering designs and initial ductwork fabrication deposit'
  },
  {
    id: 'INV-DEMO-009',
    vendor: 'Plumbing Subcontractor',
    amount: usdToInr(32000),
    category: 'Subcontractors',
    status: 'Pending',
    date: '2026-08-02',
    description: 'Copper piping order, rough-in staging, and drain install labor'
  },
  {
    id: 'INV-1010',
    vendor: 'Volt Builders Supply',
    amount: usdToInr(28000),
    category: 'Materials',
    status: 'Approved',
    date: '2026-08-02',
    description: 'Grade-A copper conduits, breaker boxes and distribution lines'
  }
];

export const INITIAL_INCIDENTS: SafetyIncident[] = [
  {
    id: 'INC-201',
    date: '2026-06-12',
    severity: 'Minor',
    type: 'First Aid',
    description: 'Worker sustained a minor laceration on left hand from rebar wire. First aid kit applied.',
    status: 'Resolved',
    actionTaken: 'First aid applied on-site. Worker returned to duty. Standard hand safety glove review conducted.'
  },
  {
    id: 'INC-202',
    date: '2026-07-08',
    severity: 'Moderate',
    type: 'Near-Miss',
    description: 'Concrete chute hose swung loose during placing due to a fractured clamps lock pin.',
    status: 'Resolved',
    actionTaken: 'Clamps inspected, lock pin replaced with rated grade. Safety alert issued to concrete foreman.'
  },
  {
    id: 'INC-203',
    date: '2026-07-15',
    severity: 'Severe',
    type: 'Lost-Time',
    description: 'Scaffolding plank slipped on Level 2, worker slipped but was caught by safety harness.',
    status: 'Resolved',
    actionTaken: 'Full scaffolding harness inspection. Defective plank replaced. Retrained scaffold erection crew.'
  }
];

export const INITIAL_MILESTONES: Milestone[] = [
  {
    id: 'M1',
    name: 'Excavation Sign-off',
    dueDate: '2026-06-25',
    completedDate: '2026-06-23',
    status: 'Complete'
  },
  {
    id: 'M2',
    name: 'Concrete Foundation Cure',
    dueDate: '2026-07-20',
    completedDate: '2026-07-19',
    status: 'Complete'
  },
  {
    id: 'M3',
    name: 'Top Out Frame Level 5',
    dueDate: '2026-08-15',
    status: 'On Track'
  },
  {
    id: 'M4',
    name: 'Interior HVAC & Plumbing Rough-in',
    dueDate: '2026-09-15',
    status: 'At Risk'
  },
  {
    id: 'M5',
    name: 'Building Enclosure Dry',
    dueDate: '2026-10-30',
    status: 'On Track'
  },
  {
    id: 'M6',
    name: 'Substantial Completion',
    dueDate: '2027-02-15',
    status: 'On Track'
  }
];

export const INITIAL_RISKS: ProjectRisk[] = [
  {
    id: 'R1',
    title: 'HVAC Equipment Long Lead Time',
    category: 'Schedule',
    probability: 'Medium',
    impact: 'High',
    status: 'Mitigating',
    mitigationPlan: 'Placed early deposits. Thermal Systems is coordinating with secondary local supply distributor.'
  },
  {
    id: 'R2',
    title: 'Extreme Heat Waves In August',
    category: 'Safety',
    probability: 'High',
    impact: 'Medium',
    status: 'Mitigating',
    mitigationPlan: 'Established shaded cooling zones. Increased water station frequency. Mandatory 15-min hydration breaks.'
  },
  {
    id: 'R3',
    title: 'Steel Tariff Pricing Volatility',
    category: 'Financial',
    probability: 'Low',
    impact: 'High',
    status: 'Monitored',
    mitigationPlan: 'Bulk locked structural steel order at fixed pricing during contract phase 1.'
  },
  {
    id: 'R4',
    title: 'Utility Supply Interconnection Delays',
    category: 'External',
    probability: 'Medium',
    impact: 'Medium',
    status: 'Monitored',
    mitigationPlan: 'Engaged municipal city inspector early. Weekly status meetings with electric utility.'
  }
];

export const INITIAL_LOGS: OperationLog[] = [
  {
    id: 'L100',
    timestamp: '2026-08-02T22:30:10-07:00',
    type: 'weather',
    severity: 'info',
    message: 'Site weather station registered: Clear Sky, Temperature: 78°F. Wind: 6mph.',
    user: 'Weather API'
  },
  {
    id: 'L99',
    timestamp: '2026-08-02T21:45:32-07:00',
    type: 'task_update',
    severity: 'success',
    message: 'Priya Patel updated progress of Steel Framing (T3) to 75%.',
    user: 'Priya Patel'
  },
  {
    id: 'L98',
    timestamp: '2026-08-02T19:15:00-07:00',
    type: 'equipment',
    severity: 'warning',
    message: 'Concrete Mixer Truck #4 scheduled for regular lubrication & valve maintenance on Sunday.',
    user: 'Equipment Tracker'
  },
  {
    id: 'L97',
    timestamp: '2026-08-02T16:22:45-07:00',
    type: 'financial',
    severity: 'info',
    message: `The site coordinator logged a pending plumbing invoice for ${formatINR(usdToInr(32000))}.`,
    user: 'Project Coordinator'
  },
  {
    id: 'L96',
    timestamp: '2026-08-02T14:10:12-07:00',
    type: 'safety',
    severity: 'success',
    message: 'Vikram Singh completed site-wide PPE inspection. 100% compliance checked on Steel Framing Crew.',
    user: 'Vikram Singh'
  },
  {
    id: 'L95',
    timestamp: '2026-08-02T11:05:18-07:00',
    type: 'general',
    severity: 'info',
    message: 'Daily toolbox safety briefing completed. Core topic: Working at heights & heavy crane swings.',
    user: 'Priya Patel'
  }
];

export const SIMULATION_EVENTS = [
  {
    message: 'The plumbing supplier resolved a backorder. Plumbing progress increased to 12%.',
    apply: (state: ProjectState): Partial<ProjectState> => {
      const updatedTasks = state.tasks.map(t => t.id === 'T5' ? { ...t, progress: 12, notes: 'Copper pipes arrived.' } : t);
      return { tasks: updatedTasks };
    },
    log: { type: 'task_update', severity: 'success', message: 'The plumbing supplier resolved a backorder. Plumbing work is active.', user: 'Procurement' }
  },
  {
    message: 'Minor Scaffold Clamps loose reported on Level 4 framing. Work halted for 10 minutes.',
    apply: (state: ProjectState): Partial<ProjectState> => {
      return {};
    },
    log: { type: 'safety', severity: 'warning', message: 'Site inspection: Loose scaffold brackets reported on Level 4. Quickly secured.', user: 'Vikram Singh' }
  },
  {
    message: `The project coordinator approved a material invoice (${formatINR(usdToInr(28000))}).`,
    apply: (state: ProjectState): Partial<ProjectState> => {
      const updatedInvoices = state.invoices.map(i => i.id === 'INV-1010' ? { ...i, status: 'Approved' as const } : i);
      return { invoices: updatedInvoices };
    },
    log: { type: 'financial', severity: 'success', message: `A material invoice from the sample supplier (${formatINR(usdToInr(28000))}) was approved by the project coordinator.`, user: 'Project Coordinator' }
  },
  {
    message: 'Site weather warning: Wind gust speeds increased to 18mph. Tower crane under high caution.',
    apply: (state: ProjectState): Partial<ProjectState> => {
      return { weather: { ...state.weather, wind: 18, condition: 'Windy', forecast: 'Caution for structural lifts' } };
    },
    log: { type: 'weather', severity: 'warning', message: 'Wind sensor triggered alert: Gust speed 18mph. Crane crew in safety caution.', user: 'Weather API' }
  },
  {
    message: 'Site concrete mixers completed additional Level 4 column pours. Steel Framing progress updated to 80%.',
    apply: (state: ProjectState): Partial<ProjectState> => {
      const updatedTasks = state.tasks.map(t => t.id === 'T3' ? { ...t, progress: 80 } : t);
      return { tasks: updatedTasks };
    },
    log: { type: 'task_update', severity: 'success', message: 'Steel Framing (T3) progress increased to 80% following successful deck pours.', user: 'Priya Patel' }
  },
  {
    message: 'Safety inspection: Hand gloves wear-and-tear review. Daily compliance rated at 98%.',
    apply: (state: ProjectState): Partial<ProjectState> => {
      return {};
    },
    log: { type: 'safety', severity: 'info', message: 'Vikram Singh logged PPE glove compliance score at 98% across all crews.', user: 'Vikram Singh' }
  },
  {
    message: 'New Equipment Check: Concrete Pump Truck #2 operational status validated.',
    apply: (state: ProjectState): Partial<ProjectState> => {
      return {};
    },
    log: { type: 'equipment', severity: 'success', message: 'Daily equipment diagnostic: Pump Truck #2 hydraulic pressure checks passed.', user: 'Equipment Tracker' }
  }
];

export const INITIAL_PUNCH_ITEMS: import('./types').PunchItem[] = [
  {
    id: 'P-101',
    item: 'Rebar cover clearance insufficient on Column C4',
    location: 'Sector 3 - Level 2 Grid D-4',
    phase: 'Framing',
    severity: 'Critical',
    subcontractor: 'Concrete Crew B',
    status: 'Closed',
    dateReported: '2026-07-28',
    photoUrl: '/photos/Joint_Weld_Inspection_L3.jpg',
    resolutionNotes: 'Additional 25mm spacer chairs installed and re-inspected by structural engineer.'
  },
  {
    id: 'P-102',
    item: 'Fire damper sleeve alignment deviation Level 2',
    location: 'Core Shaft - Level 2 Corridor East',
    phase: 'HVAC/Electrical',
    severity: 'Major',
    subcontractor: 'Thermal Systems Inc.',
    status: 'In Progress',
    dateReported: '2026-08-01',
    photoUrl: '/photos/punch-02.jpg',
    resolutionNotes: 'Sleeve being repositioned and sealed with 2-hour rated fire caulk.'
  },
  {
    id: 'P-103',
    item: 'Surface honeycombing on shear wall SW-02',
    location: 'Basement Level 1 - North Elevation',
    phase: 'Foundation',
    severity: 'Minor',
    subcontractor: 'Concrete Crew B',
    status: 'Ready for Inspection',
    dateReported: '2026-07-30',
    photoUrl: '/photos/Rebar_Tie_Verification_L4.jpg',
    resolutionNotes: 'Non-shrink structural grout patch applied and cured for 48 hours.'
  },
  {
    id: 'P-104',
    item: 'Temporary guardrail missing toe-board at stairwell L3',
    location: 'Stairwell B - Level 3 Landing',
    phase: 'Framing',
    severity: 'Critical',
    subcontractor: 'Ironworkers Local 4',
    status: 'Closed',
    dateReported: '2026-07-31',
    photoUrl: '/photos/Conduit_RoughIn_ZoneB.jpg',
    resolutionNotes: 'Standard 4-inch OSHA timber toe-board fastened firmly.'
  },
  {
    id: 'P-105',
    item: 'Copper drain trap slope gradient verify',
    location: 'Restroom Rough-in Core - Level 1',
    phase: 'HVAC/Electrical',
    severity: 'Minor',
    subcontractor: 'Plumbing Subcontractor',
    status: 'Open',
    dateReported: '2026-08-02',
    photoUrl: '/photos/Conduit_RoughIn_ZoneB.jpg',
    resolutionNotes: 'Waiting for plumber to recheck 1:50 slope ratio.'
  }
];

