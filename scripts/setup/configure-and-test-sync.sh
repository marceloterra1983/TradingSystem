#!/bin/bash
# Script para configurar e testar sincronização completa

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🔧 CONFIGURAR E TESTAR SINCRONIZAÇÃO COMPLETA          ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

cd /home/marce/Projetos/TradingSystem

# 1. Adicionar GATEWAY_PORT ao .env
echo "📝 Configurando porta do Gateway MTProto..."
if ! grep -q "^GATEWAY_PORT=" .env 2>/dev/null; then
    echo "" >> .env
    echo "# Telegram Gateway MTProto HTTP Server Port" >> .env
    echo "GATEWAY_PORT=4007" >> .env
    echo "   ✅ GATEWAY_PORT=4007 adicionado"
else
    sed -i 's/^GATEWAY_PORT=.*/GATEWAY_PORT=4007/' .env
    echo "   ✅ GATEWAY_PORT atualizado para 4007"
fi

echo ""
echo "🔄 Reiniciando serviços..."
echo ""

# 2. Reiniciar Gateway MTProto (porta 4007)
echo "   1. Gateway MTProto (porta 4007)..."
bash START-GATEWAY-MTPROTO.sh

echo ""
echo "   2. API REST (porta 4010)..."
lsof -ti :4010 | xargs kill -9 2>/dev/null || true
sleep 2
cd backend/api/telegram-gateway
nohup npm start > /home/marce/Projetos/TradingSystem/logs/telegram-gateway-api.log 2>&1 &
API_PID=$!
echo "      ✅ API iniciada (PID: $API_PID)"
cd /home/marce/Projetos/TradingSystem

echo ""
echo "⏳ Aguardando 10 segundos para estabilização..."
sleep 10

echo ""
echo "🧪 TESTANDO CONEXÕES:"
echo "═════════════════════"
echo ""

# 3. Testar Gateway MTProto
echo "   1. Gateway MTProto (4007):"
if curl -s http://localhost:4007/health >/dev/null 2>&1; then
    echo "      ✅ Respondendo"
else
    echo "      ❌ Não responde"
fi

# 4. Testar API REST
echo "   2. API REST (4010):"
if curl -s http://localhost:4010/health >/dev/null 2>&1; then
    echo "      ✅ Respondendo"
else
    echo "      ❌ Não responde"
fi

# 5. Obter API key
API_KEY=$(grep "TELEGRAM_GATEWAY_API_KEY" .env | cut -d'=' -f2)

echo ""
echo "   3. Sincronização via API:"
SYNC_RESULT=$(curl -s -X POST http://localhost:4010/api/telegram-gateway/sync-messages \
  -H 'Content-Type: application/json' \
  -H "X-API-Key: $API_KEY" \
  --max-time 30)

echo "$SYNC_RESULT" | jq .

if echo "$SYNC_RESULT" | jq -e '.success == true' >/dev/null 2>&1; then
    echo ""
    echo "      ✅ Sincronização FUNCIONOU!"
    TOTAL=$(echo "$SYNC_RESULT" | jq -r '.data.totalMessagesSynced')
    echo "      📊 Mensagens sincronizadas: $TOTAL"
else
    echo ""
    echo "      ❌ Sincronização FALHOU!"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✅ CONFIGURAÇÃO E TESTE CONCLUÍDOS!                    ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📋 SERVIÇOS RODANDO:"
echo ""
echo "   • Gateway MTProto: http://localhost:4007"
echo "   • API REST: http://localhost:4010"
echo "   • Dashboard: http://localhost:9080/#/telegram-gateway"
echo ""
echo "📝 TESTAR NO DASHBOARD:"
echo ""
echo "   1. Acesse: http://localhost:9080/#/telegram-gateway"
echo "   2. Clique em 'Checar Mensagens'"
echo "   3. Deve sincronizar automaticamente!"
echo ""
echo "🔍 VER LOGS:"
echo ""
echo "   tail -f logs/telegram-gateway-mtproto.log"
echo "   tail -f logs/telegram-gateway-api.log"
echo ""

