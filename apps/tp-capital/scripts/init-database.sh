#!/usr/bin/env bash
# ==============================================================================
# TP Capital Database Initialization Script
# ==============================================================================
# Description: Applies the tp_capital schema to a TimescaleDB instance.
# Usage: ./scripts/init-database.sh [--force]
# ==============================================================================

set -euo pipefail

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"

SCHEMA_SQL="$ROOT_DIR/backend/data/timescaledb/tp-capital/01_tp_capital_signals.sql"

FORCE_RECREATE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE_RECREATE=true
      shift
      ;;
    --help)
      cat <<'EOF'
Usage: ./scripts/init-database.sh [--force]

Options:
  --force   Drop and recreate the schema before applying migrations.
  --help    Show this message.
EOF
      exit 0
      ;;
    *)
      echo -e "${RED}[ERROR]${NC} Unknown option: $1"
      exit 1
      ;;
  esac
done

log() {
  echo -e "${BLUE}[TP-Capital DB]${NC} $1"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Load environment variables (root first, then app-level)
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return
  log "Loading environment defaults from $file"
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    if [[ -z "${!key+x}" ]]; then
      export "$key=$value"
    fi
  done <"$file"
}

load_env_file "$ROOT_DIR/.env"
load_env_file "$APP_DIR/.env"

if [[ ! -f "$SCHEMA_SQL" ]]; then
  error "Schema file not found: $SCHEMA_SQL"
  exit 1
fi

DB_HOST="${TIMESCALEDB_HOST:-${TP_CAPITAL_DATABASE_HOST:-localhost}}"
DB_PORT="${TIMESCALEDB_PORT:-${TP_CAPITAL_DATABASE_PORT:-5445}}"
DB_NAME="${TIMESCALEDB_DATABASE:-${TP_CAPITAL_DATABASE:-APPS-TPCAPITAL}}"
DB_USER="${TIMESCALEDB_USER:-${TP_CAPITAL_DB_USER:-timescale}}"
DB_PASSWORD="${TIMESCALEDB_PASSWORD:-${TP_CAPITAL_DB_PASSWORD:-pass_timescale}}"
DB_SCHEMA="${TIMESCALEDB_SCHEMA:-${TP_CAPITAL_DATABASE_SCHEMA:-tp_capital}}"

if [[ ! -f "/.dockerenv" ]]; then
  HOST_PORT_FALLBACK="${TIMESCALEDB_HOST_PORT:-${TP_CAPITAL_HOST_PORT:-5445}}"
  case "$DB_HOST" in
    timescaledb|postgres)
      DB_HOST="localhost"
      DB_PORT="$HOST_PORT_FALLBACK"
      ;;
  esac
fi

PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD

psql_args=(-h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER")

log "Database configuration:"
log "  Host: $DB_HOST:$DB_PORT"
log "  Database: $DB_NAME"
log "  Schema: $DB_SCHEMA"
log "  User: $DB_USER"

if ! command -v psql >/dev/null 2>&1; then
  error "psql not found. Please install PostgreSQL client tools."
  exit 1
fi

log "Checking database connectivity..."
if ! psql "${psql_args[@]}" -c "SELECT 1" >/dev/null 2>&1; then
  error "Unable to connect to database. Verify credentials and host reachability."
  exit 1
fi
success "Database connection successful."

if $FORCE_RECREATE; then
  warn "Force mode enabled: schema '$DB_SCHEMA' will be dropped."
  read -r -p "Type 'yes' to confirm: " confirm
  if [[ "$confirm" != "yes" ]]; then
    log "Aborted by user."
    exit 0
  fi
  log "Dropping schema '$DB_SCHEMA'..."
  psql "${psql_args[@]}" -c "DROP SCHEMA IF EXISTS \"$DB_SCHEMA\" CASCADE;" >/dev/null
  success "Schema dropped."
fi

log "Ensuring schema '$DB_SCHEMA' exists..."
psql "${psql_args[@]}" -c "CREATE SCHEMA IF NOT EXISTS \"$DB_SCHEMA\";" >/dev/null

log "Applying tp_capital schema..."
export PGOPTIONS="--search_path=${DB_SCHEMA},public"
if ! psql "${psql_args[@]}" -f "$SCHEMA_SQL" >/dev/null; then
  error "Failed to apply schema."
  exit 1
fi
success "Schema applied successfully."

ITEM_COUNT=$(psql "${psql_args[@]}" -t -c "SELECT COUNT(*) FROM ${DB_SCHEMA}.tp_capital_signals;" 2>/dev/null | tr -d '[:space:]')
ITEM_COUNT=${ITEM_COUNT:-0}
log "Signals in database: $ITEM_COUNT"

success "✅ TP Capital database ready!"
