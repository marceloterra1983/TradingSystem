#!/bin/bash
# Start all TradingSystem Docker stacks inside dev container
# Uses existing compose files from tools/compose/

set -e

echo "🚀 Starting All TradingSystem Stacks (Inside Dev Container)"
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

# List of compose files to start (in order of dependencies)
# Ordem: Infrastructure → Databases → Monitoring → Services → Frontend
COMPOSE_FILES=(
    # Infrastructure (Gateway)
    "tools/compose/docker-compose.0-gateway-stack.yml"         # API Gateway (Traefik)

    # Databases & Storage
    "tools/compose/docker-compose.5-0-database-stack.yml"      # PostgreSQL, Redis, QuestDB, Database UIs

    # Monitoring & Observability
    "tools/compose/docker-compose.6-1-monitoring-stack.yml"    # Prometheus, Grafana, Loki

    # Core Application Services
    "tools/compose/docker-compose.4-3-workspace-stack.yml"     # Workspace API + DB + Redis
    "tools/compose/docker-compose.4-1-tp-capital-stack.yml"    # TP Capital Trading

    # Communication & Integration
    "tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml"  # Telegram Gateway
    "tools/compose/docker-compose.5-2-evolution-api-stack.yml"           # Evolution API (WhatsApp)
    "tools/compose/docker-compose.5-3-waha-stack.yml"                    # WAHA (WhatsApp)

    # AI & RAG Services
    "tools/compose/docker-compose.4-4-rag-stack.yml"           # RAG Stack (Qdrant + Ollama + LlamaIndex)

    # Automation & Workflows
    "tools/compose/docker-compose-5-1-n8n-stack.yml"           # n8n Workflow Automation
    "tools/compose/docker-compose.5-5-kestra-stack.yml"        # Kestra Orchestration

    # Tools & Utilities
    "tools/compose/docker-compose.5-7-firecrawl-stack.yml"     # Firecrawl Web Scraping
    "tools/compose/docker-compose.4-5-course-crawler-stack.yml" # Course Crawler

    # Frontend Applications
    "tools/compose/docker-compose.1-dashboard-stack.yml"       # Dashboard UI (React)
    "tools/compose/docker-compose.2-docs-stack.yml"            # Documentation (Docusaurus)
)

echo -e "${BLUE}Starting Docker Compose stacks...${NC}"
echo ""

FAILED_STACKS=()

for file in "${COMPOSE_FILES[@]}"; do
    if [ -f "$file" ]; then
        stack_name=$(basename "$file" .yml | sed 's/docker-compose\.//')
        echo -e "${BLUE}📦 Starting: $stack_name${NC}"

        if docker compose -f "$file" up -d 2>&1; then
            echo -e "${GREEN}✅ $stack_name started successfully${NC}"
        else
            echo -e "${RED}❌ Failed to start $stack_name${NC}"
            FAILED_STACKS+=("$stack_name")
        fi
        echo ""
    else
        echo -e "${YELLOW}⚠️  File not found: $file${NC}"
        echo ""
    fi
done

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy (10 seconds)...${NC}"
sleep 10

# Display status
echo ""
echo -e "${BLUE}📊 Container Status:${NC}"
docker ps --filter "label=com.tradingsystem.stack" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20

echo ""
if [ ${#FAILED_STACKS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All stacks started successfully!${NC}"
else
    echo -e "${RED}❌ Failed stacks: ${FAILED_STACKS[*]}${NC}"
    echo -e "${YELLOW}Check logs with: docker compose -f <stack-file> logs${NC}"
fi

echo ""
echo -e "${BLUE}🌐 Service URLs (via Port Forwarding):${NC}"
echo -e "  ${GREEN}http://localhost:9080${NC}      - API Gateway (Traefik)"
echo -e "  ${GREEN}http://localhost:9081${NC}      - Traefik Dashboard"
echo -e "  ${GREEN}http://localhost:8090${NC}      - Dashboard UI"
echo -e "  ${GREEN}http://localhost:3404${NC}      - Documentation Hub"
echo -e "  ${GREEN}http://localhost:3200${NC}      - Workspace API"

echo ""
echo -e "${BLUE}💡 Management Commands:${NC}"
echo -e "  ${GREEN}docker ps${NC}                                       - View running containers"
echo -e "  ${GREEN}docker compose -f <stack-file> logs -f${NC}         - View logs"
echo -e "  ${GREEN}docker compose -f <stack-file> restart${NC}         - Restart stack"
echo -e "  ${GREEN}bash .devcontainer/scripts/stop-all-stacks.sh${NC}  - Stop all stacks"
echo ""
