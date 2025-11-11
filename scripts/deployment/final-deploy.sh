#!/bin/bash
# ==============================================================================
# Final Deploy - RAG Services Sprint 1
# ==============================================================================
# Description: Kill all native services and start all Docker containers
# Usage: sudo bash scripts/deployment/final-deploy.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Final Deploy - RAG Services Sprint 1${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Kill all processes on RAG ports
echo -e "${GREEN}[1/4] Killing processes on all RAG ports...${NC}"

PORTS="6333 6380 8201 8202 11434"

for PORT in $PORTS; do
    PIDS=$(lsof -ti :$PORT 2>/dev/null || echo "")
    if [ -n "$PIDS" ]; then
        echo "  Port $PORT: Killing PIDs $PIDS"
        for PID in $PIDS; do
            kill -9 $PID 2>/dev/null || echo "    PID $PID already dead"
        done
    else
        echo -e "  Port $PORT: ${GREEN}FREE${NC}"
    fi
done

echo ""
echo "Waiting 3 seconds..."
sleep 3

# Verify ports
echo ""
echo -e "${GREEN}[2/4] Verifying ports...${NC}"

ALL_FREE=true
for PORT in $PORTS; do
    if ss -tuln | grep -q ":$PORT "; then
        echo -e "${RED}  ❌ Port $PORT still in use${NC}"
        ALL_FREE=false
    else
        echo -e "${GREEN}  ✅ Port $PORT is FREE${NC}"
    fi
done

if [ "$ALL_FREE" = false ]; then
    echo ""
    echo -e "${RED}WARNING: Some ports still occupied. Deployment may fail.${NC}"
    echo ""
fi

# Start Qdrant
echo ""
echo -e "${GREEN}[3/4] Starting Qdrant...${NC}"

cd /home/marce/Projetos/TradingSystem

docker run -d \
  --name rag-qdrant \
  --network tradingsystem_backend \
  -p 6333:6333 -p 6334:6334 \
  -v "/home/marce/Projetos/TradingSystem/backend/data/qdrant:/qdrant/storage" \
  --restart unless-stopped \
  qdrant/qdrant:v1.7.4 >/dev/null 2>&1 || {
    echo -e "${YELLOW}  Qdrant may already be running or port conflict${NC}"
    docker start rag-qdrant >/dev/null 2>&1 || true
}

sleep 5

# Start RAG services
echo ""
echo -e "${GREEN}[4/4] Starting RAG services...${NC}"

docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml down 2>/dev/null || true
sleep 2
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d

echo ""
echo "Waiting 30 seconds for services to be healthy..."
sleep 30

# Final verification
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Complete - Verifying${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|qdrant|rag"

echo ""
echo "Testing Circuit Breakers:"
curl -s http://localhost:8202/health | jq '.circuitBreakers' || echo "Failed to reach service"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Done!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

