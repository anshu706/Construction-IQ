# Changelog

All notable changes to ConstructIQ will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Containerization**: Multi-stage `Dockerfile` (`node:20-bookworm-slim` with `deps`, `build`, `migrate`, and non-root `runtime` stages).
- **Docker Compose**: Hardened `docker-compose.yml` with PostgreSQL 16 healthchecks, strict `${VAR:?}` environment variable validation, and named volumes for database and uploads.
- **CI/CD Pipelines**:
  - `.github/workflows/ci.yml`: Multi-step verification (npm ci, lint, Vitest against Postgres 16 service, build, npm audit, Docker build, Hadolint, and Trivy security scanning).
  - `.github/workflows/cd.yml`: OIDC AWS authentication, automated ECR container publishing, one-off ECS migration tasks (`prisma migrate deploy`), rolling deployment to ECS Fargate, post-deploy health/readiness smoke tests, and automatic rollback on failure.
  - `.github/dependabot.yml`: Automated weekly dependency tracking across npm, docker, github-actions, and terraform ecosystems.
  - `.github/pull_request_template.md`: Standardized review checklist covering lint, tests, migrations, secrets scanning, and docs.
- **Infrastructure as Code (Terraform)**:
  - AWS reusable modules in `terraform/modules/`: `network` (VPC, public/private subnets, NAT, security groups), `ecr` (repo with scanning and 20-image retention), `rds` (PostgreSQL 16, private subnets, encrypted gp3 storage, automated backups), `alb` (HTTPS listener, HTTP-to-HTTPS redirect, target group with `/api/ready` healthcheck, and external `/metrics` path block), `ecs` (Fargate cluster, task definition, autoscaling, and migration task), `s3` (private versioned bucket for uploads), `secrets` (AWS Secrets Manager entries for credentials), and `observability` (CloudWatch log groups, 5 alarms, and ops dashboard).
  - Multi-environment configurations in `terraform/envs/dev` and `terraform/envs/prod`.
  - Bootstrap module in `terraform/bootstrap` for remote S3 state and DynamoDB distributed locking table.
  - Remote S3 backend definition in `terraform/backend.tf`.
- **Application Hardening**:
  - Pino structured JSON logging and `pino-http` middleware with correlation request ID (`x-request-id`) propagation and sensitive field redaction.
  - Helmet security headers with strict Content Security Policy (CSP), frameguard, nosniff, and referrer policy.
  - Graceful process termination on `SIGTERM` and `SIGINT` with 10-second request draining and clean Prisma database disconnection.
  - Express rate limiting (`express-rate-limit`) on login and Copilot endpoints.
  - Prometheus metrics instrumentation (`/metrics`) using `prom-client` collecting Node runtime telemetry and HTTP request duration histograms.
- **Functional Completion**:
  - Authenticated photo upload endpoint (`POST /api/photos/upload`) with binary magic-byte inspection (JPEG, PNG, WebP) and 10MB size limit.
  - Authenticated photo retrieval endpoint (`GET /api/photos/:id`) generating 5-minute presigned S3 URLs (with local dev fallback).
  - AI Copilot endpoint (`POST /api/copilot`) with server-side live telemetry hydration and resilient failover (NVIDIA NIM -> Gemini -> 503).
  - Open-Meteo weather service (`GET /api/weather`) with 15-minute in-memory caching and stale fallback.
- **Documentation**:
  - Architecture Decision Records in `docs/adr/` (ADR 0001: ECS Fargate over EKS; ADR 0002: Prisma over raw SQL; ADR 0003: OIDC over static AWS keys; ADR 0004: S3 presigned URLs over public static uploads).

### Changed
- Upgraded `multer` to 2.x and resolved safe dependency vulnerabilities with `npm audit fix`.
- Removed public `/uploads` static file routing to enforce authenticated access.
- Moved client-side authentication and project state to TanStack Query hooks with automatic cache invalidation.

## [0.1.0] - 2026-10-31

### Added
- PostgreSQL schema and Prisma ORM data persistence replacing browser localStorage.
- Role-based access control with 5 distinct roles (`ProjectManager`, `SiteSupervisor`, `FinanceManager`, `SafetyOfficer`, `Executive`).
- Earned Value Management (EVM) calculation engine (BAC, EV, PV, AC, CPI, SPI, EAC, VAC) with exact zero-denominator handling.
- Critical Path Method (CPM) forward and backward pass engine with Kahn's algorithm cycle rejection.
- Safety streak computation based on verifiable lost-time incident records.
- Comprehensive REST API endpoints for tasks, invoices, incidents, punch items, milestones, risks, and activity logs.
- Automated Vitest test suites verifying schema integrity, permissions matrix, and domain calculation algorithms.

### Fixed
- Removed hard-coded CPI/SPI clamping in metric cards.
- Fixed photo upload pipelines to store and render genuine uploaded files.
- Enforced server-side validation rejecting cyclic task dependencies.
- Replaced colliding task and invoice sequence IDs with database-backed UUIDs.
