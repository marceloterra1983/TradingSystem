#!/usr/bin/env bash
# Restart Dashboard with TP Capital API Key loaded

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DASHBOARD_DIR="$PROJECT_ROOT/frontend/dashboard"
DASHBOARD_PORT="${DASHBOARD_PORT:-9080}"
LEGACY_DASHBOARD_PORT=3103

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Reiniciando Dashboard com API Key do TP Capital     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify .env.local exists
if [ ! -f "$DASHBOARD_DIR/.env.local" ]; then
    echo -e "${RED}✗ Arquivo .env.local não encontrado!${NC}"
    echo -e "${YELLOW}   Esperado em: $DASHBOARD_DIR/.env.local${NC}"
    exit 1
fi

# Check if VITE_TP_CAPITAL_API_KEY is configured
if ! grep -q "^VITE_TP_CAPITAL_API_KEY=" "$DASHBOARD_DIR/.env.local"; then
    echo -e "${RED}✗ VITE_TP_CAPITAL_API_KEY não encontrado no .env.local!${NC}"
    
    # Get API Key from root .env
    if [ -f "$PROJECT_ROOT/.env" ]; then
        API_KEY=$(grep "^TP_CAPITAL_API_KEY=" "$PROJECT_ROOT/.env" | cut -d '=' -f 2)
        
        if [ -n "$API_KEY" ]; then
            echo -e "${YELLOW}   Adicionando VITE_TP_CAPITAL_API_KEY ao .env.local...${NC}"
            echo "" >> "$DASHBOARD_DIR/.env.local"
            echo "# TP Capital API Key (Auto-added $(date +%Y-%m-%d))" >> "$DASHBOARD_DIR/.env.local"
            echo "VITE_TP_CAPITAL_API_KEY=$API_KEY" >> "$DASHBOARD_DIR/.env.local"
            echo -e "${GREEN}✓ API Key adicionada!${NC}"
        else
            echo -e "${RED}✗ TP_CAPITAL_API_KEY não encontrado no .env raiz!${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Arquivo .env raiz não encontrado!${NC}"
        exit 1
    fi
fi

# Display current configuration
echo -e "${BLUE}Configuração atual:${NC}"
echo -e "  ${GREEN}✓${NC} .env.local: $(ls -lh "$DASHBOARD_DIR/.env.local" | awk '{print $9, "("$5")"}')"
echo -e "  ${GREEN}✓${NC} API Key: $(grep "^VITE_TP_CAPITAL_API_KEY=" "$DASHBOARD_DIR/.env.local" | cut -d '=' -f 2 | cut -c1-20)...$(grep "^VITE_TP_CAPITAL_API_KEY=" "$DASHBOARD_DIR/.env.local" | cut -d '=' -f 2 | tail -c 10)"
echo ""

# Kill existing Dashboard process
DASHBOARD_PID=$(lsof -ti:"${DASHBOARD_PORT}" 2>/dev/null || true)
if [ -z "$DASHBOARD_PID" ]; then
    DASHBOARD_PID=$(lsof -ti:"${LEGACY_DASHBOARD_PORT}" 2>/dev/null || true)
fi

if [ -n "$DASHBOARD_PID" ]; then
    echo -e "${YELLOW}⚠ Parando Dashboard existente (PID: $DASHBOARD_PID)...${NC}"
    kill -15 $DASHBOARD_PID 2>/dev/null || true
    
    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! lsof -ti:"${DASHBOARD_PORT}" >/dev/null 2>&1 && ! lsof -ti:"${LEGACY_DASHBOARD_PORT}" >/dev/null 2>&1; then
            break
        fi
        sleep 0.5
    done
    
    # Force kill if still running
    if lsof -ti:"${DASHBOARD_PORT}" >/dev/null 2>&1 || lsof -ti:"${LEGACY_DASHBOARD_PORT}" >/dev/null 2>&1; then
        echo -e "${RED}   Forçando parada...${NC}"
        kill -9 $(lsof -ti:"${DASHBOARD_PORT}") 2>/dev/null || true
        kill -9 $(lsof -ti:"${LEGACY_DASHBOARD_PORT}") 2>/dev/null || true
        sleep 1
    fi
    
    echo -e "${GREEN}✓ Dashboard parado${NC}"
else
    echo -e "${YELLOW}⚠ Dashboard não está rodando${NC}"
fi

# Start Dashboard
echo ""
echo -e "${BLUE}Iniciando Dashboard...${NC}"
cd "$DASHBOARD_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules não encontrado. Instalando dependências...${NC}"
    npm install
fi

# Start in background
echo -e "${GREEN}✓ Iniciando servidor de desenvolvimento...${NC}"
nohup npm run dev > "$PROJECT_ROOT/logs/dashboard-dev.log" 2>&1 &
DASHBOARD_NEW_PID=$!

# Wait for startup
echo -e "${YELLOW}   Aguardando inicialização...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:${DASHBOARD_PORT} > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Dashboard iniciado com sucesso!${NC}"
        echo -e "  ${BLUE}PID:${NC} $DASHBOARD_NEW_PID"
        echo -e "  ${BLUE}URL:${NC} http://localhost:${DASHBOARD_PORT}"
        echo ""
        
        # Display logs location
        echo -e "${BLUE}Logs:${NC}"
        echo -e "  tail -f $PROJECT_ROOT/logs/dashboard-dev.log"
        echo ""
        
        # Verify TP Capital API health
        echo -e "${BLUE}Verificando TP Capital API...${NC}"
        TP_HEALTH=$(curl -s http://localhost:4005/health | jq -r '.status' 2>/dev/null || echo "unknown")
        
        if [ "$TP_HEALTH" = "healthy" ]; then
            echo -e "  ${GREEN}✓${NC} TP Capital API está saudável (porta 4005)"
        else
            echo -e "  ${YELLOW}⚠${NC} TP Capital API: $TP_HEALTH (porta 4005)"
        fi
        
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   Dashboard reiniciado com sucesso!                    ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${BLUE}Próximos passos:${NC}"
        echo -e "  1. Abra http://localhost:${DASHBOARD_PORT} no navegador"
        echo -e "  2. Navegue até a página TP Capital"
        echo -e "  3. Clique em 'Checar Mensagens'"
        echo -e "  4. Verifique que NÃO aparece mais o erro de API Key!"
        echo ""
        
        exit 0
    fi
    sleep 1
done

# Startup failed
echo -e "${RED}✗ Dashboard não iniciou após 30 segundos${NC}"
echo -e "${YELLOW}   Verifique os logs em: $PROJECT_ROOT/logs/dashboard-dev.log${NC}"
exit 1

