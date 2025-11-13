#!/bin/bash
# Stop all TradingSystem Docker stacks inside dev container
# Uses existing compose files from tools/compose/

set -e

echo "🛑 Stopping All TradingSystem Stacks (Inside Dev Container)"
echo "==========================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Change to project root
cd /workspace

# List of compose files to stop (in REVERSE order of dependencies)
# Ordem: Frontend → Tools → Automation → AI → Communication → Services → Monitoring → Databases → Infrastructure
COMPOSE_FILES=(
    # Frontend Applications (first to stop)
    "tools/compose/docker-compose.2-docs-stack.yml"            # Documentation
    "tools/compose/docker-compose.1-dashboard-stack.yml"       # Dashboard UI

    # Tools & Utilities
    "tools/compose/docker-compose.4-5-course-crawler-stack.yml" # Course Crawler
    "tools/compose/docker-compose.5-7-firecrawl-stack.yml"     # Firecrawl

    # Automation & Workflows
    "tools/compose/docker-compose.5-5-kestra-stack.yml"        # Kestra
    "tools/compose/docker-compose-5-1-n8n-stack.yml"           # n8n

    # AI & RAG Services
    "tools/compose/docker-compose.4-4-rag-stack.yml"           # RAG Stack

    # Communication & Integration
    "tools/compose/docker-compose.5-3-waha-stack.yml"                    # WAHA
    "tools/compose/docker-compose.5-2-evolution-api-stack.yml"           # Evolution API
    "tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml"  # Telegram Gateway

    # Core Application Services
    "tools/compose/docker-compose.4-1-tp-capital-stack.yml"    # TP Capital
    "tools/compose/docker-compose.4-3-workspace-stack.yml"     # Workspace API

    # Monitoring & Observability
    "tools/compose/docker-compose.6-1-monitoring-stack.yml"    # Prometheus, Grafana

    # Databases & Storage
    "tools/compose/docker-compose.5-0-database-stack.yml"      # Databases

    # Infrastructure (last to stop)
    "tools/compose/docker-compose.0-gateway-stack.yml"         # API Gateway
)

echo -e "${BLUE}Stopping Docker Compose stacks...${NC}"
echo ""

for file in "${COMPOSE_FILES[@]}"; do
    if [ -f "$file" ]; then
        stack_name=$(basename "$file" .yml | sed 's/docker-compose\.//')
        echo -e "${BLUE}📦 Stopping: $stack_name${NC}"
        docker compose -f "$file" down 2>/dev/null || echo -e "${YELLOW}  (already stopped or not found)${NC}"
    fi
done

echo ""
echo -e "${BLUE}Checking for remaining TradingSystem containers...${NC}"
REMAINING=$(docker ps -a --filter "label=com.tradingsystem.stack" --format "table {{.Names}}\t{{.Status}}" | tail -n +2)

if [ -z "$REMAINING" ]; then
    echo -e "${GREEN}✅ No TradingSystem containers found${NC}"
else
    echo "$REMAINING"
    echo ""
    echo -e "${YELLOW}⚠️  Some containers are still running${NC}"
fi

echo ""
echo -e "${GREEN}✅ All stacks stopped!${NC}"
echo ""
