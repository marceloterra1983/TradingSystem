#!/usr/bin/env bash
set -euo pipefail

# Runs on initial database creation by postgres/timescale entrypoint.
# Creates a read-only role and grants usage/select on all non-system schemas.

READONLY_USER=${FRONTEND_APPS_DB_READONLY_USER:-frontend_ro}
READONLY_PASS=${FRONTEND_APPS_DB_READONLY_PASS:-change_me_ro}

# Prefer POSTGRES_DB (set by image), fallback to trading
DB_NAME=${POSTGRES_DB:-trading}

echo "[initdb] Creating read-only role '$READONLY_USER' on database '$DB_NAME'..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB_NAME" <<-EOSQL
DO

	\$do\$
	DECLARE
	  schema_name text;
	BEGIN
	  -- Create role if not exists
	  IF NOT EXISTS (
	    SELECT 1 FROM pg_roles WHERE rolname = '$READONLY_USER'
	  ) THEN
	    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '$READONLY_USER', '$READONLY_PASS');
	  END IF;

	  -- Ensure connect privilege
	  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', '$DB_NAME', '$READONLY_USER');

	  -- Iterate over all non-system schemas
	  FOR schema_name IN
	    SELECT nspname FROM pg_namespace
	    WHERE nspname NOT IN ('pg_catalog','information_schema','pg_toast')
	  LOOP
	    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', schema_name, '$READONLY_USER');
	    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO %I', schema_name, '$READONLY_USER');
	    EXECUTE format('GRANT SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', schema_name, '$READONLY_USER');
	    -- Default privileges for future tables/sequences
	    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO %I', schema_name, '$READONLY_USER');
	    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON SEQUENCES TO %I', schema_name, '$READONLY_USER');
	  END LOOP;
	END
	\$do\$;
EOSQL

echo "[initdb] Read-only role '$READONLY_USER' configured."

