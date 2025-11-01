#!/usr/bin/env bash
# Finaliza contêineres Kestra ativos.

set -euo pipefail

CONTAINER_NAME="${KESTRA_CONTAINER_NAME:-tools-kestra}"
IDS=$(docker ps --filter "name=^${CONTAINER_NAME}$" --format '{{.ID}}')

if [[ -z "${IDS}" ]]; then
  IDS=$(docker ps --filter 'ancestor=kestra/kestra:latest' --format '{{.ID}}')
fi

if [[ -z "${IDS}" ]]; then
  echo "ℹ️  Nenhum contêiner Kestra em execução."
  exit 0
fi

echo "🛑 Encerrando contêiner(es) Kestra..."
while read -r id; do
  [[ -z "${id}" ]] && continue
  docker stop "${id}" >/dev/null && echo "  ✓ ${id} interrompido"
done <<< "${IDS}"
