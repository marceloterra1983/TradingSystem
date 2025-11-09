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
    "tools/compose/docker-compose.database-ui.yml"
    "tools/compose/docker-compose.workspace-stack.yml"
    "tools/compose/docker-compose.4-2-telegram-stack.yml"
    "tools/compose/docker-compose.4-1-tp-capital-stack.yml"
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

# 4.1 Database UI Stack
echo -e "${CYAN}📊 Starting Database UI Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.database-ui.yml" ]; then
    if docker compose -p 3-database-stack -f "$PROJECT_ROOT/tools/compose/docker-compose.database-ui.yml" up -d; then
        echo -e "${GREEN}✓ Database UI stack started (QuestDB + pgAdmin/Adminer)${NC}"
    else
        echo -e "${RED}✗ Failed to start Database UI stack${NC}"
    fi
else
    echo -e "${RED}✗ Database UI compose file not found${NC}"
fi
echo ""

# 4.2 WORKSPACE Stack
echo -e "${CYAN}🧱 Starting WORKSPACE Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.workspace-stack.yml" ]; then
    if docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.workspace-stack.yml" up -d; then
        echo -e "${GREEN}✓ Workspace stack started${NC}"
    else
        echo -e "${RED}✗ Failed to start Workspace stack${NC}"
    fi
else
    echo -e "${YELLOW}⊗ Workspace stack compose file not found${NC}"
fi
echo ""

# 4.3 TELEGRAM Stack
echo -e "${CYAN}📨 Starting TELEGRAM Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.4-2-telegram-stack.yml" ]; then
    if docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.4-2-telegram-stack.yml" up -d; then
        echo -e "${GREEN}✓ Telegram stack started${NC}"
    else
        echo -e "${RED}✗ Failed to start Telegram stack${NC}"
    fi
else
    echo -e "${YELLOW}⊗ Telegram stack compose file not found${NC}"
fi
echo ""

# 4.4 TP-CAPITAL Stack
echo -e "${CYAN}📈 Starting TP-CAPITAL Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.4-1-tp-capital-stack.yml" ]; then
    if docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.4-1-tp-capital-stack.yml" up -d; then
        echo -e "${GREEN}✓ TP-Capital stack started${NC}"
    else
        echo -e "${RED}✗ Failed to start TP-Capital stack${NC}"
    fi
else
    echo -e "${YELLOW}⊗ TP-Capital stack compose file not found${NC}"
fi
echo ""

# 4.5 DOCS Stack (independent)
echo -e "${CYAN}📚 Starting DOCS Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.docs.yml" ]; then
    if docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.docs.yml" up -d; then
        echo -e "${GREEN}✓ DOCS stack started${NC}"
    else
        echo -e "${RED}✗ Failed to start DOCS stack${NC}"
    fi
else
    echo -e "${RED}✗ Docs compose file not found${NC}"
fi
echo ""

# 4.6 RAG Stack (independent)
echo -e "${CYAN}🧠 Starting RAG Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.rag.yml" ]; then
    if docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.rag.yml" up -d; then
        echo -e "${GREEN}✓ RAG stack started${NC}"
    else
        echo -e "${RED}✗ Failed to start RAG stack${NC}"
    fi
else
    echo -e "${RED}✗ RAG compose file not found${NC}"
fi
echo ""

# 4.7 MONITORING Stack (independent)
echo -e "${CYAN}📊 Starting MONITORING Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.monitoring.yml" ]; then
    if docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.monitoring.yml" up -d; then
        echo -e "${GREEN}✓ MONITORING stack started${NC}"
    else
        echo -e "${RED}✗ Failed to start MONITORING stack${NC}"
    fi
else
    echo -e "${RED}✗ Monitoring compose file not found${NC}"
fi
echo ""

# 4.8 TOOLS Stack (independent)
echo -e "${CYAN}🔧 Starting TOOLS Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.tools.yml" ]; then
    if docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.tools.yml" up -d; then
        echo -e "${GREEN}✓ TOOLS stack started${NC}"
    else
        echo -e "${RED}✗ Failed to start TOOLS stack${NC}"
    fi
else
    echo -e "${RED}✗ Tools compose file not found${NC}"
fi
echo ""

# 4.9 FIRECRAWL Stack (independent)
echo -e "${CYAN}🕷️  Starting FIRECRAWL Stack...${NC}"
if [ -f "$PROJECT_ROOT/tools/compose/docker-compose.firecrawl.yml" ]; then
    if docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.firecrawl.yml" up -d; then
        echo -e "${GREEN}✓ FIRECRAWL stack started${NC}"
    else
        echo -e "${RED}✗ Failed to start FIRECRAWL stack${NC}"
    fi
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

for prefix in "workspace" "telegram" "tp-capital" "data" "docs" "rag" "monitor" "tools"; do
    count=$(docker ps --filter "name=${prefix}-" --format '{{.Names}}' 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        case $prefix in
            workspace) icon="🧱" name="WORKSPACE" ;;
            telegram) icon="📨" name="TELEGRAM" ;;
            tp-capital) icon="📈" name="TP-CAPITAL" ;;
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
