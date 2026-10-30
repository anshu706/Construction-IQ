/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long'),
  DEMO_MODE: z
    .string()
    .optional()
    .transform(val => val === 'true' || val === '1'),
  DEMO_PASSWORD: z.string().default('DemoPass123!'),
  NVIDIA_API_KEY: z.string().optional().default(''),
  NVIDIA_MODEL: z.string().default('meta/llama-3.2-11b-vision-instruct'),
  GEMINI_API_KEY: z.string().optional().default(''),
  UPLOAD_DIR: z.string().default('./uploads'),
  S3_BUCKET: z.string().optional().default(''),
  AWS_REGION: z.string().default('us-east-1'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ [ConstructIQ Config Error] Missing or invalid environment variables:\n${errorDetails}\n`);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

