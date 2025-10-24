#!/usr/bin/env bash
set -euo pipefail

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "[restart-dashboard-stack] Parando serviços existentes..."
"$ROOT_DIR/scripts/shutdown/stop-dashboard-stack.sh"

echo "[restart-dashboard-stack] Iniciando novamente..."
"$ROOT_DIR/scripts/startup/start-dashboard-stack.sh"

echo "[restart-dashboard-stack] Stack reiniciada com sucesso."
