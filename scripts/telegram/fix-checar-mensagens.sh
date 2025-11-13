#!/bin/bash
# ==============================================================================
# TradingSystem - Fix "Checar Mensagens" Button
# ==============================================================================
# Resolve todos os problemas relacionados ao botão "Checar Mensagens"
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DASHBOARD_PORT="${DASHBOARD_PORT:-9080}"
LEGACY_DASHBOARD_PORT=3103
cd "$PROJECT_ROOT"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🔧 ${BOLD}Fix 'Checar Mensagens' Button${NC}                       ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================================================
# Problem 1: Telegram Gateway stuck waiting for authentication code
# ==============================================================================

echo -e "${YELLOW}━━━ Problem 1: Telegram Gateway Authentication ━━━${NC}"
echo ""

echo -e "${CYAN}The Telegram Gateway API is waiting for interactive authentication.${NC}"
echo -e "${CYAN}This blocks the /sync-messages endpoint from responding.${NC}"
echo ""

echo -e "${YELLOW}⚠️  This requires manual intervention:${NC}"
echo ""
echo -e "1. ${BOLD}Check if Telegram Gateway API (4010) needs authentication:${NC}"
echo -e "   ${BLUE}tail -f /tmp/tradingsystem-logs/telegram-gateway-api-$(date +%Y%m%d).log${NC}"
echo ""
echo -e "2. ${BOLD}If you see 'Please enter the code you received':${NC}"
echo -e "   ${CYAN}• Check your Telegram app for the code${NC}"
echo -e "   ${CYAN}• Enter the code in the terminal where the service is running${NC}"
echo -e "   ${CYAN}• Or stop and restart the service to skip authentication${NC}"
echo ""
echo -e "3. ${BOLD}To restart without authentication (recommended for now):${NC}"
echo -e "   ${BLUE}pkill -f telegram-gateway-api${NC}"
echo -e "   ${BLUE}cd backend/api/telegram-gateway && npm run dev${NC}"
echo ""

# Check if service is running
if lsof -i :4010 -sTCP:LISTEN >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Telegram Gateway API is listening on port 4010${NC}"
else
    echo -e "${RED}✗ Telegram Gateway API is NOT running on port 4010${NC}"
    echo -e "${CYAN}  Starting service...${NC}"
    
    cd "$PROJECT_ROOT/backend/api/telegram-gateway"
    nohup npm run dev > /tmp/tradingsystem-logs/telegram-gateway-api-$(date +%Y%m%d).log 2>&1 &
    NEW_PID=$!
    echo "$NEW_PID" > /tmp/tradingsystem-logs/telegram-gateway-api.pid
    
    echo -e "${GREEN}✓ Service started (PID: $NEW_PID)${NC}"
    
    echo -e "${CYAN}Waiting 5 seconds...${NC}"
    sleep 5
fi

echo ""

# ==============================================================================
# Problem 2: Frontend not sending X-API-Key header
# ==============================================================================

echo -e "${YELLOW}━━━ Problem 2: Frontend API Key Configuration ━━━${NC}"
echo ""

# Check if VITE_TP_CAPITAL_API_KEY exists in .env
if grep -q "^VITE_TP_CAPITAL_API_KEY=" .env; then
    echo -e "${GREEN}✓ VITE_TP_CAPITAL_API_KEY found in .env${NC}"
else
    echo -e "${YELLOW}⚠ VITE_TP_CAPITAL_API_KEY missing, adding...${NC}"
    
    # Get the backend API key
    BACKEND_KEY=$(grep "^TP_CAPITAL_API_KEY=" .env | cut -d'=' -f2)
    
    if [ -n "$BACKEND_KEY" ]; then
        # Add VITE_ version
        sed -i "/^TP_CAPITAL_API_KEY=/a# Frontend API Key (Vite requires VITE_ prefix)\nVITE_TP_CAPITAL_API_KEY=$BACKEND_KEY" .env
        echo -e "${GREEN}✓ VITE_TP_CAPITAL_API_KEY added to .env${NC}"
    else
        echo -e "${RED}✗ TP_CAPITAL_API_KEY not found in .env${NC}"
        echo -e "${CYAN}  Generate one with: openssl rand -hex 32${NC}"
    fi
fi

# Restart Dashboard to load new env vars
echo ""
echo -e "${CYAN}Restarting Dashboard to load updated environment...${NC}"

# Stop Dashboard
DASHBOARD_PID=$(lsof -ti :"${DASHBOARD_PORT}" 2>/dev/null | head -1)
if [ -z "$DASHBOARD_PID" ]; then
    DASHBOARD_PID=$(lsof -ti :"${LEGACY_DASHBOARD_PORT}" 2>/dev/null | head -1)
fi
if [ -n "$DASHBOARD_PID" ]; then
    echo -e "${YELLOW}Stopping Dashboard (PID: $DASHBOARD_PID)...${NC}"
    kill "$DASHBOARD_PID" 2>/dev/null || true
    sleep 2
    
    # Force kill if needed
    if kill -0 "$DASHBOARD_PID" 2>/dev/null; then
        kill -9 "$DASHBOARD_PID" 2>/dev/null || true
        sleep 1
    fi
fi

# Start Dashboard
cd "$PROJECT_ROOT/frontend/dashboard"
nohup npm run dev > /tmp/tradingsystem-logs/dashboard-$(date +%Y%m%d).log 2>&1 &
NEW_DASHBOARD_PID=$!
echo "$NEW_DASHBOARD_PID" > /tmp/tradingsystem-logs/dashboard.pid

echo -e "${GREEN}✓ Dashboard restarted (PID: $NEW_DASHBOARD_PID)${NC}"

# Wait for Dashboard
echo -e "${CYAN}Waiting for Dashboard to be ready...${NC}"
waited=0
while [ $waited -lt 20 ]; do
    if curl -sf --max-time 2 "http://localhost:${DASHBOARD_PORT}" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Dashboard is responding${NC}"
        break
    fi
    sleep 2
    waited=$((waited + 2))
    echo -n "."
done
echo ""

echo ""

# ==============================================================================
# Final Instructions
# ==============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  📋 ${BOLD}Next Steps${NC}                                           ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}1. Clear browser cache:${NC}"
echo -e "   • Press ${BLUE}Ctrl+Shift+R${NC} (Windows/Linux) or ${BLUE}Cmd+Shift+R${NC} (Mac)"
echo -e "   • Or go to DevTools → Network → Disable cache"
echo ""

echo -e "${BOLD}2. Open Dashboard:${NC}"
echo -e "   • ${BLUE}http://localhost:${DASHBOARD_PORT}${NC}"
echo -e "   • Navigate to ${CYAN}TP Capital${NC} page"
echo ""

echo -e "${BOLD}3. Click 'Checar Mensagens' button${NC}"
echo ""

echo -e "${YELLOW}⚠️  If Telegram Gateway is still asking for auth code:${NC}"
echo -e "   • The button will timeout (15+ seconds)"
echo -e "   • You need to authenticate the Telegram session first"
echo -e "   • See logs: ${BLUE}tail -f /tmp/tradingsystem-logs/telegram-gateway-api-*.log${NC}"
echo ""

echo -e "${CYAN}Expected behavior:${NC}"
echo -e "  ✅ Button sends X-API-Key header"
echo -e "  ✅ TP Capital accepts the request"
echo -e "  ✅ TP Capital calls Telegram Gateway with X-API-Key"
echo -e "  ⚠️  Telegram Gateway may ask for phone code (first time)"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ✅ ${BOLD}Configuration Updated!${NC}                               ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

