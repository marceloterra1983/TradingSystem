#!/bin/bash
# ==============================================================================
# Fix Telegram PgBouncer Authentication
# ==============================================================================
# Corrige o problema de autenticação entre PgBouncer e TimescaleDB
# ==============================================================================

set -euo pipefail

echo "🔧 Fixing Telegram PgBouncer Authentication..."
echo ""

# 1. Adicionar regra md5 no pg_hba.conf do TimescaleDB
echo "1/4: Adding md5 authentication rule to TimescaleDB..."
docker exec telegram-timescale bash -c "echo 'host all all 0.0.0.0/0 md5' >> /var/lib/postgresql/data/pg_hba.conf"

# 2. Recarregar configuração do PostgreSQL
echo "2/4: Reloading PostgreSQL configuration..."
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "SELECT pg_reload_conf();"

# 3. Aguardar 3 segundos
echo "3/4: Waiting 3 seconds..."
sleep 3

# 4. Verificar logs do PgBouncer
echo "4/4: Checking PgBouncer logs..."
docker logs telegram-pgbouncer --tail 10

echo ""
echo "✅ Configuration updated!"
echo ""
echo "Now wait 10 seconds and check:"
echo "  docker logs telegram-gateway-api --tail 10"
echo "  docker logs telegram-mtproto --tail 10"
echo ""
echo "If still failing, restart the stack:"
echo "  docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml restart"
