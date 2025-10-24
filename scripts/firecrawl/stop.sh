#!/bin/bash
# Firecrawl Stack Stopper
# Usage: bash scripts/firecrawl/stop.sh [--remove-volumes]

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_CMD=()
COMPOSE_FILE="${ROOT_DIR}/tools/firecrawl/firecrawl-source/docker-compose.yaml"
REMOVE_VOLUMES=false

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

  echo -e "${RED}❌ Docker Compose not found. Install Docker compose plugin or docker-compose binary.${NC}"
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

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --remove-volumes)
        REMOVE_VOLUMES=true
        shift
        ;;
      --help)
        echo "Usage: $(basename "$0") [--remove-volumes]"
        exit 0
        ;;
      *)
        echo -e "${RED}Unknown option: $1${NC}"
        exit 1
        ;;
    esac
  done
}

confirm_volume_removal() {
  echo -e "${RED}⚠ This will remove Firecrawl volumes (data will be lost).${NC}"
  read -r -p "Type 'DELETE' to confirm: " answer
  if [[ "$answer" != "DELETE" ]]; then
    echo -e "${YELLOW}Volume removal cancelled.${NC}"
    exit 0
  fi
}

stop_firecrawl() {
  section "🛑 Stopping Firecrawl Stack"

  cd "$ROOT_DIR"

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}❌ Compose file not found: $COMPOSE_FILE${NC}"
    exit 1
  fi

  if [[ -f ".env" ]]; then
    set -a
    source ".env"
    set +a
  else
    echo -e "${YELLOW}⚠️  Root .env not found. Using compose defaults for Firecrawl variables.${NC}"
  fi

  if [[ "$REMOVE_VOLUMES" == "true" ]]; then
    confirm_volume_removal
    echo -e "${YELLOW}📦 Stopping containers and removing volumes...${NC}"
    compose_cmd -f "$COMPOSE_FILE" down -v
    echo -e "${GREEN}✓ Containers stopped and volumes removed${NC}"
  else
    echo -e "${YELLOW}📦 Stopping containers (volumes preserved)...${NC}"
    compose_cmd -f "$COMPOSE_FILE" down
    echo -e "${GREEN}✓ Containers stopped${NC}"
  fi

  echo ""
  echo -e "${BLUE}Remaining Firecrawl containers:${NC}"
  docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "^firecrawl-" || echo "None"

  echo ""
  echo -e "${YELLOW}💡 Tips${NC}"
  echo "  Start again: bash scripts/firecrawl/start.sh"
  echo "  View volumes: docker volume ls | grep firecrawl"
  echo "  Prune dangling volumes: docker volume prune"
}

main() {
  parse_args "$@"
  detect_compose
  ensure_docker_running
  stop_firecrawl
}

main "$@"
