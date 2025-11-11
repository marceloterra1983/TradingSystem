#!/bin/bash
# ==============================================================================
# Deploy Workspace Stack with Redis Cache (Phase 2.3)
# ==============================================================================
# Deploys the updated workspace stack with Redis caching enabled
#
# Usage:
#   bash scripts/docker/deploy-workspace-with-redis.sh [options]
#
# Options:
#   --rebuild    Rebuild images before deploying
#   --clean      Remove volumes and start fresh (CAUTION: deletes data)
#
# What this script does:
#   1. Stops current workspace stack
#   2. Optionally rebuilds images
#   3. Starts updated stack with Redis
#   4. Waits for health checks
#   5. Validates Redis connection
#   6. Shows stack status
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="tools/compose/docker-compose.4-3-workspace-stack.yml"
REBUILD=false
CLEAN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --rebuild)
      REBUILD=true
      shift
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--rebuild] [--clean]"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Workspace Stack Deployment with Redis Cache (Phase 2.3)${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# ==============================================================================
# Step 1: Stop Current Stack
# ==============================================================================
echo -e "${YELLOW}Step 1: Stopping current workspace stack...${NC}"

if docker compose -f "$COMPOSE_FILE" ps | grep -q "workspace"; then
    docker compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}✅ Stack stopped${NC}"
else
    echo -e "${BLUE}ℹ️  Stack not running${NC}"
fi

echo ""

# ==============================================================================
# Step 2: Clean Volumes (if requested)
# ==============================================================================
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}Step 2: Cleaning volumes (CAUTION: deleting data)...${NC}"
    read -p "Are you sure you want to delete all workspace data? (yes/no): " CONFIRM

    if [ "$CONFIRM" = "yes" ]; then
        docker compose -f "$COMPOSE_FILE" down -v
        echo -e "${GREEN}✅ Volumes cleaned${NC}"
    else
        echo -e "${BLUE}ℹ️  Skipped volume cleanup${NC}"
    fi
    echo ""
fi

# ==============================================================================
# Step 3: Rebuild Images (if requested)
# ==============================================================================
if [ "$REBUILD" = true ]; then
    echo -e "${YELLOW}Step 3: Rebuilding workspace API image...${NC}"
    docker compose -f "$COMPOSE_FILE" build workspace-api
    echo -e "${GREEN}✅ Image rebuilt${NC}"
    echo ""
fi

# ==============================================================================
# Step 4: Pull Redis Image
# ==============================================================================
echo -e "${YELLOW}Step 4: Pulling Redis image...${NC}"

if docker image inspect redis:7-alpine >/dev/null 2>&1; then
    echo -e "${BLUE}ℹ️  Redis image already exists${NC}"
else
    docker pull redis:7-alpine
    echo -e "${GREEN}✅ Redis image pulled${NC}"
fi

echo ""

# ==============================================================================
# Step 5: Start Updated Stack
# ==============================================================================
echo -e "${YELLOW}Step 5: Starting workspace stack with Redis...${NC}"

docker compose -f "$COMPOSE_FILE" up -d

echo -e "${GREEN}✅ Stack started${NC}"
echo ""

# ==============================================================================
# Step 6: Wait for Health Checks
# ==============================================================================
echo -e "${YELLOW}Step 6: Waiting for services to be healthy...${NC}"

MAX_WAIT=60
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    REDIS_HEALTHY=$(docker compose -f "$COMPOSE_FILE" ps workspace-redis | grep -c "healthy" || echo "0")
    DB_HEALTHY=$(docker compose -f "$COMPOSE_FILE" ps workspace-db | grep -c "healthy" || echo "0")
    API_HEALTHY=$(docker compose -f "$COMPOSE_FILE" ps workspace-api | grep -c "healthy" || echo "0")

    if [ "$REDIS_HEALTHY" -eq 1 ] && [ "$DB_HEALTHY" -eq 1 ] && [ "$API_HEALTHY" -eq 1 ]; then
        echo -e "${GREEN}✅ All services are healthy${NC}"
        break
    fi

    echo -e "${BLUE}⏳ Waiting for health checks... ($ELAPSED/${MAX_WAIT}s)${NC}"
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${RED}❌ Timeout waiting for services to be healthy${NC}"
    echo ""
    echo -e "${YELLOW}Container status:${NC}"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo -e "${YELLOW}Logs:${NC}"
    docker compose -f "$COMPOSE_FILE" logs --tail=50
    exit 1
