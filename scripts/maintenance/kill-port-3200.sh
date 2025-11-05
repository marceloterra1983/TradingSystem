#!/usr/bin/env bash
#
# Script para liberar a porta 3200 (workspace-api)
# Mata processos docker-proxy e outros que possam estar ocupando a porta
#

set -euo pipefail

echo "🔍 Procurando processos usando a porta 3200..."

# Encontrar PIDs usando a porta 3200
PIDS=$(sudo lsof -ti :3200 2>/dev/null || echo "")

if [ -z "$PIDS" ]; then
  echo "✅ Porta 3200 está livre!"
  exit 0
fi

echo "📋 Processos encontrados:"
for PID in $PIDS; do
  ps -p "$PID" -o pid,cmd
done

echo ""
echo "⚠️  Matando processos..."
for PID in $PIDS; do
  sudo kill -9 "$PID" && echo "✅ Processo $PID finalizado"
done

echo ""
echo "✅ Porta 3200 liberada!"

