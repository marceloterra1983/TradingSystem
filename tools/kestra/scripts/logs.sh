#!/usr/bin/env bash
# Segue logs do contêiner Kestra ativo.

set -euo pipefail

CONTAINER_NAME="${KESTRA_CONTAINER_NAME:-tools-kestra}"
CONTAINER_ID="$(docker ps --filter "name=^${CONTAINER_NAME}$" --format '{{.ID}}' | head -n1)"

if [[ -z "${CONTAINER_ID}" ]]; then
  CONTAINER_ID="$(docker ps --filter 'ancestor=kestra/kestra:latest' --format '{{.ID}}' | head -n1)"
fi

if [[ -z "${CONTAINER_ID}" ]]; then
  echo "❌ Kestra não está em execução."
  exit 1
fi

echo "▶️  Exibindo logs para contêiner ${CONTAINER_ID}"
docker logs -f "${CONTAINER_ID}"
