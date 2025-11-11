#!/bin/bash
# ==============================================================================
# Force Dashboard Reload - Clear cache and restart
# ==============================================================================
# Forces a complete reload of the dashboard with cache invalidation
# ==============================================================================

set -euo pipefail

echo "🔄 Forçando reload completo do Dashboard..."
echo ""

# Step 1: Touch source file to trigger hot reload
echo "1️⃣  Touching source file to trigger Vite HMR..."
docker exec dashboard-ui touch /app/src/hooks/useTelegramGateway.ts
sleep 2

# Step 2: Check if dashboard is still healthy
echo ""
echo "2️⃣  Verificando status do Dashboard..."
if docker ps --filter "name=dashboard-ui" --filter "health=healthy" | grep -q dashboard-ui; then
    echo "✅ Dashboard is healthy!"
else
    echo "⚠️  Dashboard not healthy, restarting..."
    docker restart dashboard-ui

    # Wait for health check
    echo "Waiting for dashboard to be healthy..."
    for i in {1..30}; do
        if docker ps --filter "name=dashboard-ui" --filter "health=healthy" | grep -q dashboard-ui; then
            echo "✅ Dashboard is healthy!"
            break
        fi
        echo -n "."
        sleep 1
    done
fi

echo ""
echo "3️⃣  Teste rápido da API de canais..."
CHANNELS_COUNT=$(curl -s "http://localhost:3103/api/channels" -H "X-Gateway-Token: gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA" | jq -r '.data | length' || echo "0")

echo "✅ API retornando $CHANNELS_COUNT canais"

echo ""
echo "📋 Instruções para o navegador:"
echo "   1. Abra http://localhost:3103"
echo "   2. Pressione Ctrl+Shift+R (hard refresh)"
echo "   3. Ou abra DevTools (F12) → Application → Clear Storage → Clear site data"
echo "   4. Navegue para a página Telegram Gateway"
echo ""
echo "✅ Dashboard atualizado! Aguardando navegador limpar cache..."
