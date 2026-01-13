# =============================================================================
# Onera Web - Multi-stage Docker Build
# =============================================================================
FROM oven/bun:alpine AS builder
WORKDIR /app

# Install build tools for native modules (needed for some dependencies)
RUN apk add --no-cache python3 make g++

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

# Serve with nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
