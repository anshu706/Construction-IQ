# Contributing to ConstructIQ

Thank you for contributing to ConstructIQ! We welcome issues, suggestions, and pull requests to help make construction project intelligence more reliable, secure, and maintainable.

---

## Development Workflow

### Prerequisites
- Node.js 20 LTS
- npm 10+
- Docker and Docker Compose (or local PostgreSQL 16)

### Local Setup
1. Clone the repository and copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local PostgreSQL database using Docker Compose:
   ```bash
   npm run docker:up
   ```
4. Run Prisma database migrations and seed baseline demo accounts:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
5. Start development servers:
   - Full-stack dev mode:
     ```bash
     npm run dev         # Frontend on http://localhost:3000
     npm run server:dev  # Express API on http://localhost:3001
     ```

---

## Available Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Starts the Vite development server on port 3000 |
| `npm run server:dev` | Starts the Express server with live reload via `tsx` on port 3001 |
| `npm run build` | Compiles frontend assets and bundles server to `dist/server.js` |
| `npm run start` | Executes the compiled production server (`node dist/server.js`) |
| `npm run lint` | Performs strict TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Runs the full Vitest automated test suite |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run db:generate` | Generates the `@prisma/client` TypeScript library from schema |
| `npm run db:migrate` | Applies pending Prisma migrations against `DATABASE_URL` |
| `npm run db:seed` | Populates PostgreSQL with baseline users and project demo records |
| `npm run docker:build` | Builds the production multi-stage Docker container |
| `npm run docker:up` | Starts PostgreSQL and background services with Docker Compose |
| `npm run docker:down` | Stops and tears down Docker Compose containers |

---

## Pull Request Checklist

Before submitting a pull request, ensure all gates pass:

- [ ] **Type Safety & Lint**: `npm run lint` passes without any TypeScript warnings or errors.
- [ ] **Test Suite**: `npm test` passes all tests across schema, permissions, domain calculations, and API routes.
- [ ] **Production Build**: `npm run build` succeeds and produces clean client and server bundles in `dist/`.
- [ ] **No Secrets**: Confirm no API keys, private passwords, or AWS tokens appear in diffs (check `git diff`).
- [ ] **Zod Validation**: Any newly added API endpoints have schema validation using `.strict()`.
- [ ] **RBAC Authorization**: Any new API route enforces `requirePermission(action)`.
- [ ] **Database Integrity**: Schema updates include committed migration SQL in `prisma/migrations/`.
- [ ] **Documentation**: `CHANGELOG.md` updated under `[Unreleased]` and `README.md` updated if environment variables changed.

---

## Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:
- `feat:` New features or capabilities
- `fix:` Bug fixes and corrections
- `test:` Adding or updating test suites
- `chore:` Dependency maintenance, configuration, and tooling
- `ci:` GitHub Actions workflow and pipeline changes
- `docs:` Documentation improvements and ADR updates
