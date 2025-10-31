#!/bin/bash
# ==============================================================================
# TradingSystem - Complete Cleanup and Restart
# ==============================================================================
# Removes ALL containers and restarts with organized structure
# ==============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🧹 ${GREEN}TradingSystem - Complete Cleanup & Restart${NC}         ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Stop ALL containers
echo -e "${CYAN}Step 1: Stopping ALL containers...${NC}"
docker ps -q | xargs -r docker stop 2>/dev/null || true
echo -e "${GREEN}✓ All containers stopped${NC}"
echo ""

# Step 2: Remove ALL containers
echo -e "${CYAN}Step 2: Removing ALL containers...${NC}"
docker ps -aq | xargs -r docker rm -f 2>/dev/null || true
echo -e "${GREEN}✓ All containers removed${NC}"
echo ""

# Step 3: List all compose files
echo -e "${CYAN}Step 3: Detecting compose files...${NC}"
COMPOSE_FILES=(
    "tools/compose/docker-compose.database.yml"
    "tools/compose/docker-compose.apps.yml"
    "tools/compose/docker-compose.docs.yml"
    "tools/compose/docker-compose.rag.yml"
    "tools/compose/docker-compose.monitoring.yml"
    "tools/compose/docker-compose.tools.yml"
    "tools/compose/docker-compose.firecrawl.yml"
)

for file in "${COMPOSE_FILES[@]}"; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
        echo -e "  ${GREEN}✓${NC} Found: $file"
    else
        echo -e "  ${YELLOW}⊗${NC} Missing: $file"
    fi
done
echo ""

# Step 4: Start stacks in correct order
echo -e "${CYAN}Step 4: Starting stacks in dependency order...${NC}"
echo ""

# 4.1 DATABASE Stack (first - everyone depends on it)
echo -e "${CYAN}📊 Starting DATABASE Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.database.yml" ]; then
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.database.yml" up -d
    echo -e "${GREEN}✓ DATABASE stack started${NC}"
    echo "  Waiting for TimescaleDB to be healthy..."
    sleep 10
    while ! docker inspect --format='{{.State.Health.Status}}' data-timescale 2>/dev/null | grep -q healthy; do
        sleep 2
    done
    echo -e "${GREEN}✓ TimescaleDB is healthy${NC}"
else
    echo -e "${RED}✗ Database compose file not found${NC}"
fi
echo ""

# 4.2 APPS Stack (depends on database)
echo -e "${CYAN}📦 Starting APPS Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.apps.yml" ]; then
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.apps.yml" up -d
    echo -e "${GREEN}✓ APPS stack started${NC}"
else
    echo -e "${RED}✗ Apps compose file not found${NC}"
fi
echo ""

# 4.3 DOCS Stack (independent)
echo -e "${CYAN}📚 Starting DOCS Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.docs.yml" ]; then
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.docs.yml" up -d
    echo -e "${GREEN}✓ DOCS stack started${NC}"
else
    echo -e "${RED}✗ Docs compose file not found${NC}"
fi
echo ""

# 4.4 RAG Stack (independent)
echo -e "${CYAN}🧠 Starting RAG Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.rag.yml" ]; then
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.rag.yml" up -d
    echo -e "${GREEN}✓ RAG stack started${NC}"
else
    echo -e "${RED}✗ RAG compose file not found${NC}"
fi
echo ""

# 4.5 MONITORING Stack (independent)
echo -e "${CYAN}📊 Starting MONITORING Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.monitoring.yml" ]; then
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.monitoring.yml" up -d
    echo -e "${GREEN}✓ MONITORING stack started${NC}"
else
    echo -e "${RED}✗ Monitoring compose file not found${NC}"
fi
echo ""

# 4.6 TOOLS Stack (independent)
echo -e "${CYAN}🔧 Starting TOOLS Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.tools.yml" ]; then
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.tools.yml" up -d
    echo -e "${GREEN}✓ TOOLS stack started${NC}"
else
    echo -e "${RED}✗ Tools compose file not found${NC}"
fi
echo ""

# 4.7 FIRECRAWL Stack (independent)
echo -e "${CYAN}🕷️  Starting FIRECRAWL Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.firecrawl.yml" ]; then
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.firecrawl.yml" up -d
    echo -e "${GREEN}✓ FIRECRAWL stack started${NC}"
else
    echo -e "${RED}✗ Firecrawl compose file not found${NC}"
fi
echo ""

# Step 5: Wait for health checks
echo -e "${CYAN}Step 5: Waiting for containers to stabilize...${NC}"
sleep 5
echo ""

# Step 6: Show final status
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ✅ ${GREEN}Cleanup and Restart Complete!${NC}                     ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Count containers by stack
echo -e "${CYAN}Container Summary:${NC}"
echo ""

for prefix in "apps" "data" "docs" "rag" "monitor" "tools"; do
    count=$(docker ps --filter "name=${prefix}-" --format '{{.Names}}' 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        case $prefix in
            apps) icon="📦" name="APPS" ;;
            data) icon="🗄️" name="DATA" ;;
            docs) icon="📚" name="DOCS" ;;
            rag) icon="🧠" name="RAG" ;;
            monitor) icon="📊" name="MONITORING" ;;
            tools) icon="🔧" name="TOOLS" ;;
        esac
        echo -e "  $icon ${GREEN}$name Stack:${NC} $count containers"
    fi
done

echo ""
total=$(docker ps -q | wc -l)
echo -e "${GREEN}Total running:${NC} $total containers"
echo ""

echo -e "${CYAN}Next steps:${NC}"
echo -e "  ${GREEN}status${NC}  - View detailed status"
echo -e "  ${GREEN}stop${NC}    - Stop all services"
echo ""
