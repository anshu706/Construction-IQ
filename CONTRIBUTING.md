# Contributing to ConstructIQ

Thank you for contributing to ConstructIQ! We welcome issues, suggestions, and pull requests to help make construction project intelligence more reliable and performant.

## Development Workflow

1. Clone the repository and copy `.env.example` to `.env`.
2. Run `npm install` to install dependencies.
3. Start the database using Docker Compose: `docker compose up -d db`.
4. Apply Prisma migrations and seed demo data: `npm run db:migrate && npm run db:seed`.
5. Start development servers:
   - Frontend: `npm run dev` (Vite on port 3000)
   - Server: `npm run server:dev` (Express API on port 3001)

## Quality Standards

Before submitting a PR, ensure all checks pass:
- Type checking & linting: `npm run lint`
- Automated test suite: `npm test`
- Build verification: `npm run build`

## Commit Convention

We enforce the Conventional Commits specification:
- `feat:` New features
- `fix:` Bug fixes
- `test:` Adding or updating tests
- `chore:` Maintenance, dependency updates, and build tasks
- `ci:` Continuous integration workflows
- `docs:` Documentation improvements
