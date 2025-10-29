#!/usr/bin/env bash
set -euo pipefail

# Recover Telegram Gateway channels from previous databases/schemas into the current destination.
# - Detects legacy databases like APPS-TELEGRAM-GATEWAY or APPS-TPCAPITAL
# - Exports rows from telegram_gateway.channels (if present) and imports into the current schema
#
# Usage:
#   bash scripts/migrations/recover-telegram-gateway-channels.sh
#
# Requirements:
#   - psql installed
#   - TIMESCALEDB_* or TELEGRAM_GATEWAY_DB_* env vars available (loaded from .env automatically)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}[recover]${NC} $*"; }
ok() { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[err]${NC} $*" >&2; }

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    if [[ -z "${!k+x}" ]]; then
      export "$k"="$v"
    fi
  done < <(grep -Ev '^(#|\s*$|export\s+)' "$file")
}

load_env_file "$PROJECT_ROOT/config/.env.defaults"
load_env_file "$PROJECT_ROOT/.env"
load_env_file "$PROJECT_ROOT/.env.local"

if ! command -v psql >/dev/null 2>&1; then
  err "psql não encontrado. Instale o cliente do PostgreSQL."
  exit 1
fi

# Destination (current) connection
DEST_HOST="${TELEGRAM_GATEWAY_DB_HOST:-${TIMESCALEDB_HOST:-localhost}}"
DEST_PORT="${TELEGRAM_GATEWAY_DB_PORT:-${TIMESCALEDB_PORT:-5433}}"
DEST_DB="${TELEGRAM_GATEWAY_DB_NAME:-${TIMESCALEDB_DATABASE:-tradingsystem}}"
DEST_USER="${TELEGRAM_GATEWAY_DB_USER:-${TIMESCALEDB_USER:-timescale}}"
DEST_PASS="${TELEGRAM_GATEWAY_DB_PASSWORD:-${TIMESCALEDB_PASSWORD:-pass_timescale}}"
DEST_SCHEMA="${TELEGRAM_GATEWAY_DB_SCHEMA:-telegram_gateway}"

export PGPASSWORD="$DEST_PASS"

log "Destino: ${DEST_USER}@${DEST_HOST}:${DEST_PORT}/${DEST_DB} schema=${DEST_SCHEMA}"

# Candidate legacy databases to probe
readarray -t CANDIDATE_DBS < <(printf '%s\n' \
  "APPS-TELEGRAM-GATEWAY" \
  "APPS-TPCAPITAL" \
  "${DEST_DB}")

SOURCE_DB=""
for db in "${CANDIDATE_DBS[@]}"; do
  if psql -h "$DEST_HOST" -p "$DEST_PORT" -U "$DEST_USER" -d "$db" -tAc "SELECT 1" >/dev/null 2>&1; then
    # Check if table exists and has rows
    COUNT=$(psql -h "$DEST_HOST" -p "$DEST_PORT" -U "$DEST_USER" -d "$db" -tAc \
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='telegram_gateway' AND table_name='channels';" | tr -d '[:space:]' || echo 0)
    if [[ "$COUNT" =~ ^[0-9]+$ ]] && [[ "$COUNT" -gt 0 ]]; then
      ROWS=$(psql -h "$DEST_HOST" -p "$DEST_PORT" -U "$DEST_USER" -d "$db" -tAc \
        "SELECT COUNT(*) FROM telegram_gateway.channels;" | tr -d '[:space:]' || echo 0)
      if [[ "$ROWS" =~ ^[0-9]+$ ]] && [[ "$ROWS" -gt 0 ]]; then
        SOURCE_DB="$db"
        log "Fonte detectada: ${db} (telegram_gateway.channels = ${ROWS} linhas)"
        break
      fi
    fi
  fi
done

if [[ -z "$SOURCE_DB" ]]; then
  warn "Nenhuma base legada com telegram_gateway.channels encontrada. Nada para recuperar."
  exit 0
fi

TMP_CSV="$(mktemp -t channels_XXXX).csv"

log "Exportando canais da fonte (${SOURCE_DB})..."
psql -h "$DEST_HOST" -p "$DEST_PORT" -U "$DEST_USER" -d "$SOURCE_DB" -v ON_ERROR_STOP=1 <<SQL
\copy (SELECT channel_id, COALESCE(label,''), COALESCE(description,''), is_active, created_at, updated_at FROM telegram_gateway.channels ORDER BY created_at ASC) TO '$TMP_CSV' WITH CSV
SQL

ok "Export concluído: $TMP_CSV"

log "Importando canais no destino (${DEST_DB}.${DEST_SCHEMA}) (upsert por channel_id)..."
psql -h "$DEST_HOST" -p "$DEST_PORT" -U "$DEST_USER" -d "$DEST_DB" -v ON_ERROR_STOP=1 <<SQL
CREATE SCHEMA IF NOT EXISTS "$DEST_SCHEMA";
SET search_path TO "$DEST_SCHEMA", public;
CREATE TABLE IF NOT EXISTS channels (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT UNIQUE NOT NULL,
  label TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TEMP TABLE _channels_import (
  channel_id BIGINT,
  label TEXT,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
\copy _channels_import FROM '$TMP_CSV' WITH CSV
-- Upsert by channel_id
INSERT INTO channels (channel_id, label, description, is_active, created_at, updated_at)
SELECT channel_id,
       NULLIF(label,'')::TEXT,
       NULLIF(description,'')::TEXT,
       COALESCE(is_active, TRUE),
       COALESCE(created_at, NOW()),
       COALESCE(updated_at, NOW())
FROM _channels_import src
ON CONFLICT (channel_id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = GREATEST(EXCLUDED.updated_at, channels.updated_at);
DROP TABLE _channels_import;
SQL

ok "Importação concluída. Limpando arquivo temporário."
rm -f "$TMP_CSV"

ok "Recuperação finalizada com sucesso. Abra o Dashboard > Apps > Telegram Gateway para ver os canais."

