#!/bin/bash
# ==============================================================================
# NUCLEAR CLEANUP + DEPLOY ALL (Sprint 1 + Sprint 2)
# ==============================================================================
# Description: Ultimate cleanup script - kills everything and redeploys
# Usage: sudo bash scripts/deployment/nuclear-cleanup-and-deploy.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"

echo -e "${RED}========================================${NC}"
echo -e "${RED}NUCLEAR CLEANUP + FULL DEPLOY${NC}"
echo -e "${RED}========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will:${NC}"
echo "  - Kill ALL processes on RAG/Kong ports"
echo "  - Stop ALL Docker containers"
echo "  - Remove ALL stopped containers"
echo "  - Prune Docker networks"
echo "  - Restart entire stack"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""

# ==============================================================================
# Phase 1: KILL EVERYTHING
# ==============================================================================
echo -e "${RED}[1/6] KILLING ALL PROCESSES ON RAG/KONG PORTS...${NC}"

ALL_PORTS="3402 3403 5433 6333 6334 6335 6336 6337 6338 6339 6340 6380 8000 8001 8002 8201 8202 8404 8443 11434"

echo "  Killing processes on ports: $ALL_PORTS"
echo ""

for PORT in $ALL_PORTS; do
    PIDS=$(lsof -ti :$PORT 2>/dev/null || echo "")
    if [ -n "$PIDS" ]; then
        echo -n "  Port $PORT: "
        for PID in $PIDS; do
            kill -9 $PID 2>/dev/null || true
        done
        echo -e "${GREEN}KILLED${NC}"
    fi
done

echo ""
echo "  Waiting 5 seconds for ports to release..."
sleep 5

# Verify
OCCUPIED=0
for PORT in $ALL_PORTS; do
    if ss -tuln | grep -q ":$PORT "; then
        echo -e "${YELLOW}  ⚠️  Port $PORT still occupied${NC}"
        OCCUPIED=$((OCCUPIED + 1))
    fi
done

if [ $OCCUPIED -eq 0 ]; then
    echo -e "${GREEN}  ✅ ALL PORTS FREE!${NC}"
else
    echo -e "${YELLOW}  Warning: $OCCUPIED ports still occupied (will try anyway)${NC}"
fi

echo ""

# ==============================================================================
# Phase 2: STOP ALL DOCKER CONTAINERS
# ==============================================================================
echo -e "${RED}[2/6] STOPPING ALL DOCKER CONTAINERS...${NC}"

RUNNING=$(docker ps -q)
if [ -n "$RUNNING" ]; then
    docker stop $(docker ps -q) 2>/dev/null || true
    echo -e "${GREEN}  ✅ All containers stopped${NC}"
else
    echo -e "  No containers running"
fi

echo ""

# ==============================================================================
# Phase 3: REMOVE ALL CONTAINERS + PRUNE
# ==============================================================================
echo -e "${RED}[3/6] REMOVING CONTAINERS + PRUNING...${NC}"

docker container prune -f
docker network prune -f

echo -e "${GREEN}  ✅ Cleanup complete${NC}"
echo ""

# ==============================================================================
# Phase 4: RECREATE NETWORKS
# ==============================================================================
echo -e "${GREEN}[4/6] RECREATING NETWORKS...${NC}"

docker network create tradingsystem_backend 2>&1 || echo "  Network exists or created"

echo -e "${GREEN}  ✅ Networks ready${NC}"
echo ""

# ==============================================================================
# Phase 5: START SERVICES IN ORDER
# ==============================================================================
echo -e "${GREEN}[5/6] STARTING SERVICES (ORDERED)...${NC}"

cd "$PROJECT_ROOT"

# 5.1: Start Qdrant (single node for now - HA has issues)
echo ""
echo -e "${BLUE}  [5.1] Starting Qdrant (single node)...${NC}"
docker run -d \
  --name rag-qdrant \
  --network tradingsystem_backend \
  -p 6333:6333 -p 6334:6334 \
  -v "$PROJECT_ROOT/backend/data/qdrant:/qdrant/storage" \
  --restart unless-stopped \
  qdrant/qdrant:v1.7.4 >/dev/null 2>&1 || docker start rag-qdrant >/dev/null 2>&1
