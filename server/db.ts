/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

let dbAvailable: boolean | null = null;
let lastCheck = 0;

export async function isDatabaseAvailable(): Promise<boolean> {
  const now = Date.now();
  if (dbAvailable !== null && now - lastCheck < 15_000) {
    return dbAvailable;
  }
  lastCheck = now;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DB Timeout')), 1500)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    dbAvailable = true;
    return true;
  } catch {
    dbAvailable = false;
    return false;
  }
}

export function markDatabaseUnavailable() {
  dbAvailable = false;
  lastCheck = Date.now();
}

export default prisma;

