#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/scripts/webscraper/.runtime"
PID_FILE="$RUNTIME_DIR/pids"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file found. Start services first using start-services.sh."
  exit 0
fi

mapfile -t PIDS <"$PID_FILE"

if [[ ${#PIDS[@]} -eq 0 ]]; then
  echo "PID file empty. Nothing to stop."
  exit 0
fi

echo "Stopping WebScraper processes..."
for pid in "${PIDS[@]}"; do
  if ps -p "$pid" >/dev/null 2>&1; then
    kill "$pid" || true
  fi
done

sleep 2

for pid in "${PIDS[@]}"; do
  if ps -p "$pid" >/dev/null 2>&1; then
    echo "Force killing PID $pid"
    kill -9 "$pid" || true
  fi
done

rm -f "$PID_FILE"
echo "WebScraper services stopped."
