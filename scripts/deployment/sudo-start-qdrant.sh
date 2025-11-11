#!/bin/bash
# ==============================================================================
# SUDO: Start Qdrant (Kill Port 6334 first)
# ==============================================================================
# Description: Kills process on port 6334 and starts Qdrant
# Usage: sudo bash scripts/deployment/sudo-start-qdrant.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Starting Qdrant (with port cleanup)${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Kill port 6334
echo -e "${GREEN}[1/3] Killing process on port 6334...${NC}"
PIDS=$(lsof -ti :6334 2>/dev/null || echo "")

if [ -n "$PIDS" ]; then
    echo "  Found PIDs: $PIDS"
    for PID in $PIDS; do
        kill -9 $PID 2>/dev/null || echo "    Already dead"
    done
    echo -e "${GREEN}  ✅ Port 6334 freed${NC}"
else
    echo -e "${GREEN}  ✅ Port 6334 already free${NC}"
fi

sleep 2

# Remove old container
echo ""
echo -e "${GREEN}[2/3] Removing old Qdrant container...${NC}"
docker rm -f rag-qdrant 2>/dev/null || echo "  No old container found"

# Start Qdrant
echo ""
echo -e "${GREEN}[3/3] Starting Qdrant...${NC}"
cd /home/marce/Projetos/TradingSystem
docker run -d \
  --name rag-qdrant \
  --network tradingsystem_backend \
  -p 6333:6333 -p 6334:6334 \
  -v "/home/marce/Projetos/TradingSystem/backend/data/qdrant:/qdrant/storage" \
  --restart unless-stopped \
  qdrant/qdrant:v1.7.4 >/dev/null 2>&1 || docker start rag-qdrant >/dev/null 2>&1

sleep 5

echo ""
echo "Qdrant status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|qdrant"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Done! Now restart llamaindex-query${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Run:"
echo "  docker restart rag-llamaindex-query"
echo "  sleep 20"
echo "  curl http://localhost:8202/health | jq '.circuitBreakers'"
echo ""

