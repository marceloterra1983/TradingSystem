#!/bin/bash
# Start LangGraph Development Environment (Port 8112)

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

COMPOSE_CMD=()
COMPOSE_ARGS=()

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"
COMPOSE_FILE="${REPO_ROOT}/tools/compose/docker-compose.langgraph-dev.yml"

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

# Source .env to check LANGSMITH_API_KEY using safe parsing
if [[ -f "$ENV_FILE" ]]; then
    # Use set -a/+a to safely source the .env file in a controlled way
    set -a
    . "$ENV_FILE"
    set +a
fi

# Validate LANGSMITH_API_KEY
if [[ -z "$LANGSMITH_API_KEY" ]]; then
    echo -e "${YELLOW}⚠️  LANGSMITH_API_KEY is not set in .env.${NC}"
    echo -e "${BLUE}📝 Get your key at: https://smith.langchain.com/settings${NC}"
    echo -e "${YELLOW}⚠️  LangSmith Studio integration will not work without this key.${NC}"
fi

# Start services
echo -e "${BLUE}🚀 Starting LangGraph Development Environment${NC}"
echo -e "${BLUE}Port: 8112 | Mode: Development | Studio: Enabled${NC}"

# Clean start
echo -e "${BLUE}🧹 Cleaning up existing containers...${NC}"
compose_cmd -f "$COMPOSE_FILE" down

# Start services with build
echo -e "${BLUE}🏗️  Building and starting services...${NC}"
compose_cmd -f "$COMPOSE_FILE" up -d --build

echo -e "${GREEN}✓ LangGraph dev stack started${NC}"

# Wait for services to initialize
echo -e "${BLUE}⏳ Waiting for services to initialize (10s)...${NC}"
sleep 10

# Health check
echo -e "${BLUE}🏥 Performing health check...${NC}"
if curl -f http://localhost:8112/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ Health check failed, services may still be starting${NC}"
    echo -e "${BLUE}📋 Check logs: docker logs infra-langgraph-dev -f${NC}"
fi

# Print access information
echo
echo -e "${BLUE}🌐 Access URLs${NC}"
echo -e "${BLUE}─────────────────────────────────────────${NC}"
echo "LangGraph Dev API: http://localhost:8112"
echo "Health Check:    http://localhost:8112/health"
echo "Metrics:        http://localhost:8112/metrics"
echo "Redis (dev):    localhost:6380"
echo "PostgreSQL (dev):localhost:5443"
echo
echo -e "${BLUE}📊 LangSmith Studio:${NC}"
if [[ -n "$LANGSMITH_API_KEY" ]]; then
    echo "Visit: https://smith.langchain.com/studio"
else
    echo -e "${YELLOW}⚠️ Set LANGSMITH_API_KEY in .env to enable Studio${NC}"
fi
echo
echo -e "${BLUE}💡 Tips:${NC}"
echo "  - View logs: docker logs infra-langgraph-dev -f"
echo "  - Stop dev: bash scripts/langgraph/stop-dev.sh"
echo "  - Restart: bash scripts/langgraph/start-dev.sh"
echo "  - Dev ports: 8112 (LangGraph), 6380 (Redis), 5443 (PostgreSQL)"
echo
echo -e "${GREEN}✅ LangGraph development environment ready!${NC}"