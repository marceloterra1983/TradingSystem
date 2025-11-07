#!/usr/bin/env bash

# ==============================================================================
# WAHA Smoke Test
# ------------------------------------------------------------------------------
# Validates that the WhatsApp HTTP API stack is reachable with the configured
# API key, can list sessions, and keeps the default session operational.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
)"

if [[ ! -f "${ROOT_DIR}/.env" ]]; then
  echo "error: ${ROOT_DIR}/.env not found" >&2
  exit 1
fi

set -a
source "${ROOT_DIR}/.env"
set +a

BASE_URL="${WAHA_BASE_URL:-http://localhost:3310}"
API_KEY="${WAHA_API_KEY:-}"

if [[ -z "${API_KEY}" ]]; then
  echo "error: WAHA_API_KEY is not defined in .env" >&2
  exit 1
fi

function curl_json() {
  local method="$1"
  local path="$2"
  shift 2 || true

  curl -sS -w "\n%{http_code}" \
    -X "${method}" \
    -H "X-Api-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    "${BASE_URL}${path}" \
    "$@"
}

echo "→ Checking /api/version"
readarray -t version_resp < <(curl_json "GET" "/api/version")
version_body="${version_resp[0]}"
version_status="${version_resp[1]}"
if [[ "${version_status}" != "200" ]]; then
  echo "Version endpoint failed (${version_status}): ${version_body}" >&2
  exit 1
fi
echo "✓ Version OK: $(echo "${version_body}" | tr -d '\n')"

echo "→ Checking /health (200/422 acceptable)"
readarray -t health_resp < <(curl -sS -w "\n%{http_code}" \
  -H "X-Api-Key: ${API_KEY}" \
  "${BASE_URL}/health")
health_status="${health_resp[1]}"
if [[ "${health_status}" != "200" && "${health_status}" != "422" ]]; then
  echo "Health endpoint failed (${health_status}): ${health_resp[0]}" >&2
  exit 1
fi
echo "✓ Health status ${health_status}"

echo "→ Listing sessions"
readarray -t list_resp < <(curl_json "GET" "/api/sessions")
list_status="${list_resp[1]}"
if [[ "${list_status}" != "200" ]]; then
  echo "Failed to list sessions (${list_status}): ${list_resp[0]}" >&2
  exit 1
fi
echo "✓ Sessions listed"

echo "→ Ensuring default session exists"
readarray -t default_resp < <(curl_json "POST" "/api/sessions" --data "$(cat <<'JSON'
{"name":"default"}
JSON
)")
default_status="${default_resp[1]}"
if [[ "${default_status}" != "201" && "${default_status}" != "422" ]]; then
  echo "Default session creation failed (${default_status}): ${default_resp[0]}" >&2
  exit 1
fi
echo "✓ Default session ready (${default_status})"

echo "→ Starting default session"
readarray -t start_resp < <(curl_json "POST" "/api/sessions/default/start")
start_status="${start_resp[1]}"
if [[ "${start_status}" != "200" && "${start_status}" != "201" && "${start_status}" != "202" && "${start_status}" != "422" ]]; then
  echo "Failed to start default session (${start_status}): ${start_resp[0]}" >&2
  exit 1
fi
echo "✓ Default session start returned ${start_status}"

echo "→ Fetching screenshot for default session"
shot_status="$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "X-Api-Key: ${API_KEY}" \
  "${BASE_URL}/api/screenshot?session=default")"
if [[ "${shot_status}" != "200" && "${shot_status}" != "404" ]]; then
  echo "Screenshot endpoint failed (${shot_status})" >&2
  exit 1
fi
echo "✓ Screenshot status ${shot_status}"

echo "WAHA smoke test completed successfully."
