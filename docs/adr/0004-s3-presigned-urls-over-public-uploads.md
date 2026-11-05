# ADR 0004: S3 Presigned URLs and Authenticated Endpoints over Public Static Uploads

## Status
Accepted

## Context
Construction site photos (e.g. concrete pours, scaffolding inspections, QA punch-item defects) frequently contain sensitive client blueprints, proprietary structural details, and safety incident evidence. Serving these files through an unauthenticated public `/uploads` directory exposes confidential asset telemetry to unauthorized web scrapers.

## Decision
We remove public static `/uploads` routing from the Express web server. Construction photos are uploaded via an authenticated multipart endpoint (`POST /api/photos/upload`) validated for file magic bytes and stored in private S3 buckets. Retrieval is mediated via authenticated endpoints (`GET /api/photos/:id`) generating **short-lived (5-minute TTL) S3 presigned URLs**. In local development without S3, the endpoint serves authorized files from local storage.

## Consequences

### Positive
- **Guaranteed Confidentiality**: Files cannot be accessed without an active, authenticated ConstructIQ session.
- **Direct S3 Offloading**: High-bandwidth binary photo transfers bypass the Node.js application server during image consumption, reducing memory pressure.
- **Short Window of Exposure**: Presigned URLs expire after 300 seconds, preventing link sharing across unauthorized parties.
- **MIME & Magic-Byte Defense**: Content is verified at upload against binary headers (`image/jpeg`, `image/png`, `image/webp`), preventing malicious script or executable injection.

### Negative
- Client UI must fetch the presigned URL before rendering images or cache presigned links during viewing sessions.

