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
    echo "Error: '$1' command not found. Please install it before continuing."
    exit 1
  }
}

require_cmd node
require_cmd npm
require_cmd curl
require_cmd pg_isready

NODE_VERSION=$(node --version | sed 's/v//')
if [[ "${NODE_VERSION%%.*}" -lt 20 ]]; then
  echo "Error: Node.js >= 20 is required (detected ${NODE_VERSION})."
  exit 1
fi

set -a
[ -f "$CONTAINER_IMAGES_FILE" ] && source "$CONTAINER_IMAGES_FILE"
[ -f "$DEFAULT_ENV_FILE" ] && source "$DEFAULT_ENV_FILE"
[ -f "$LEGACY_ENV_FILE" ] && source "$LEGACY_ENV_FILE"
[ -f "$LOCAL_ENV_FILE" ] && source "$LOCAL_ENV_FILE"
set +a

if [[ -z "${WEBSCRAPER_DATABASE_URL:-}" ]]; then
  echo "Error: WEBSCRAPER_DATABASE_URL not configured."
  exit 1
fi

parse_output="$(python - <<'PY'
import os
from urllib.parse import urlparse

url = os.environ["WEBSCRAPER_DATABASE_URL"]
parsed = urlparse(url)
user = parsed.username or "postgres"
password = parsed.password or ""
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

REQUIRED_TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Atc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('scrape_jobs','job_schedules');")
if [[ "$REQUIRED_TABLE_COUNT" != "2" ]]; then
  echo "Error: WebScraper database schema is incomplete. Run 'bash scripts/webscraper/init-database.sh --seed' before starting the scheduler."
  exit 1
fi

echo "Checking Firecrawl Proxy availability..."
if ! curl -sf "${WEBSCRAPER_FIRECRAWL_PROXY_URL:-http://localhost:3600}/health" >/dev/null 2>&1; then
  echo "Warning: Firecrawl Proxy not reachable. Scheduled executions may fail."
fi

if [[ ! -d "$SERVICE_DIR/node_modules" ]]; then
  echo "Installing API dependencies..."
  (cd "$SERVICE_DIR" && npm install)
fi

echo "Generating Prisma client..."
(cd "$SERVICE_DIR" && npx prisma generate >/dev/null)

CMD=("npm" "run" "dev")
if [[ "$MODE" == "prod" ]]; then
  CMD=("npm" "start")
fi

export WEBSCRAPER_SCHEDULER_ENABLED="true"
export WEBSCRAPER_SCHEDULER_MAX_CONCURRENT_JOBS="${WEBSCRAPER_SCHEDULER_MAX_CONCURRENT_JOBS:-5}"

echo "Starting WebScraper API with scheduler (${MODE} mode)..."
(cd "$SERVICE_DIR" && "${CMD[@]}") &
SERVICE_PID=$!

cleanup() {
  echo -e "\nStopping scheduler (PID $SERVICE_PID)..."
  kill "$SERVICE_PID" >/dev/null 2>&1 || true
  wait "$SERVICE_PID" 2>/dev/null || true
  unset PGPASSWORD
}
trap cleanup EXIT INT TERM

sleep 4
API_PORT="${WEBSCRAPER_API_PORT:-3700}"
BASE_URL="http://localhost:${API_PORT}"

HEALTH_STATUS=$(curl -s -o /tmp/webscraper-scheduler-health.json -w "%{http_code}" "${BASE_URL}/health" || true)

if [[ "$HEALTH_STATUS" == "200" ]]; then
  echo "Scheduler ready:"
  echo "  • API:       ${BASE_URL}"
  echo "  • Schedules: ${BASE_URL}/api/v1/schedules"
  echo "  • Metrics:   ${BASE_URL}/metrics"
  echo "  • Health:    ${BASE_URL}/health"
  echo "Environment overrides:"
  echo "  - WEBSCRAPER_SCHEDULER_ENABLED=${WEBSCRAPER_SCHEDULER_ENABLED}"
  echo "  - WEBSCRAPER_SCHEDULER_MAX_CONCURRENT_JOBS=${WEBSCRAPER_SCHEDULER_MAX_CONCURRENT_JOBS}"
  echo "Press Ctrl+C to stop."
else
  echo "Warning: API health check failed (status ${HEALTH_STATUS}). Inspect logs for details."
fi

wait "$SERVICE_PID"
