#!/bin/bash
# ==============================================================================
# TradingSystem - Restart Dashboard
# ==============================================================================
# Reinicia o Dashboard para carregar novas variáveis de ambiente
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES_DIR="${LOG_DIR:-/tmp/tradingsystem-logs}"
PID_FILE="$SERVICES_DIR/dashboard.pid"
DASHBOARD_PORT="${DASHBOARD_PORT:-9080}"
LEGACY_DASHBOARD_PORT=3103

cd "$PROJECT_ROOT"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🔄 ${BLUE}Restart Dashboard${NC}                                    ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Dashboard is running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo -e "${YELLOW}Stopping Dashboard (PID: $OLD_PID)...${NC}"
        kill "$OLD_PID" 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        if kill -0 "$OLD_PID" 2>/dev/null; then
            echo -e "${YELLOW}Force killing Dashboard...${NC}"
            kill -9 "$OLD_PID" 2>/dev/null || true
            sleep 1
        fi
        
        echo -e "${GREEN}✓ Dashboard stopped${NC}"
    fi
    
    rm -f "$PID_FILE"
fi

# Check current dashboard port
PORT_PID=$(lsof -ti :"${DASHBOARD_PORT}" 2>/dev/null || echo "")
if [ -n "$PORT_PID" ]; then
    echo -e "${YELLOW}Port ${DASHBOARD_PORT} is occupied by PID: $PORT_PID${NC}"
    echo -e "${YELLOW}Killing process on port ${DASHBOARD_PORT}...${NC}"
    kill -9 "$PORT_PID" 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ Port ${DASHBOARD_PORT} freed${NC}"
fi

# Clean legacy port if still in use
LEGACY_PID=$(lsof -ti :"${LEGACY_DASHBOARD_PORT}" 2>/dev/null || echo "")
if [ -n "$LEGACY_PID" ]; then
    echo -e "${YELLOW}Legacy port ${LEGACY_DASHBOARD_PORT} ainda está em uso (PID: $LEGACY_PID). Encerrando...${NC}"
    kill -9 "$LEGACY_PID" 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ Legacy port ${LEGACY_DASHBOARD_PORT} freed${NC}"
fi

echo ""
echo -e "${CYAN}Starting Dashboard with updated environment...${NC}"

# Navigate to dashboard directory
cd "$PROJECT_ROOT/frontend/dashboard"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}Installing dependencies...${NC}"
    npm install --silent
fi

# Start Dashboard in background
LOG_FILE="$SERVICES_DIR/dashboard-$(date +%Y%m%d).log"
nohup npm run dev > "$LOG_FILE" 2>&1 &
NEW_PID=$!

# Save PID
echo "$NEW_PID" > "$PID_FILE"

echo -e "${GREEN}✓ Dashboard started (PID: $NEW_PID)${NC}"
echo ""

# Wait for dashboard to be available
echo -e "${CYAN}Waiting for Dashboard to be available (max 30s)...${NC}"
waited=0
while [ $waited -lt 30 ]; do
    if curl -sf --max-time 2 "http://localhost:${DASHBOARD_PORT}" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Dashboard is responding!${NC}"
        echo ""
        echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║${NC}  ✅ ${GREEN}Dashboard Restarted Successfully!${NC}                  ${CYAN}║${NC}"
        echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "  🌐 Dashboard: ${BLUE}http://localhost:${DASHBOARD_PORT}${NC}"
        echo -e "  📄 Logs:      ${BLUE}$LOG_FILE${NC}"
        echo ""
        echo -e "${CYAN}The 'Checar Mensagens' button should now work!${NC}"
        echo -e "${CYAN}The X-API-Key header is now being sent with requests.${NC}"
        echo ""
        exit 0
    fi
    
    sleep 2
    waited=$((waited + 2))
    echo -n "."
done

echo ""
echo -e "${YELLOW}⚠ Dashboard may still be starting${NC}"
echo -e "${CYAN}Check logs: tail -f $LOG_FILE${NC}"
echo ""

