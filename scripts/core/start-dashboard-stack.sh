#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

WORKSPACE_DIR="$ROOT_DIR/backend/api/workspace"
TPCAPITAL_DIR="$ROOT_DIR/apps/tp-capital"
B3_DIR="$ROOT_DIR/apps/b3-market-data"
FIRECRAWL_PROXY_DIR="$ROOT_DIR/backend/api/firecrawl-proxy"
STATUS_DIR="$ROOT_DIR/apps/status"
DASHBOARD_DIR="$ROOT_DIR/frontend/dashboard"

FIRECRAWL_COMPOSE="$ROOT_DIR/tools/firecrawl/firecrawl-source/docker-compose.yaml"
TIMESCALE_COMPOSE="$ROOT_DIR/tools/compose/docker-compose.timescale.yml"
DOCS_COMPOSE="$ROOT_DIR/tools/compose/docker-compose.docs.yml"
IMAGES_OVERRIDE="$ROOT_DIR/tools/compose/docker-compose.images.override.yml"

DEFAULT_ENV_FILE="$ROOT_DIR/config/.env.defaults"
CONTAINER_IMAGES_FILE="$ROOT_DIR/config/container-images.env"
LEGACY_ENV_FILE="$ROOT_DIR/.env"
LOCAL_ENV_FILE="$ROOT_DIR/.env.local"

RUNTIME_DIR="$ROOT_DIR/scripts/.runtime/dashboard-stack"
LOG_DIR="$RUNTIME_DIR/logs"
PID_FILE="$RUNTIME_DIR/pids"

mkdir -p "$LOG_DIR"

if [[ -f "$PID_FILE" ]]; then
  echo "[start-dashboard-stack] Existing PID file detected at $PID_FILE."
  echo "Stop running services before starting new ones."
  exit 1
fi

set -a
# shellcheck source=/dev/null
[ -f "$CONTAINER_IMAGES_FILE" ] && source "$CONTAINER_IMAGES_FILE"
[ -f "$DEFAULT_ENV_FILE" ] && source "$DEFAULT_ENV_FILE"
[ -f "$LEGACY_ENV_FILE" ] && source "$LEGACY_ENV_FILE"
[ -f "$LOCAL_ENV_FILE" ] && source "$LOCAL_ENV_FILE"
set +a

set +a

# Align derived database credentials for host processes
FRONTEND_APPS_DB_HOST="${FRONTEND_APPS_DB_HOST:-localhost}"
FRONTEND_APPS_DB_PORT="${FRONTEND_APPS_DB_PORT:-5444}"
FRONTEND_APPS_DB_NAME="${FRONTEND_APPS_DB_NAME:-frontend_apps}"

DEFAULT_WORKSPACE_DB_USER="app_workspace"
DEFAULT_WORKSPACE_DB_PASSWORD="app_workspace_dev_password"

if [[ -z "${APP_WORKSPACE_DB_USER:-}" || "${APP_WORKSPACE_DB_USER}" == "${FRONTEND_APPS_DB_SUPERUSER:-frontend_admin}" ]]; then
  APP_WORKSPACE_DB_USER="$DEFAULT_WORKSPACE_DB_USER"
fi
if [[ -z "${APP_WORKSPACE_DB_PASSWORD:-}" || "${APP_WORKSPACE_DB_PASSWORD}" == "${FRONTEND_APPS_DB_SUPERPASS:-change_me_frontend}" ]]; then
  APP_WORKSPACE_DB_PASSWORD="$DEFAULT_WORKSPACE_DB_PASSWORD"
fi
if [[ -z "${WORKSPACE_DATABASE_USER:-}" || "${WORKSPACE_DATABASE_USER}" == "${FRONTEND_APPS_DB_SUPERUSER:-frontend_admin}" ]]; then
  WORKSPACE_DATABASE_USER="$APP_WORKSPACE_DB_USER"
fi
if [[ -z "${WORKSPACE_DATABASE_PASSWORD:-}" || "${WORKSPACE_DATABASE_PASSWORD}" == "${FRONTEND_APPS_DB_SUPERPASS:-change_me_frontend}" ]]; then
  WORKSPACE_DATABASE_PASSWORD="$APP_WORKSPACE_DB_PASSWORD"
fi
WORKSPACE_DATABASE_HOST="${WORKSPACE_DATABASE_HOST:-$FRONTEND_APPS_DB_HOST}"
WORKSPACE_DATABASE_PORT="${WORKSPACE_DATABASE_PORT:-$FRONTEND_APPS_DB_PORT}"
WORKSPACE_DATABASE_NAME="${WORKSPACE_DATABASE_NAME:-$FRONTEND_APPS_DB_NAME}"
WORKSPACE_DATABASE_SCHEMA="${WORKSPACE_DATABASE_SCHEMA:-workspace}"
WORKSPACE_DATABASE_URL="${WORKSPACE_DATABASE_URL:-postgresql://$WORKSPACE_DATABASE_USER:$WORKSPACE_DATABASE_PASSWORD@$WORKSPACE_DATABASE_HOST:$WORKSPACE_DATABASE_PORT/$WORKSPACE_DATABASE_NAME?schema=$WORKSPACE_DATABASE_SCHEMA}"

