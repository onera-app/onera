# =============================================================================
# Onera Web - Multi-stage Docker Build
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Copy package files
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/types/package.json ./packages/types/

# Remove packageManager field and convert workspace:* to proper versions
# Then install with npm
RUN apk add --no-cache jq && \
    jq 'del(.packageManager)' package.json > tmp.json && mv tmp.json package.json && \
    # Convert workspace:* to * for npm compatibility
    for pkg in apps/web apps/server packages/crypto packages/types; do \
        if [ -f "$pkg/package.json" ]; then \
            jq 'walk(if type == "object" then with_entries(if .value == "workspace:*" then .value = "*" else . end) else . end)' "$pkg/package.json" > tmp.json && mv tmp.json "$pkg/package.json"; \
        fi; \
    done && \
    npm install --legacy-peer-deps --loglevel=error

# Copy source code
COPY . .

# Restore workspace aliases for build (vite config uses these paths)
# Build web app with vite
WORKDIR /app/apps/web
RUN npx vite build

# Serve with nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
