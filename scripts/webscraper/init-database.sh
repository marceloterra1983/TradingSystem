#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_ENV_FILE="$ROOT_DIR/config/.env.defaults"
CONTAINER_IMAGES_FILE="$ROOT_DIR/config/container-images.env"
LEGACY_ENV_FILE="$ROOT_DIR/.env"
LOCAL_ENV_FILE="$ROOT_DIR/.env.local"
SCHEMA_FILE="$ROOT_DIR/infrastructure/timescaledb/webscraper-schema.sql"
SEED_FILE="$ROOT_DIR/infrastructure/timescaledb/webscraper-seed.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required but not installed. Install PostgreSQL client tools first."
  exit 1
fi

set -a
[ -f "$CONTAINER_IMAGES_FILE" ] && source "$CONTAINER_IMAGES_FILE"
[ -f "$DEFAULT_ENV_FILE" ] && source "$DEFAULT_ENV_FILE"
[ -f "$LEGACY_ENV_FILE" ] && source "$LEGACY_ENV_FILE"
[ -f "$LOCAL_ENV_FILE" ] && source "$LOCAL_ENV_FILE"
set +a

DB_URL="${WEBSCRAPER_DATABASE_URL:-}"

if [[ -z "$DB_URL" ]]; then
  echo "WEBSCRAPER_DATABASE_URL is not defined in .env"
  exit 1
fi

read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME <<<"$(python - <<'PY'
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

export PGPASSWORD="$DB_PASSWORD"

echo "Ensuring database '$DB_NAME' exists..."
EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")
if [[ -z "$EXISTS" ]]; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" postgres -c "CREATE DATABASE \"${DB_NAME}\";"
  echo "Database $DB_NAME created."
else
  echo "Database $DB_NAME already exists."
fi

echo "Applying schema..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"

echo "Seeding development data..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SEED_FILE"

echo "WebScraper database initialised successfully."
