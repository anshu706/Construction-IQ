/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/weather?projectId=xxx
 * Returns current weather with 15-min cache; updates crane-halt flag on project.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { prisma } from '../db.js';
import { fetchWeather } from '../services/weather.js';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const weather = await fetchWeather();

    // If a project is specified and crane halt risk is detected, persist it
    if (projectId && weather.craneHaltRisk) {
      await prisma.project.updateMany({
        where: { id: projectId, craneHalt: false },
        data: { craneHalt: true },
      });
    }

    res.json({ weather });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

export default router;

