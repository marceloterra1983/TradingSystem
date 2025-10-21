#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../compose/.env.timescaledb"
BACKUP_DIR="${TIMESCALEDB_MANUAL_BACKUP_DIR:-$SCRIPT_DIR/../backups/timescaledb}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[ERROR] ${ENV_FILE} não encontrado. Copie a partir de .env.timescaledb.example e configure as credenciais." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

PGPASSWORD="${TIMESCALEDB_PASSWORD:-changeme}" pg_dump \
  -h "${TIMESCALEDB_HOST:-localhost}" \
  -p "${TIMESCALEDB_PORT:-5433}" \
  -U "${TIMESCALEDB_USER:-timescale}" \
  -F c \
  -d "${TIMESCALEDB_DB:-tradingsystem}" \
  -f "${BACKUP_DIR}/${TIMESTAMP}.dump"

echo "Backup salvo em ${BACKUP_DIR}/${TIMESTAMP}.dump"
