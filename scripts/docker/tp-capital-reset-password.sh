#!/bin/bash
# ==============================================================================
# TP Capital - Reset Database Password
# ==============================================================================
# Purpose: Fix "wrong password type" error by resetting password with SCRAM-SHA-256
# ==============================================================================

set -euo pipefail

echo "🔐 TP Capital - Reset Database Password"
echo "========================================"
echo ""

# Load password from .env
source /home/marce/Projetos/TradingSystem/.env

if [ -z "${TP_CAPITAL_DB_PASSWORD:-}" ]; then
  echo "❌ Erro: TP_CAPITAL_DB_PASSWORD não encontrada no .env"
  exit 1
fi

echo "1️⃣  Resetando senha do usuário tp_capital..."

# Use PGPASSWORD to avoid password in command line
docker exec -e PGPASSWORD="$TP_CAPITAL_DB_PASSWORD" tp-capital-timescale \
  psql -U tp_capital -d postgres -c \
  "ALTER USER tp_capital WITH PASSWORD '$TP_CAPITAL_DB_PASSWORD';"

echo "   ✅ Senha resetada com SCRAM-SHA-256"
echo ""

echo "2️⃣  Verificando autenticação..."
docker exec -e PGPASSWORD="$TP_CAPITAL_DB_PASSWORD" tp-capital-timescale \
  psql -U tp_capital -d tp_capital_db -c "SELECT current_user, version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "   ✅ Autenticação funcionando"
else
  echo "   ❌ Erro na autenticação"
  exit 1
fi
echo ""

echo "3️⃣  Reiniciando TP Capital API..."
docker restart tp-capital-api > /dev/null
echo "   ✅ API reiniciada"
echo ""

echo "4️⃣  Aguardando API ficar healthy..."
for i in {1..30}; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' tp-capital-api 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "healthy" ]; then
    echo "   ✅ API healthy"
    break
  fi
  sleep 2
  if [ $i -eq 30 ]; then
    echo "   ⚠️  Timeout - verificar logs manualmente"
  fi
done
echo ""

echo "════════════════════════════════════════"
echo "✅ SENHA RESETADA COM SUCESSO!"
echo "════════════════════════════════════════"
echo ""
echo "🔍 Verificar status:"
echo "   docker ps --filter 'label=com.tradingsystem.stack=tp-capital'"
echo ""
echo "📊 Testar API:"
echo "   curl http://localhost:4005/health"
echo ""
