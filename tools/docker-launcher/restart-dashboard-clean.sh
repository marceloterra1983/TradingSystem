#!/bin/bash
###############################################################################
# Restart Dashboard with Cleanup
#
# Reinicia o container do Dashboard e remove imagens antigas (dangling)
# para evitar acúmulo de lixo no sistema
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="dashboard-ui"
DASHBOARD_PORT="${DASHBOARD_PORT:-9082}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/tools/compose/docker-compose.1-dashboard-stack.yml"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Restart Dashboard + Cleanup                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 0: Check if port is in use by another process
echo -e "${YELLOW}→ Checking port ${DASHBOARD_PORT} availability...${NC}"
PORT_PID=$(lsof -ti :${DASHBOARD_PORT} 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
  PORT_PROCESS=$(ps -p "$PORT_PID" -o comm= 2>/dev/null || echo "unknown")
  echo -e "${YELLOW}⚠ Port ${DASHBOARD_PORT} is in use by PID ${PORT_PID} (${PORT_PROCESS})${NC}"
  
  # Check if it's a Node.js process (likely local dashboard instance)
  if echo "$PORT_PROCESS" | grep -qi "node\|MainThread"; then
    echo -e "${YELLOW}  Detected Node.js process - likely local dashboard instance${NC}"
    echo -e "${YELLOW}  Stopping process ${PORT_PID} to free port...${NC}"
    if kill "$PORT_PID" 2>/dev/null; then
      sleep 2
      # Force kill if still running
      if kill -0 "$PORT_PID" 2>/dev/null; then
        kill -9 "$PORT_PID" 2>/dev/null || true
        sleep 1
      fi
      echo -e "${GREEN}✓ Process stopped${NC}"
    else
      echo -e "${RED}✗ Failed to stop process. Please stop it manually: kill ${PORT_PID}${NC}"
      exit 1
    fi
  else
    echo -e "${RED}✗ Port ${DASHBOARD_PORT} is in use by ${PORT_PROCESS} (PID ${PORT_PID})${NC}"
    echo -e "${RED}  Please stop the process manually or use a different port${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ Port ${DASHBOARD_PORT} is available${NC}"
fi

# Step 1: Stop and remove container if exists
echo -e "${YELLOW}→ Stopping and removing existing container...${NC}"
CONTAINER_EXISTS=$(docker ps -a --filter "name=${CONTAINER_NAME}" --format '{{.Names}}' 2>/dev/null)

if [ -n "$CONTAINER_EXISTS" ]; then
  echo -e "${YELLOW}  Container found, removing...${NC}"
  if docker compose -f "${COMPOSE_FILE}" down dashboard 2>&1; then
    echo -e "${GREEN}✓ Container removed${NC}"
  else
    echo -e "${RED}✗ Failed to remove container${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ No existing container to remove${NC}"
fi

# Step 2: Force rebuild without cache
echo -e "${YELLOW}→ Rebuilding dashboard without cache...${NC}"
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$SCRIPT_DIR" || exit 1

if docker compose -f "${COMPOSE_FILE}" build --no-cache dashboard 2>&1; then
  echo -e "${GREEN}✓ Build completed successfully${NC}"
else
  echo -e "${RED}✗ Failed to build container${NC}"
  exit 1
fi

# Step 3: Start the new container
echo -e "${YELLOW}→ Starting new container...${NC}"
if docker compose -f "${COMPOSE_FILE}" up -d dashboard 2>&1; then
  echo -e "${GREEN}✓ Container started successfully${NC}"
else
  echo -e "${RED}✗ Failed to start container${NC}"
  echo -e "${RED}  Check logs with: docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml logs dashboard${NC}"
  exit 1
fi

# Step 4: Wait for container to be ready
echo -e "${YELLOW}→ Waiting for container to be ready...${NC}"
sleep 3

# Step 5: Remove dangling images (images without tags)
echo -e "${YELLOW}→ Removing dangling images...${NC}"
DANGLING_IMAGES=$(docker images -f "dangling=true" -q 2>/dev/null)

if [ -z "$DANGLING_IMAGES" ]; then
  echo -e "${GREEN}✓ No dangling images to remove${NC}"
else
  IMAGE_COUNT=$(echo "$DANGLING_IMAGES" | wc -l)
  echo -e "${YELLOW}  Found ${IMAGE_COUNT} dangling image(s)${NC}"

  if docker rmi $DANGLING_IMAGES >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Removed ${IMAGE_COUNT} dangling image(s)${NC}"
  else
    echo -e "${YELLOW}⚠ Some images could not be removed (may be in use)${NC}"
  fi
fi

# Step 6: Show disk space saved
echo -e "${YELLOW}→ Docker disk usage summary:${NC}"
docker system df

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Dashboard restarted and cleanup completed!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Container status:"
docker ps --filter "name=${CONTAINER_NAME}" --format "  {{.Names}}: {{.Status}}"
echo ""
echo -e "Dashboard URL: ${BLUE}http://localhost:9082${NC}"
echo ""
