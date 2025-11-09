#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/tools/compose/docker-compose.dashboard.yml"
PROJECT_NAME="${DASHBOARD_PROJECT_NAME:-1-dashboard-stack}"

echo "▶️  Starting dashboard container via ${COMPOSE_FILE} (project: ${PROJECT_NAME})"
echo "   This will build the image to pick up latest governance UI/data."

docker compose -p "${PROJECT_NAME}" -f "${COMPOSE_FILE}" up --build
