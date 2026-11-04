/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/copilot  — authenticated AI assistant endpoint
 * Builds context server-side from DB; calls NVIDIA NIM → Gemini fallback.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { calculateEVM } from '../services/evm.js';
import { calculateSafetyStreak } from '../services/safety.js';
import { getCachedWeather, fetchWeather } from '../services/weather.js';
import { formatINRCompact } from '../../shared/currency.js';

const router = Router();

const copilotSchema = z.object({
  projectId: z.string().min(1),
  query: z.string().min(1).max(2000),
}).strict();

// In-memory rate limiter: 12 requests / 60 s per IP
// NOTE: single-replica only. Use ALB/WAF or a shared store (Redis) for multi-instance.
const ipWindowMs = 60_000;
const ipLimit = 12;
const ipMap = new Map<string, { count: number; resetAt: number }>();

function checkCopilotRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + ipWindowMs });
    return true;
  }
  if (entry.count >= ipLimit) return false;
  entry.count++;
  return true;
}

async function buildContext(projectId: string, userRole: string): Promise<string> {
  const [project, tasks, invoices, incidents] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.task.findMany({ where: { projectId } }),
    prisma.invoice.findMany({ where: { projectId, isDeleted: false } }),
    prisma.incident.findMany({ where: { projectId, isDeleted: false } }),
  ]);

  if (!project) return 'Project not found.';

  const weather = getCachedWeather() ?? await fetchWeather();

  const evm = calculateEVM(
    { budgetInr: Number(project.budgetInr), statusDate: project.statusDate.toISOString() },
    tasks.map(t => ({
      id: t.id,
      startDate: t.startDate.toISOString(),
      endDate: t.endDate.toISOString(),
      progress: t.progress,
      budgetedCostInr: Number(t.budgetedCostInr),
    })),
    invoices.map(i => ({
      id: i.id,
      amountInr: Number(i.amountInr),
      status: i.status as 'Pending' | 'Approved' | 'Paid' | 'Rejected',
    }))
  );

  const safetyStreak = calculateSafetyStreak(
    { startDate: project.startDate.toISOString(), statusDate: project.statusDate.toISOString() },
    incidents.map(i => ({
      id: i.id,
      occurredAt: i.occurredAt.toISOString(),
      severity: i.severity,
      type: i.type,
      status: i.status,
      isLostTime: i.isLostTime,
    }))
  );

  const openIncidents = incidents.filter(i => i.status === 'Open' || i.status === 'Investigating');
  const criticalTasks = tasks.filter(t => t.priority === 'Critical');
  const delayedTasks = tasks.filter(t => t.status === 'Delayed');
  const pendingInvoices = invoices.filter(i => i.status === 'Pending');

  return `You are ConstructIQ Copilot, an expert AI construction project intelligence assistant.

## Live Project: ${project.name} (${project.location})
- Status Date: ${project.statusDate.toISOString().split('T')[0]}
- Budget (BAC): ${formatINRCompact(Number(project.budgetInr))}
- EVM: EV=${formatINRCompact(evm.ev)} | AC=${formatINRCompact(evm.ac)} | CPI=${evm.cpi?.toFixed(2) ?? 'n/a'} | SPI=${evm.spi?.toFixed(2) ?? 'n/a'}
- EAC: ${evm.eac ? formatINRCompact(evm.eac) : 'n/a'} | VAC: ${evm.vac ? formatINRCompact(evm.vac) : 'n/a'}
- Budget Burn: ${evm.budgetBurnPercentage.toFixed(1)}%
- Physical Completion: ${evm.physicalCompletionPercentage.toFixed(1)}%

## Tasks (${tasks.length} total)
${tasks.map(t => `- [${t.status}] ${t.name}: ${t.progress}% (${t.priority}) – ${t.assignedCrew}`).join('\n')}
- Critical tasks: ${criticalTasks.map(t => t.name).join(', ') || 'None'}
- Delayed tasks: ${delayedTasks.length === 0 ? 'None' : delayedTasks.map(t => t.name).join(', ')}

## Financials
- Pending invoices: ${pendingInvoices.length} | Total pending: ${formatINRCompact(pendingInvoices.reduce((s, i) => s + Number(i.amountInr), 0))}
- Crane halt active: ${project.craneHalt ? 'YES – manual clearance required' : 'No'}

## Safety
- Days without lost-time incident: ${safetyStreak}
- Open incidents: ${openIncidents.length}

## Weather
- Condition: ${weather.condition}, ${weather.temp}°F, Wind: ${weather.wind}mph
- Crane halt risk: ${weather.craneHaltRisk ? 'YES (>20mph)' : 'No'}

## User Role: ${userRole}

Provide expert, concise, actionable intelligence tailored to the ${userRole}'s responsibilities.
Use ₹ INR for all financial figures. Be precise, professional, and site-focused.`;
}

async function callNvidiaNim(systemPrompt: string, query: string): Promise<string> {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.NVIDIA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA NIM error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? '';
}

async function callGemini(systemPrompt: string, query: string): Promise<string> {
  // Use @google/genai SDK
  const { GoogleGenAI } = await import('@google/genai');
  const genai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY! });
  const result = await genai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `${systemPrompt}\n\nUser query: ${query}`,
  });
  return result.text ?? '';
}

router.post(
  '/',
  requireAuth,
  requirePermission('copilot:chat'),
  async (req: Request, res: Response): Promise<void> => {
    const ip = (req.ip ?? 'unknown').replace('::ffff:', '');
    if (!checkCopilotRateLimit(ip)) {
      res.status(429).json({ error: 'Too many requests. Limit: 12 per minute.' });
      return;
    }

    const parsed = copilotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { projectId, query } = parsed.data;
    const user = (req as any).user;

    // Verify project membership
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });
    if (!member) {
      res.status(403).json({ error: 'Not a member of this project' });
      return;
    }

    const hasNvidia = Boolean(config.NVIDIA_API_KEY);
    const hasGemini = Boolean(config.GEMINI_API_KEY);

    if (!hasNvidia && !hasGemini) {
      res.status(503).json({
        error: 'No AI API keys configured. Set NVIDIA_API_KEY or GEMINI_API_KEY in the server environment.',
        text: 'AI unavailable — set NVIDIA_API_KEY or GEMINI_API_KEY on the server.',
      });
      return;
    }

    try {
      const systemPrompt = await buildContext(projectId, user.role);
      let text: string;
      let provider: string;

      if (hasNvidia) {
        try {
          text = await callNvidiaNim(systemPrompt, query);
          provider = 'NVIDIA NIM';
        } catch (nvErr) {
          if (!hasGemini) throw nvErr;
          text = await callGemini(systemPrompt, query);
          provider = 'Gemini';
        }
      } else {
        text = await callGemini(systemPrompt, query);
        provider = 'Gemini';
      }

      res.json({ text, provider });
    } catch (err: any) {
      res.status(502).json({ error: `AI request failed: ${err.message ?? 'Unknown error'}` });
    }
  }
);

export default router;

