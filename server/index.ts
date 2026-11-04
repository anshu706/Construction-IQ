/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConstructIQ – Production Express Application Server
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { config } from './config.js';
import { prisma } from './db.js';
import logger from './logger.js';

// Route handlers
import authRoutes      from './routes/auth.js';
import projectRoutes   from './routes/projects.js';
import taskRoutes      from './routes/tasks.js';
import invoiceRoutes   from './routes/invoices.js';
import incidentRoutes  from './routes/incidents.js';
import punchItemRoutes from './routes/punchItems.js';
import riskRoutes      from './routes/risks.js';
import milestoneRoutes from './routes/milestones.js';
import logRoutes       from './routes/logs.js';
import copilotRoutes   from './routes/copilot.js';
import photoRoutes     from './routes/photos.js';
import weatherRoutes   from './routes/weather.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// ── Request ID ───────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).requestId = id;
  res.setHeader('x-request-id', id);
  next();
});

// ── Pino HTTP logging ────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req as any).requestId,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.passwordHash'],
      censor: '[REDACTED]',
    },
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

// ── Security Headers (helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 'unsafe-inline' for style-src: required by Tailwind CSS v4 runtime injection in dev.
        // In production, consider a nonce-based CSP if you need stricter styles.
        // See SECURITY.md for the rationale.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: [
          "'self'",
          'https://integrate.api.nvidia.com',
          'https://generativelanguage.googleapis.com',
          'https://api.open-meteo.com',
        ],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.SESSION_SECRET));

// ── Metrics (prom-client) ─────────────────────────────────────────────────────
// IMPORTANT: This endpoint must NOT be exposed through the public ALB.
// Add an ALB listener rule that returns 404 for path /metrics from the internet.
// In Terraform: see modules/alb/main.tf for the blocking rule.
import('/api/metrics' as any).catch(() => {}); // lazy, see metricsRoutes below
import { createServer } from 'http';

let metricsHandler: ((req: Request, res: Response) => void) | null = null;
(async () => {
  try {
    const client = await import('prom-client');
    const register = client.register;
    client.collectDefaultMetrics({ register });

    const httpRequestCount = new client.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [register],
    });

    const httpDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = process.hrtime.bigint();
      res.on('finish', () => {
        const dur = Number(process.hrtime.bigint() - start) / 1e9;
        const route = req.route?.path ?? req.path;
        httpRequestCount.inc({ method: req.method, route, status: res.statusCode });
        httpDuration.observe({ method: req.method, route, status: res.statusCode }, dur);
      });
      next();
    });

    metricsHandler = async (_req: Request, res: Response) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    };

    logger.info('prom-client metrics enabled');
  } catch {
    logger.warn('prom-client not installed; /metrics disabled');
  }
})();

app.get('/metrics', (req: Request, res: Response) => {
  if (metricsHandler) {
    metricsHandler(req, res);
  } else {
    res.status(404).json({ error: 'Metrics not available' });
  }
});

// ── Static files (built frontend only; /uploads removed – use /api/photos/:id) ──
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// ── API Routers ───────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/projects',    projectRoutes);
app.use('/api/tasks',       taskRoutes);
app.use('/api/invoices',    invoiceRoutes);
app.use('/api/incidents',   incidentRoutes);
app.use('/api/punch-items', punchItemRoutes);
app.use('/api/risks',       riskRoutes);
app.use('/api/milestones',  milestoneRoutes);
app.use('/api/logs',        logRoutes);
app.use('/api/copilot',     copilotRoutes);
app.use('/api/photos',      photoRoutes);
app.use('/api/weather',     weatherRoutes);

// ── Health endpoints ──────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    version: '0.1.0',
    demoMode: config.DEMO_MODE,
    aiAvailable: Boolean(config.NVIDIA_API_KEY || config.GEMINI_API_KEY),
  });
});

app.get('/api/ready', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_req: Request, res: Response) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).send('Not found');
  });
});

// ── Server start + graceful shutdown ─────────────────────────────────────────
const server = http.createServer(app);
let isShuttingDown = false;

function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, 'Received shutdown signal — stopping new connections');

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected');
    } catch (err) {
      logger.error({ err }, 'Error disconnecting Prisma');
    }
    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 10 s if requests are still in flight
  setTimeout(() => {
    logger.error('Graceful shutdown timeout — forcing exit');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT, mode: config.NODE_ENV }, 'ConstructIQ server listening');
  });
}

export default app;
