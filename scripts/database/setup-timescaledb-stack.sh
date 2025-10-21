#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/../compose/docker-compose.timescale.yml"
ENV_FILE="${SCRIPT_DIR}/../compose/.env.timescaledb"

usage() {
  cat <<USAGE
TimescaleDB stack helper

Usage:
  $(basename "$0") up       # start stack
  $(basename "$0") down     # stop stack
  $(basename "$0") restart  # restart stack

Environment file:
  ${ENV_FILE}

Adjust credentials/ports before running the stack for the first time.
USAGE
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "[ERROR] docker compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[WARN] ${ENV_FILE} not found. Creating from template..."
  cp "${ENV_FILE}.example" "${ENV_FILE}" || {
    echo "[ERROR] failed to create env file" >&2
    exit 1
  }
  echo "Please edit ${ENV_FILE} with secure credentials before starting the stack."
  exit 1
fi

case "$1" in
  up)
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d
    ;;
  down)
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down
    ;;
  restart)
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d
    ;;
  *)
    usage
    exit 1
    ;;
 esac
