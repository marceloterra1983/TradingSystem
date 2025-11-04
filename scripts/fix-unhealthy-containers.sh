#!/bin/bash
# ==============================================================================
# TradingSystem - Fix Unhealthy Containers
# ==============================================================================
# Corrige containers com status unhealthy identificados pelo comando status
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🔧 ${BLUE}Fix Unhealthy Containers${NC}                            ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================================================
# Problem 1: Qdrant container is missing
# ==============================================================================

echo -e "${YELLOW}━━━ Problem 1: Qdrant Container Missing ━━━${NC}"
echo ""
echo -e "${CYAN}Affected services:${NC}"
echo -e "  • rag-llamaindex-ingest (tries to connect to data-qdrant:6333)"
echo -e "  • rag-service (tries to connect to data-qdrant:6333)"
echo -e "  • tools-langgraph (depends on services above)"
echo ""

if docker ps -a --format '{{.Names}}' | grep -qx "data-qdrant"; then
    echo -e "${GREEN}✓ Qdrant container exists${NC}"
    
    if docker ps --format '{{.Names}}' | grep -qx "data-qdrant"; then
        echo -e "${GREEN}✓ Qdrant is running${NC}"
    else
        echo -e "${YELLOW}⚠ Qdrant is stopped, starting...${NC}"
        docker start data-qdrant
        sleep 3
        echo -e "${GREEN}✓ Qdrant started${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Qdrant container doesn't exist, creating...${NC}"
    echo ""
    echo -e "${CYAN}Starting Qdrant from timescale compose...${NC}"
    docker compose -f tools/compose/docker-compose.timescale.yml up -d data-qdrant
    
    echo ""
    echo -e "${CYAN}Waiting for Qdrant to be healthy (max 30s)...${NC}"
    waited=0
    while [ $waited -lt 30 ]; do
        if docker ps --filter "name=data-qdrant" --filter "health=healthy" --format '{{.Names}}' | grep -q "data-qdrant"; then
            echo -e "${GREEN}✓ Qdrant is healthy${NC}"
            break
        fi
        sleep 2
        waited=$((waited + 2))
        echo -n "."
    done
    echo ""
    
    if [ $waited -ge 30 ]; then
        echo -e "${YELLOW}⚠ Qdrant health check timeout, but container is running${NC}"
    fi
fi

echo ""

# ==============================================================================
# Problem 2: Kestra missing database password
# ==============================================================================

echo -e "${YELLOW}━━━ Problem 2: Kestra Database Configuration ━━━${NC}"
echo ""
echo -e "${CYAN}Issue: Missing datasources.default.password${NC}"
echo ""

# Check if Kestra is running
if docker ps --format '{{.Names}}' | grep -qx "tools-kestra"; then
    echo -e "${CYAN}Restarting Kestra with correct environment...${NC}"
    
    # Ensure env vars are exported
    export KESTRA_DB_HOST="${KESTRA_DB_HOST:-tools-kestra-postgres}"
    export KESTRA_DB_PORT="${KESTRA_DB_PORT:-5432}"
    export KESTRA_DB_NAME="${KESTRA_DB_NAME:-kestra}"
    export KESTRA_DB_USER="${KESTRA_DB_USER:-kestra}"
    export KESTRA_DB_PASSWORD="${KESTRA_DB_PASSWORD:-kestra_password_change_in_production}"
    export KESTRA_BASICAUTH_USERNAME="${KESTRA_BASICAUTH_USERNAME:-admin}"
    export KESTRA_BASICAUTH_PASSWORD="${KESTRA_BASICAUTH_PASSWORD:-admin_change_in_production}"
    export KESTRA_HTTP_PORT="${KESTRA_HTTP_PORT:-8100}"
    
    # Restart Kestra
    docker compose -f tools/compose/docker-compose.tools.yml restart kestra
    
    echo ""
    echo -e "${CYAN}Waiting for Kestra to start (max 60s)...${NC}"
    waited=0
    while [ $waited -lt 60 ]; do
        if curl -sf --max-time 3 "http://localhost:8100/api/v1/configs" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Kestra is responding${NC}"
            break
        fi
        sleep 3
        waited=$((waited + 3))
        echo -n "."
    done
    echo ""
    
    if [ $waited -ge 60 ]; then
        echo -e "${YELLOW}⚠ Kestra may still be starting, check logs: docker logs tools-kestra${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Kestra is not running${NC}"
    echo -e "${CYAN}Start it with: docker compose -f tools/compose/docker-compose.tools.yml up -d kestra${NC}"
fi

echo ""

# ==============================================================================
# Problem 3: Restart affected RAG services
# ==============================================================================

echo -e "${YELLOW}━━━ Step 3: Restart Affected RAG Services ━━━${NC}"
echo ""

# Wait a bit for Qdrant to be fully ready
if docker ps --format '{{.Names}}' | grep -qx "data-qdrant"; then
    echo -e "${CYAN}Giving Qdrant 5 seconds to fully initialize...${NC}"
    sleep 5
    
    echo -e "${CYAN}Restarting RAG services...${NC}"
    for service in rag-llamaindex-ingest rag-service tools-langgraph; do
        if docker ps -a --format '{{.Names}}' | grep -qx "$service"; then
            echo -e "  Restarting ${BLUE}$service${NC}..."
            docker restart "$service" >/dev/null 2>&1
        fi
    done
    
    echo ""
    echo -e "${GREEN}✓ RAG services restarted${NC}"
    echo ""
    echo -e "${CYAN}Waiting 10 seconds for health checks...${NC}"
    sleep 10
fi

# ==============================================================================
# Final Status Check
# ==============================================================================

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  📊 ${BLUE}Final Status Check${NC}                                  ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

unhealthy_count=$(docker ps --filter "health=unhealthy" --format '{{.Names}}' | wc -l)

if [ "$unhealthy_count" -eq 0 ]; then
    echo -e "${GREEN}✅ All containers are healthy!${NC}"
else
    echo -e "${YELLOW}⚠ Still $unhealthy_count unhealthy container(s):${NC}"
    docker ps --filter "health=unhealthy" --format "  • {{.Names}} ({{.Status}})"
    echo ""
    echo -e "${CYAN}💡 Tips:${NC}"
    echo -e "  • Check logs: ${BLUE}docker logs <container-name>${NC}"
    echo -e "  • View status: ${BLUE}bash scripts/status.sh${NC}"
    echo -e "  • Manual restart: ${BLUE}docker restart <container-name>${NC}"
fi

echo ""
echo -e "${CYAN}Run 'status' to see updated container health${NC}"
echo ""

