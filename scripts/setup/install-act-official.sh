#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ACT_BIN="${PROJECT_ROOT}/bin/act"

if [ ! -f "$ACT_BIN" ]; then
  echo "Erro: ${ACT_BIN} não encontrado. Execute o instalador oficial antes." >&2
  exit 1
fi

sudo mv "$ACT_BIN" /usr/local/bin/act
sudo chmod +x /usr/local/bin/act
