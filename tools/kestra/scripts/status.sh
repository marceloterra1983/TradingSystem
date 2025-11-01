#!/usr/bin/env bash
# Lista contêineres ativos do Kestra.

set -euo pipefail

CONTAINER_NAME="${KESTRA_CONTAINER_NAME:-tools-kestra}"
CONTAINERS=$(docker ps --filter "name=^${CONTAINER_NAME}$" --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}')

if [[ -z "${CONTAINERS//[$'\n\r ']/}" ]]; then
  CONTAINERS=$(docker ps --filter 'ancestor=kestra/kestra:latest' --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}')
fi

if [[ -z "${CONTAINERS//[$'\n\r ']/}" ]]; then
  echo "ℹ️  Nenhum contêiner Kestra ativo."
  exit 1
fi

echo "${CONTAINERS}"
