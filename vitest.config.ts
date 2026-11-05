import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    // Server integration tests (supertest/Express) must run in 'node' environment.
    // 'jsdom' blocks TCP loopback connections causing EACCES errors with supertest.
    // All test files in this project are server-side Node.js tests.
    // If React component unit tests are added under src/, set environment per-file
    // using a vitest.workspace.ts with separate client/server projects.
    environment: 'node',
    setupFiles: [],
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/services/**', 'shared/**'],
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
