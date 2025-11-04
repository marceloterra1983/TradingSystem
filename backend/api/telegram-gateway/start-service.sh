#!/bin/bash

echo "🚀 Iniciando Telegram Gateway API..."
echo ""

# Ir para o diretório do serviço
cd "$(dirname "$0")"

# Matar processos antigos
pkill -f "backend/api/telegram-gateway" 2>/dev/null
sleep 2

# Verificar .env no root
PROJECT_ROOT="../../../"
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "❌ Erro: .env não encontrado no root do projeto!"
    exit 1
fi

echo "✅ .env encontrado: $PROJECT_ROOT/.env"
echo ""

# Iniciar serviço
echo "📝 Logs em: /tmp/telegram-gateway-api.log"
nohup npm run dev > /tmp/telegram-gateway-api.log 2>&1 &
PID=$!

echo "✅ Serviço iniciado (PID: $PID)"
echo ""
echo "Aguardando 8s para inicialização..."
sleep 8

# Testar
echo ""
echo "🧪 Testando endpoint..."
if curl -s http://localhost:4010/health | grep -q "status"; then
    echo "✅ Telegram Gateway API está RODANDO!"
    curl -s http://localhost:4010/health | jq '.' 2>/dev/null || curl -s http://localhost:4010/health
else
    echo "⚠️  Serviço não respondeu. Verificar log:"
    echo "   tail -50 /tmp/telegram-gateway-api.log"
    tail -30 /tmp/telegram-gateway-api.log
fi

