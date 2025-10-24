#!/bin/bash
# Stop All TradingSystem Stacks
# Execute com: bash stop-all-stacks.sh

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_CMD=()
COMPOSE_ARGS=()

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

detect_compose() {
    if command -v docker >/dev/null 2>&1; then
        if docker compose version >/dev/null 2>&1; then
            COMPOSE_CMD=(docker compose)
            return 0
        fi
    fi

    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD=(docker-compose)
        return 0
    fi

    echo -e "${RED}❌ Docker Compose not found. Install either the Docker Compose plugin or docker-compose binary.${NC}"
    exit 1
}

compose_cmd() {
    "${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" "$@"
}

detect_compose

if [[ -f "$ENV_FILE" ]]; then
    COMPOSE_ARGS+=(--env-file "$ENV_FILE")
else
    echo -e "${YELLOW}⚠️  Root .env not found at ${ENV_FILE}. Compose will use defaults.${NC}"
fi

has_compose_services() {
    local compose_file="$1"
    [[ "$compose_file" != /* ]] && compose_file="${REPO_ROOT}/${compose_file}"

    if [ ! -f "$compose_file" ]; then
        return 1
    fi

    set +e
    local services
    services=$(compose_cmd -f "$compose_file" config --services 2>/dev/null)
    local status=$?
    set -e

    if [ $status -ne 0 ]; then
        return 1
    fi

    if [ -z "${services//[$' \t\r\n']/}" ]; then
        return 1
    fi

    return 0
}

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🛑 Stopping TradingSystem - All Stacks${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Ordem reversa do start (parar dependentes primeiro)

# 7. Infrastructure Services
echo -e "${YELLOW}📦 Stack 7/7: Stopping Infrastructure services...${NC}"
compose_cmd -f "${REPO_ROOT}/tools/compose/docker-compose.infra.yml" down
echo -e "${GREEN}✓ Infrastructure services stopped${NC}"
echo ""

# 6. Monitoring
echo -e "${YELLOW}📦 Stack 6/7: Stopping Monitoring...${NC}"
if [ -f tools/monitoring/docker-compose.yml ]; then
    compose_cmd -f "${REPO_ROOT}/tools/monitoring/docker-compose.yml" down
    echo -e "${GREEN}✓ Monitoring stopped${NC}"
else
    echo -e "${YELLOW}⚠ Monitoring compose file not found, skipping...${NC}"
fi
echo ""

# TimescaleDB stack
TIMESCALE_COMPOSE="tools/compose/docker-compose.timescale.yml"
echo -e "${YELLOW}📦 Stack 5/7: Stopping TimescaleDB...${NC}"
if has_compose_services "$TIMESCALE_COMPOSE"; then
    compose_cmd -f "${REPO_ROOT}/${TIMESCALE_COMPOSE}" down
    echo -e "${GREEN}✓ TimescaleDB stopped${NC}"
else
    echo -e "${YELLOW}↳ No TimescaleDB containers defined (stack skipped)${NC}"
fi
echo ""

# Frontend apps unified database
FRONTEND_APPS_COMPOSE="tools/compose/docker-compose.frontend-apps.yml"
echo -e "${YELLOW}📦 Stack 4/7: Stopping Frontend Apps database...${NC}"
if has_compose_services "$FRONTEND_APPS_COMPOSE"; then
    compose_cmd -f "${REPO_ROOT}/${FRONTEND_APPS_COMPOSE}" down
    echo -e "${GREEN}✓ Frontend Apps database stopped${NC}"
else
    echo -e "${YELLOW}↳ No frontend-apps containers defined (stack skipped)${NC}"
fi
echo ""

# 3. Data (manter volumes)
echo -e "${YELLOW}📦 Stack 3/7: Stopping Data (keeping volumes)...${NC}"
DATA_COMPOSE="tools/compose/docker-compose.data.yml"
if has_compose_services "$DATA_COMPOSE"; then
    compose_cmd -f "${REPO_ROOT}/${DATA_COMPOSE}" down
    echo -e "${GREEN}✓ Data layer stopped${NC}"
else
    echo -e "${YELLOW}↳ QuestDB stack retired; no data containers to stop.${NC}"
fi
echo ""

# Docs stack
DOCS_COMPOSE="tools/compose/docker-compose.docs.yml"
echo -e "${YELLOW}📦 Stack 2/7: Stopping Docs stack...${NC}"
if has_compose_services "$DOCS_COMPOSE"; then
    compose_cmd -f "${REPO_ROOT}/${DOCS_COMPOSE}" down
    echo -e "${GREEN}✓ Documentation services stopped${NC}"
else
    echo -e "${YELLOW}↳ No docs containers defined (stack skipped)${NC}"
fi
echo ""

INFRA_COMPOSE="tools/compose/docker-compose.infra.yml"
echo -e "${YELLOW}📦 Stack 1/7: Stopping Infrastructure (keeping volumes)...${NC}"
if has_compose_services "$INFRA_COMPOSE"; then
    compose_cmd -f "${REPO_ROOT}/${INFRA_COMPOSE}" down
    echo -e "${GREEN}✓ Infrastructure stopped${NC}"
else
    echo -e "${YELLOW}↳ No infrastructure containers defined (stack skipped)${NC}"
fi
echo ""

FIRECRAWL_STOP="${REPO_ROOT}/scripts/firecrawl/stop.sh"
if [[ -f "$FIRECRAWL_STOP" ]]; then
    echo -e "${YELLOW}📦 Firecrawl: Stopping Firecrawl stack...${NC}"
    bash "$FIRECRAWL_STOP"
else
    echo -e "${YELLOW}⚠ Firecrawl stop script not found at ${FIRECRAWL_STOP}${NC}"
fi
echo ""

# Status final
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All stacks stopped successfully!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Stop any remaining TradingSystem containers (including -dev containers)
REMAINING=$(docker ps -q | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo -e "${YELLOW}⚠ Containers still running:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    echo ""
    
    # Find TradingSystem-related containers (infra-, data-, docs-, mon-, apps-, ollama, etc.)
    TRADINGSYSTEM_CONTAINERS=$(docker ps --format "{{.Names}}" | grep -E "^(infra-|data-|docs-|mon-|firecrawl-|frontend-apps-|apps-|ollama)" || true)
    
    if [ -n "$TRADINGSYSTEM_CONTAINERS" ]; then
        echo -e "${YELLOW}📦 Stopping remaining TradingSystem containers...${NC}"
        echo "$TRADINGSYSTEM_CONTAINERS" | while read -r container; do
            echo -e "${YELLOW}  Stopping $container...${NC}"
            docker stop "$container" >/dev/null 2>&1 || true
        done
        echo -e "${GREEN}✓ Additional containers stopped${NC}"
        echo ""
        
        # Check again
        REMAINING_AFTER=$(docker ps --format "{{.Names}}" | grep -E "^(infra-|data-|docs-|mon-|firecrawl-|frontend-apps-|apps-|ollama)" | wc -l || echo "0")
        if [ "$REMAINING_AFTER" -gt 0 ]; then
            echo -e "${YELLOW}⚠ Some containers still running:${NC}"
            docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "^(infra-|data-|docs-|mon-|firecrawl-|frontend-apps-|apps-|ollama)"
            echo ""
            echo -e "${YELLOW}💡 To force stop all containers:${NC}"
            echo "  docker stop \$(docker ps -q)"
        else
            echo -e "${GREEN}✓ All TradingSystem containers stopped${NC}"
        fi
    else
        echo -e "${YELLOW}💡 Non-TradingSystem containers are still running${NC}"
        echo "  To stop all: docker stop \$(docker ps -q)"
    fi
else
    echo -e "${GREEN}✓ No containers running${NC}"
fi
echo ""

echo -e "${YELLOW}💡 Notes:${NC}"
echo "  - Volumes preserved (data not lost)"
echo "  - To remove volumes: docker volume prune"
echo "  - To start again: bash start-all-stacks.sh"
echo ""
