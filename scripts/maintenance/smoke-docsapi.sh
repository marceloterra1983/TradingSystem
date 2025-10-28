#!/usr/bin/env bash
set -euo pipefail

# Smoke test runner for Documentation API
# - Picks a free port (prefers 3400, falls back to 3401..3405)
# - Starts the service if not already running
# - Probes key endpoints and prints concise outputs
# - Stops the service if it started it

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVICE_DIR="$ROOT_DIR/backend/api/documentation-api"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/docsapi-smoke.log"

mkdir -p "$LOG_DIR"

have_cmd() { command -v "$1" >/dev/null 2>&1; }

is_port_free() {
  local port="$1"
  if have_cmd ss; then
    ! ss -ltn "sport = :$port" | awk 'NR>1 {print}' | grep -q .
  elif have_cmd lsof; then
    ! lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
  elif have_cmd netstat; then
    ! netstat -ltn | awk -v p=":$port" '$4 ~ p {found=1} END {exit !found}'
  else
    # Assume free if cannot check
    return 0
  fi
}

pick_port() {
  local preferred=(3400 3401 3402 3403 3404 3405)
  for p in "${preferred[@]}"; do
    if is_port_free "$p"; then
      echo "$p"; return 0
    fi
  done
  echo "3400"
}

start_service() {
  local port="$1"
  echo "[smoke] Starting Documentation API on port $port..."
  (
    cd "$SERVICE_DIR"
    PORT="$port" NODE_ENV=development node src/server.js >>"$LOG_FILE" 2>&1 &
    echo $! > "$LOG_DIR/docsapi-smoke.pid"
  )
}

wait_health() {
  local url="$1"
  local max_tries=30
  local delay=0.5
  for i in $(seq 1 "$max_tries"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[smoke] Healthy at $url"; return 0
    fi
    sleep "$delay"
  done
  echo "[smoke] ERROR: Service did not become healthy ($url)" >&2
  return 1
}

print_sep() { echo; echo "==== $*"; }

cleanup() {
  if [[ -f "$LOG_DIR/docsapi-smoke.started" ]]; then
    if [[ -f "$LOG_DIR/docsapi-smoke.pid" ]]; then
      local pid
      pid="$(cat "$LOG_DIR/docsapi-smoke.pid" || true)"
      if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
        echo "[smoke] Stopping service (pid $pid)"
        kill "$pid" 2>/dev/null || true
        sleep 0.5
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
  fi
}
trap cleanup EXIT

PORT_CHOSEN="${PORT:-}"
if [[ -z "$PORT_CHOSEN" ]]; then
  PORT_CHOSEN="$(pick_port)"
fi

if is_port_free "$PORT_CHOSEN"; then
  # Start the service ourselves
  : > "$LOG_FILE"
  start_service "$PORT_CHOSEN"
  touch "$LOG_DIR/docsapi-smoke.started"
else
  echo "[smoke] Port $PORT_CHOSEN already in use. Assuming service is running."
fi

BASE="http://localhost:$PORT_CHOSEN"

wait_health "$BASE/health"

print_sep "GET /health"
curl -fsS "$BASE/health" | sed -n '1,40p'

print_sep "GET /api/v1/docs/status"
curl -fsS "$BASE/api/v1/docs/status" | sed -n '1,120p'

print_sep "GET /api/v1/docs/facets?q=architecture"
curl -fsS "$BASE/api/v1/docs/facets?q=architecture" | sed -n '1,120p'

print_sep "GET /api/v1/docs/suggest?q=arch"
curl -fsS "$BASE/api/v1/docs/suggest?q=arch" | sed -n '1,80p'

print_sep "GET /api/v1/docs/search?q=docs&domain=backend&type=guide&limit=5"
curl -fsS "$BASE/api/v1/docs/search?q=docs&domain=backend&type=guide&limit=5" | sed -n '1,160p'

print_sep "GET /spec/openapi.yaml (head)"
curl -fsS "$BASE/spec/openapi.yaml" | sed -n '1,30p'

echo "\n[smoke] Done. Full logs at: $LOG_FILE"

