#!/usr/bin/env bash
# ============================================================================
# Fix Port 3700 Conflict - Kill Process Using Port
# ============================================================================

set -euo pipefail

PORT=3700

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Fixing Port $PORT Conflict${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if lsof is available
if ! command -v lsof &> /dev/null; then
    echo -e "${YELLOW}!${NC} lsof not found, trying netstat..."
    
    # Try netstat
    PID=$(netstat -tulpn 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1 | head -1)
else
    # Use lsof
    PID=$(lsof -ti:$PORT 2>/dev/null | head -1)
fi

if [ -z "$PID" ]; then
    echo -e "${GREEN}✓${NC} Port $PORT is free (no process found)"
    echo ""
    echo -e "${BLUE}You can now start the service:${NC}"
    echo -e "  cd backend/api/webscraper-api"
    echo -e "  npm run dev"
    exit 0
fi

# Get process info
PROCESS_NAME=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")
PROCESS_CMD=$(ps -p "$PID" -o args= 2>/dev/null || echo "unknown")

echo -e "${YELLOW}!${NC} Port $PORT is in use"
echo ""
echo -e "  PID:     ${CYAN}$PID${NC}"
echo -e "  Process: ${CYAN}$PROCESS_NAME${NC}"
echo -e "  Command: ${CYAN}${PROCESS_CMD:0:80}${NC}"
echo ""

# Ask for confirmation
read -p "Kill this process? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}→${NC} Killing process $PID..."
    
    # Try graceful kill first
    if kill "$PID" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Sent SIGTERM to process $PID"
        
        # Wait up to 5 seconds
        for i in {1..5}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} Process terminated gracefully"
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${YELLOW}!${NC} Process still running, forcing kill..."
            kill -9 "$PID" 2>/dev/null || true
            sleep 1
        fi
    else
        echo -e "${RED}✗${NC} Failed to kill process (may need sudo)"
        echo ""
        echo -e "${YELLOW}Try manually:${NC}"
        echo -e "  sudo kill -9 $PID"
        exit 1
    fi
    
    # Verify port is free
    sleep 1
    if command -v lsof &> /dev/null; then
        NEW_PID=$(lsof -ti:$PORT 2>/dev/null | head -1)
    else
        NEW_PID=$(netstat -tulpn 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1 | head -1)
    fi
    
    if [ -z "$NEW_PID" ]; then
        echo -e "${GREEN}✓${NC} Port $PORT is now free!"
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✓ Success - Port Cleared${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${YELLOW}Next step:${NC}"
        echo -e "  cd backend/api/webscraper-api && npm run dev"
        echo ""
    else
        echo -e "${RED}✗${NC} Port still in use by PID $NEW_PID"
        echo -e "${YELLOW}Try manually:${NC}"
        echo -e "  sudo kill -9 $NEW_PID"
        exit 1
    fi
else
    echo ""
    echo -e "${YELLOW}Cancelled.${NC} Process not killed."
    echo ""
    echo -e "${BLUE}Alternatives:${NC}"
    echo -e "  1. Change port in .env: ${CYAN}WEBSCRAPER_API_PORT=3701${NC}"
    echo -e "  2. Kill manually: ${CYAN}kill -9 $PID${NC}"
    echo ""
    exit 0
fi
