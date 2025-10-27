#!/usr/bin/env bash
set -euo pipefail

# Idempotently create/update a Postgres read-only role and apply grants
# across all non-system schemas in the target database.
#
# Defaults align with TimescaleDB service from tools/compose/docker-compose.database.yml
# listening on localhost:5433 and database name 'trading'.
#
# Env vars (override as needed):
#   DB_HOST=localhost
#   DB_PORT=5433
#   DB_NAME=trading
#   DB_SUPERUSER=timescale
#   DB_SUPERPASS=${TIMESCALEDB_PASSWORD}
#   FRONTEND_APPS_DB_READONLY_USER=frontend_ro
#   FRONTEND_APPS_DB_READONLY_PASS=change_me_ro
#   DOCKER_EXEC=0            # set to 1 to run inside container data-timescaledb
#   DOCKER_CONTAINER=data-timescaledb

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-trading}
DB_SUPERUSER=${DB_SUPERUSER:-timescale}
DB_SUPERPASS=${DB_SUPERPASS:-${TIMESCALEDB_PASSWORD:-pass_timescale}}
READONLY_USER=${FRONTEND_APPS_DB_READONLY_USER:-frontend_ro}
READONLY_PASS=${FRONTEND_APPS_DB_READONLY_PASS:-change_me_ro}
DOCKER_EXEC=${DOCKER_EXEC:-0}
DOCKER_CONTAINER=${DOCKER_CONTAINER:-data-timescaledb}

SQL=$(cat <<EOSQL
DO
\$\$
DECLARE
  schema_name text;
BEGIN
  -- Create role if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = '${READONLY_USER}'
  ) THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${READONLY_USER}', '${READONLY_PASS}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', '${READONLY_USER}', '${READONLY_PASS}');
  END IF;

  -- Ensure connect privilege
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), '${READONLY_USER}');

  -- Iterate over all non-system schemas (includes public)
  FOR schema_name IN
    SELECT nspname FROM pg_namespace
    WHERE nspname NOT IN ('pg_catalog','information_schema','pg_toast')
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', schema_name, '${READONLY_USER}');
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO %I', schema_name, '${READONLY_USER}');
    EXECUTE format('GRANT SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', schema_name, '${READONLY_USER}');
    -- Default privileges for future objects
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO %I', schema_name, '${READONLY_USER}');
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON SEQUENCES TO %I', schema_name, '${READONLY_USER}');
  END LOOP;
END
\$\$;
EOSQL
)

echo "[grant-ro] Ensuring read-only role '${READONLY_USER}' on ${DB_HOST}:${DB_PORT}/${DB_NAME}..."

PSQL_BASE=(psql -v ON_ERROR_STOP=1 -X)
PSQL_CONN=("-h" "$DB_HOST" "-p" "$DB_PORT" "-U" "$DB_SUPERUSER" "-d" "$DB_NAME")
# Pass as quoted psql variables to ensure literal substitution
# no psql variables required; we've embedded values above safely via format()
PSQL_VARS=()

if [[ "$DOCKER_EXEC" == "1" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "[grant-ro] Docker is not available but DOCKER_EXEC=1 was set." 1>&2
    exit 1
  fi
  echo "[grant-ro] Executing inside container: $DOCKER_CONTAINER"
  docker exec -e PGPASSWORD="$DB_SUPERPASS" "$DOCKER_CONTAINER" \
    "${PSQL_BASE[@]}" "${PSQL_CONN[@]}" "${PSQL_VARS[@]}" -c "$SQL"
else
  PGPASSWORD="$DB_SUPERPASS" "${PSQL_BASE[@]}" "${PSQL_CONN[@]}" "${PSQL_VARS[@]}" -c "$SQL"
fi

echo "[grant-ro] Role ensured and grants applied. Verifying with SELECT NOW()..."

PGPASSWORD="$READONLY_PASS" psql -X -h "$DB_HOST" -p "$DB_PORT" -U "$READONLY_USER" -d "$DB_NAME" -c "SELECT NOW() AS ts;" 1>/dev/null
echo "[grant-ro] Success: read-only connection works."
