#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
SERVICE_DIR="$ROOT_DIR/backend/api/webscraper-api"
ENV_FILE="$ROOT_DIR/.env"
SEED=false

if [[ ${1:-} == "--seed" ]]; then
  SEED=true
elif [[ -n ${1:-} ]]; then
  echo "Usage: $(basename "$0") [--seed]"
  exit 1
fi

SCHEMA_SQL="$ROOT_DIR/backend/data/timescaledb/webscraper-schema.sql"
SEED_SQL="$ROOT_DIR/backend/data/timescaledb/webscraper-seed.sql"

log() {
  printf '==> %s\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but not installed."
    exit 1
  fi
}

require_cmd psql
require_cmd npx
require_cmd pg_isready

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN=python
else
  echo "Error: python or python3 is required but not installed."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env file not found at project root. Please configure environment variables."
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [[ -z "${WEBSCRAPER_DATABASE_URL:-}" ]]; then
  echo "Error: WEBSCRAPER_DATABASE_URL not defined in .env"
  exit 1
fi

parse_output="$($PYTHON_BIN - <<'PY'
import os
from urllib.parse import urlparse, parse_qs

url = os.environ["WEBSCRAPER_DATABASE_URL"]
parsed = urlparse(url)
user = parsed.username or "postgres"
password = parsed.password or ""
host = parsed.hostname or "localhost"
port = parsed.port or 5432
dbname = parsed.path.lstrip("/") or "webscraper"
params = parse_qs(parsed.query)
schema = params.get("schema", [os.environ.get("WEBSCRAPER_DATABASE_SCHEMA", "public")])[0]
print(user, password, host, port, dbname, schema)
PY
)"

read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME DB_SCHEMA <<<"$parse_output"

DB_SCHEMA="${DB_SCHEMA:-${WEBSCRAPER_DATABASE_SCHEMA:-public}}"

if [[ ! "$DB_SCHEMA" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "Error: Invalid schema name '${DB_SCHEMA}'."
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

log "Checking TimescaleDB/PostgreSQL availability on ${DB_HOST}:${DB_PORT}..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
  echo "Error: Database server not reachable at ${DB_HOST}:${DB_PORT}."
  exit 1
fi

SUPERUSER="${POSTGRES_SUPERUSER:-${FRONTEND_APPS_DB_SUPERUSER:-postgres}}"
SUPERPASS="${POSTGRES_SUPERPASS:-${FRONTEND_APPS_DB_SUPERPASS:-$DB_PASSWORD}}"
CAN_MANAGE=true

export PGPASSWORD="$SUPERPASS"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$SUPERUSER" postgres -Atqc "SELECT 1" >/dev/null 2>&1; then
  CAN_MANAGE=false
  echo "Warning: Unable to authenticate as ${SUPERUSER}. Skipping role/database provisioning."
fi

if [[ "$CAN_MANAGE" == "true" ]]; then
  if [[ "$DB_USER" != "$SUPERUSER" ]]; then
    ROLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$SUPERUSER" postgres -Atc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")
    if [[ -z "$ROLE_EXISTS" ]]; then
      log "Creating database role '${DB_USER}'..."
      psql -h "$DB_HOST" -p "$DB_PORT" -U "$SUPERUSER" postgres -c "CREATE ROLE \"${DB_USER}\" WITH LOGIN PASSWORD '${DB_PASSWORD}'"
    else
      log "Role '${DB_USER}' already exists."
    fi
  fi

  log "Ensuring database '${DB_NAME}' exists..."
  DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$SUPERUSER" postgres -Atc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")
  if [[ -z "$DB_EXISTS" ]]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$SUPERUSER" postgres -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\""
    log "Database '${DB_NAME}' created."
  else
    log "Database '${DB_NAME}' already present."
  fi
fi

export PGPASSWORD="$DB_PASSWORD"

