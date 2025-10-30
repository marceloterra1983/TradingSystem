#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
PID_FILE="$LOG_DIR/docusaurus-serve.pid"
LOG_FILE="$LOG_DIR/docusaurus-serve.log"
PORT="${PORT:-3400}"

mkdir -p "$LOG_DIR"

is_port_used() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -lptn "sport = :$port" | awk 'NR>1{print}' | grep -q .
  else
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  fi
}

stop_pid() {
  local pid="$1"
  [[ -z "$pid" ]] && return 0
  kill "$pid" 2>/dev/null || true
  sleep 0.3
  kill -9 "$pid" 2>/dev/null || true
}

echo "[docs:restart] Ensuring port $PORT is free..."
if is_port_used "$PORT"; then
  if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -t -iTCP:"$PORT" -sTCP:LISTEN || true)
  else
    PIDS=$(ss -lptn "sport = :$PORT" | awk 'NR>1{print $NF}' | sed 's/.*pid=\([0-9]*\).*/\1/' | tr -d ',' | tr -s '\n' ' ')
  fi
  for pid in $PIDS; do
    echo "[docs:restart] Killing pid $pid on port $PORT"
    stop_pid "$pid"
  done
fi

echo "[docs:restart] Building (if needed) and starting Docusaurus on $PORT..."
(
  cd "$ROOT_DIR/docs"
  npm run docs:build >/dev/null 2>&1 || true
  nohup npm run docs:serve -- --port "$PORT" >"$LOG_FILE" 2>&1 & echo $! >"$PID_FILE"
)

# Wait for healthy
URL="http://localhost:$PORT"
for i in $(seq 1 40); do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    echo "[docs:restart] Docusaurus up at $URL"
    exit 0
  fi
  sleep 0.25
done

echo "[docs:restart] Timed out waiting for Docusaurus at $URL" >&2
exit 1
