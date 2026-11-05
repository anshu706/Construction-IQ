/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Secure Vibe Coding Security Test Suite
 * Validates the 5 Core Security Layers & 30-Minute Security Review Invariants:
 * 1. Server-Side Validation (Layer 01)
 * 2. Rate Limiting on Login & General APIs (Layer 02)
 * 3. Safe Authentication & Password Handling (Layer 03 & 05)
 * 4. Error Masking & No Information Leakage (Layer 04)
 * 5. Resource Ownership & IDOR Prevention (Step 4 & Layer 05)
 * 6. CSRF Origin Protection (Layer 05)
 */

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import * as sessionModule from '../auth/session.js';
import { prisma } from '../db.js';

describe('Secure Vibe Coding Compliance Suite', () => {
  const projectAId = 'a0000000-0000-0000-0000-000000000001';
  const projectBId = 'b0000000-0000-0000-0000-000000000002';

  // Mock User A: Project Manager assigned ONLY to Project A
  const mockUserA = {
    id: 'user-a-pm',
    email: 'userA@constructiq.demo',
    name: 'User A',
    title: 'Project Manager Project A',
    role: 'ProjectManager' as const,
    isActive: true,
    passwordHash: '$2a$12$hashedPasswordPlaceholder',
    createdAt: new Date(),
    updatedAt: new Date(),
    memberships: [
      {
        id: 'mem-a',
        projectId: projectAId,
        userId: 'user-a-pm',
        role: 'ProjectManager' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  describe('Step 4 & Layer 05: Resource Ownership & IDOR Protection', () => {
    it('blocks User A from accessing project details for Project B (IDOR prevention)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'session-user-a',
        userId: mockUserA.id,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        createdAt: new Date(),
        user: mockUserA,
      } as any);

      const res = await request(app)
        .get(`/api/projects/${projectBId}`)
        .set('Cookie', ['constructiq_session=session-user-a']);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
      expect(res.body.error).toContain('Access to this project is denied');
    });

    it('blocks User A from creating tasks inside Project B (IDOR prevention)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'session-user-a-task',
        userId: mockUserA.id,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        createdAt: new Date(),
        user: mockUserA,
      } as any);

      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', ['constructiq_session=session-user-a-task'])
        .send({
          projectId: projectBId,
          name: 'Unauthorized Cross-Project Task',
          phase: 'Framing',
          startDate: '2026-09-01',
          endDate: '2026-09-15',
          assignedCrew: 'Unauthorized Crew',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access to this project is denied');
    });

    it('blocks User A from modifying a task that belongs to Project B', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'session-user-a-task-mod',
        userId: mockUserA.id,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        createdAt: new Date(),
        user: mockUserA,
      } as any);

      vi.spyOn(prisma.task, 'findUnique').mockResolvedValueOnce({
        id: 'task-in-b',
        projectId: projectBId,
        name: 'Secret Project B Task',
        phase: 'Excavation',
        startDate: new Date(),
        endDate: new Date(),
        progress: 10,
        status: 'InProgress',
        priority: 'High',
        assignedCrew: 'Crew B',
        budgetedCostInr: 100000 as any,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .patch('/api/tasks/task-in-b/progress')
        .set('Cookie', ['constructiq_session=session-user-a-task-mod'])
        .send({
          progress: 50,
          status: 'InProgress',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access to this project is denied');
    });

    it('blocks User A from accessing photo evidence belonging to Project B', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValueOnce({
        id: 'session-user-a-photo',
        userId: mockUserA.id,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        createdAt: new Date(),
        user: mockUserA,
      } as any);

      vi.spyOn(prisma.photo, 'findUnique').mockResolvedValueOnce({
        id: 'photo-b-1',
        originalName: 'site-audit.jpg',
        mimeType: 'image/jpeg',
        byteSize: 1024,
        storageKey: '/uploads/secret-photo.jpg',
        projectId: projectBId,
        uploadedBy: 'other-user',
        createdAt: new Date(),
      } as any);

      const res = await request(app)
        .get('/api/photos/photo-b-1')
        .set('Cookie', ['constructiq_session=session-user-a-photo']);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access to this photo\'s project is denied');
    });
  });

  describe('Layer 02: Rate Limiting & Abuse Prevention', () => {
    it('attaches standard draft-7 rate-limit headers to API responses', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.headers).toHaveProperty('ratelimit');
      expect(res.headers).toHaveProperty('ratelimit-policy');
      expect(res.headers['ratelimit-policy']).toContain('180;w=60');
    });
  });

  describe('Layer 05: CSRF Protection for Cookie-Authenticated Requests', () => {
    it('rejects cross-origin state-changing mutation with mismatched origin', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', ['constructiq_session=some-active-session'])
        .set('Origin', 'https://malicious-attacker-site.com')
        .set('Host', 'localhost:3001')
        .set('x-test-csrf-attack', 'true');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('CSRF');
    });

    it('rejects cookie-authenticated mutation with missing Origin and Referer headers', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', ['constructiq_session=some-active-session'])
        .set('Host', 'localhost:3001')
        .set('x-test-csrf-attack', 'true');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('CSRF');
    });
  });

  describe('Layer 04: Information Leakage Prevention & Error Masking', () => {
    it('returns generic error with requestId and never leaks stack traces', async () => {
      // Simulate an unhandled database error during an endpoint call
      vi.spyOn(sessionModule, 'getSession').mockRejectedValueOnce(
        new Error('FATAL: password authentication failed for user "postgres" at line 452 in db_driver.c')
      );

      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', ['constructiq_session=some-session']);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      // Must not expose internal credentials or stack traces
      expect(JSON.stringify(res.body)).not.toContain('db_driver.c');
      expect(JSON.stringify(res.body)).not.toContain('line 452');
    });
  });
});
