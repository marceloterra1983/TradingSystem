#!/usr/bin/env bash
set -euo pipefail

# Colors
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   WebScraper API - Force Restart${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Create PID directory
mkdir -p /tmp/tradingsystem-pids
mkdir -p /tmp/tradingsystem-logs

# 2. Kill existing process on port 3700
echo -e "${BLUE}[1/4]${NC} Freeing port 3700..."
if lsof -ti:3700 >/dev/null 2>&1; then
    PID=$(lsof -ti:3700)
    PROCESS=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")
    echo -e "      ${YELLOW}→${NC} Killing process: $PROCESS (PID: $PID)"
    kill -9 "$PID" 2>/dev/null || true
    sleep 2
    
    if lsof -ti:3700 >/dev/null 2>&1; then
        echo -e "      ${RED}✗${NC} Failed to free port"
        exit 1
    fi
    echo -e "      ${GREEN}✓${NC} Port 3700 freed"
else
    echo -e "      ${GREEN}✓${NC} Port 3700 already free"
fi

# 3. Remove old PID file
echo ""
echo -e "${BLUE}[2/4]${NC} Cleaning up old PID file..."
rm -f /tmp/tradingsystem-pids/webscraper-api.pid
echo -e "      ${GREEN}✓${NC} Cleanup complete"

# 4. Start service
echo ""
echo -e "${BLUE}[3/4]${NC} Starting WebScraper API..."

cd /home/marce/projetos/TradingSystem/backend/api/webscraper-api

# Load environment
if [ -f ../../../.env ]; then
    set -a
    source ../../../.env
    set +a
fi

# Start in background
npm run dev > /tmp/tradingsystem-logs/webscraper-api.log 2>&1 &
SERVICE_PID=$!
echo "$SERVICE_PID" > /tmp/tradingsystem-pids/webscraper-api.pid

echo -e "      ${GREEN}✓${NC} Service launched (PID: $SERVICE_PID)"

# 5. Wait for port
echo ""
echo -e "${BLUE}[4/4]${NC} Waiting for port 3700..."

MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if lsof -ti:3700 >/dev/null 2>&1; then
        echo -e "      ${GREEN}✓${NC} Port 3700 is listening"
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}   ✓ WebScraper API started successfully!${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "  ${BLUE}URL:${NC}  http://localhost:3700"
        echo -e "  ${BLUE}PID:${NC}  $SERVICE_PID"
        echo -e "  ${BLUE}Logs:${NC} /tmp/tradingsystem-logs/webscraper-api.log"
        echo ""
        echo -e "${YELLOW}Next Steps:${NC}"
        echo -e "  ${GREEN}status-quick${NC}  - Verify all services are running"
        echo -e "  ${GREEN}tail -f /tmp/tradingsystem-logs/webscraper-api.log${NC}  - Monitor logs"
        echo ""
        exit 0
    fi
    
    # Check if process died
    if ! ps -p "$SERVICE_PID" >/dev/null 2>&1; then
        echo -e "      ${RED}✗${NC} Service crashed during startup"
        echo ""
        echo -e "${RED}Last 20 lines of log:${NC}"
        tail -n 20 /tmp/tradingsystem-logs/webscraper-api.log 2>/dev/null || echo "No logs available"
        exit 1
    fi
    
    sleep 1
    WAITED=$((WAITED + 1))
    
    # Show progress every 5 seconds
    if [ $((WAITED % 5)) -eq 0 ]; then
        echo -e "      ${YELLOW}→${NC} Still waiting... ($WAITED/${MAX_WAIT}s)"
    fi
done

# Timeout
echo -e "      ${RED}✗${NC} Timeout waiting for port 3700"
echo ""
echo -e "${RED}Service status:${NC}"
if ps -p "$SERVICE_PID" >/dev/null 2>&1; then
    echo -e "  Process: ${GREEN}ALIVE${NC} (PID: $SERVICE_PID)"
    echo -e "  Port: ${RED}NOT LISTENING${NC}"
else
    echo -e "  Process: ${RED}DEAD${NC}"
fi

echo ""
echo -e "${YELLOW}Last 30 lines of log:${NC}"
tail -n 30 /tmp/tradingsystem-logs/webscraper-api.log 2>/dev/null || echo "No logs available"

exit 1
