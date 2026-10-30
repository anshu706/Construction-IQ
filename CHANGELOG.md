# Changelog

All notable changes to ConstructIQ will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-31

### Added
- PostgreSQL schema and Prisma ORM data persistence replacing localStorage.
- Role-based access control with 5 distinct roles (`ProjectManager`, `SiteSupervisor`, `FinanceManager`, `SafetyOfficer`, `Executive`).
- Earned Value Management (EVM) calculation engine (BAC, EV, PV, AC, CPI, SPI, EAC, VAC).
- Critical Path Method (CPM) forward and backward pass engine with cycle rejection.
- Safety streak computation based on verifiable lost-time incident records.
- Open-Meteo weather caching with 15-minute TTL and stale telemetry fallback.
- Server-side context hydration for AI Copilot with NVIDIA NIM and Gemini API fallback.
- Multi-stage Docker containerization and Docker Compose setup.
- CI/CD workflow with GitHub Actions.
- Terraform infrastructure as code for AWS deployment.

### Fixed
- Removed hard-coded CPI/SPI clamping in metric cards.
- Fixed photo upload pipelines to store and render genuine uploaded files.
- Enforced server-side validation rejecting cyclic dependencies.
- Replaced colliding task and invoice sequence IDs with database-backed UUIDs.
