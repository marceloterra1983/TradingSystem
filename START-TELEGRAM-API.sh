#!/bin/bash

echo "🚀 Iniciando Telegram Gateway API..."
echo ""

cd /home/marce/Projetos/TradingSystem/backend/api/telegram-gateway

# Matar processos antigos
echo "🧹 Limpando processos antigos..."
pkill -f "backend/api/telegram-gateway" 2>/dev/null
sleep 2

# Iniciar serviço
echo "📝 Iniciando serviço (log: /tmp/telegram-gateway-api.log)..."
nohup npm run dev > /tmp/telegram-gateway-api.log 2>&1 &
PID=$!

echo "✅ Serviço iniciado (PID: $PID)"
echo ""
echo "⏳ Aguardando 10s para inicialização..."
sleep 10

# Testar
echo ""
echo "🧪 Testando endpoint..."
if curl -s http://localhost:4010/health | grep -q "status"; then
    echo "✅ Telegram Gateway API está RODANDO!"
    echo ""
    curl -s http://localhost:4010/health | jq '.' 2>/dev/null || curl -s http://localhost:4010/health
else
    echo "⚠️  Serviço não respondeu. Verificar log:"
    echo "   tail -50 /tmp/telegram-gateway-api.log"
    echo ""
    tail -30 /tmp/telegram-gateway-api.log
fi

