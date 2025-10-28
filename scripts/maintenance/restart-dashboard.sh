#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$ROOT_DIR/frontend/dashboard"
LOG_DIR="$ROOT_DIR/logs"
VITE_PID_FILE="$LOG_DIR/dashboard-vite.pid"
WATCH_PID_FILE="$LOG_DIR/dashboard-watch.pid"
VITE_LOG_FILE="$LOG_DIR/dashboard-vite.log"
WATCH_LOG_FILE="$LOG_DIR/dashboard-watch.log"

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

# Force port: default 3103 (can override with env PORT)
PORT="${PORT:-3103}"

# Stop previous instances if exist
for f in "$VITE_PID_FILE" "$WATCH_PID_FILE"; do
  if [[ -f "$f" ]]; then
    pid=$(cat "$f" || true)
    if [[ -n "${pid:-}" ]]; then
      echo "[dashboard:restart] Stopping PID $pid"
      stop_pid "$pid"
    fi
    rm -f "$f"
  fi
done

# Ensure target port is free
if is_port_used "$PORT"; then
  if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -t -iTCP:"$PORT" -sTCP:LISTEN || true)
  else
    PIDS=$(ss -lptn "sport = :$PORT" | awk 'NR>1{print $NF}' | sed 's/.*pid=\([0-9]*\).*/\1/' | tr -d ',' | tr -s '\n' ' ')
  fi
  for pid in $PIDS; do
    echo "[dashboard:restart] Killing pid $pid on $PORT"
    stop_pid "$pid"
  done
fi

echo "[dashboard:restart] Using port $PORT"

(
  cd "$APP_DIR"
  # Start watcher
  nohup npm run watch:docs >"$WATCH_LOG_FILE" 2>&1 & echo $! >"$WATCH_PID_FILE"
  # Start vite with target port (strict)
  nohup npm run dev:vite -- --port "$PORT" --strictPort=true >"$VITE_LOG_FILE" 2>&1 & echo $! >"$VITE_PID_FILE"
)

# Wait for vite readiness
URL="http://localhost:$PORT"
for i in $(seq 1 80); do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    echo "[dashboard:restart] Dashboard up at $URL"
    exit 0
  fi
  sleep 0.25
done

echo "[dashboard:restart] Timed out waiting for Dashboard at $URL" >&2
exit 1
