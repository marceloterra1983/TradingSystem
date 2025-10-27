#!/usr/bin/env bash
# check-local-telegram-gateway.sh
#
# Runs a quick sanity check against the local Telegram Gateway stack.
# - the MTProto gateway (port 4006)
# - the REST API (port 4010, protected by X-Gateway-Token)
# - direct TimescaleDB query
set -euo pipefail

print_step() {
  printf '\n\033[1;34m▶ %s\033[0m\n' "$1"
}

fail() {
  echo "error: $*" >&2
  exit 1
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "required command '$1' not found in PATH"
  fi
}

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

require_cmd curl
require_cmd jq
require_cmd psql
require_cmd lsof

# Collect tokens and DSN from configuration.
API_ENV="$ROOT_DIR/backend/api/telegram-gateway/.env"
ROOT_ENV="$ROOT_DIR/.env"

get_env_value() {
  local key="$1"
  local file="$2"
  awk -F '=' -v k="$key" '$1==k {gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); gsub(/(^"|"$)/, "", $2); print $2}' "$file" 2>/dev/null | tail -n1
}

API_TOKEN="$(get_env_value "TELEGRAM_GATEWAY_API_TOKEN" "$API_ENV")"
if [[ -z "${API_TOKEN:-}" ]]; then
  API_TOKEN="$(get_env_value "API_SECRET_TOKEN" "$API_ENV")"
fi
if [[ -z "${API_TOKEN:-}" ]]; then
  API_TOKEN="$(get_env_value "API_SECRET_TOKEN" "$ROOT_ENV")"
fi
if [[ -z "${API_TOKEN:-}" ]]; then
  fail "could not determine API token (set TELEGRAM_GATEWAY_API_TOKEN or API_SECRET_TOKEN)"
fi

DB_URL="$(get_env_value "TELEGRAM_GATEWAY_DB_URL" "$ROOT_ENV")"
if [[ -z "${DB_URL:-}" ]]; then
  DB_URL="$(get_env_value "TELEGRAM_GATEWAY_DB_URL" "$API_ENV")"
fi
if [[ -z "${DB_URL:-}" ]]; then
  DB_URL="postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY"
fi

print_step "Checking running processes on ports 4006 and 4010"
lsof -i :4006 || fail "no process listening on port 4006 (gateway)"
lsof -i :4010 || fail "no process listening on port 4010 (REST API)"

print_step "Calling MTProto gateway health endpoint"
curl -fsS http://localhost:4006/health | tee /tmp/telegram_gateway_health.json | jq '.status,.telegram' >/tmp/telegram_gateway_health_status.log
if ! grep -q '"connected"' /tmp/telegram_gateway_health_status.log; then
  echo "warning: telegram client is not connected according to health endpoint"
fi

print_step "Fetching metrics (first 5 lines)"
curl -fsS http://localhost:4006/metrics | head -n 5

print_step "Calling REST API health endpoint"
curl -fsS -H "X-Gateway-Token: ${API_TOKEN}" http://localhost:4010/health | tee /tmp/telegram_gateway_api_health.json | jq '.status' >/tmp/telegram_gateway_api_health_status.log
if ! grep -q '"healthy"' /tmp/telegram_gateway_api_health_status.log; then
  echo "warning: REST API health endpoint did not report status=healthy"
fi

print_step "Listing last 5 messages via REST API"
curl -fsS -H "X-Gateway-Token: ${API_TOKEN}" "http://localhost:4010/api/messages?limit=5" | jq '.data[]? | {channel_id,message_id,status,received_at}' || echo "warning: unable to fetch messages JSON payload"

print_step "Validating TimescaleDB schema"
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
\dt telegram_gateway.*
SELECT channel_id, message_id, status, received_at
FROM telegram_gateway.messages
ORDER BY received_at DESC
LIMIT 5;
SQL

cat <<'EOF'

Checks completed. Review warnings above (if any) for follow-up actions.
EOF
