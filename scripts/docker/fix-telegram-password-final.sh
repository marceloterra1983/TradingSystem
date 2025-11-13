#!/bin/bash
# ==============================================================================
# Fix Telegram User Password (FINAL)
# ==============================================================================
# Atualiza a senha do usuário telegram para corresponder ao .env
# ==============================================================================

set -euo pipefail

# Carregar variáveis de ambiente
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -f "$PROJECT_ROOT/.env" ]; then
    # Export apenas as variáveis necessárias
    export TELEGRAM_DB_PASSWORD=$(grep "^TELEGRAM_DB_PASSWORD=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
fi

if [ -z "$TELEGRAM_DB_PASSWORD" ]; then
    echo "❌ Error: TELEGRAM_DB_PASSWORD not found in .env"
    exit 1
fi

echo "🔧 Updating Telegram user password..."
echo ""

# Usar variável de ambiente ao invés de hardcoded password
docker exec -e PGPASSWORD="$TELEGRAM_DB_PASSWORD" telegram-timescale psql -U telegram -d telegram_gateway -c "ALTER USER telegram WITH PASSWORD '$TELEGRAM_DB_PASSWORD';"

echo ""
echo "✅ Password updated successfully!"
echo ""
echo "Restarting services..."
docker restart telegram-pgbouncer telegram-gateway-api telegram-mtproto

echo ""
echo "Wait 15 seconds and check:"
echo "  docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml ps"
echo ""
