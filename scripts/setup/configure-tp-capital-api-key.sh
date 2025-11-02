#!/bin/bash

# ============================================================================
# Configure TP Capital API Key
# ============================================================================
# This script adds TP_CAPITAL_API_KEY to the root .env file
# ============================================================================

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
ENV_FILE="$PROJECT_ROOT/.env"
FRONTEND_ENV="$PROJECT_ROOT/frontend/dashboard/.env.local"

# Generated API Key (64 characters)
API_KEY="bbf913dad93ae879f1fbbec4490303a2c0d49be1d717342a64173a192f99f1a1"

echo "=================================================="
echo "TP Capital API Key Configuration"
echo "=================================================="
echo ""

# ============================================================================
# 1. Add to root .env
# ============================================================================
echo "1. Configurando root .env..."

if [ ! -f "$ENV_FILE" ]; then
    echo "   ❌ Arquivo .env não encontrado em $PROJECT_ROOT"
    echo "   Criando .env..."
    touch "$ENV_FILE"
fi

# Check if key already exists
if grep -q "^TP_CAPITAL_API_KEY=" "$ENV_FILE" 2>/dev/null; then
    echo "   ⚠️  TP_CAPITAL_API_KEY já existe no .env"
    echo "   Atualizando valor..."
    sed -i "s/^TP_CAPITAL_API_KEY=.*/TP_CAPITAL_API_KEY=$API_KEY/" "$ENV_FILE"
else
    echo "   ✅ Adicionando TP_CAPITAL_API_KEY ao .env"
    echo "" >> "$ENV_FILE"
    echo "# TP Capital API Key (Auto-generated $(date +%Y-%m-%d))" >> "$ENV_FILE"
    echo "TP_CAPITAL_API_KEY=$API_KEY" >> "$ENV_FILE"
fi

echo "   ✅ Root .env configurado"
echo ""

# ============================================================================
# 2. Add to frontend .env.local
# ============================================================================
echo "2. Configurando frontend .env.local..."

# Create frontend .env.local if doesn't exist
if [ ! -f "$FRONTEND_ENV" ]; then
    echo "   Criando $FRONTEND_ENV..."
    touch "$FRONTEND_ENV"
fi

# Check if key already exists
if grep -q "^VITE_TP_CAPITAL_API_KEY=" "$FRONTEND_ENV" 2>/dev/null; then
    echo "   ⚠️  VITE_TP_CAPITAL_API_KEY já existe"
    echo "   Atualizando valor..."
    sed -i "s/^VITE_TP_CAPITAL_API_KEY=.*/VITE_TP_CAPITAL_API_KEY=$API_KEY/" "$FRONTEND_ENV"
else
    echo "   ✅ Adicionando VITE_TP_CAPITAL_API_KEY"
    echo "" >> "$FRONTEND_ENV"
    echo "# TP Capital API Key (Auto-generated $(date +%Y-%m-%d))" >> "$FRONTEND_ENV"
    echo "VITE_TP_CAPITAL_API_KEY=$API_KEY" >> "$FRONTEND_ENV"
fi

echo "   ✅ Frontend .env.local configurado"
echo ""

# ============================================================================
# 3. Display confirmation
# ============================================================================
echo "=================================================="
echo "✅ Configuração Completa!"
echo "=================================================="
echo ""
echo "API Key gerada e configurada:"
echo "  🔑 $API_KEY"
echo ""
echo "Arquivos atualizados:"
echo "  ✅ $ENV_FILE (TP_CAPITAL_API_KEY)"
echo "  ✅ $FRONTEND_ENV (VITE_TP_CAPITAL_API_KEY)"
echo ""
echo "Próximos passos:"
echo "  1. Reiniciar TP Capital: cd apps/tp-capital && npm run dev"
echo "  2. Reiniciar Dashboard: cd frontend/dashboard && npm run dev"
echo "  3. Testar: npm run test:unit"
echo ""
echo "Testar autenticação:"
echo "  # ❌ Sem API Key (401)"
echo "  curl -X POST http://localhost:4005/sync-messages"
echo ""
echo "  # ✅ Com API Key (200)"
echo "  curl -X POST -H 'X-API-Key: $API_KEY' http://localhost:4005/sync-messages"
echo ""
echo "=================================================="

