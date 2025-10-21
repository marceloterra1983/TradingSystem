#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_ENV_FILE="$ROOT_DIR/config/.env.defaults"
CONTAINER_IMAGES_FILE="$ROOT_DIR/config/container-images.env"
LEGACY_ENV_FILE="$ROOT_DIR/.env"
LOCAL_ENV_FILE="$ROOT_DIR/.env.local"
API_DIR="$ROOT_DIR/backend/api/webscraper-api"
APP_DIR="$ROOT_DIR/frontend/apps/WebScraper"
RUNTIME_DIR="$ROOT_DIR/scripts/webscraper/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
PID_FILE="$RUNTIME_DIR/pids"

mkdir -p "$LOG_DIR"

set -a
[ -f "$CONTAINER_IMAGES_FILE" ] && source "$CONTAINER_IMAGES_FILE"
[ -f "$DEFAULT_ENV_FILE" ] && source "$DEFAULT_ENV_FILE"
[ -f "$LEGACY_ENV_FILE" ] && source "$LEGACY_ENV_FILE"
[ -f "$LOCAL_ENV_FILE" ] && source "$LOCAL_ENV_FILE"
set +a

function ensure_node_modules() {
  local dir="$1"
  if [[ ! -d "$dir/node_modules" ]]; then
    echo "Installing dependencies in $dir..."
    (cd "$dir" && npm install)
  fi
}

function check_firecrawl() {
  local url="${WEBSCRAPER_FIRECRAWL_PROXY_URL:-http://localhost:3600}/health"
  if command -v curl >/dev/null 2>&1; then
    if ! curl -s --max-time 3 "$url" >/dev/null; then
      echo "Warning: firecrawl-proxy does not respond at $url"
    else
      echo "firecrawl-proxy reachable at $url"
    fi
  else
    echo "curl not available, skipping firecrawl-proxy health check."
  fi
}

function start_service() {
  local name="$1"
  local dir="$2"
  local cmd="$3"
  local log_file="$4"

  echo "Starting $name..."
  (cd "$dir" && nohup $cmd >"$log_file" 2>&1 & echo $! >>"$PID_FILE")
  echo "$name started (logs: $log_file)"
}

> "$PID_FILE"

check_firecrawl
ensure_node_modules "$API_DIR"
ensure_node_modules "$APP_DIR"

start_service "WebScraper API" "$API_DIR" "npm run dev" "$LOG_DIR/webscraper-api.log"
start_service "WebScraper App" "$APP_DIR" "npm run dev" "$LOG_DIR/webscraper-app.log"

echo "Services started. API: http://localhost:${WEBSCRAPER_API_PORT:-3700} | App: http://localhost:3800"
