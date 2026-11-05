# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Controls and Defenses

ConstructIQ implements defense-in-depth security principles across application code, container configuration, and cloud infrastructure:

### 1. Authentication and Session Management
- **Password Storage**: Passwords are hashed using bcrypt with salt rounds minimum 12. Plaintext passwords are never persisted or logged.
- **Session Tokens**: Session IDs are generated using `crypto.randomBytes(32)` (256-bit entropy).
- **Cookie Security**: Sessions are delivered via `httpOnly`, `SameSite=Lax` cookies with the `Secure` flag enforced in production.
- **Server-Side Validation**: Every authenticated request validates session existence, expiry timestamp (7-day TTL), and revocation state against PostgreSQL.

### 2. Role-Based Access Control (RBAC)
- **Granular Permissions Matrix**: A typed authorization matrix maps 5 distinct roles (`ProjectManager`, `SiteSupervisor`, `FinanceManager`, `SafetyOfficer`, `Executive`) across 26 discrete domain actions.
- **Server Enforcement**: All route handlers enforce `requirePermission(action)`. Unauthorized attempts are rejected with HTTP 403 Forbidden.
- **Project Boundary Enforcement**: Mutation routes verify project membership before executing state transitions.

### 3. HTTP Security Headers and CSP
- **Content Security Policy (CSP)**: Managed via `helmet`:
  ```
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self' https://integrate.api.nvidia.com https://generativelanguage.googleapis.com https://api.open-meteo.com;
  object-src 'none';
  frame-ancestors 'none';
  ```
  *(Note: `'unsafe-inline'` for `style-src` is currently permitted to accommodate dynamic Tailwind CSS runtime injection. In locked-down production environments with static CSS bundles, this can be transitioned to hash-based verification.)*
- **Clickjacking Protection**: `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- **MIME Sniffing Prevention**: `X-Content-Type-Options: nosniff`.
- **Referrer Privacy**: `Referrer-Policy: no-referrer`.
- **Hardware Isolation**: `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

### 4. Rate Limiting and DoS Prevention
- **Global API Rate Limiter**: 180 requests per minute per IP on all `/api/*` endpoints with standard draft-7 rate-limit headers (`ratelimit`, `ratelimit-policy`).
- **Login Rate Limiter**: 5 failed login attempts per minute per IP and email combination via `express-rate-limit`.
- **Copilot Query Limiter**: 12 AI assistant interactions per minute per IP.
- **Payload Limits**: Strict JSON and URL-encoded body limits of 10 MB.
- **Multi-Replica Notice**: Default rate limiting utilizes an in-memory store. For multi-replica deployments behind an ALB, AWS WAF rate-based rules or a Redis-backed store (`rate-limit-redis`) must be enabled.

### 5. Multi-Tenancy Ownership & IDOR Protection (Secure Vibe Coding Step 4)
- **Resource Ownership Verification**: Every resource mutation and access request (tasks, invoices, incidents, punch items, photos, milestones, risks) strictly checks project membership (`hasProjectAccess`).
- **Cross-Project Access Prevention**: Users assigned to Project A are strictly forbidden from reading or mutating resources in Project B (HTTP 403 Forbidden).
- **Executive Portfolio Scope**: Only executive accounts (`Role.Executive`) possess multi-project portfolio visibility.
- **CSRF Origin Protection**: All state-changing mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`) verified against Host and Origin/Referer headers to prevent cross-site request forgery.
- **Information Leakage Prevention**: Centralized error handling suppresses database drivers, SQL queries, and internal stack traces in production, returning masked errors with correlation `requestId`.

### 5. Input Validation and Upload Hygiene
- **Strict Schema Enforcement**: All incoming API requests are validated with Zod using `.strict()`, rejecting unexpected or malicious payload injection.
- **Binary Magic-Byte Inspection**: Uploaded construction photos are inspected at the binary level using file magic bytes:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47`
  - WebP: `52 49 46 46 ... 57 45 42 50`
  MIME header spoofing and executable uploads are rejected with HTTP 422.
- **Presigned URLs**: Public static `/uploads` serving is disabled. Authorized users access photos through temporary (5-minute TTL) AWS S3 presigned URLs.

### 6. Logging, Redaction, and Observability
- **Pino Structured Logging**: Request-level logging with unique correlation tracing via `x-request-id`.
- **Automated Redaction**: Sensitive attributes (`authorization`, `cookie`, `password`, `passwordHash`) are automatically sanitized and replaced with `[REDACTED]`.
- **Metrics Isolation**: Prometheus metrics at `/metrics` are shielded from public internet exposure by an AWS ALB listener rule.

### 7. Cloud and Deployment Security
- **Least Privilege IAM**: GitHub Actions authenticates via AWS OpenID Connect (OIDC) with zero static access keys stored in CI.
- **Non-Root Containers**: Container runtime runs as unprivileged user `node` (`USER node`).
- **Network Isolation**: PostgreSQL RDS instance resides exclusively in private subnets with no public route.
- **Container Scanning**: Images are scanned for known CVEs on push using Amazon ECR scanning and Trivy in CI.

---

## Reporting a Vulnerability

ConstructIQ takes the security of its infrastructure and users seriously. If you discover a security vulnerability, please report it privately:

1. **Email:** Send details to `security@constructiq.local` (or file a GitHub Security Advisory).
2. **Details:** Include reproduction steps, sample payload, affected endpoints, and potential impact.
3. **Disclosure:** Please allow up to 48 hours for an acknowledgment and coordinate disclosure before publishing any details.
