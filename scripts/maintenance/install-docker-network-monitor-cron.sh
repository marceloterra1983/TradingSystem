#!/usr/bin/env bash
# Adiciona/atualiza tarefa cron para monitorar redes Docker

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_PATH="$PROJECT_ROOT/scripts/maintenance/monitor-docker-networks.sh"
LOG_FILE="$PROJECT_ROOT/outputs/logs/docker-network-monitor.log"
CRON_EXPR="0 * * * *"
ENTRY="$CRON_EXPR bash $SCRIPT_PATH --show-config >> $LOG_FILE 2>&1"

if [[ $EUID -eq 0 ]]; then
  echo "🚫 Execute como usuário normal (cron do root pode afetar serviços)."
  exit 1
fi

mkdir -p "$PROJECT_ROOT/outputs/logs"

TMP_CRON=$(mktemp)
crontab -l 2>/dev/null > "$TMP_CRON" || true

if grep -Fq "$SCRIPT_PATH" "$TMP_CRON"; then
  echo "🔁 Atualizando entrada existente do monitor de redes..."
  sed -i "\#$SCRIPT_PATH#d" "$TMP_CRON"
else
  echo "➕ Adicionando monitor de redes ao crontab..."
fi

echo "$ENTRY" >> "$TMP_CRON"
crontab "$TMP_CRON"
rm "$TMP_CRON"

echo "✅ Tarefa cron configurada: $ENTRY"
echo "📄 Logs: $LOG_FILE"
echo "ℹ️  Use 'crontab -l' para verificar."
