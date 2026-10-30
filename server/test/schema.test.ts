import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase B: Schema and Seed Integrity', () => {
  it('has a valid Prisma schema file with all required enterprise tables', () => {
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    expect(fs.existsSync(schemaPath)).toBe(true);

    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const requiredTables = [
      'model User',
      'model Session',
      'model Project',
      'model ProjectMember',
      'model Task',
      'model TaskDependency',
      'model Invoice',
      'model Incident',
      'model PunchItem',
      'model Photo',
      'model Milestone',
      'model Risk',
      'model ActivityLog',
    ];

    for (const table of requiredTables) {
      expect(schemaContent).toContain(table);
    }

    const requiredEnums = [
      'enum Role',
      'enum TaskPhase',
      'enum TaskStatus',
      'enum Priority',
      'enum InvoiceCategory',
      'enum InvoiceStatus',
      'enum IncidentSeverity',
      'enum IncidentType',
      'enum IncidentStatus',
      'enum PunchSeverity',
      'enum PunchStatus',
    ];

    for (const enumDef of requiredEnums) {
      expect(schemaContent).toContain(enumDef);
    }
  });

  it('has initial migration SQL with table and constraint definitions', () => {
    const migrationPath = path.resolve(__dirname, '../../prisma/migrations/20261031000000_init/migration.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    expect(sqlContent).toContain('CREATE TABLE "users"');
    expect(sqlContent).toContain('CREATE TABLE "projects"');
    expect(sqlContent).toContain('CREATE TABLE "tasks"');
    expect(sqlContent).toContain('CREATE TABLE "invoices"');
    expect(sqlContent).toContain('CREATE TABLE "incidents"');
    expect(sqlContent).toContain('CREATE TABLE "punch_items"');
    expect(sqlContent).toContain('CREATE TABLE "photos"');
    expect(sqlContent).toContain('ALTER TABLE "task_dependencies" ADD CONSTRAINT');
  });

  it('verifies seed script defines all 5 demo roles with secure hashing', () => {
    const seedPath = path.resolve(__dirname, '../../prisma/seed.ts');
    expect(fs.existsSync(seedPath)).toBe(true);

    const seedContent = fs.readFileSync(seedPath, 'utf-8');
    expect(seedContent).toContain('pm@constructiq.demo');
    expect(seedContent).toContain('supervisor@constructiq.demo');
    expect(seedContent).toContain('finance@constructiq.demo');
    expect(seedContent).toContain('safety@constructiq.demo');
    expect(seedContent).toContain('exec@constructiq.demo');
    expect(seedContent).toContain('bcrypt.hash');
  });
});
