#!/bin/bash
# ==============================================================================
# Setup Kong API Gateway
# ==============================================================================
# Description: Deploys Kong Gateway with declarative configuration
# Usage: bash scripts/kong/setup-kong.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Kong API Gateway Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==============================================================================
# Step 1: Check Prerequisites
# ==============================================================================
echo -e "${GREEN}[1/5] Checking prerequisites...${NC}"

cd "$PROJECT_ROOT"

# Check if INTER_SERVICE_SECRET is set
if grep -q "^INTER_SERVICE_SECRET=" .env 2>/dev/null; then
    echo -e "${GREEN}  ✅ INTER_SERVICE_SECRET found${NC}"
else
    echo -e "${RED}  ❌ INTER_SERVICE_SECRET not found in .env${NC}"
    echo ""
    echo "Run: bash scripts/setup/configure-inter-service-secret.sh"
    exit 1
fi

# Check if Kong password is set
if ! grep -q "^KONG_PG_PASSWORD=" .env 2>/dev/null; then
    echo -e "${YELLOW}  Adding KONG_PG_PASSWORD to .env...${NC}"
    echo "" >> .env
    echo "# Kong API Gateway" >> .env
    echo "KONG_PG_PASSWORD=$(openssl rand -hex 16)" >> .env
    echo -e "${GREEN}  ✅ KONG_PG_PASSWORD added${NC}"
fi

echo ""

# ==============================================================================
# Step 2: Stop Old Kong (if exists)
# ==============================================================================
echo -e "${GREEN}[2/5] Stopping old Kong instance...${NC}"

docker compose -f tools/compose/docker-compose.kong.yml down 2>/dev/null || echo "  No old instance"

echo -e "${GREEN}  ✅ Old instance stopped${NC}"
echo ""

# ==============================================================================
# Step 3: Start Kong Gateway
# ==============================================================================
echo -e "${GREEN}[3/5] Starting Kong Gateway...${NC}"

docker compose -f tools/compose/docker-compose.kong.yml up -d

echo ""
echo "  Waiting 30 seconds for Kong to be ready..."
sleep 30

echo ""
echo "  Kong status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|kong"

echo ""
echo -e "${GREEN}  ✅ Kong started${NC}"
echo ""

# ==============================================================================
# Step 4: Verify Kong Health
# ==============================================================================
echo -e "${GREEN}[4/5] Verifying Kong health...${NC}"

# Check Admin API
if curl -s http://localhost:8001/status > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Kong Admin API responding${NC}"
    
    # Show status
    KONG_STATUS=$(curl -s http://localhost:8001/status | jq -r '.database.reachable')
    echo "  Database reachable: $KONG_STATUS"
else
    echo -e "${RED}  ❌ Kong Admin API not responding${NC}"
fi

# Check Proxy
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Kong Proxy responding${NC}"
else
    echo -e "${YELLOW}  ⚠️  Kong Proxy not responding (expected if no routes configured)${NC}"
fi

echo ""

# ==============================================================================
# Step 5: Test RAG Service Route
# ==============================================================================
echo -e "${GREEN}[5/5] Testing RAG service route...${NC}"

# Test health endpoint through Kong
echo "  Testing: http://localhost:8000/api/v1/rag/status/health"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/rag/status/health)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}  ✅ RAG service route working! (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" == "503" ]; then
    echo -e "${YELLOW}  ⚠️  Service unavailable (HTTP $HTTP_CODE)${NC}"
    echo "  Check if rag-service container is running"
else
    echo -e "${YELLOW}  Status: HTTP $HTTP_CODE${NC}"
fi

echo ""

# ==============================================================================
# Setup Summary
# ==============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Kong Gateway Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Kong Endpoints:"
echo "  - Proxy (HTTP): http://localhost:8000"
echo "  - Proxy (HTTPS): https://localhost:8443"
echo "  - Admin API: http://localhost:8001"
echo "  - Admin GUI: http://localhost:8002"
echo ""
echo "RAG API Routes (via Kong):"
echo "  - Health: http://localhost:8000/api/v1/rag/status/health"
echo "  - Search: http://localhost:8000/api/v1/rag/search"
echo "  - Query: http://localhost:8000/api/v1/rag/query"
echo "  - LlamaIndex: http://localhost:8000/api/v1/llamaindex/*"
echo ""
echo "Configuration:"
echo "  - Rate Limit: 100 req/min per route"
echo "  - CORS: Enabled for localhost:3103"
echo "  - Service Token: Automatically added"
echo "  - Request ID: Auto-generated (X-Request-ID)"
echo ""
echo "Next Steps:"
echo "  1. Update Dashboard to use Kong: http://localhost:8000"
echo "  2. Test routes: curl http://localhost:8000/api/v1/rag/status/health"
echo "  3. View Admin GUI: http://localhost:8002"
echo "  4. Enable JWT auth (optional): bash scripts/kong/enable-jwt.sh"
echo ""
echo -e "${GREEN}✅ Kong is ready to proxy requests!${NC}"
echo ""

