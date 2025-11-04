#!/bin/bash
# Script para iniciar o Telegram Gateway completo (MTProto + API)

set -e

echo "🚀 Iniciando Telegram Gateway..."
echo ""

# 1. Iniciar Telegram Gateway API (porta 4010)
echo "📡 Iniciando Telegram Gateway API (porta 4010)..."
cd backend/api/telegram-gateway

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "   📦 Instalando dependências..."
  npm install
fi

# Start in background
echo "   ▶️  Iniciando serviço..."
npm run dev > ../../../logs/telegram-gateway-api.log 2>&1 &
API_PID=$!
echo "   ✅ API iniciada (PID: $API_PID)"

cd ../../..

echo ""
echo "⏳ Aguardando API inicializar (5s)..."
sleep 5

# Test API
echo "🧪 Testando conexão..."
if curl -s http://localhost:4010/health > /dev/null 2>&1; then
  echo "   ✅ API respondendo em http://localhost:4010"
else
  echo "   ⚠️  API ainda não está respondendo"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Telegram Gateway API Iniciado!                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "📊 Endpoints disponíveis:"
echo "   • Health: http://localhost:4010/health"
echo "   • Messages: http://localhost:4010/api/messages"
echo "   • Channels: http://localhost:4010/api/channels"
echo ""
echo "📋 Para ver logs:"
echo "   tail -f logs/telegram-gateway-api.log"
echo ""
echo "🛑 Para parar:"
echo "   kill $API_PID"
echo ""
echo "🔄 Agora recarregue o Dashboard em:"
echo "   http://localhost:3103/#/telegram-gateway"
echo ""

