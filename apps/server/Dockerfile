# =============================================================================
# Onera Server - Multi-stage Docker Build
# =============================================================================
# Use specific bun version that supports lockfileVersion 1
FROM oven/bun:alpine AS base
WORKDIR /app

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
FROM oven/bun:alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R bun:bun /app/data

# Copy built artifacts
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/drizzle ./drizzle

# Copy migration files for runtime migrations
COPY --from=builder /app/apps/server/src/db ./src/db

# Copy package files and install dependencies
COPY --from=builder /app/apps/server/package.json ./package.json
RUN bun install --production

# Create entrypoint script that runs migrations then starts server
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo 'echo "Running database migrations..."' >> /app/entrypoint.sh && \
    echo 'bun run src/db/migrate.ts' >> /app/entrypoint.sh && \
    echo 'echo "Starting server..."' >> /app/entrypoint.sh && \
    echo 'exec bun run dist/index.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["/app/entrypoint.sh"]
