# ADR 0002: Prisma ORM with Versioned SQL Migrations over Raw SQL

## Status
Accepted

## Context
ConstructIQ features complex financial and construction operational models, including Earned Value Management (EVM), Critical Path Method (CPM) task dependencies, multi-tier user role permissions, invoices, and safety incident reporting. The application requires strict type safety across database access layers, reproducible schema evolution, and automated migrations.

## Decision
We adopt **Prisma ORM** with declarative `schema.prisma` and explicit, committed SQL migration files (`prisma migrate deploy`).

## Consequences

### Positive
- **End-to-End Type Safety**: TypeScript types are generated directly from the database schema (`@prisma/client`), eliminating out-of-sync queries and schema-code mismatches.
- **Deterministic Migrations**: Migrations are committed as pure SQL in `prisma/migrations/`, auditable in Git, and executed idempotently in CI/CD via one-off ECS migration tasks.
- **Relational Integrity**: Foreign keys, cascade rules, and indexes are declaratively defined and enforced at both database and application levels.
- **Rapid Seeding**: Programmatic database seeding via `prisma/seed.ts` facilitates automated testing and local developer onboarding.

### Negative
- Prisma query engine adds a slight binary overhead to container images (addressed by using `node:20-bookworm-slim`).
- Complex analytical queries or bulk aggregations may occasionally require `$queryRaw`.

