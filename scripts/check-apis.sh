#!/bin/bash
# Script to check status of all TradingSystem APIs
# Usage: bash scripts/check-apis.sh

echo "╔════════════════════════════════════════════════════════╗"
echo "║  TradingSystem - API Status Check                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check API status
check_api() {
    local name=$1
    local url=$2
    local port=$3

    echo -n "  $name (${port}): "

    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Rodando${NC}"
        return 0
    else
        echo -e "${RED}❌ NÃO está rodando${NC}"
        return 1
    fi
}

# Counter for running services
running=0
total=5

echo "📡 Verificando APIs Backend:"
echo ""

# Workspace API (3200)
if check_api "Workspace API     " "http://localhost:3200/health" "3200"; then
    ((running++))
fi

# Documentation API (3401)
if check_api "Documentation API " "http://localhost:3401/health" "3401"; then
    ((running++))
fi

    ((running++))
fi

echo ""
echo "🌐 Verificando Frontend:"
echo ""

# Dashboard (3103)
if check_api "Dashboard         " "http://localhost:3103" "3103"; then
    ((running++))
fi

# Docusaurus (3400)
if check_api "Docusaurus        " "http://localhost:3400" "3400"; then
    ((running++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $running -eq $total ]; then
    echo -e "${GREEN}✅ Todos os serviços estão rodando! ($running/$total)${NC}"
    echo ""
    echo "🎉 Acesse o dashboard: http://localhost:3103"
elif [ $running -eq 0 ]; then
    echo -e "${RED}❌ Nenhum serviço está rodando! ($running/$total)${NC}"
    echo ""
    echo "⚠️  Execute: bash scripts/start-all-apis.sh"
else
    echo -e "${YELLOW}⚠️  Alguns serviços não estão rodando ($running/$total)${NC}"
    echo ""
    echo "💡 Para iniciar os serviços faltantes:"
    echo ""

    # Check each service and provide start command
    if ! curl -s -f "http://localhost:3200/health" > /dev/null 2>&1; then
        echo "   Workspace API:"
        echo "   cd backend/api/workspace && npm run dev"
        echo ""
    fi

    if ! curl -s -f "http://localhost:3401/health" > /dev/null 2>&1; then
        echo "   Documentation API:"
        echo "   cd backend/api/documentation-api && npm run dev"
        echo ""
    fi

        echo ""
    fi

    if ! curl -s -f "http://localhost:3103" > /dev/null 2>&1; then
        echo "   Dashboard:"
        echo "   cd frontend/dashboard && npm run dev"
        echo ""
    fi

    if ! curl -s -f "http://localhost:3400" > /dev/null 2>&1; then
        echo "   Docusaurus:"
        echo "   cd docs && npm run start -- --port 3400"
        echo ""
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
