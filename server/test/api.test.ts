import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import * as sessionModule from '../auth/session.js';

describe('Phase E: REST API Route Validation and Role Protection', () => {
  describe('GET /api/health', () => {
    it('returns ok status, version, and demoMode flag', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.version).toBe('0.1.0');
      expect(res.body).toHaveProperty('demoMode');
    });
  });

  describe('Authentication Enforcement (401)', () => {
    it('rejects unauthenticated requests to protected endpoints', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authentication required');
    });

    it('rejects invalid or expired session tokens', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce(null);
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', ['constructiq_session=invalid_nonexistent_session_token']);
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Session invalid or expired');
    });
  });

  describe('Zod Payload Validation (400)', () => {
    it('rejects login requests with missing or invalid fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email' }); // missing password, bad email
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid request body');
    });

    it('rejects login requests with unknown fields (.strict())', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'pm@constructiq.demo',
          password: 'somepassword',
          hackerField: 'malicious_injection',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('Role Authorization Matrix Enforcement (403)', () => {
    it('blocks SiteSupervisor from creating tasks (tasks:create is PM only)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'mock-session-sup',
        userId: 'user-supervisor',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        createdAt: new Date(),
        user: {
          id: 'user-supervisor',
          email: 'supervisor@constructiq.demo',
          name: 'Priya Patel',
          title: 'Site Superintendent',
          role: 'SiteSupervisor' as any,
          isActive: true,
          passwordHash: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [],
        },
      } as any);

      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', ['constructiq_session=mock-session-sup'])
        .send({
          projectId: 'd0000000-0000-0000-0000-000000000000',
          name: 'Supervisor Unauthorized Task',
          phase: 'Framing',
          startDate: '2026-08-01',
          endDate: '2026-08-15',
          assignedCrew: 'Crew A',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
      expect(res.body.error).toContain('SiteSupervisor');
    });

    it('blocks ProjectManager from approving invoices (invoices:approve is FinanceManager only)', async () => {
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
          memberships: [],
        },
      } as any);

      const res = await request(app)
        .patch('/api/invoices/mock-invoice-id/status')
        .set('Cookie', ['constructiq_session=mock-session-pm'])
        .send({ status: 'Approved' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('FinanceManager');
    });

    it('blocks SiteSupervisor from reading invoices (invoices:read restricted)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'mock-session-sup-inv',
        userId: 'user-supervisor',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        createdAt: new Date(),
        user: {
          id: 'user-supervisor',
          email: 'supervisor@constructiq.demo',
          name: 'Priya Patel',
          title: 'Site Superintendent',
          role: 'SiteSupervisor' as any,
          isActive: true,
          passwordHash: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [],
        },
      } as any);

      const res = await request(app)
        .get('/api/invoices?projectId=d0000000-0000-0000-0000-000000000000')
        .set('Cookie', ['constructiq_session=mock-session-sup-inv']);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });
  });
});
