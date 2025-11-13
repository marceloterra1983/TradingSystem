#!/bin/bash
# ==============================================================================
# Fix Telegram PgBouncer Authentication (v3 - SOLUÇÃO FINAL)
# ==============================================================================
# Corrige o listen_addresses do PostgreSQL para aceitar conexões de rede
# ==============================================================================

set -euo pipefail

echo "🔧 Fixing Telegram PgBouncer Authentication (v3 - FINAL)..."
echo ""

# 1. Configurar listen_addresses para aceitar conexões de qualquer IP
echo "1/3: Setting PostgreSQL to listen on all addresses..."
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "ALTER SYSTEM SET listen_addresses = '*';"

# 2. Reiniciar TimescaleDB para aplicar mudança
echo "2/3: Restarting TimescaleDB..."
docker restart telegram-timescale

# Aguardar TimescaleDB voltar (até 30s)
echo "Waiting for TimescaleDB to be ready..."
for i in {1..30}; do
    if docker exec telegram-timescale pg_isready -U telegram -d telegram_gateway &>/dev/null; then
        echo "✅ TimescaleDB is ready!"
        break
    fi
    echo -n "."
    sleep 1
done

# 3. Reiniciar containers que dependem do banco
echo "3/3: Restarting dependent containers..."
docker restart telegram-pgbouncer telegram-gateway-api telegram-mtproto

echo ""
echo "✅ Configuration completed!"
echo ""
echo "Wait 20 seconds and check:"
echo "  docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml ps"
echo ""
echo "All services should be 'Up (healthy)' status."
