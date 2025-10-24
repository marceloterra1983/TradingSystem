#!/usr/bin/env bash
# ==============================================================================
# Workspace Database Initialization Script
# ==============================================================================
# Description: Initialize TimescaleDB schema and seed data for Workspace
# Usage: ./scripts/init-database.sh [--seed] [--force]
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(cd "$API_DIR/../../.." && pwd)"

# SQL files
SCHEMA_SQL="$ROOT_DIR/backend/data/timescaledb/workspace-schema.sql"
SEED_SQL="$ROOT_DIR/backend/data/timescaledb/workspace-seed.sql"

# Parse arguments
SEED_DATA=false
FORCE_RECREATE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --seed)
      SEED_DATA=true
      shift
      ;;
    --force)
      FORCE_RECREATE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--seed] [--force]"
      echo ""
      echo "Options:"
      echo "  --seed   Insert sample seed data after schema creation"
      echo "  --force  Drop and recreate schema (WARNING: deletes all data)"
      echo "  --help   Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Logging function
log() {
  echo -e "${BLUE}[Workspace DB]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Load environment variables
if [[ -f "$ROOT_DIR/.env" ]]; then
  log "Loading environment from $ROOT_DIR/.env"
  export $(grep -v '^#' "$ROOT_DIR/.env" | grep -v '^$' | xargs)
else
  warn ".env file not found at $ROOT_DIR/.env"
fi

# Check required environment variables
if [[ -z "${WORKSPACE_DATABASE_URL:-}" ]] && [[ -z "${FRONTEND_APPS_DB_HOST:-}" ]]; then
  error "Database connection not configured"
  error "Set WORKSPACE_DATABASE_URL or FRONTEND_APPS_DB_* variables in .env"
  exit 1
fi

# Build connection URL if not provided directly
if [[ -z "${WORKSPACE_DATABASE_URL:-}" ]]; then
  DB_HOST="${FRONTEND_APPS_DB_HOST:-localhost}"
  DB_PORT="${FRONTEND_APPS_DB_PORT:-5444}"
  DB_NAME="${FRONTEND_APPS_DB_NAME:-frontend_apps}"
  DB_USER="${APP_WORKSPACE_DB_USER:-app_workspace}"
  DB_PASSWORD="${APP_WORKSPACE_DB_PASSWORD:-password}"
  DB_SCHEMA="${WORKSPACE_DATABASE_SCHEMA:-workspace}"
  
  WORKSPACE_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}"
fi

# Extract connection parameters
parse_output=$(python3 <<EOF
import os
from urllib.parse import urlparse, parse_qs

url = os.environ["WORKSPACE_DATABASE_URL"]
parsed = urlparse(url)
params = parse_qs(parsed.query)

user = parsed.username or ""
password = parsed.password or ""
host = parsed.hostname or "localhost"
port = parsed.port or 5432
dbname = parsed.path.lstrip("/") or "postgres"
schema = params.get("schema", [os.environ.get("WORKSPACE_DATABASE_SCHEMA", "workspace")])[0]

print(user, password, host, port, dbname, schema)
EOF
)

read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME DB_SCHEMA <<<"$parse_output"

DB_SCHEMA="${DB_SCHEMA:-${WORKSPACE_DATABASE_SCHEMA:-workspace}}"

log "Database Configuration:"
log "  Host: $DB_HOST:$DB_PORT"
log "  Database: $DB_NAME"
log "  Schema: $DB_SCHEMA"
log "  User: $DB_USER"

# Check if psql is available
if ! command -v psql &> /dev/null; then
  error "psql not found. Please install PostgreSQL client tools."
  exit 1
fi

# Check if SQL files exist
if [[ ! -f "$SCHEMA_SQL" ]]; then
  error "Schema file not found: $SCHEMA_SQL"
  exit 1
fi

if $SEED_DATA && [[ ! -f "$SEED_SQL" ]]; then
  error "Seed file not found: $SEED_SQL"
  exit 1
fi

# Check database connectivity
log "Checking database connectivity..."
if ! psql "$WORKSPACE_DATABASE_URL" -c "SELECT 1" &> /dev/null; then
  error "Cannot connect to database at $DB_HOST:$DB_PORT"
  error "Please ensure:"
  error "  1. TimescaleDB is running"
  error "  2. Database credentials are correct"
  error "  3. Database '$DB_NAME' exists"
  exit 1
fi

success "Database connection successful"

# Handle force recreate
if $FORCE_RECREATE; then
  warn "⚠️  FORCE MODE: This will DROP all data in schema '$DB_SCHEMA'"
  read -p "Are you sure? (type 'yes' to confirm): " confirm
  if [[ "$confirm" != "yes" ]]; then
    log "Aborted by user"
    exit 0
  fi
  
  log "Dropping schema '$DB_SCHEMA'..."
  psql "$WORKSPACE_DATABASE_URL" -c "DROP SCHEMA IF EXISTS \"${DB_SCHEMA}\" CASCADE;" || {
    error "Failed to drop schema"
    exit 1
  }
  success "Schema dropped"
fi

# Create schema if not exists
log "Ensuring schema '$DB_SCHEMA' exists..."
psql "$WORKSPACE_DATABASE_URL" -c "CREATE SCHEMA IF NOT EXISTS \"${DB_SCHEMA}\";" || {
  error "Failed to create schema"
  exit 1
}

# Apply schema
log "Applying workspace schema..."
export PGOPTIONS="--search_path=${DB_SCHEMA},public"
psql "$WORKSPACE_DATABASE_URL" -f "$SCHEMA_SQL" || {
  error "Failed to apply schema"
  exit 1
}
success "Schema applied successfully"

# Apply seed data if requested
if $SEED_DATA; then
  log "Inserting seed data..."
  psql "$WORKSPACE_DATABASE_URL" -f "$SEED_SQL" || {
    error "Failed to insert seed data"
    exit 1
  }
  success "Seed data inserted"
fi

# Verify installation
log "Verifying installation..."
ITEM_COUNT=$(psql "$WORKSPACE_DATABASE_URL" -t -c "SELECT COUNT(*) FROM ${DB_SCHEMA}.workspace_items;" 2>/dev/null || echo "0")
ITEM_COUNT=$(echo "$ITEM_COUNT" | tr -d ' ')

log "Database initialized successfully!"
log "  Items in database: $ITEM_COUNT"
log ""
success "✅ Workspace database ready!"

# Show next steps
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next steps:"
echo ""
echo "1. Start the Workspace API:"
echo "   cd $API_DIR"
echo "   npm run dev"
echo ""
echo "2. Test the API:"
echo "   curl http://localhost:3200/health"
echo "   curl http://localhost:3200/api/items"
echo ""
echo "3. Access the Workspace UI:"
echo "   http://localhost:3900"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