export FRONTEND_APPS_DB_HOST FRONTEND_APPS_DB_PORT FRONTEND_APPS_DB_NAME
export APP_WORKSPACE_DB_USER APP_WORKSPACE_DB_PASSWORD
export WORKSPACE_DATABASE_HOST WORKSPACE_DATABASE_PORT WORKSPACE_DATABASE_NAME
export WORKSPACE_DATABASE_SCHEMA WORKSPACE_DATABASE_USER WORKSPACE_DATABASE_PASSWORD WORKSPACE_DATABASE_URL

export LIBRARY_DB_STRATEGY="${LIBRARY_DB_STRATEGY:-timescaledb}"

if [[ -z "${QUESTDB_HOST:-}" || "${QUESTDB_HOST}" == "data-questdb" ]]; then
  QUESTDB_HOST="localhost"
fi
if [[ -z "${QUESTDB_HTTP_PORT:-}" || "${QUESTDB_HTTP_PORT}" == "9000" ]]; then
  QUESTDB_HTTP_PORT="9002"
fi
if [[ -z "${QUESTDB_ILP_PORT:-}" || "${QUESTDB_ILP_PORT}" == "9009" ]]; then
  QUESTDB_ILP_PORT="9010"
fi
if [[ -z "${QUESTDB_PG_PORT:-}" || "${QUESTDB_PG_PORT}" == "8812" || "${QUESTDB_PG_PORT}" == "5433" ]]; then
  QUESTDB_PG_PORT="8813"
fi

export QUESTDB_HOST QUESTDB_HTTP_PORT QUESTDB_ILP_PORT QUESTDB_PG_PORT

echo "[start-dashboard-stack] Workspace DB host: $WORKSPACE_DATABASE_HOST port: $WORKSPACE_DATABASE_PORT user: $WORKSPACE_DATABASE_USER"
echo "[start-dashboard-stack] QuestDB HTTP: $QUESTDB_HOST:$QUESTDB_HTTP_PORT ILP: $QUESTDB_ILP_PORT"

compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "[start-dashboard-stack] docker compose is required but not installed." >&2
    exit 1
  fi
}

ensure_node_modules() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    return
  fi
  if [[ ! -d "$dir/node_modules" ]]; then
    echo "[start-dashboard-stack] Installing dependencies in $dir"
    (cd "$dir" && npm install)
  fi
}

ensure_node_modules_if_present() {
  local dir="$1"
  local name="$2"
  if [[ ! -d "$dir" ]]; then
    echo "[start-dashboard-stack] Skipping dependency install for $name (directory not found: $dir)"
    return
  fi
  ensure_node_modules "$dir"
}

start_service() {
  local name="$1"
  local dir="$2"
  local cmd="$3"
  local log_file="$4"

  if [[ ! -d "$dir" ]]; then
    echo "[start-dashboard-stack] Skipping $name (directory not found: $dir)"
    return
  fi

  echo "[start-dashboard-stack] Starting $name..."
  (cd "$dir" && nohup $cmd >"$log_file" 2>&1 & echo "$!" >>"$PID_FILE")
  echo "[start-dashboard-stack] $name started (logs: $log_file)"
}

start_compose_service() {
  local file="$1"
  local service="$2"
  if [[ -f "$IMAGES_OVERRIDE" ]]; then
    echo "[start-dashboard-stack] docker compose -f $file -f $IMAGES_OVERRIDE up -d $service"
    compose_cmd -f "$file" -f "$IMAGES_OVERRIDE" up -d "$service"
  else
    echo "[start-dashboard-stack] docker compose -f $file up -d $service"
    compose_cmd -f "$file" up -d "$service"
  fi
}

compose_has_service() {
  local file="$1"
  local service="$2"
  compose_cmd -f "$file" config --services >/tmp/compose-services.$$ 2>/dev/null || return 1
  if grep -qx "$service" /tmp/compose-services.$$; then
    rm -f /tmp/compose-services.$$
    return 0
  fi
  rm -f /tmp/compose-services.$$
  return 1
}

echo "[start-dashboard-stack] Bootstrapping Docker dependencies..."

