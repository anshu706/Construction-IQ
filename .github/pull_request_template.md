## Pull Request Checklist

### Type of change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Infrastructure / DevOps change
- [ ] Documentation update

### Checklist
- [ ] `npm run lint` passes (tsc --noEmit returns 0 errors)
- [ ] `npm test` passes (all Vitest suites green)
- [ ] `npm run build` succeeds
- [ ] No secrets, API keys, or credentials in this PR (run `grep -r "AKIA\|password\s*=" --include="*.ts" --include="*.yml"`)
- [ ] New API routes have Zod validation and role authorization
- [ ] Database changes include a Prisma migration file
- [ ] Migration is backward-compatible or deployment plan accounts for downtime
- [ ] CHANGELOG.md updated under `[Unreleased]`
- [ ] README.md updated if the architecture or env vars changed
- [ ] Tests added for new behaviour (domain services, API routes, auth)
- [ ] No `dangerouslySetInnerHTML` with user-supplied content

### Migration impact
Describe any database schema changes and their impact on running services:

> _none / [describe migration]_

### Screenshots / recordings (if UI change)

> _attach or leave blank_

### Deployment notes

> _special steps, feature flags, seed data required?_

