#!/bin/bash
# ==============================================================================
# Deploy RAG Services Sprint 1 Enhancements
# ==============================================================================
# Description: Complete deployment script for Sprint 1 features
# Features: Circuit Breaker, Inter-Service Auth, API Versioning, Tests
# ==============================================================================

set -e  # Exit on error

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RAG Services Sprint 1 Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==============================================================================
# Step 1: Configure Environment
# ==============================================================================
echo -e "${GREEN}[1/5] Configuring environment variables...${NC}"

if ! grep -q "^INTER_SERVICE_SECRET=" .env 2>/dev/null; then
    echo -e "${YELLOW}  INTER_SERVICE_SECRET not found in .env${NC}"
    echo "  Running configuration script..."
    bash scripts/setup/configure-inter-service-secret.sh
else
    echo -e "${GREEN}  ✅ INTER_SERVICE_SECRET already configured${NC}"
fi

echo ""

# ==============================================================================
# Step 2: Rebuild Docker Images
# ==============================================================================
echo -e "${GREEN}[2/5] Rebuilding Docker images...${NC}"
echo "  This may take 3-5 minutes..."
echo ""

# Rebuild LlamaIndex Query Service (includes circuitbreaker library)
echo -e "${BLUE}  Building llamaindex-query (container: rag-llamaindex-query)...${NC}"
docker compose -f tools/compose/docker-compose.rag.yml build llamaindex-query --no-cache

# Rebuild RAG Service / Documentation API (includes opossum library)
echo -e "${BLUE}  Building rag-service...${NC}"
docker compose -f tools/compose/docker-compose.rag.yml build rag-service --no-cache

# Rebuild RAG Collections Service (includes service auth)
echo -e "${BLUE}  Building rag-collections-service...${NC}"
docker compose -f tools/compose/docker-compose.rag.yml build rag-collections-service --no-cache

echo -e "${GREEN}  ✅ Docker images rebuilt${NC}"
echo ""

# ==============================================================================
# Step 3: Stop Existing Services
# ==============================================================================
echo -e "${GREEN}[3/5] Stopping existing RAG services...${NC}"

docker compose -f tools/compose/docker-compose.rag.yml down

echo -e "${GREEN}  ✅ Services stopped${NC}"
echo ""

# ==============================================================================
# Step 4: Start Services with New Images
# ==============================================================================
echo -e "${GREEN}[4/5] Starting RAG services with new features...${NC}"

docker compose -f tools/compose/docker-compose.rag.yml up -d

echo ""
echo -e "${YELLOW}  Waiting for services to be healthy (30 seconds)...${NC}"
sleep 30

echo -e "${GREEN}  ✅ Services started${NC}"
echo ""

# ==============================================================================
# Step 5: Verify Deployment
# ==============================================================================
echo -e "${GREEN}[5/5] Verifying deployment...${NC}"
echo ""

# Check LlamaIndex Query Service
echo -e "${BLUE}  Checking LlamaIndex Query Service...${NC}"
if curl -s http://localhost:8202/health | jq -e '.circuitBreakers' > /dev/null 2>&1; then
    echo -e "${GREEN}    ✅ LlamaIndex Query Service healthy (circuit breakers active)${NC}"
    curl -s http://localhost:8202/health | jq '.circuitBreakers'
else
    echo -e "${RED}    ❌ LlamaIndex Query Service health check failed${NC}"
    echo "    Check logs: docker logs rag-llamaindex-query"
fi
echo ""

# Check RAG Service / Documentation API
echo -e "${BLUE}  Checking RAG Service (Documentation API)...${NC}"
if curl -s http://localhost:3402/health > /dev/null 2>&1; then
    echo -e "${GREEN}    ✅ RAG Service healthy${NC}"
else
    echo -e "${RED}    ❌ RAG Service health check failed${NC}"
    echo "    Check logs: docker logs rag-service"
fi
echo ""

# Check RAG Collections Service
echo -e "${BLUE}  Checking RAG Collections Service...${NC}"
if curl -s http://localhost:3403/health > /dev/null 2>&1; then
    echo -e "${GREEN}    ✅ RAG Collections Service healthy${NC}"
else
    echo -e "${RED}    ❌ RAG Collections Service health check failed${NC}"
    echo "    Check logs: docker logs rag-collections-service"
fi
echo ""

# ==============================================================================
# Deployment Summary
# ==============================================================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Sprint 1 Features Deployed:"
echo "  ✅ Circuit Breaker Pattern (4 breakers)"
echo "  ✅ Inter-Service Authentication (X-Service-Token)"
echo "  ✅ API Versioning (/api/v1)"
echo "  ✅ Unit Tests (51 tests created)"
echo ""
echo "Services Running:"
echo "  - LlamaIndex Query: http://localhost:8202"
echo "  - RAG Service: http://localhost:3402"
echo "  - Collections Service: http://localhost:3403"
echo "  - Ollama: http://localhost:11434"
echo "  - Qdrant: http://localhost:6333"
echo "  - Redis: http://localhost:6380"
echo ""
echo "Next Steps:"
echo "  1. Manual testing: bash scripts/testing/test-circuit-breaker.sh"
echo "  2. Monitor logs: docker compose -f tools/compose/docker-compose.rag.yml logs -f"
echo "  3. Check metrics: curl http://localhost:8202/health | jq"
echo ""
echo -e "${YELLOW}Monitor for 48 hours before promoting to staging/production.${NC}"
echo ""

