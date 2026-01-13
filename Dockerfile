# =============================================================================
# Onera Web - Production Docker Build
# =============================================================================
# This is a standalone Dockerfile for the web application, optimized for
# production deployment to Azure Container Apps or similar platforms.
#
# Build:
#   docker build -t onera-web \
#     --build-arg VITE_API_URL=https://api.yourapp.com \
#     --build-arg VITE_WS_URL=https://api.yourapp.com \
#     .
#
# Run:
#   docker run -p 80:80 onera-web
# =============================================================================

FROM oven/bun:1.1-alpine AS builder
WORKDIR /app

ARG VITE_API_URL
ARG VITE_WS_URL
ARG BUILD_HASH=dev
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_BUILD_HASH=$BUILD_HASH

# Copy package files for better layer caching
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build web app
WORKDIR /app/apps/web
RUN bun run build

# -----------------------------------------------------------------------------
# Production Runtime
# -----------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
