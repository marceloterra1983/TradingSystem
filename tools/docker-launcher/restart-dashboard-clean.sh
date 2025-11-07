#!/bin/bash
###############################################################################
# Restart Dashboard with Cleanup
#
# Reinicia o container do Dashboard e remove imagens antigas (dangling)
# para evitar acúmulo de lixo no sistema
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="dashboard-ui"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Restart Dashboard + Cleanup                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Restart container
echo -e "${YELLOW}→ Restarting ${CONTAINER_NAME}...${NC}"
if docker restart ${CONTAINER_NAME} >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Container restarted successfully${NC}"
else
  echo -e "${RED}✗ Failed to restart container${NC}"
  exit 1
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
