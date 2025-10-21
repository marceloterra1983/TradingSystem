#!/usr/bin/env bash
set -euo pipefail

FORCE=false
if [[ ${1:-} == "--force" ]]; then
  FORCE=true
elif [[ -n ${1:-} ]]; then
  echo "Usage: $(basename "$0") [--force]"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_ENV_FILE="$ROOT_DIR/config/.env.defaults"
CONTAINER_IMAGES_FILE="$ROOT_DIR/config/container-images.env"
LEGACY_ENV_FILE="$ROOT_DIR/.env"
LOCAL_ENV_FILE="$ROOT_DIR/.env.local"

set -a
[ -f "$CONTAINER_IMAGES_FILE" ] && source "$CONTAINER_IMAGES_FILE"
[ -f "$DEFAULT_ENV_FILE" ] && source "$DEFAULT_ENV_FILE"
[ -f "$LEGACY_ENV_FILE" ] && source "$LEGACY_ENV_FILE"
[ -f "$LOCAL_ENV_FILE" ] && source "$LOCAL_ENV_FILE"
set +a

PORT="${WEBSCRAPER_API_PORT:-3700}"

if ! command -v lsof >/dev/null 2>&1; then
  echo "Error: 'lsof' required to detect running service."
  exit 1
fi

PIDS=$(lsof -ti tcp:"$PORT")

if [[ -z "$PIDS" ]]; then
  echo "WebScraper API not running on port ${PORT}."
  exit 0
fi

for PID in $PIDS; do
  if [[ "$FORCE" == "true" ]]; then
    echo "Force killing WebScraper API process (PID ${PID})..."
    kill -9 "$PID" || true
    continue
  fi

  echo "Stopping WebScraper API (PID ${PID})..."
  kill -TERM "$PID" || true

  for attempt in {1..10}; do
    if ! kill -0 "$PID" >/dev/null 2>&1; then
      echo "Service stopped gracefully."
      break
    fi
    sleep 1
  done

  if kill -0 "$PID" >/dev/null 2>&1; then
    echo "Process still running; sending SIGKILL."
    kill -9 "$PID" || true
  fi
done

if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
  echo "Warning: port ${PORT} is still in use."
else
  echo "Port ${PORT} released."
fi