if [[ -f "$TIMESCALE_COMPOSE" ]]; then
  if compose_has_service "$TIMESCALE_COMPOSE" timescaledb; then
    start_compose_service "$TIMESCALE_COMPOSE" timescaledb
  else
    echo "[start-dashboard-stack] Skipping TimescaleDB (service not found in compose)."
  fi

  declare -A timescale_services=(
    ["data-postgress-langgraph"]="LangGraph Postgres"
    ["timescaledb-pgadmin"]="TimescaleDB pgAdmin"
    ["timescaledb-pgweb"]="TimescaleDB pgWeb"
    ["data-questdb"]="QuestDB"
  )

  for svc in "${!timescale_services[@]}"; do
    if compose_has_service "$TIMESCALE_COMPOSE" "$svc"; then
      start_compose_service "$TIMESCALE_COMPOSE" "$svc"
    else
      echo "[start-dashboard-stack] Skipping ${timescale_services[$svc]} (service '$svc' not found in compose)."
    fi
  done
else
  echo "[start-dashboard-stack] TimescaleDB compose file not found at $TIMESCALE_COMPOSE"
fi

if [[ -f "$FIRECRAWL_COMPOSE" ]]; then
  for svc in firecrawl-api firecrawl-redis firecrawl-postgres firecrawl-playwright firecrawl-proxy; do
    if compose_has_service "$FIRECRAWL_COMPOSE" "$svc"; then
      start_compose_service "$FIRECRAWL_COMPOSE" "$svc"
    else
      echo "[start-dashboard-stack] Warning: service '$svc' not found in $FIRECRAWL_COMPOSE (skipping)"
    fi
  done
else
  echo "[start-dashboard-stack] Firecrawl compose file not found at $FIRECRAWL_COMPOSE"
fi

if [[ -f "$DOCS_COMPOSE" ]]; then
  if compose_has_service "$DOCS_COMPOSE" documentation-api; then
    start_compose_service "$DOCS_COMPOSE" documentation-api
  else
    echo "[start-dashboard-stack] Warning: documentation-api service not found in $DOCS_COMPOSE (skipping)"
  fi
else
  echo "[start-dashboard-stack] Documentation compose file not found at $DOCS_COMPOSE"
fi

echo "[start-dashboard-stack] Ensuring Node dependencies..."
ensure_node_modules_if_present "$WORKSPACE_DIR" "Workspace API"
ensure_node_modules_if_present "$TPCAPITAL_DIR" "TP Capital API"
ensure_node_modules_if_present "$B3_DIR" "B3 Market Data API"
ensure_node_modules_if_present "$FIRECRAWL_PROXY_DIR" "Firecrawl Proxy API"
ensure_node_modules_if_present "$STATUS_DIR" "Status API"
ensure_node_modules_if_present "$DASHBOARD_DIR" "Dashboard App"

echo "[start-dashboard-stack] Launching APIs..."
> "$PID_FILE"
start_service "Workspace API" "$WORKSPACE_DIR" "env PORT=${WORKSPACE_PORT:-3200} npm start" "$LOG_DIR/workspace.log"
start_service "TP Capital API" "$TPCAPITAL_DIR" "env PORT=${TP_CAPITAL_PORT:-4005} npm start" "$LOG_DIR/tp-capital.log"
start_service "B3 Market Data API" "$B3_DIR" "env PORT=${B3_API_PORT:-3302} npm start" "$LOG_DIR/b3-market.log"
start_service "Firecrawl Proxy" "$FIRECRAWL_PROXY_DIR" "env PORT=${FIRECRAWL_PROXY_PORT:-3600} npm start" "$LOG_DIR/firecrawl-proxy.log"
start_service "Status API" "$STATUS_DIR" "env PORT=${STATUS_PORT:-3500} npm start" "$LOG_DIR/status.log"
start_service "Dashboard App" "$DASHBOARD_DIR" "env PORT=${VITE_DASHBOARD_PORT:-3103} npm run dev" "$LOG_DIR/dashboard.log"

cat <<EOF

================ Dashboard stack started ================
TimescaleDB:           postgres://localhost:${TIMESCALEDB_PORT:-5433}
Firecrawl Proxy:       http://localhost:${FIRECRAWL_PROXY_PORT:-3600}
Workspace API:         http://localhost:${WORKSPACE_PORT:-3200}
TP Capital API:        http://localhost:${TP_CAPITAL_PORT:-4005}
B3 Market API:         http://localhost:${B3_API_PORT:-3302}
Status API:            http://localhost:${STATUS_PORT:-3500}
Dashboard App:         http://localhost:${VITE_DASHBOARD_PORT:-3103}

Logs directory:        $LOG_DIR
Dashboard logs:        $LOG_DIR/dashboard.log
PID file:              $PID_FILE

Use scripts/stop-dashboard-stack.sh to stop these services.
=========================================================
EOF