log "Ensuring schema '${DB_SCHEMA}' exists..."
psql "$WEBSCRAPER_DATABASE_URL" -c "CREATE SCHEMA IF NOT EXISTS \"${DB_SCHEMA}\" AUTHORIZATION \"${DB_USER}\";"

export PGOPTIONS="--search_path=${DB_SCHEMA},public"

log "Generating Prisma client..."
(cd "$SERVICE_DIR" && npx prisma generate)

log "Verifying Prisma schema sync..."
(cd "$SERVICE_DIR" && npx prisma validate)

log "Applying TimescaleDB schema extensions..."
psql "$WEBSCRAPER_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
psql "$WEBSCRAPER_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql "$WEBSCRAPER_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# Configure chunk interval and JSONB index settings
CHUNK_DAYS="${WEBSCRAPER_CHUNK_INTERVAL_DAYS:-7}"
ENABLE_JSONB_INDEX="${WEBSCRAPER_ENABLE_JSONB_INDEX:-false}"

log "Applying infrastructure SQL schema (${SCHEMA_SQL})..."
psql "$WEBSCRAPER_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v chunk_interval_days="$CHUNK_DAYS" \
  -v enable_jsonb_index="$ENABLE_JSONB_INDEX" \
  -v schema_name="$DB_SCHEMA" \
  -f "$SCHEMA_SQL"

if [[ "$SEED" == "true" ]]; then
  log "Seeding TimescaleDB schema (${SEED_SQL})..."
  psql "$WEBSCRAPER_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEED_SQL"

  log "Seeding database via Prisma..."
  (cd "$SERVICE_DIR" && npx prisma db seed)
fi

# Create JSONB index concurrently if enabled (cannot be done inside DO block)
if [[ "$ENABLE_JSONB_INDEX" == "true" ]]; then
  log "Creating JSONB GIN index on scrape_jobs.results (this may take a while)..."
  psql "$WEBSCRAPER_DATABASE_URL" -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scrape_jobs_results_gin ON scrape_jobs USING gin (results);"

  # Verify index was created
  log "Verifying JSONB index creation..."
  psql "$WEBSCRAPER_DATABASE_URL" -c "SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'idx_scrape_jobs_results_gin';"
fi

log "Verifying schema objects..."
TABLES=$(psql "$WEBSCRAPER_DATABASE_URL" -Atc "SELECT tablename FROM pg_tables WHERE schemaname = '${DB_SCHEMA}' ORDER BY tablename")
printf '    %s\n' $TABLES

log "Verifying job_schedules table..."
psql "$WEBSCRAPER_DATABASE_URL" -c "SELECT COUNT(*) AS schedule_rows FROM job_schedules;"

log "Verifying TimescaleDB policies..."
psql "$WEBSCRAPER_DATABASE_URL" -c "SELECT job_id, application_name, schedule_interval, next_start FROM timescaledb_information.jobs WHERE hypertable_name = 'scrape_jobs' ORDER BY application_name;"

log "Verifying continuous aggregates..."
psql "$WEBSCRAPER_DATABASE_URL" -c "SELECT view_name, materialization_hypertable_name FROM timescaledb_information.continuous_aggregates;";

MASKED_URL="${WEBSCRAPER_DATABASE_URL//*:*@/******@}"
log "✓ Database initialized successfully"
printf '    - Target DB: %s\n' "$MASKED_URL"
printf '    - Tables: scrape_templates, scrape_jobs, job_schedules\n'
printf '    - Hypertable: scrape_jobs (partitioned by started_at)\n'
printf '    - Compression: Enabled (7 days)\n'
printf '    - Retention: Enabled (90 days)\n'
printf '    - Continuous Aggregate: scrape_jobs_daily_stats\n'
printf '    - Seed Data: %s\n' "$(if [[ "$SEED" == "true" ]]; then echo 'templates, jobs, schedules'; else echo 'skipped (--seed not provided)'; fi)"

unset PGPASSWORD
unset PGOPTIONS
