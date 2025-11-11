#!/bin/bash
# Script para configurar a API Key do Telegram Gateway

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   🔐 CONFIGURAÇÃO DA API KEY DO TELEGRAM GATEWAY                ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

ENV_FILE=".env"
PROJECT_ROOT="/home/marce/Projetos/TradingSystem"

cd "$PROJECT_ROOT"

# Gerar uma API key aleatória se não existir
if ! grep -q "TELEGRAM_GATEWAY_API_KEY" "$ENV_FILE" 2>/dev/null; then
    echo "📝 Gerando nova API key..."
    API_KEY=$(openssl rand -hex 32)
    
    echo "" >> "$ENV_FILE"
    echo "# Telegram Gateway API Authentication" >> "$ENV_FILE"
    echo "TELEGRAM_GATEWAY_API_KEY=$API_KEY" >> "$ENV_FILE"
    
    echo "✅ API key adicionada ao .env: $API_KEY"
else
    API_KEY=$(grep "TELEGRAM_GATEWAY_API_KEY" "$ENV_FILE" | cut -d'=' -f2)
    echo "ℹ️  API key já existe no .env: $API_KEY"
fi

echo ""
echo "🔄 Adicionando ao frontend (.env)..."

# Adicionar ao frontend se não existir
FRONTEND_ENV="$PROJECT_ROOT/frontend/dashboard/.env"

if [ ! -f "$FRONTEND_ENV" ]; then
    touch "$FRONTEND_ENV"
fi

if ! grep -q "VITE_TELEGRAM_GATEWAY_API_TOKEN" "$FRONTEND_ENV" 2>/dev/null; then
    echo "" >> "$FRONTEND_ENV"
    echo "# Telegram Gateway API Token" >> "$FRONTEND_ENV"
    echo "VITE_TELEGRAM_GATEWAY_API_TOKEN=$API_KEY" >> "$FRONTEND_ENV"
    echo "✅ Variável VITE_TELEGRAM_GATEWAY_API_TOKEN adicionada ao frontend"
else
    # Atualizar se já existir
    sed -i "s/^VITE_TELEGRAM_GATEWAY_API_TOKEN=.*/VITE_TELEGRAM_GATEWAY_API_TOKEN=$API_KEY/" "$FRONTEND_ENV"
    echo "✅ Variável VITE_TELEGRAM_GATEWAY_API_TOKEN atualizada no frontend"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   ✅ CONFIGURAÇÃO COMPLETA!                                      ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Reinicie o serviço Telegram Gateway:"
echo "   bash START-GATEWAY-MTPROTO.sh"
echo ""
echo "2. Reinicie o Dashboard:"
echo "   docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml restart"
echo ""
echo "3. Teste o botão 'Checar Mensagens' em:"
echo "   http://localhost:3103/#/telegram-gateway"
echo ""
echo "🔍 Para testar manualmente:"
echo ""
echo "curl -X POST http://localhost:4010/api/telegram-gateway/sync-messages \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'X-API-Key: $API_KEY'"
echo ""

