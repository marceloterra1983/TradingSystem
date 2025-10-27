#!/usr/bin/env bash
# start-local-telegram-gateway.sh
#
# Provision TimescaleDB, wire environment configuration, install dependencies,
# and start both the Telegram Gateway MTProto service and its REST API locally.
set -euo pipefail

print_step() {
  printf '\n\033[1;34m▶ %s\033[0m\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: required command '$1' not found in PATH" >&2
    exit 1
  fi
}

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

require_cmd psql
require_cmd npm
require_cmd node

# 1. Ensure TimescaleDB is provisioned with the Telegram Gateway schema.
print_step "Provisioning local TimescaleDB for Telegram Gateway"
"$ROOT_DIR/tools/scripts/install-local-telegram-gateway-db.sh"

DB_URL="$(awk -F '=' '/^TELEGRAM_GATEWAY_DB_URL=/{gsub(/"/,"",$2); print $2}' "$ROOT_DIR/.env" 2>/dev/null | tail -n1)"
if [[ -z "${DB_URL:-}" ]]; then
  DB_URL="postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY"
fi

print_step "Validating database connectivity"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "SELECT current_database() AS db, current_schema() AS schema, NOW() AS timestamp;" >/tmp/telegram_gateway_db_check.log
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "\dt telegram_gateway.*" >>/tmp/telegram_gateway_db_check.log
echo "info: database check log saved to /tmp/telegram_gateway_db_check.log"

# 2. Prepare API service environment.
API_ENV_FILE="$ROOT_DIR/backend/api/telegram-gateway/.env"
API_TOKEN="$(awk -F '=' '/^API_SECRET_TOKEN=/{gsub(/"/,"",$2); print $2}' "$ROOT_DIR/.env" 2>/dev/null | tail -n1)"
if [[ -z "${API_TOKEN:-}" ]]; then
  API_TOKEN="changeme"
fi

if [[ ! -f "$API_ENV_FILE" ]]; then
  print_step "Creating backend/api/telegram-gateway/.env"
  cat >"$API_ENV_FILE" <<EOF
TELEGRAM_GATEWAY_API_TOKEN=${API_TOKEN}
LOG_LEVEL=debug
TELEGRAM_GATEWAY_DB_URL=${DB_URL}
EOF
else
  print_step "Updating backend/api/telegram-gateway/.env with DB URL"
  if grep -q '^TELEGRAM_GATEWAY_DB_URL=' "$API_ENV_FILE"; then
    sed -i "s|^TELEGRAM_GATEWAY_DB_URL=.*|TELEGRAM_GATEWAY_DB_URL=${DB_URL}|" "$API_ENV_FILE"
  else
    printf 'TELEGRAM_GATEWAY_DB_URL=%s\n' "$DB_URL" >>"$API_ENV_FILE"
  fi
  if ! grep -q '^TELEGRAM_GATEWAY_API_TOKEN=' "$API_ENV_FILE"; then
    printf 'TELEGRAM_GATEWAY_API_TOKEN=%s\n' "$API_TOKEN" >>"$API_ENV_FILE"
  fi
fi

# 3. Install dependencies (idempotent).
print_step "Installing npm dependencies for apps/telegram-gateway"
(cd "$ROOT_DIR/apps/telegram-gateway" && npm install)

print_step "Installing npm dependencies for backend/api/telegram-gateway"
(cd "$ROOT_DIR/backend/api/telegram-gateway" && npm install)

# 4. Launch both services in the background and stream logs.
print_step "Starting Telegram Gateway service (apps/telegram-gateway)"
(cd "$ROOT_DIR/apps/telegram-gateway" && npm run dev) &
GATEWAY_PID=$!

print_step "Starting Telegram Gateway REST API (backend/api/telegram-gateway)"
(cd "$ROOT_DIR/backend/api/telegram-gateway" && npm run dev) &
API_PID=$!

cat <<'EOS'

Both services are running:
  - Gateway (MTProto)  : http://localhost:4006  (health: /health, metrics: /metrics)
  - REST API           : http://localhost:4010  (health: /health, messages: /messages)

First run? Keep this terminal open to complete Telegram authentication (SMS + 2FA).

Use Ctrl+C to stop both services. Processes will exit cleanly.
EOS

trap 'echo; echo "Stopping services..."; kill $GATEWAY_PID $API_PID >/dev/null 2>&1 || true' INT TERM
wait $GATEWAY_PID $API_PID