fi

echo ""

# ==============================================================================
# Step 7: Validate Redis Connection
# ==============================================================================
echo -e "${YELLOW}Step 7: Validating Redis connection...${NC}"

REDIS_PING=$(docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli PING 2>&1)

if [[ "$REDIS_PING" == *"PONG"* ]]; then
    echo -e "${GREEN}✅ Redis is responding${NC}"
else
    echo -e "${RED}❌ Redis not responding: $REDIS_PING${NC}"
    exit 1
fi

# Check Redis memory configuration
echo -e "${BLUE}Redis Configuration:${NC}"
docker compose -f "$COMPOSE_FILE" exec -T workspace-redis redis-cli INFO memory | grep -E "maxmemory_human|maxmemory_policy" | sed 's/^/   /'

echo ""

# ==============================================================================
# Step 8: Validate API Connection
# ==============================================================================
echo -e "${YELLOW}Step 8: Validating API connection...${NC}"

sleep 5 # Give API time to fully initialize

API_HEALTH=$(curl -s http://localhost:3200/health 2>&1)

if [[ "$API_HEALTH" == *"\"status\":\"healthy\""* ]]; then
    echo -e "${GREEN}✅ Workspace API is responding${NC}"
else
    echo -e "${RED}❌ API not responding properly${NC}"
    echo "$API_HEALTH"
    exit 1
fi

echo ""

# ==============================================================================
# Step 9: Show Stack Status
# ==============================================================================
echo -e "${YELLOW}Step 9: Stack status...${NC}"

docker compose -f "$COMPOSE_FILE" ps

echo ""

# ==============================================================================
# Summary
# ==============================================================================
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Deployment Complete${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "${GREEN}✅ Workspace stack deployed successfully with Redis caching!${NC}"
echo ""
echo -e "${BLUE}Running Services:${NC}"
echo -e "   🗄️  workspace-db      - PostgreSQL 17 Alpine (Port: 5432 internal)"
echo -e "   ⚡ workspace-redis   - Redis 7 Alpine (Port: 6379 internal)"
echo -e "   🚀 workspace-api     - Node.js Express + Cache (Port: 3200)"
echo ""
echo -e "${BLUE}API Endpoints:${NC}"
echo -e "   Health:    http://localhost:3200/health"
echo -e "   Items:     http://localhost:3200/api/items"
echo -e "   Stats:     http://localhost:3200/api/items/stats"
echo -e "   Metrics:   http://localhost:3200/metrics"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "   1. Test cache behavior:"
echo -e "      ${GREEN}bash scripts/docker/test-workspace-redis-cache.sh${NC}"
echo ""
echo -e "   2. Monitor cache statistics:"
echo -e "      ${GREEN}docker compose -f $COMPOSE_FILE exec workspace-redis redis-cli INFO stats${NC}"
echo ""
echo -e "   3. View cached keys:"
echo -e "      ${GREEN}docker compose -f $COMPOSE_FILE exec workspace-redis redis-cli KEYS 'workspace:*'${NC}"
echo ""
echo -e "   4. View API logs:"
echo -e "      ${GREEN}docker compose -f $COMPOSE_FILE logs -f workspace-api${NC}"
echo ""
echo -e "   5. Check cache headers:"
echo -e "      ${GREEN}curl -v http://localhost:3200/api/items 2>&1 | grep X-Cache${NC}"
echo ""
echo -e "${BLUE}==============================================================================${NC}"