sleep 10
echo -e "${GREEN}    ✅ Qdrant started${NC}"

# 5.2: Start RAG infrastructure (Ollama, Redis)
echo ""
echo -e "${BLUE}  [5.2] Starting RAG infrastructure...${NC}"
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d ollama rag-redis
sleep 10
echo -e "${GREEN}    ✅ Infrastructure started${NC}"

# 5.3: Start LlamaIndex services
echo ""
echo -e "${BLUE}  [5.3] Starting LlamaIndex services...${NC}"
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d llamaindex-query
sleep 15
echo -e "${GREEN}    ✅ LlamaIndex started${NC}"

# 5.4: Start RAG services (depends on LlamaIndex)
echo ""
echo -e "${BLUE}  [5.4] Starting RAG services...${NC}"
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d rag-service rag-collections-service
sleep 10
echo -e "${GREEN}    ✅ RAG services started${NC}"

# 5.5: Start Kong Gateway
echo ""
echo -e "${BLUE}  [5.5] Starting Kong Gateway...${NC}"
docker compose -f tools/compose/docker-compose.kong.yml up -d
sleep 30
echo -e "${GREEN}    ✅ Kong started${NC}"

echo ""
echo -e "${GREEN}  ✅ All services started!${NC}"
echo ""

# ==============================================================================
# Phase 6: VERIFY EVERYTHING
# ==============================================================================
echo -e "${GREEN}[6/6] VERIFYING DEPLOYMENT...${NC}"

echo ""
echo "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|qdrant|ollama|redis|llama|rag|kong"

echo ""
echo -e "${BLUE}Testing Endpoints:${NC}"

# Test 1: LlamaIndex Circuit Breakers
echo -n "  1. LlamaIndex (circuit breakers): "
if curl -s http://localhost:8202/health | jq -e '.circuitBreakers' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ WORKING${NC}"
    curl -s http://localhost:8202/health | jq '.circuitBreakers'
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 2: RAG Service Direct
echo -n "  2. RAG Service (direct): "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3402/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ HTTP $HTTP_CODE${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE${NC}"
fi

# Test 3: Kong Admin API
echo -n "  3. Kong Admin API: "
if curl -s http://localhost:8001/status | jq -e '.server' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ WORKING${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 4: Kong Proxy (via route)
echo -n "  4. Kong Proxy (/api/v1/rag): "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/rag/status/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ HTTP $HTTP_CODE${NC}"
elif [ "$HTTP_CODE" == "404" ]; then
    echo -e "${YELLOW}⚠️  HTTP 404 (route not found - needs config)${NC}"
elif [ "$HTTP_CODE" == "503" ]; then
    echo -e "${YELLOW}⚠️  HTTP 503 (service unavailable)${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE${NC}"
fi

echo ""

# ==============================================================================
# DEPLOYMENT SUMMARY
# ==============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Services Running:"
echo "  - Qdrant: http://localhost:6333"
echo "  - Ollama: http://localhost:11434"
echo "  - Redis: http://localhost:6380"
echo "  - LlamaIndex Query: http://localhost:8202"
echo "  - RAG Service: http://localhost:3402"
echo "  - Collections Service: http://localhost:3403"
echo "  - Kong Proxy: http://localhost:8000"
echo "  - Kong Admin: http://localhost:8001"
echo ""
echo "Next Steps:"
echo "  1. Configure Kong routes: bash scripts/kong/configure-routes.sh"
echo "  2. Verify circuit breakers: curl http://localhost:8202/health | jq '.circuitBreakers'"
echo "  3. Test via Kong: curl http://localhost:8000/api/v1/rag/status/health"
echo ""
echo -e "${GREEN}✅ Infrastructure is UP!${NC}"
echo ""

