/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { createInvoiceSchema, updateInvoiceStatusSchema } from '../../shared/schemas.js';
import { formatINR } from '../../shared/currency.js';

const router = Router();

// List Invoices - FinanceManager, ProjectManager, Executive
router.get('/', requireAuth, requirePermission('invoices:read'), async (req, res) => {
  const { projectId } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Valid projectId query parameter required' });
  }

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return res.json({ invoices });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve invoices' });
  }
});

// Create Invoice - FinanceManager and ProjectManager
router.post('/', requireAuth, requirePermission('invoices:create'), async (req, res) => {
  const parseResult = createInvoiceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid invoice payload',
      details: parseResult.error.flatten(),
    });
  }

  const { projectId, vendor, category, amountInr, invoiceDate, description } = parseResult.data;

  try {
    // Generate server-side unique invoice number for the project
    const invoiceCount = await prisma.invoice.count({ where: { projectId } });
    const invoiceNumber = `INV-${1001 + invoiceCount}`;

    const newInvoice = await prisma.invoice.create({
      data: {
        projectId,
        number: invoiceNumber,
        vendor,
        category,
        amountInr,
        status: 'Pending',
        invoiceDate: new Date(invoiceDate),
        description,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        actorId: req.user!.id,
        type: 'financial',
        severity: 'info',
        message: `${req.user!.name} created pending invoice ${invoiceNumber} from ${vendor} for ${formatINR(amountInr)}.`,
      },
    });

    return res.status(201).json({ invoice: newInvoice });
  } catch (error) {
    console.error('[Invoice Create Error]', error);
    return res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update Invoice Status (Approve/Reject/Pay) - FinanceManager ONLY
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const parseResult = updateInvoiceStatusSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid status payload',
      details: parseResult.error.flatten(),
    });
  }

  const { status } = parseResult.data;
  const user = req.user!;

  // Strict enforcement: Only FinanceManager can approve, reject, or pay
  if (user.role !== 'FinanceManager') {
    return res.status(403).json({
      error: `Forbidden: Only FinanceManager can transition invoices to '${status}'.`,
    });
  }

  try {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        approvedBy: status === 'Approved' || status === 'Paid' ? user.name : existing.approvedBy,
        approvedAt: status === 'Approved' || status === 'Paid' ? new Date() : existing.approvedAt,
      },
    });

    const severity = status === 'Approved' || status === 'Paid' ? 'success' : 'warning';
    await prisma.activityLog.create({
      data: {
        projectId: existing.projectId,
        actorId: user.id,
        type: 'financial',
        severity,
        message: `${user.name} changed status of invoice ${existing.number} (${existing.vendor}, ${formatINR(Number(existing.amountInr))}) to "${status}".`,
      },
    });

    return res.json({ invoice: updatedInvoice });
  } catch (error) {
    console.error('[Invoice Status Error]', error);
    return res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// Soft Delete Invoice - FinanceManager only
router.delete('/:id', requireAuth, requirePermission('invoices:approve'), async (req, res) => {
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Financial records are never hard-deleted
    await prisma.invoice.update({
      where: { id },
      data: { isDeleted: true },
    });

    await prisma.activityLog.create({
      data: {
        projectId: invoice.projectId,
        actorId: req.user!.id,
        type: 'financial',
        severity: 'warning',
        message: `${req.user!.name} archived invoice ${invoice.number} (${invoice.vendor}).`,
      },
    });

    return res.json({ message: 'Invoice archived successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to archive invoice' });
  }
});

export default router;
