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
DASHBOARD_PORT="${DASHBOARD_PORT:-3103}"

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

# Step 1: Check container status and restart/start accordingly
echo -e "${YELLOW}→ Checking container status...${NC}"
CONTAINER_STATUS=$(docker inspect ${CONTAINER_NAME} --format '{{.State.Status}}' 2>/dev/null || echo "not-found")

if [ "$CONTAINER_STATUS" = "not-found" ]; then
  echo -e "${YELLOW}→ Container not found, starting with docker compose...${NC}"
  SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
  cd "$SCRIPT_DIR" || exit 1
  if docker compose -f tools/compose/docker-compose.dashboard.yml up -d dashboard 2>&1; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
  else
    echo -e "${RED}✗ Failed to start container${NC}"
    echo -e "${RED}  Check logs with: docker compose -f tools/compose/docker-compose.dashboard.yml logs dashboard${NC}"
    exit 1
  fi
elif [ "$CONTAINER_STATUS" = "running" ]; then
  echo -e "${YELLOW}→ Container is running, restarting...${NC}"
  if docker restart ${CONTAINER_NAME} 2>&1; then
    echo -e "${GREEN}✓ Container restarted successfully${NC}"
  else
    echo -e "${RED}✗ Failed to restart container${NC}"
    echo -e "${RED}  Check logs with: docker logs ${CONTAINER_NAME}${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}→ Container is stopped (${CONTAINER_STATUS}), starting...${NC}"
  if docker start ${CONTAINER_NAME} 2>&1; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
  else
    echo -e "${RED}✗ Failed to start container${NC}"
    echo -e "${RED}  Check logs with: docker logs ${CONTAINER_NAME}${NC}"
    exit 1
  fi
fi

# Step 2: Wait for container to be ready
echo -e "${YELLOW}→ Waiting for container to be ready...${NC}"
sleep 3

# Step 3: Remove dangling images (images without tags)
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

# Step 4: Show disk space saved
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
echo -e "Dashboard URL: ${BLUE}http://localhost:3103${NC}"
echo ""
