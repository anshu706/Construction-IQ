/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConstructIQ – Production Express Application Server
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { prisma } from './db.js';

// Route handlers
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import invoiceRoutes from './routes/invoices.js';
import incidentRoutes from './routes/incidents.js';
import punchItemRoutes from './routes/punchItems.js';
import riskRoutes from './routes/risks.js';
import milestoneRoutes from './routes/milestones.js';
import logRoutes from './routes/logs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://integrate.api.nvidia.com https://api.open-meteo.com"
  );
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.SESSION_SECRET));

// Static files (uploads & built frontend)
const uploadsPath = path.resolve(config.UPLOAD_DIR);
app.use('/uploads', express.static(uploadsPath));

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// API Routers
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/punch-items', punchItemRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/logs', logRoutes);

// Liveness Health Check
app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    version: '0.1.0',
    demoMode: config.DEMO_MODE,
    aiAvailable: Boolean(config.NVIDIA_API_KEY || config.GEMINI_API_KEY),
  });
});

// Readiness Health Check (validates DB connectivity)
app.get('/api/ready', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

// Production SPA fallback
app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) res.status(404).send('Not found');
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`[ConstructIQ Server] Listening on port ${config.PORT} (mode: ${config.NODE_ENV})`);
  });
}

export default app;
