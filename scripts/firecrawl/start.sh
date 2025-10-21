#!/bin/bash
# Firecrawl Stack Starter
# Usage: bash scripts/firecrawl/start.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_CMD=()
COMPOSE_FILE="${ROOT_DIR}/infrastructure/firecrawl/firecrawl-source/docker-compose.yaml"

section() {
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
}

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

  echo -e "${RED}❌ Docker Compose not found. Install Docker desktop or the compose plugin first.${NC}"
  exit 1
}

compose_cmd() {
  "${COMPOSE_CMD[@]}" "$@"
}

ensure_docker_running() {
  if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running. Start Docker and retry.${NC}"
    exit 1
  fi
}

start_firecrawl() {
  section "🚀 Starting Firecrawl Stack"

  cd "$ROOT_DIR"

  if [[ ! -d "infrastructure/firecrawl/firecrawl-source" ]]; then
    echo -e "${RED}❌ Firecrawl submodule not found (infrastructure/firecrawl/firecrawl-source).${NC}"
    echo -e "${YELLOW}Run:${NC} git submodule update --init --recursive"
    exit 1
  fi

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}❌ Compose file not found: $COMPOSE_FILE${NC}"
    exit 1
  fi

  if [[ -f ".env" ]]; then
    # Export root environment variables so compose interpolation picks them up
    set -a
    source ".env"
    set +a
  else
    echo -e "${YELLOW}⚠️  Root .env not found. Using compose defaults for Firecrawl variables.${NC}"
  fi

  echo -e "${YELLOW}📦 Building and starting containers...${NC}"
  compose_cmd -f "$COMPOSE_FILE" up -d --build
  echo -e "${GREEN}✓ Firecrawl containers started${NC}"

  echo -e "${YELLOW}⏳ Waiting for services to initialize (10s)...${NC}"
  sleep 10

  local local_port="${FIRECRAWL_PORT:-3002}"
  local proxy_port="${FIRECRAWL_PROXY_PORT:-3600}"

  echo -e "${BLUE}📊 Container status:${NC}"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(firecrawl-|STATUS)" || echo "No firecrawl containers found"

  echo ""
  echo -e "${BLUE}🌐 Access URLs${NC}"
  echo "  Firecrawl API (firecrawl-api):  http://localhost:${local_port}"
  echo "  Firecrawl Proxy:     http://localhost:${proxy_port}"
  echo "  Bull Queue UI:       http://localhost:${local_port}/admin/queues"
  echo ""
  echo -e "${YELLOW}💡 Tips${NC}"
  echo "  View logs: docker logs firecrawl-api -f  # or docker compose --env-file $ROOT_DIR/.env -f $COMPOSE_FILE logs -f"
  echo "  Stop stack: bash scripts/firecrawl/stop.sh"
  echo "  Core health: curl http://localhost:${local_port}/v0/health/readiness"
}

main() {
  detect_compose
  ensure_docker_running
  start_firecrawl
}

main "$@"
