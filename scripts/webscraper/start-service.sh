#!/usr/bin/env bash
set -euo pipefail

MODE="dev"
if [[ ${1:-} == "--prod" ]]; then
  MODE="prod"
  shift
elif [[ -n ${1:-} ]]; then
  echo "Usage: $(basename "$0") [--prod]"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVICE_DIR="$ROOT_DIR/backend/api/webscraper-api"
DEFAULT_ENV_FILE="$ROOT_DIR/config/.env.defaults"
CONTAINER_IMAGES_FILE="$ROOT_DIR/config/container-images.env"
LEGACY_ENV_FILE="$ROOT_DIR/.env"
LOCAL_ENV_FILE="$ROOT_DIR/.env.local"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' command not found."
    exit 1
  fi
}

set -a
[ -f "$CONTAINER_IMAGES_FILE" ] && source "$CONTAINER_IMAGES_FILE"
[ -f "$DEFAULT_ENV_FILE" ] && source "$DEFAULT_ENV_FILE"
[ -f "$LEGACY_ENV_FILE" ] && source "$LEGACY_ENV_FILE"
[ -f "$LOCAL_ENV_FILE" ] && source "$LOCAL_ENV_FILE"
set +a

require_cmd node
require_cmd npm
require_cmd curl
require_cmd pg_isready

PYTHON_BIN=""
if command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
else
  echo "Error: python or python3 command not found."
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
if [[ "${NODE_VERSION%%.*}" -lt 20 ]]; then
  echo "Error: Node.js >= 20 is required (detected ${NODE_VERSION})."
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [[ -z "${WEBSCRAPER_DATABASE_URL:-}" ]]; then
  echo "Error: WEBSCRAPER_DATABASE_URL not configured."
  exit 1
fi

parse_output="$("$PYTHON_BIN" - <<'PY'
import os
from urllib.parse import urlparse, unquote

url = os.environ["WEBSCRAPER_DATABASE_URL"]
parsed = urlparse(url)
user = parsed.username or "postgres"
password = unquote(parsed.password) if parsed.password else ""
host = parsed.hostname or "localhost"
port = parsed.port or 5432
dbname = parsed.path.lstrip("/") or "webscraper"
print(user, password, host, port, dbname)
PY
)"

read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME <<<"$parse_output"
export PGPASSWORD="$DB_PASSWORD"

echo "Checking TimescaleDB connection..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
  echo "Error: TimescaleDB/PostgreSQL not reachable at ${DB_HOST}:${DB_PORT}."
  exit 1
fi

REQUIRED_TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Atc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('scrape_jobs','scrape_templates');")
if [[ "$REQUIRED_TABLE_COUNT" != "2" ]]; then
  echo "Error: WebScraper database schema is incomplete. Run 'bash backend/api/webscraper-api/scripts/init-database.sh --seed' before starting the service."
  exit 1
fi

echo "Checking Firecrawl Proxy availability..."
if ! curl -sf "${WEBSCRAPER_FIRECRAWL_PROXY_URL:-http://localhost:3600}/health" >/dev/null 2>&1; then
  echo "Warning: Firecrawl Proxy not reachable. Rerun endpoints may fail."
fi

if [[ ! -d "$SERVICE_DIR/node_modules" ]]; then
  echo "Installing dependencies..."
  (cd "$SERVICE_DIR" && npm install)
fi

echo "Generating Prisma client..."
(cd "$SERVICE_DIR" && npx prisma generate >/dev/null)

CMD=("npm" "run" "dev")
if [[ "$MODE" == "prod" ]]; then
  CMD=("npm" "start")
fi

echo "Starting WebScraper API (${MODE} mode)..."
(cd "$SERVICE_DIR" && "${CMD[@]}") &
SERVICE_PID=$!

cleanup() {
  echo -e "\nShutting down WebScraper API (PID $SERVICE_PID)..."
  kill "$SERVICE_PID" >/dev/null 2>&1 || true
  wait "$SERVICE_PID" 2>/dev/null || true
  unset PGPASSWORD
}
trap cleanup EXIT INT TERM

sleep 3
HEALTH_STATUS=$(curl -s -o /tmp/webscraper-health.json -w "%{http_code}" "http://localhost:${WEBSCRAPER_API_PORT:-3700}/health" || true)

if [[ "$HEALTH_STATUS" == "200" ]]; then
  echo "WebScraper API running:"
  echo "  • API:     http://localhost:${WEBSCRAPER_API_PORT:-3700}"
  echo "  • Health:  http://localhost:${WEBSCRAPER_API_PORT:-3700}/health"
  echo "  • Metrics: http://localhost:${WEBSCRAPER_API_PORT:-3700}/metrics"
  echo "Press Ctrl+C to stop."
else
  echo "Warning: health check failed (status ${HEALTH_STATUS})."
fi

wait "$SERVICE_PID"
