#!/bin/sh
# =============================================================================
# Cortex Web - Docker Entrypoint
# =============================================================================
# This script runs at container startup to inject runtime environment variables
# into the pre-built JavaScript files. This allows the same Docker image to be
# used across different environments (dev, staging, prod) without rebuilding.
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Environment Variable Injection
# -----------------------------------------------------------------------------
# Replace placeholder values in JS files with actual runtime values
# This handles the Vite build-time limitation where env vars are inlined

echo "Injecting runtime environment variables..."

# Inject VITE_CONVEX_URL if provided
if [ -n "$VITE_CONVEX_URL" ]; then
  echo "Setting CONVEX_URL to: $VITE_CONVEX_URL"
  find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.js.map" \) -exec \
    sed -i "s|__CONVEX_URL_PLACEHOLDER__|${VITE_CONVEX_URL}|g" {} \;
else
  echo "WARNING: VITE_CONVEX_URL not set. Application may not function correctly."
fi

# -----------------------------------------------------------------------------
# Additional Environment Variables (extend as needed)
# -----------------------------------------------------------------------------
# Example: Inject analytics or feature flags
# if [ -n "$VITE_ANALYTICS_ID" ]; then
#   find /usr/share/nginx/html -type f -name "*.js" -exec \
#     sed -i "s|__ANALYTICS_PLACEHOLDER__|${VITE_ANALYTICS_ID}|g" {} \;
# fi

echo "Environment injection complete."

# -----------------------------------------------------------------------------
# Execute the main command (nginx)
# -----------------------------------------------------------------------------
exec "$@"
