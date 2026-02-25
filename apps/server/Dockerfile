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
RUN bun build src/index.ts --outdir dist --target bun --external libsodium-wrappers-sumo --external libsodium-sumo

# Production
FROM oven/bun:alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/drizzle ./drizzle

# Copy migration files for runtime migrations
COPY --from=builder /app/apps/server/src/db ./src/db

# Copy package files, strip workspace deps, and install production dependencies
COPY --from=builder /app/apps/server/package.json ./package.json

RUN bun -e " \
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
  pkg.scripts = { start: 'bun run dist/index.js' }; \
  for (const [k, v] of Object.entries(pkg.dependencies || {})) { \
    if (String(v).startsWith('workspace:')) delete pkg.dependencies[k]; \
  } \
  pkg.dependencies['libsodium-wrappers-sumo'] = '0.7.16'; \
  pkg.dependencies['libsodium-sumo'] = '0.7.16'; \
  delete pkg.devDependencies; \
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
" && bun install --production && \
    rm -rf ~/.bun/install/cache

# Create entrypoint script that runs migrations then starts server
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo 'echo "Running database migrations..."' >> /app/entrypoint.sh && \
    echo 'bun run src/db/migrate.ts' >> /app/entrypoint.sh && \
    echo 'echo "Starting server..."' >> /app/entrypoint.sh && \
    echo 'exec bun run dist/index.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Run as non-root user
USER bun

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["/app/entrypoint.sh"]
