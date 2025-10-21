#!/usr/bin/env bash
set -euo pipefail

# Colors
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

echo -e "${BLUE}[WebScraper Port Fix]${NC} Resolving port 3700 conflict..."
echo ""

# 1. Create PID directory if missing
if [ ! -d "/tmp/tradingsystem-pids" ]; then
    echo -e "${YELLOW}[INFO]${NC} Creating PID directory..."
    mkdir -p /tmp/tradingsystem-pids
    echo -e "${GREEN}✓${NC} PID directory created"
else
    echo -e "${GREEN}✓${NC} PID directory exists"
fi

# 2. Check if port 3700 is in use
echo ""
echo -e "${BLUE}[Port Check]${NC} Checking port 3700..."
if lsof -ti:3700 >/dev/null 2>&1; then
    PID=$(lsof -ti:3700)
    PROCESS=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")
    echo -e "${YELLOW}[WARNING]${NC} Port 3700 is occupied by PID $PID ($PROCESS)"
    
    # Ask for confirmation to kill
    echo ""
    echo -e "${YELLOW}[ACTION REQUIRED]${NC} Kill process $PID to free port 3700?"
    echo -e "  Process: ${YELLOW}$PROCESS${NC} (PID: $PID)"
    read -p "  Kill? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}[Killing]${NC} Stopping PID $PID..."
        kill -9 "$PID" 2>/dev/null || true
        sleep 1
        
        if lsof -ti:3700 >/dev/null 2>&1; then
            echo -e "${RED}✗${NC} Failed to free port 3700"
            exit 1
        else
            echo -e "${GREEN}✓${NC} Port 3700 freed"
        fi
    else
        echo -e "${RED}✗${NC} Operation cancelled"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Port 3700 is free"
fi

# 3. Check database connection
echo ""
echo -e "${BLUE}[Database Check]${NC} Verifying PostgreSQL connection..."
if docker exec data-frontend-apps pg_isready -U app_webscraper -d frontend_apps >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database is ready"
else
    echo -e "${YELLOW}[WARNING]${NC} Database connection check failed (this may be normal)"
fi

# 4. Start WebScraper API
echo ""
echo -e "${BLUE}[Starting]${NC} Launching WebScraper API on port 3700..."

cd /home/marce/projetos/TradingSystem/backend/api/webscraper-api

# Load environment
if [ -f ../../../.env ]; then
    set -a
    source ../../../.env
    set +a
fi

# Start service in background
npm run dev > /tmp/tradingsystem-logs/webscraper-api.log 2>&1 &
SERVICE_PID=$!
echo "$SERVICE_PID" > /tmp/tradingsystem-pids/webscraper-api.pid

# Wait for port to be listening
echo -e "${BLUE}[Waiting]${NC} Waiting for port 3700 to be ready..."
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if lsof -ti:3700 >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} WebScraper API is listening on port 3700"
        echo ""
        echo -e "${GREEN}[SUCCESS]${NC} WebScraper API started successfully!"
        echo -e "  ${BLUE}PID:${NC} $SERVICE_PID"
        echo -e "  ${BLUE}Port:${NC} 3700"
        echo -e "  ${BLUE}Logs:${NC} /tmp/tradingsystem-logs/webscraper-api.log"
        echo ""
        echo -e "${BLUE}[Next Steps]${NC}"
        echo -e "  ${GREEN}status-quick${NC}     - Verify all services"
        echo -e "  ${GREEN}tail -f /tmp/tradingsystem-logs/webscraper-api.log${NC} - Monitor logs"
        exit 0
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

# Timeout - check if process is still alive
if ps -p "$SERVICE_PID" >/dev/null 2>&1; then
    echo -e "${YELLOW}[WARNING]${NC} Service is running but port 3700 not detected yet"
    echo -e "  Check logs: ${BLUE}tail -f /tmp/tradingsystem-logs/webscraper-api.log${NC}"
    exit 1
else
    echo -e "${RED}✗${NC} Service failed to start"
    echo -e "  Check logs: ${BLUE}tail -f /tmp/tradingsystem-logs/webscraper-api.log${NC}"
    exit 1
fi
