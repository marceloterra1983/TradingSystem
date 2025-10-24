#!/bin/bash
# Stop LangGraph Development Environment

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

# Stop services
echo -e "${BLUE}🛑 Stopping LangGraph Development Environment${NC}"

compose_cmd -f "$COMPOSE_FILE" down

echo -e "${GREEN}✓ LangGraph dev stack stopped${NC}"

# Optional cleanup info
echo
echo -e "${BLUE}💡 Additional options:${NC}"
echo "  To remove volumes (data will be lost):"
echo "  docker compose -f ${COMPOSE_FILE} down -v"
echo
echo "  View remaining containers:"
echo "  docker ps --format \"{{.Names}}\" | grep -E \"^infra-.*-dev$\""
echo
