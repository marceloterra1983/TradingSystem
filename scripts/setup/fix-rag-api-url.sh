#!/bin/bash
# Fix RAG API URL in .env
# The documentation-api (port 3401) has the /api/v1/rag/status endpoint
# The rag-collections-service (port 3403) is only an auxiliary service

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
ENV_FILE="$PROJECT_ROOT/.env"

echo "🔧 Fixing RAG API URL configuration..."
echo ""

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found at $ENV_FILE"
    exit 1
fi

# Backup .env
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created: $ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# Update VITE_API_BASE_URL to point to documentation-api (port 3401)
if grep -q "^VITE_API_BASE_URL=" "$ENV_FILE"; then
    sed -i 's|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://localhost:3401|' "$ENV_FILE"
    echo "✅ Updated existing VITE_API_BASE_URL to http://localhost:3401"
else
    echo "VITE_API_BASE_URL=http://localhost:3401" >> "$ENV_FILE"
    echo "✅ Added VITE_API_BASE_URL=http://localhost:3401"
fi

echo ""
echo "📊 Current configuration:"
grep "VITE_API_BASE_URL" "$ENV_FILE"
echo ""

echo "✅ Configuration fixed!"
echo ""
echo "⚠️  IMPORTANTE: Você precisa reiniciar o dashboard para aplicar as mudanças:"
echo "   1. Pare o dashboard (Ctrl+C no terminal onde está rodando)"
echo "   2. Execute: cd frontend/dashboard && npm run dev"
echo ""
echo "   Ou use o comando universal:"
echo "   stop-services && start-services"

