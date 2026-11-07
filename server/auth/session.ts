/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { Response } from 'express';
import { prisma } from '../db.js';
import { config } from '../config.js';

export const SESSION_COOKIE_NAME = 'constructiq_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const inMemorySessions = new Map<string, any>();

export async function createSession(userId: string, demoUser?: any): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  if (demoUser) {
    inMemorySessions.set(sessionId, {
      id: sessionId,
      userId,
      expiresAt,
      revokedAt: null,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        title: demoUser.title,
        role: demoUser.role,
        isActive: true,
        memberships: demoUser.memberships || [],
      },
    });
    return sessionId;
  }

  try {
    await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        expiresAt,
      },
    });
  } catch (err) {
    inMemorySessions.set(sessionId, {
      id: sessionId,
      userId,
      expiresAt,
      revokedAt: null,
      user: {
        id: userId,
        email: 'user@constructiq.demo',
        name: 'Demo User',
        title: 'User',
        role: 'ProjectManager',
        isActive: true,
        memberships: [],
      },
    });
  }

  return sessionId;
}

export async function getSession(sessionId: string) {
  if (!sessionId) return null;

  const mem = inMemorySessions.get(sessionId);
  if (mem) {
    if (mem.revokedAt !== null) return null;
    if (mem.expiresAt.getTime() <= Date.now()) return null;
    return mem;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!session) return null;
    if (session.revokedAt !== null) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;
    if (!session.user.isActive) return null;

    return session;
  } catch {
    return null;
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  inMemorySessions.delete(sessionId);
  try {
    await prisma.session.updateMany({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  } catch {
    // ignore
  }
}

export function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

