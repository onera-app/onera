# =============================================================================
# Onera Server - Multi-stage Docker Build
# =============================================================================
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

# Install dependencies
FROM base AS deps
COPY package.json bun.lock turbo.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/types/package.json ./packages/types/
RUN bun install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY . .
WORKDIR /app/apps/server
RUN bun build src/index.ts --outdir dist --target bun

# Production
FROM oven/bun:1.3-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Install runtime dependencies for SQLite
RUN apk add --no-cache sqlite-libs

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R bun:bun /app/data

COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/drizzle ./drizzle
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules

# Run migrations and start server
COPY --from=builder /app/apps/server/src/db/migrate.ts ./src/db/migrate.ts
COPY --from=builder /app/apps/server/src/db/client.ts ./src/db/client.ts
COPY --from=builder /app/apps/server/src/db/schema.ts ./src/db/schema.ts

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["bun", "run", "dist/index.js"]
