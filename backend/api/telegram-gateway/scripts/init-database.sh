#!/usr/bin/env bash
# ==============================================================================
# Telegram Gateway Database Initialization Script
# ==============================================================================
# Applies the TimescaleDB schema used by the Telegram Gateway API.
# Usage: ./scripts/init-database.sh [--force]
# ==============================================================================

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(cd "$SERVICE_DIR/../../.." && pwd)"

SCHEMA_DIR="$ROOT_DIR/backend/data/timescaledb/telegram-gateway"
SQL_FILES=(
  "$SCHEMA_DIR/01_telegram_gateway_messages.sql"
  "$SCHEMA_DIR/02_telegram_gateway_channels.sql"
)

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
  --force   Drop and recreate the telegram_gateway schema before applying migrations.
  --help    Show this help message.
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
  echo -e "${BLUE}[Telegram Gateway DB]${NC} $1"
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

# Load environment files (root first, then service)
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
load_env_file "$SERVICE_DIR/.env"

for sql in "${SQL_FILES[@]}"; do
  if [[ ! -f "$sql" ]]; then
    error "Schema file not found: $sql"
    exit 1
  fi
done

DB_HOST="${TELEGRAM_GATEWAY_DB_HOST:-${TIMESCALEDB_HOST:-localhost}}"
DB_PORT="${TELEGRAM_GATEWAY_DB_PORT:-${TIMESCALEDB_PORT:-5433}}"
DB_NAME="${TELEGRAM_GATEWAY_DB_NAME:-${TIMESCALEDB_DATABASE:-APPS-TPCAPITAL}}"
DB_USER="${TELEGRAM_GATEWAY_DB_USER:-${TIMESCALEDB_USER:-timescale}}"
DB_PASSWORD="${TELEGRAM_GATEWAY_DB_PASSWORD:-${TIMESCALEDB_PASSWORD:-pass_timescale}}"
DB_SCHEMA="${TELEGRAM_GATEWAY_DB_SCHEMA:-telegram_gateway}"

if [[ ! -f "/.dockerenv" ]]; then
  HOST_PORT_FALLBACK="${TELEGRAM_GATEWAY_DB_HOST_PORT:-${TIMESCALEDB_HOST_PORT:-5433}}"
  case "$DB_HOST" in
    timescaledb|postgres)
      DB_HOST="localhost"
      DB_PORT="$HOST_PORT_FALLBACK"
      ;;
  esac
fi

PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD

base_psql_args=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER")
psql_args=("${base_psql_args[@]}" -d "$DB_NAME")

log "Database configuration:"
log "  Host: $DB_HOST:$DB_PORT"
log "  Database: $DB_NAME"
log "  Schema: $DB_SCHEMA"
log "  User: $DB_USER"

if ! command -v psql >/dev/null 2>&1; then
  error "psql not found. Install PostgreSQL client tools first."
  exit 1
fi

log "Checking database connectivity..."
if ! psql "${psql_args[@]}" -c "SELECT 1" >/dev/null 2>&1; then
  warn "Target database '$DB_NAME' unreachable - attempting to create it..."
  if ! psql "${base_psql_args[@]}" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
    error "Unable to reach PostgreSQL server. Verify credentials and connectivity."
    exit 1
  fi
  if ! psql "${base_psql_args[@]}" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" >/dev/null 2>&1; then
    error "Failed to create database '$DB_NAME'."
    exit 1
  fi
  success "Database '$DB_NAME' created."
fi
success "Database connection successful."

if $FORCE_RECREATE; then
  warn "Force mode enabled: schema '$DB_SCHEMA' will be dropped."
  read -r -p "Type 'yes' to continue: " confirm
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

export PGOPTIONS="--search_path=${DB_SCHEMA},public"

for sql in "${SQL_FILES[@]}"; do
  log "Applying $(basename "$sql")..."
  if ! psql "${psql_args[@]}" -f "$sql" >/dev/null; then
    error "Failed to apply $(basename "$sql")."
    exit 1
  fi
done
success "Schema applied successfully."

COUNT=$(psql "${psql_args[@]}" -t -c "SELECT COUNT(*) FROM ${DB_SCHEMA}.messages;" 2>/dev/null | tr -d '[:space:]')
COUNT=${COUNT:-0}
log "Messages stored: $COUNT"

success "✅ Telegram Gateway database ready!"
