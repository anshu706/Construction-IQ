/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConstructIQ Database Seed Script
 * Seeds realistic enterprise construction data and demo user profiles.
 */

import { PrismaClient, Role, TaskPhase, TaskStatus, Priority, InvoiceCategory, InvoiceStatus, IncidentSeverity, IncidentType, IncidentStatus, PunchSeverity, PunchStatus, RiskLevel, RiskCategory, RiskStatus, MilestoneStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USD_TO_INR = 83;
const usdToInr = (usd: number) => usd * USD_TO_INR;

export async function seedDatabase() {
  console.log('🌱 Starting ConstructIQ database seeding...');

  const demoPassword = process.env.DEMO_PASSWORD || 'DemoPass123!';
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  // 1. Clean existing records in correct foreign key order
  await prisma.activityLog.deleteMany();
  await prisma.punchItem.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.session.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create standard demo accounts
  const usersData = [
    {
      email: 'pm@constructiq.demo',
      name: 'Rahul Sharma',
      title: 'Senior Project Manager',
      role: Role.ProjectManager,
      passwordHash,
    },
    {
      email: 'supervisor@constructiq.demo',
      name: 'Priya Patel',
      title: 'Site Superintendent',
      role: Role.SiteSupervisor,
      passwordHash,
    },
    {
      email: 'finance@constructiq.demo',
      name: 'Project Coordinator',
      title: 'Financial Controller',
      role: Role.FinanceManager,
      passwordHash,
    },
    {
      email: 'safety@constructiq.demo',
      name: 'Vikram Singh',
      title: 'EHS Director',
      role: Role.SafetyOfficer,
      passwordHash,
    },
    {
      email: 'exec@constructiq.demo',
      name: 'Neha Gupta',
      title: 'VP of Operations',
      role: Role.Executive,
      passwordHash,
    },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.create({ data: u });
    createdUsers[u.role] = user;
    console.log(`  ✓ Created user [${u.role}]: ${u.email}`);
  }

  // 3. Create Primary Commercial Tower Project
  const totalBudgetInr = 2_000_000 * USD_TO_INR; // ₹16,60,00,000 (16.6 Cr)
  const contingencyInr = 200_000 * USD_TO_INR;   // ₹1,66,00,000 (1.66 Cr)

  const project = await prisma.project.create({
    data: {
      name: 'Skyline Heights Commercial Tower',
      location: 'BKC Bandra Kurla Complex, Mumbai, MH, India',
      currency: 'INR',
      budgetInr: totalBudgetInr,
      contingencyInr: contingencyInr,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      plannedFinishDate: new Date('2027-02-15T00:00:00.000Z'),
      statusDate: new Date('2026-08-02T00:00:00.000Z'),
      craneHalt: false,
    },
  });
  console.log(`  ✓ Created primary project: ${project.name} (${project.id})`);

  // 4. Assign project memberships
  for (const role of Object.keys(createdUsers)) {
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: createdUsers[role].id,
        role: role as Role,
      },
    });
  }

  // 5. Seed Tasks with budget allocation summing to BAC
  const tasksSeed = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      name: 'Site Clearance & Excavation',
      phase: TaskPhase.Excavation,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-06-25T00:00:00.000Z'),
      progress: 100,
      assignedCrew: 'Excavation Crew A',
      priority: Priority.High,
      status: TaskStatus.Complete,
      budgetedCostInr: usdToInr(125000), // ₹1,03,75,000
      notes: 'Successfully cleared all bedrock. Permits finalized.',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      name: 'Pour Concrete Footings & Foundations',
      phase: TaskPhase.Foundation,
      startDate: new Date('2026-06-26T00:00:00.000Z'),
      endDate: new Date('2026-07-20T00:00:00.000Z'),
      progress: 100,
      assignedCrew: 'Concrete Crew B',
      priority: Priority.Critical,
      status: TaskStatus.Complete,
      budgetedCostInr: usdToInr(260000), // ₹2,15,80,000
      notes: 'Poured 400 cubic yards. Concrete compression tests passed.',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      name: 'Steel Framing Structure (L1-L5)',
      phase: TaskPhase.Framing,
      startDate: new Date('2026-07-21T00:00:00.000Z'),
      endDate: new Date('2026-08-15T00:00:00.000Z'),
      progress: 75,
      assignedCrew: 'Ironworkers Local 4',
      priority: Priority.Critical,
      status: TaskStatus.InProgress,
      budgetedCostInr: usdToInr(550000), // ₹4,56,50,000
      notes: 'Framing currently up to Level 4. Minor wind delays last Wednesday.',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000004',
      name: 'HVAC Ductwork Installation',
      phase: TaskPhase.HVAC_Electrical,
      startDate: new Date('2026-08-16T00:00:00.000Z'),
      endDate: new Date('2026-09-10T00:00:00.000Z'),
      progress: 15,
      assignedCrew: 'Thermal Systems Inc.',
      priority: Priority.Medium,
      status: TaskStatus.InProgress,
      budgetedCostInr: usdToInr(220000), // ₹1,82,60,000
      notes: 'Early staging completed. Rough-ins starting on Level 1.',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000005',
      name: 'Plumbing and Sprinklers Rough-in',
      phase: TaskPhase.HVAC_Electrical,
      startDate: new Date('2026-08-18T00:00:00.000Z'),
      endDate: new Date('2026-09-15T00:00:00.000Z'),
      progress: 8,
      assignedCrew: 'Plumbing Subcontractor',
      priority: Priority.High,
      status: TaskStatus.InProgress,
      budgetedCostInr: usdToInr(180000), // ₹1,49,40,000
      notes: 'Delayed slightly due to copper piping supplier backorder.',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000006',
      name: 'Main Electrical Feeders & Distribution Panels',
      phase: TaskPhase.HVAC_Electrical,
      startDate: new Date('2026-08-25T00:00:00.000Z'),
      endDate: new Date('2026-10-05T00:00:00.000Z'),
      progress: 0,
      assignedCrew: 'Volt Builders',
      priority: Priority.High,
      status: TaskStatus.NotStarted,
      budgetedCostInr: usdToInr(240000), // ₹1,99,20,000
      notes: 'Switchgear expected to arrive on site August 22.',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000007',
      name: 'Exterior Insulation and Sheathing',
      phase: TaskPhase.Exterior,
      startDate: new Date('2026-09-16T00:00:00.000Z'),
      endDate: new Date('2026-10-20T00:00:00.000Z'),
      progress: 0,
      assignedCrew: 'CladCraft Co.',
      priority: Priority.Medium,
      status: TaskStatus.NotStarted,
      budgetedCostInr: usdToInr(200000), // ₹1,66,00,000
      notes: 'Scaffolding scheduled for erection on September 14.',
    },
    {
      id: 'd0000000-0000-0000-0000-000000000008',
      name: 'Drywall & Interior Finishes',
      phase: TaskPhase.Finishing,
      startDate: new Date('2026-10-10T00:00:00.000Z'),
      endDate: new Date('2026-11-20T00:00:00.000Z'),
      progress: 0,
      assignedCrew: 'Drywall Artisans',
      priority: Priority.Low,
      status: TaskStatus.NotStarted,
      budgetedCostInr: usdToInr(225000), // ₹1,86,75,000
      notes: 'Requires thermal boundary and rough-in inspection sign-offs.',
    },
  ];

  for (const t of tasksSeed) {
    await prisma.task.create({
      data: {
        ...t,
        projectId: project.id,
      },
    });
  }
  console.log(`  ✓ Seeded ${tasksSeed.length} project tasks`);

  // 6. Seed Task Dependencies (DAG, no cycles)
  const dependencies = [
    { taskIdx: 1, dependsOnIdx: 0 }, // T2 depends on T1
    { taskIdx: 2, dependsOnIdx: 1 }, // T3 depends on T2
    { taskIdx: 3, dependsOnIdx: 2 }, // T4 depends on T3
    { taskIdx: 4, dependsOnIdx: 1 }, // T5 depends on T2
    { taskIdx: 5, dependsOnIdx: 2 }, // T6 depends on T3
    { taskIdx: 6, dependsOnIdx: 2 }, // T7 depends on T3
    { taskIdx: 7, dependsOnIdx: 3 }, // T8 depends on T4
    { taskIdx: 7, dependsOnIdx: 4 }, // T8 depends on T5
  ];

  for (const dep of dependencies) {
    await prisma.taskDependency.create({
      data: {
        taskId: tasksSeed[dep.taskIdx].id,
        dependsOnTaskId: tasksSeed[dep.dependsOnIdx].id,
      },
    });
  }

  // 7. Seed Invoices
  const invoicesSeed = [
    { number: 'INV-1001', vendor: 'Titan Excavation Ltd.', amountInr: usdToInr(120000), category: InvoiceCategory.Subcontractors, status: InvoiceStatus.Paid, invoiceDate: new Date('2026-06-15'), description: 'Site preparation, mass excavation, and soil removal' },
    { number: 'INV-1002', vendor: 'Apex Concrete Supply', amountInr: usdToInr(280000), category: InvoiceCategory.Materials, status: InvoiceStatus.Paid, invoiceDate: new Date('2026-07-05'), description: 'Bulk supply of high-grade commercial footing concrete' },
    { number: 'INV-1003', vendor: 'National Crane Rentals', amountInr: usdToInr(90000), category: InvoiceCategory.Equipment, status: InvoiceStatus.Paid, invoiceDate: new Date('2026-07-22'), description: 'Monthly tower crane rental and qualified operator fees' },
    { number: 'INV-1004', vendor: 'Ironworkers Local 4 union', amountInr: usdToInr(320000), category: InvoiceCategory.Labor, status: InvoiceStatus.Paid, invoiceDate: new Date('2026-08-01'), description: 'Payroll dispatch for Level 1 to 4 structural steel installation' },
    { number: 'INV-1005', vendor: 'United Steel Corp', amountInr: usdToInr(200000), category: InvoiceCategory.Materials, status: InvoiceStatus.Paid, invoiceDate: new Date('2026-07-15'), description: 'Pre-fabricated structural columns, beams and tension rods' },
    { number: 'INV-1006', vendor: 'Concrete Placing & Labor Crew B', amountInr: usdToInr(230000), category: InvoiceCategory.Labor, status: InvoiceStatus.Paid, invoiceDate: new Date('2026-07-18'), description: 'Rebar tie labor, formwork erection, and pour placing staff' },
    { number: 'INV-1007', vendor: 'Atlas Machine Rental', amountInr: usdToInr(60000), category: InvoiceCategory.Equipment, status: InvoiceStatus.Paid, invoiceDate: new Date('2026-06-10'), description: 'Excavator, dump truck and soil screener rental' },
    { number: 'INV-1008', vendor: 'Thermal Systems Inc.', amountInr: usdToInr(45000), category: InvoiceCategory.Subcontractors, status: InvoiceStatus.Approved, invoiceDate: new Date('2026-08-01'), description: 'HVAC engineering designs and initial ductwork fabrication deposit' },
    { number: 'INV-DEMO-009', vendor: 'Plumbing Subcontractor', amountInr: usdToInr(32000), category: InvoiceCategory.Subcontractors, status: InvoiceStatus.Pending, invoiceDate: new Date('2026-08-02'), description: 'Copper piping order, rough-in staging, and drain install labor' },
    { number: 'INV-1010', vendor: 'Volt Builders Supply', amountInr: usdToInr(28000), category: InvoiceCategory.Materials, status: InvoiceStatus.Approved, invoiceDate: new Date('2026-08-02'), description: 'Grade-A copper conduits, breaker boxes and distribution lines' },
  ];

  for (const inv of invoicesSeed) {
    await prisma.invoice.create({
      data: {
        ...inv,
        projectId: project.id,
      },
    });
  }

  // 8. Seed Safety Incidents
  const incidentsSeed = [
    { occurredAt: new Date('2026-06-12T10:00:00.000Z'), severity: IncidentSeverity.Minor, type: IncidentType.FirstAid, description: 'Worker sustained a minor laceration on left hand from rebar wire. First aid kit applied.', status: IncidentStatus.Resolved, actionTaken: 'First aid applied on-site. Worker returned to duty. Standard hand safety glove review conducted.', isLostTime: false },
    { occurredAt: new Date('2026-07-08T14:30:00.000Z'), severity: IncidentSeverity.Moderate, type: IncidentType.NearMiss, description: 'Concrete chute hose swung loose during placing due to a fractured clamps lock pin.', status: IncidentStatus.Resolved, actionTaken: 'Clamps inspected, lock pin replaced with rated grade. Safety alert issued to concrete foreman.', isLostTime: false },
    { occurredAt: new Date('2026-07-15T09:15:00.000Z'), severity: IncidentSeverity.Severe, type: IncidentType.LostTime, description: 'Scaffolding plank slipped on Level 2, worker slipped but was caught by safety harness.', status: IncidentStatus.Resolved, actionTaken: 'Full scaffolding harness inspection. Defective plank replaced. Retrained scaffold erection crew.', isLostTime: true },
  ];

  for (const inc of incidentsSeed) {
    await prisma.incident.create({
      data: {
        ...inc,
        projectId: project.id,
      },
    });
  }

  // 9. Seed Milestones
  const milestonesSeed = [
    { name: 'Excavation Sign-off', dueDate: new Date('2026-06-25'), completedDate: new Date('2026-06-23'), status: MilestoneStatus.Complete },
    { name: 'Concrete Foundation Cure', dueDate: new Date('2026-07-20'), completedDate: new Date('2026-07-19'), status: MilestoneStatus.Complete },
    { name: 'Top Out Frame Level 5', dueDate: new Date('2026-08-15'), status: MilestoneStatus.OnTrack },
    { name: 'Interior HVAC & Plumbing Rough-in', dueDate: new Date('2026-09-15'), status: MilestoneStatus.AtRisk },
    { name: 'Building Enclosure Dry', dueDate: new Date('2026-10-30'), status: MilestoneStatus.OnTrack },
    { name: 'Substantial Completion', dueDate: new Date('2027-02-15'), status: MilestoneStatus.OnTrack },
  ];

  for (const m of milestonesSeed) {
    await prisma.milestone.create({
      data: {
        ...m,
        projectId: project.id,
      },
    });
  }

  // 10. Seed Risks
  const risksSeed = [
    { title: 'HVAC Equipment Long Lead Time', category: RiskCategory.Schedule, probability: RiskLevel.Medium, impact: RiskLevel.High, status: RiskStatus.Mitigating, mitigationPlan: 'Placed early deposits. Thermal Systems is coordinating with secondary local supply distributor.' },
    { title: 'Extreme Heat Waves In August', category: RiskCategory.Safety, probability: RiskLevel.High, impact: RiskLevel.Medium, status: RiskStatus.Mitigating, mitigationPlan: 'Established shaded cooling zones. Increased water station frequency. Mandatory 15-min hydration breaks.' },
    { title: 'Steel Tariff Pricing Volatility', category: RiskCategory.Financial, probability: RiskLevel.Low, impact: RiskLevel.High, status: RiskStatus.Monitored, mitigationPlan: 'Bulk locked structural steel order at fixed pricing during contract phase 1.' },
    { title: 'Utility Supply Interconnection Delays', category: RiskCategory.External, probability: RiskLevel.Medium, impact: RiskLevel.Medium, status: RiskStatus.Monitored, mitigationPlan: 'Engaged municipal city inspector early. Weekly status meetings with electric utility.' },
  ];

  for (const r of risksSeed) {
    await prisma.risk.create({
      data: {
        ...r,
        projectId: project.id,
      },
    });
  }

  // 11. Seed Punch Items
  const punchItemsSeed = [
    { item: 'Rebar cover clearance insufficient on Column C4', location: 'Sector 3 - Level 2 Grid D-4', phase: 'Framing', severity: PunchSeverity.Critical, subcontractor: 'Concrete Crew B', status: PunchStatus.Closed, reportedAt: new Date('2026-07-28'), resolutionNotes: 'Additional 25mm spacer chairs installed and re-inspected by structural engineer.' },
    { item: 'Fire damper sleeve alignment deviation Level 2', location: 'Core Shaft - Level 2 Corridor East', phase: 'HVAC/Electrical', severity: PunchSeverity.Major, subcontractor: 'Thermal Systems Inc.', status: PunchStatus.InProgress, reportedAt: new Date('2026-08-01'), resolutionNotes: 'Sleeve being repositioned and sealed with 2-hour rated fire caulk.' },
    { item: 'Surface honeycombing on shear wall SW-02', location: 'Basement Level 1 - North Elevation', phase: 'Foundation', severity: PunchSeverity.Minor, subcontractor: 'Concrete Crew B', status: PunchStatus.ReadyForInspection, reportedAt: new Date('2026-07-30'), resolutionNotes: 'Non-shrink structural grout patch applied and cured for 48 hours.' },
    { item: 'Temporary guardrail missing toe-board at stairwell L3', location: 'Stairwell B - Level 3 Landing', phase: 'Framing', severity: PunchSeverity.Critical, subcontractor: 'Ironworkers Local 4', status: PunchStatus.Closed, reportedAt: new Date('2026-07-31'), resolutionNotes: 'Standard 4-inch OSHA timber toe-board fastened firmly.' },
    { item: 'Copper drain trap slope gradient verify', location: 'Restroom Rough-in Core - Level 1', phase: 'HVAC/Electrical', severity: PunchSeverity.Minor, subcontractor: 'Plumbing Subcontractor', status: PunchStatus.Open, reportedAt: new Date('2026-08-02'), resolutionNotes: 'Waiting for plumber to recheck 1:50 slope ratio.' },
  ];

  for (const p of punchItemsSeed) {
    await prisma.punchItem.create({
      data: {
        ...p,
        projectId: project.id,
      },
    });
  }

  // 12. Seed Activity Logs
  const logsSeed = [
    { type: 'weather', severity: 'info', message: 'Site weather station registered: Clear Sky, Temperature: 78°F. Wind: 6mph.', createdAt: new Date('2026-08-02T22:30:10.000Z'), actorRole: Role.ProjectManager },
    { type: 'task_update', severity: 'success', message: 'Priya Patel updated progress of Steel Framing (T3) to 75%.', createdAt: new Date('2026-08-02T21:45:32.000Z'), actorRole: Role.SiteSupervisor },
    { type: 'equipment', severity: 'warning', message: 'Concrete Mixer Truck #4 scheduled for regular lubrication & valve maintenance on Sunday.', createdAt: new Date('2026-08-02T19:15:00.000Z'), actorRole: Role.SiteSupervisor },
    { type: 'financial', severity: 'info', message: 'The site coordinator logged a pending plumbing invoice for ₹26,56,000.', createdAt: new Date('2026-08-02T16:22:45.000Z'), actorRole: Role.FinanceManager },
    { type: 'safety', severity: 'success', message: 'Vikram Singh completed site-wide PPE inspection. 100% compliance checked on Steel Framing Crew.', createdAt: new Date('2026-08-02T14:10:12.000Z'), actorRole: Role.SafetyOfficer },
  ];

  for (const log of logsSeed) {
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        actorId: createdUsers[log.actorRole].id,
        type: log.type,
        severity: log.severity,
        message: log.message,
        createdAt: log.createdAt,
      },
    });
  }

  console.log('✅ ConstructIQ database seeding completed successfully!');
}

if (process.env.NODE_ENV !== 'test') {
  seedDatabase()
    .catch((err) => {
      console.error('❌ Seeding error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
