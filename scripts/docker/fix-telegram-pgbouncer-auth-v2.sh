#!/bin/bash
# ==============================================================================
# Fix Telegram PgBouncer Authentication (v2 - Solução Definitiva)
# ==============================================================================
# Corrige o problema de autenticação mudando para md5 e recriando senha
# ==============================================================================

set -euo pipefail

echo "🔧 Fixing Telegram PgBouncer Authentication (v2)..."
echo ""

# 1. Modificar password_encryption para md5 temporariamente
echo "1/6: Setting password encryption to md5..."
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "ALTER SYSTEM SET password_encryption = 'md5';"
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "SELECT pg_reload_conf();"

# 2. Recriar senha do usuário telegram com md5
echo "2/6: Recreating telegram user password with md5..."
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "ALTER USER telegram WITH PASSWORD 'telegram';"

# 3. Limpar pg_hba.conf e adicionar regra md5 correta
echo "3/6: Fixing pg_hba.conf..."
docker exec telegram-timescale bash -c "sed -i '/host all all all scram-sha-256/d' /var/lib/postgresql/data/pg_hba.conf"
docker exec telegram-timescale bash -c "sed -i '/host all all 0.0.0.0\/0 md5/d' /var/lib/postgresql/data/pg_hba.conf"
docker exec telegram-timescale bash -c "echo 'host all all 0.0.0.0/0 md5' >> /var/lib/postgresql/data/pg_hba.conf"

# 4. Recarregar configuração do PostgreSQL
echo "4/6: Reloading PostgreSQL configuration..."
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "SELECT pg_reload_conf();"

# 5. Aguardar 3 segundos
echo "5/6: Waiting 3 seconds..."
sleep 3

# 6. Reiniciar containers que dependem do banco
echo "6/6: Restarting dependent containers..."
docker restart telegram-gateway-api telegram-mtproto

echo ""
echo "✅ Configuration updated!"
echo ""
echo "Wait 15 seconds and check:"
echo "  docker logs telegram-gateway-api --tail 10"
echo "  docker logs telegram-mtproto --tail 10"
echo "  docker logs telegram-pgbouncer --tail 10"
echo ""
echo "If successful, both APIs should start without errors."
