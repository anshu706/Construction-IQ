/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConstructIQ API Validation Schemas
 * Strict Zod validation schemas for all inbound payloads across the REST API.
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
}).strict();

export const taskPhaseEnum = z.enum([
  'Excavation',
  'Foundation',
  'Framing',
  'HVAC_Electrical',
  'Finishing',
  'Exterior',
]);

export const taskStatusEnum = z.enum([
  'NotStarted',
  'InProgress',
  'Complete',
  'Delayed',
]);

export const priorityEnum = z.enum([
  'Low',
  'Medium',
  'High',
  'Critical',
]);

export const createTaskSchema = z.object({
  projectId: z.string().uuid('Valid project ID required'),
  name: z.string().min(2, 'Task name must be at least 2 characters').max(200),
  phase: taskPhaseEnum,
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  progress: z.number().int().min(0).max(100).default(0),
  status: taskStatusEnum.default('NotStarted'),
  priority: priorityEnum.default('Medium'),
  assignedCrew: z.string().min(1, 'Assigned crew is required'),
  budgetedCostInr: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
  dependencies: z.array(z.string().uuid()).optional(),
}).strict();

export const updateTaskSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  phase: taskPhaseEnum.optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: taskStatusEnum.optional(),
  priority: priorityEnum.optional(),
  assignedCrew: z.string().min(1).optional(),
  budgetedCostInr: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  dependencies: z.array(z.string().uuid()).optional(),
}).strict();

export const updateTaskProgressSchema = z.object({
  progress: z.number().int().min(0).max(100),
  status: taskStatusEnum,
  notes: z.string().optional().nullable(),
}).strict();

export const taskDependencySchema = z.object({
  taskId: z.string().uuid(),
  dependsOnTaskId: z.string().uuid(),
}).strict();

export const invoiceCategoryEnum = z.enum([
  'Labor',
  'Materials',
  'Equipment',
  'Subcontractors',
]);

export const invoiceStatusEnum = z.enum([
  'Pending',
  'Approved',
  'Paid',
  'Rejected',
]);

export const createInvoiceSchema = z.object({
  projectId: z.string().uuid('Valid project ID required'),
  vendor: z.string().min(2, 'Vendor is required'),
  category: invoiceCategoryEnum,
  amountInr: z.number().positive('Invoice amount must be positive'),
  invoiceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  description: z.string().min(2, 'Description is required'),
}).strict();

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['Approved', 'Paid', 'Rejected']),
  notes: z.string().optional(),
}).strict();

export const incidentSeverityEnum = z.enum([
  'Minor',
  'Moderate',
  'Severe',
]);

export const incidentTypeEnum = z.enum([
  'FirstAid',
  'NearMiss',
  'LostTime',
  'EquipmentDamage',
]);

export const incidentStatusEnum = z.enum([
  'Open',
  'UnderInvestigation',
  'Resolved',
]);

export const createIncidentSchema = z.object({
  projectId: z.string().uuid('Valid project ID required'),
  occurredAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  severity: incidentSeverityEnum,
  type: incidentTypeEnum,
  description: z.string().min(5, 'Incident description is required'),
  actionTaken: z.string().optional().nullable(),
  isLostTime: z.boolean().default(false),
}).strict();

export const resolveIncidentSchema = z.object({
  actionTaken: z.string().min(5, 'Action taken is required to resolve incident'),
}).strict();

export const punchSeverityEnum = z.enum([
  'Critical',
  'Major',
  'Minor',
]);

export const punchStatusEnum = z.enum([
  'Open',
  'InProgress',
  'ReadyForInspection',
  'Closed',
]);

export const createPunchItemSchema = z.object({
  projectId: z.string().uuid('Valid project ID required'),
  item: z.string().min(3, 'Item description is required'),
  location: z.string().min(2, 'Location is required'),
  phase: z.string().min(2, 'Phase is required'),
  severity: punchSeverityEnum,
  subcontractor: z.string().min(2, 'Subcontractor is required'),
  photoId: z.string().uuid().optional().nullable(),
  resolutionNotes: z.string().optional().nullable(),
}).strict();

export const updatePunchStatusSchema = z.object({
  status: punchStatusEnum,
  resolutionNotes: z.string().optional().nullable(),
}).strict();

export const riskCategoryEnum = z.enum([
  'Schedule',
  'Financial',
  'Safety',
  'External',
  'Resource',
]);

export const riskLevelEnum = z.enum([
  'Low',
  'Medium',
  'High',
]);

export const riskStatusEnum = z.enum([
  'Monitored',
  'Mitigating',
  'Resolved',
]);

export const createRiskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2),
  category: riskCategoryEnum,
  probability: riskLevelEnum,
  impact: riskLevelEnum,
  status: riskStatusEnum.default('Monitored'),
  mitigationPlan: z.string().min(5),
}).strict();

export const milestoneStatusEnum = z.enum([
  'OnTrack',
  'AtRisk',
  'Delayed',
  'Complete',
]);

export const createMilestoneSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(2),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  status: milestoneStatusEnum.default('OnTrack'),
  completedDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
}).strict();

export const copilotChatSchema = z.object({
  projectId: z.string().uuid('Project ID is required'),
  query: z.string().min(1, 'Query cannot be empty').max(2000, 'Query exceeds 2000 characters'),
}).strict();
