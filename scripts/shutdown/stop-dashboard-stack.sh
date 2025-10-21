#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/scripts/.runtime/dashboard-stack/pids"
LOG_DIR="$ROOT_DIR/scripts/.runtime/dashboard-stack/logs"
TIMESCALE_COMPOSE="$ROOT_DIR/infrastructure/compose/docker-compose.timescale.yml"
FIRECRAWL_COMPOSE="$ROOT_DIR/infrastructure/firecrawl/firecrawl-source/docker-compose.yaml"
DOCS_COMPOSE="$ROOT_DIR/infrastructure/compose/docker-compose.docs.yml"
IMAGES_OVERRIDE="$ROOT_DIR/infrastructure/compose/docker-compose.images.override.yml"

DEFAULT_ENV_FILE="$ROOT_DIR/config/.env.defaults"
CONTAINER_IMAGES_FILE="$ROOT_DIR/config/container-images.env"
LEGACY_ENV_FILE="$ROOT_DIR/.env"
LOCAL_ENV_FILE="$ROOT_DIR/.env.local"

set -a
[ -f "$CONTAINER_IMAGES_FILE" ] && source "$CONTAINER_IMAGES_FILE"
[ -f "$DEFAULT_ENV_FILE" ] && source "$DEFAULT_ENV_FILE"
[ -f "$LEGACY_ENV_FILE" ] && source "$LEGACY_ENV_FILE"
[ -f "$LOCAL_ENV_FILE" ] && source "$LOCAL_ENV_FILE"
set +a

compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "[stop-dashboard-stack] docker compose is required but not installed." >&2
    exit 1
  fi
}

if [[ -f "$PID_FILE" ]]; then
  echo "[stop-dashboard-stack] Stopping Node services..."
  tac "$PID_FILE" | while read -r pid; do
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "  - killing PID $pid"
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  rm -f "$PID_FILE"
else
  echo "[stop-dashboard-stack] No PID file found; Node services may not be running."
fi

echo "[stop-dashboard-stack] Ensuring Node service processes are terminated..."
patterns=(
  "backend/api/workspace"
  "frontend/apps/tp-capital"
  "frontend/apps/b3-market-data"
  "backend/api/webscraper-api"
  "backend/api/firecrawl-proxy"
  "frontend/apps/service-launcher"
  "frontend/apps/dashboard"
  "frontend/apps/WebScraper"
)

for pattern in "${patterns[@]}"; do
  if pgrep -f "$pattern" >/dev/null 2>&1; then
    echo "  - pkill -f $pattern"
    pkill -f "$pattern" >/dev/null 2>&1 || true
  fi
done

echo "[stop-dashboard-stack] Stopping Firecrawl stack..."
if [[ -f "$IMAGES_OVERRIDE" ]]; then
  compose_cmd -f "$FIRECRAWL_COMPOSE" -f "$IMAGES_OVERRIDE" down
else
  compose_cmd -f "$FIRECRAWL_COMPOSE" down
fi

if [[ -f "$TIMESCALE_COMPOSE" ]]; then
  echo "[stop-dashboard-stack] Stopping TimescaleDB stack..."
  if [[ -f "$IMAGES_OVERRIDE" ]]; then
    compose_cmd -f "$TIMESCALE_COMPOSE" -f "$IMAGES_OVERRIDE" down
  else
    compose_cmd -f "$TIMESCALE_COMPOSE" down
  fi
fi

echo "[stop-dashboard-stack] Stopping Documentation API..."
if [[ -f "$IMAGES_OVERRIDE" ]]; then
  compose_cmd -f "$DOCS_COMPOSE" -f "$IMAGES_OVERRIDE" stop documentation-api
else
  compose_cmd -f "$DOCS_COMPOSE" stop documentation-api
fi

echo "[stop-dashboard-stack] Stack stopped. Logs remain in $LOG_DIR"
