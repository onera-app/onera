# =============================================================================
# Cortex Web - Multi-stage Docker Build
# =============================================================================
# Stage 1: Build with Bun in a monorepo context
# Stage 2: Serve with Nginx Alpine for minimal image size
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build arguments for environment configuration
# Use placeholder that will be replaced at runtime for flexibility
ARG VITE_CONVEX_URL=__CONVEX_URL_PLACEHOLDER__
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

# Build argument for version tracking
ARG BUILD_HASH=dev
ENV VITE_BUILD_HASH=$BUILD_HASH

# Build the web application
RUN bun run build --filter=@cortex/web

# -----------------------------------------------------------------------------
# Stage 2: Nginx Runtime
# -----------------------------------------------------------------------------
FROM nginx:alpine

# Install envsubst for potential future env var templating
RUN apk add --no-cache bash

# Copy built assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script for runtime env injection
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Use custom entrypoint for env var injection, then start nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
