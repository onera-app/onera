#!/bin/bash
# =============================================================================
# Onera - Azure Container Registry Deployment Script
# =============================================================================
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Docker installed and running
#   - Azure Container Registry created
#
# Usage:
#   ./scripts/deploy-azure.sh <acr-name> [tag]
#
# Example:
#   ./scripts/deploy-azure.sh myregistry v1.0.0
#   ./scripts/deploy-azure.sh myregistry latest
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: ACR name is required${NC}"
    echo "Usage: $0 <acr-name> [tag]"
    echo "Example: $0 myregistry v1.0.0"
    exit 1
fi

ACR_NAME=$1
TAG=${2:-latest}
ACR_URL="${ACR_NAME}.azurecr.io"

echo -e "${GREEN}=== Onera Azure Deployment ===${NC}"
echo -e "ACR: ${YELLOW}${ACR_URL}${NC}"
echo -e "Tag: ${YELLOW}${TAG}${NC}"
echo ""

# Login to Azure Container Registry
echo -e "${GREEN}[1/4] Logging into Azure Container Registry...${NC}"
az acr login --name "$ACR_NAME"

# Build images
echo -e "${GREEN}[2/4] Building Docker images...${NC}"
ACR_NAME=$ACR_NAME TAG=$TAG docker compose -f docker-compose.azure.yml build

# Push images
echo -e "${GREEN}[3/4] Pushing images to ACR...${NC}"
ACR_NAME=$ACR_NAME TAG=$TAG docker compose -f docker-compose.azure.yml push

# Show image info
echo -e "${GREEN}[4/4] Deployment complete!${NC}"
echo ""
echo -e "${GREEN}Pushed images:${NC}"
echo "  - ${ACR_URL}/onera-server:${TAG}"
echo "  - ${ACR_URL}/onera-web:${TAG}"
echo ""
echo -e "${YELLOW}To deploy to Azure Container Apps, run:${NC}"
echo ""
echo "  # Create Container Apps environment (if not exists)"
echo "  az containerapp env create \\"
echo "    --name onera-env \\"
echo "    --resource-group <your-resource-group> \\"
echo "    --location <location>"
echo ""
echo "  # Deploy server"
echo "  az containerapp create \\"
echo "    --name onera-server \\"
echo "    --resource-group <your-resource-group> \\"
echo "    --environment onera-env \\"
echo "    --image ${ACR_URL}/onera-server:${TAG} \\"
echo "    --registry-server ${ACR_URL} \\"
echo "    --target-port 3000 \\"
echo "    --ingress external \\"
echo "    --env-vars DATABASE_URL=<your-db-url> BETTER_AUTH_SECRET=<secret>"
echo ""
echo "  # Deploy web"
echo "  az containerapp create \\"
echo "    --name onera-web \\"
echo "    --resource-group <your-resource-group> \\"
echo "    --environment onera-env \\"
echo "    --image ${ACR_URL}/onera-web:${TAG} \\"
echo "    --registry-server ${ACR_URL} \\"
echo "    --target-port 80 \\"
echo "    --ingress external"
