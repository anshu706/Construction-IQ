# ConstructIQ – Multi-stage Dockerfile
# Stage order: deps → build → runtime
# Uses node:20-bookworm-slim (Debian) for OpenSSL compatibility with Prisma's query engine.

# ── Stage 1: install all dependencies ────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build frontend + backend ────────────────────────────────────────
FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: migrate (run as a one-off ECS task / init container) ─────────────
FROM node:20-bookworm-slim AS migrate
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
ENV DATABASE_URL=""
CMD ["npx", "prisma", "migrate", "deploy"]

# ── Stage 4: production runtime ───────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy Prisma generated client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma

# Copy built application artefacts
COPY --from=build /app/dist ./dist

# Named volume mount point for uploads (dev fallback; use S3 in production)
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

EXPOSE 3001

# Non-root user (built in to official Node images)
USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]

