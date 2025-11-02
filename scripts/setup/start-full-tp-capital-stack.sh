#!/bin/bash

# ============================================================================
# Start Full TP Capital Stack
# ============================================================================
# Starts all dependencies for TP Capital to work correctly:
# - TimescaleDB (already running)
# - Telegram Gateway (MISSING!)
# - TP Capital service
# ============================================================================

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"

echo "=================================================="
echo "TP Capital - Full Stack Startup"
echo "=================================================="
echo ""

# 1. Check TimescaleDB
echo "1. Verificando TimescaleDB..."
if docker ps | grep -q "data-timescale"; then
    echo "   ✅ TimescaleDB rodando"
else
    echo "   ❌ TimescaleDB não está rodando!"
    echo "   Iniciando..."
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.infra.yml" up -d timescaledb
    sleep 5
fi
echo ""

# 2. Check/Start Telegram Gateway
echo "2. Verificando Telegram Gateway..."
if docker ps | grep -q "telegram-gateway"; then
    echo "   ✅ Telegram Gateway rodando"
else
    echo "   ⚠️  Telegram Gateway NÃO está rodando"
    echo "   "
    echo "   AVISO: TP Capital precisa do Telegram Gateway para:"
    echo "   - Sincronizar mensagens do Telegram"
    echo "   - Processar sinais novos"
    echo "   - Funcionalidade completa do botão 'Checar Mensagens'"
    echo ""
    echo "   O Telegram Gateway está em: backend/api/telegram-gateway/"
    echo "   "
    echo "   Deseja iniciar o Telegram Gateway? (requer configuração)"
    echo "   "
    echo "   Alternativa: TP Capital pode funcionar com:"
    echo "   - Dados históricos existentes"
    echo "   - Polling Worker (processa mensagens já no Gateway DB)"
    echo "   "
fi
echo ""

# 3. Kill old TP Capital
echo "3. Parando TP Capital antigo..."
sudo fuser -k 4005/tcp 2>/dev/null || true
pkill -9 -f "node.*tp-capital" 2>/dev/null || true
sleep 2
echo "   ✅ Processos antigos parados"
echo ""

# 4. Start TP Capital
echo "4. Iniciando TP Capital..."
cd "$PROJECT_ROOT/apps/tp-capital"
mkdir -p logs

nohup node src/server.js > logs/server.log 2>&1 &
PID=$!
echo "   ✅ PID: $PID"
sleep 8
echo ""

# 5. Verify services
echo "5. Verificando serviços..."

# TP Capital
if curl -s -f http://localhost:4005/healthz > /dev/null 2>&1; then
    echo "   ✅ TP Capital: http://localhost:4005"
else
    echo "   ❌ TP Capital não respondendo"
    exit 1
fi

# Telegram Gateway
if curl -s -f http://localhost:4006/health > /dev/null 2>&1; then
    echo "   ✅ Telegram Gateway: http://localhost:4006"
else
    echo "   ⚠️  Telegram Gateway: OFFLINE (porta 4006)"
    echo "      Sincronização completa indisponível"
fi

echo ""

# 6. Check messages in Gateway DB
echo "6. Verificando mensagens no Gateway DB..."
MESSAGE_COUNT=$(PGPASSWORD=pass_timescale psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -t -c \
  "SELECT COUNT(*) FROM telegram_gateway.messages WHERE channel_id = '-1001649127710';" 2>/dev/null | tr -d ' ')

if [ "$MESSAGE_COUNT" -gt 0 ]; then
    echo "   ✅ $MESSAGE_COUNT mensagens no Gateway DB"
    
    # Check by status
    echo "   "
    PGPASSWORD=pass_timescale psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -c \
      "SELECT status, COUNT(*) FROM telegram_gateway.messages WHERE channel_id = '-1001649127710' GROUP BY status;" 2>/dev/null
else
    echo "   ⚠️  0 mensagens no Gateway DB"
    echo "      Gateway precisa estar rodando para popular o banco"
fi

echo ""

# 7. Test sync
echo "7. Testando sincronização..."
SYNC_RESULT=$(curl -s -X POST \
  -H "X-API-Key: bbf913dad93ae879f1fbbec4490303a2c0d49be1d717342a64173a192f99f1a1" \
  http://localhost:4005/sync-messages)

SYNCED=$(echo "$SYNC_RESULT" | jq -r '.data.messagesSynced')
echo "   ℹ️  Mensagens sincronizadas: $SYNCED"

if [ "$SYNCED" = "0" ]; then
    echo "   ⚠️  Nenhuma mensagem nova para sincronizar"
    echo "      Telegram Gateway precisa estar ativo e capturando mensagens"
fi

echo ""
echo "=================================================="
echo "Status do Stack TP Capital"
echo "=================================================="
echo ""
echo "✅ TimescaleDB: Rodando"
echo "✅ TP Capital API: Rodando (PID: $PID)"

if curl -s -f http://localhost:4006/health > /dev/null 2>&1; then
    echo "✅ Telegram Gateway: Rodando"
else
    echo "⚠️  Telegram Gateway: OFFLINE"
    echo ""
    echo "   Para funcionalidade completa, inicie o Telegram Gateway:"
    echo "   cd backend/api/telegram-gateway"
    echo "   npm run dev"
fi

echo ""
echo "URLs:"
echo "  🌐 TP Capital: http://localhost:4005"
echo "  🌐 Telegram Gateway: http://localhost:4006 (se ativo)"
echo "  📝 Logs: apps/tp-capital/logs/server.log"
echo ""
echo "Próximo passo:"
echo "  Abrir Dashboard: http://localhost:3103"
echo "  Navegar para TP Capital"
echo "  Testar sincronização"
echo ""
echo "=================================================="

