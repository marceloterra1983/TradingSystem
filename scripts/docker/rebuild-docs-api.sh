#!/usr/bin/env bash
# ==============================================================================
# Rebuild Documentation API Container
# ==============================================================================
# 
# Rebuilds the docs-api container with latest code changes
# Useful when routes/endpoints are added or modified
#
# Usage:
#   bash scripts/docker/rebuild-docs-api.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Rebuild Documentation API Container${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Stop the container
echo -e "\n${YELLOW}[1/4] Stopping docs-api container...${NC}"
docker compose -f tools/compose/docker-compose.docs.yml stop docs-api || true

# Remove the container
echo -e "\n${YELLOW}[2/4] Removing old container...${NC}"
docker compose -f tools/compose/docker-compose.docs.yml rm -f docs-api || true

# Rebuild the image
echo -e "\n${YELLOW}[3/4] Rebuilding image with latest code...${NC}"
docker compose -f tools/compose/docker-compose.docs.yml build --no-cache docs-api

# Start the container
echo -e "\n${YELLOW}[4/4] Starting docs-api container...${NC}"
docker compose -f tools/compose/docker-compose.docs.yml up -d docs-api

# Wait for health check
echo -e "\n${BLUE}Waiting for container to be healthy...${NC}"
for i in {1..30}; do
    if docker ps --filter "name=docs-api" --filter "health=healthy" | grep -q docs-api; then
        echo -e "${GREEN}✓ Container is healthy!${NC}"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Container failed to become healthy after 30 seconds${NC}"
        echo -e "\n${YELLOW}Logs:${NC}"
        docker logs docs-api --tail 50
        exit 1
    fi
    
    echo -n "."
    sleep 1
done

# Test the endpoint
echo -e "\n${BLUE}Testing dashboard-metrics endpoint...${NC}"
if curl -sf http://localhost:3401/api/v1/docs/health/dashboard-metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Endpoint is working!${NC}"
else
    echo -e "${YELLOW}⚠ Endpoint test failed - check logs:${NC}"
    docker logs docs-api --tail 20
fi

echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Rebuild Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "\n${BLUE}Documentation API:${NC} http://localhost:3401"
echo -e "${BLUE}Health Check:${NC}      curl http://localhost:3401/health"
echo -e "${BLUE}Metrics:${NC}           curl http://localhost:3401/api/v1/docs/health/dashboard-metrics"
echo ""

