#!/bin/bash
# Stops compose phases; now loads .env.shared for port info.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_SHARED="${REPO_ROOT}/.env.shared"

if [[ -f "${ENV_SHARED}" ]]; then
  set -a
  . "${ENV_SHARED}"
  set +a
fi

compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

for file in "${PHASES[@]}"; do
  path="${REPO_ROOT}/tools/compose/${file}"
  [[ -f "$path" ]] && compose -f "$path" down || true
.done
