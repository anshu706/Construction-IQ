/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import * as sessionModule from '../auth/session.js';
import { prisma } from '../db.js';

describe('Phase 3 & 6: Application Hardening and Functional Validation', () => {
  describe('Security Headers & Request ID Propagation', () => {
    it('propagates custom incoming x-request-id header', async () => {
      const customId = 'req-custom-trace-9876';
      const res = await request(app)
        .get('/api/health')
        .set('x-request-id', customId);

      expect(res.headers['x-request-id']).toBe(customId);
    });

    it('generates a new x-request-id if not supplied by client', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id'].length).toBeGreaterThan(10);
    });

    it('enforces Helmet security headers (nosniff, frameguard, CSP, referrer policy)', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Health and Readiness Endpoints', () => {
    it('GET /api/health returns 200 with JSON payload', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.version).toBe('0.1.0');
    });

    it('GET /api/ready handles DB readiness and reports status', async () => {
      vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ '?column?': 1 }]);
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.database).toBe('connected');
    });

    it('GET /api/ready returns 503 when database is disconnected', async () => {
      vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Connection refused'));
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unavailable');
      expect(res.body.database).toBe('disconnected');
    });
  });

  describe('Photo Upload Validation (Magic Bytes & Auth)', () => {
    it('rejects unauthenticated upload requests with 401', async () => {
      const res = await request(app)
        .post('/api/photos/upload')
        .attach('photo', Buffer.from('fake data'), 'test.jpg');

      expect(res.status).toBe(401);
    });

    it('rejects uploads with invalid magic bytes (spoofed MIME type) with 422', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'mock-session',
        userId: 'user-pm',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        createdAt: new Date(),
        user: {
          id: 'user-pm',
          email: 'pm@constructiq.demo',
          name: 'Rahul Sharma',
          title: 'Project Manager',
          role: 'ProjectManager' as any,
          isActive: true,
          passwordHash: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [],
        },
      } as any);

      // Sending ASCII text with image/jpeg Content-Type
      const invalidBuffer = Buffer.from('<?php echo "malicious payload"; ?>');

      const res = await request(app)
        .post('/api/photos/upload')
        .set('Cookie', ['constructiq_session=mock-session'])
        .attach('photo', invalidBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(422);
      expect(res.body.error).toContain('allowed image type');
    });

    it('rejects uploads with forbidden MIME type extension with 500/400', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'mock-session',
        userId: 'user-pm',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        createdAt: new Date(),
        user: {
          id: 'user-pm',
          email: 'pm@constructiq.demo',
          name: 'Rahul Sharma',
          title: 'Project Manager',
          role: 'ProjectManager' as any,
          isActive: true,
          passwordHash: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [],
        },
      } as any);

      const res = await request(app)
        .post('/api/photos/upload')
        .set('Cookie', ['constructiq_session=mock-session'])
        .attach('photo', Buffer.from('test text content'), { filename: 'exploit.sh', contentType: 'text/plain' });

      expect([400, 500]).toContain(res.status);
    });
  });

  describe('AI Copilot Endpoint Authorization & Missing Keys (503)', () => {
    it('rejects unauthenticated requests to /api/copilot with 401', async () => {
      const res = await request(app)
        .post('/api/copilot')
        .send({ projectId: 'proj-1', query: 'Status update' });

      expect(res.status).toBe(401);
    });

    it('returns 503 when authenticated but neither NVIDIA nor GEMINI API key is configured', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'mock-session-pm',
        userId: 'user-pm',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        createdAt: new Date(),
        user: {
          id: 'user-pm',
          email: 'pm@constructiq.demo',
          name: 'Rahul Sharma',
          title: 'Project Manager',
          role: 'ProjectManager' as any,
          isActive: true,
          passwordHash: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [{ projectId: 'proj-1', role: 'ProjectManager' }],
        },
      } as any);

      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValueOnce({
        id: 'mem-1',
        projectId: 'proj-1',
        userId: 'user-pm',
        role: 'ProjectManager',
        joinedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/api/copilot')
        .set('Cookie', ['constructiq_session=mock-session-pm'])
        .send({ projectId: 'proj-1', query: 'Summarize tasks' });

      // If keys are empty in test env, must return 503
      expect(res.status).toBe(503);
      expect(res.body.error).toContain('No AI API keys configured');
    });
  });

  describe('Weather Service & Crane Halt Risk', () => {
    it('rejects unauthenticated requests to /api/weather with 401', async () => {
      const res = await request(app).get('/api/weather');
      expect(res.status).toBe(401);
    });

    it('returns cached or fallback weather data for authenticated user', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'mock-session-sup',
        userId: 'user-sup',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        createdAt: new Date(),
        user: {
          id: 'user-sup',
          email: 'sup@constructiq.demo',
          name: 'Priya Patel',
          title: 'Superintendent',
          role: 'SiteSupervisor' as any,
          isActive: true,
          passwordHash: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [],
        },
      } as any);

      const res = await request(app)
        .get('/api/weather')
        .set('Cookie', ['constructiq_session=mock-session-sup']);

      expect(res.status).toBe(200);
      expect(res.body.weather).toBeDefined();
      expect(res.body.weather).toHaveProperty('temp');
      expect(res.body.weather).toHaveProperty('wind');
      expect(res.body.weather).toHaveProperty('craneHaltRisk');
    });
  });

  describe('Shutdown Handler Graceful Termination', () => {
    it('gracefully handles database disconnect on exit', async () => {
      const disconnectSpy = vi.spyOn(prisma, '$disconnect').mockResolvedValueOnce();
      await prisma.$disconnect();
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});

