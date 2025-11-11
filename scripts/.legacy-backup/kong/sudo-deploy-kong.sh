#!/bin/bash
# ==============================================================================
# SUDO: Deploy Kong Gateway (Kill conflicting ports first)
# ==============================================================================
# Description: Kills processes on Kong ports and deploys gateway
# Usage: sudo bash scripts/kong/sudo-deploy-kong.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Kong Gateway - Full Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==============================================================================
# Step 1: Kill Processes on Kong Ports
# ==============================================================================
echo -e "${GREEN}[1/4] Killing processes on Kong ports...${NC}"

KONG_PORTS="5433 8000 8001 8002 8443"

for PORT in $KONG_PORTS; do
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

# Verify
echo ""
ALL_FREE=true
for PORT in $KONG_PORTS; do
    if ss -tuln | grep -q ":$PORT "; then
        echo -e "${RED}  ❌ Port $PORT still in use${NC}"
        ALL_FREE=false
    else
        echo -e "${GREEN}  ✅ Port $PORT is FREE${NC}"
    fi
done

echo ""

if [ "$ALL_FREE" = false ]; then
    echo -e "${RED}WARNING: Some ports still occupied!${NC}"
    echo ""
fi

# ==============================================================================
# Step 2: Configure Environment
# ==============================================================================
echo -e "${GREEN}[2/4] Configuring environment...${NC}"

cd "$PROJECT_ROOT"

if ! grep -q "^KONG_PG_PASSWORD=" .env 2>/dev/null; then
    echo "  Generating KONG_PG_PASSWORD..."
    echo "" >> .env
    echo "# Kong API Gateway (Generated $(date +%Y-%m-%d))" >> .env
    echo "KONG_PG_PASSWORD=$(openssl rand -hex 16)" >> .env
    echo -e "${GREEN}  ✅ KONG_PG_PASSWORD added to .env${NC}"
else
    echo -e "${GREEN}  ✅ KONG_PG_PASSWORD already configured${NC}"
fi

echo ""

# ==============================================================================
# Step 3: Deploy Kong
# ==============================================================================
echo -e "${GREEN}[3/4] Deploying Kong Gateway...${NC}"

docker compose -f tools/compose/docker-compose.kong.yml down 2>/dev/null || true
sleep 2

docker compose -f tools/compose/docker-compose.kong.yml up -d

echo ""
echo "  Waiting 40 seconds for Kong to initialize..."
sleep 40

echo ""
echo "  Kong status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|kong"

echo ""

# ==============================================================================
# Step 4: Verify Deployment
# ==============================================================================
echo -e "${GREEN}[4/4] Verifying deployment...${NC}"

echo ""
echo "  Testing Admin API..."
if curl -s http://localhost:8001/status | jq -e '.database.reachable' > /dev/null 2>&1; then
    echo -e "${GREEN}    ✅ Kong Admin API healthy${NC}"
    DB_STATUS=$(curl -s http://localhost:8001/status | jq -r '.database.reachable')
    echo "    Database reachable: $DB_STATUS"
else
    echo -e "${RED}    ❌ Kong Admin API not responding${NC}"
    echo "    Check logs: docker logs kong-gateway"
fi

echo ""
echo "  Testing Proxy..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 2>/dev/null || echo "000")

if [ "$HTTP_CODE" == "404" ]; then
    echo -e "${GREEN}    ✅ Kong Proxy responding (404 expected, no routes yet)${NC}"
elif [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}    ✅ Kong Proxy responding (HTTP 200)${NC}"
else
    echo -e "${YELLOW}    Status: HTTP $HTTP_CODE${NC}"
fi

echo ""

# ==============================================================================
# Deployment Summary
# ==============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Kong Gateway Deployed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Kong Endpoints:"
echo "  - Proxy (HTTP): http://localhost:8000"
echo "  - Proxy (HTTPS): https://localhost:8443"
echo "  - Admin API: http://localhost:8001"
echo "  - Admin GUI: http://localhost:8002 (if enabled)"
echo ""
echo "Configuration:"
echo "  - Mode: Declarative (DB-less)"
echo "  - Config File: tools/compose/kong-declarative.yml"
echo "  - Rate Limiting: 100 req/min"
echo "  - CORS: Enabled"
echo ""
echo "Next Steps:"
echo "  1. Test routes: curl http://localhost:8000/api/v1/rag/status/health"
echo "  2. View config: curl http://localhost:8001/config | jq"
echo "  3. Update Dashboard: Change baseURL to http://localhost:8000"
echo ""
echo -e "${GREEN}✅ Kong is ready!${NC}"
echo ""

