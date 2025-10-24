#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Status Script
# ==============================================================================
# Shows status of all services
# Usage: bash scripts/universal/status.sh
# ==============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check port
check_port() {
    local port=$1
    local name=$2
    local pid=$(lsof -ti :"$port" 2>/dev/null)
    
    if [ -n "$pid" ]; then
        echo -e "${GREEN}  ✓${NC} ${name} (Port: ${BLUE}${port}${NC}, PID: ${BLUE}${pid}${NC})"
    else
        echo -e "${RED}  ✗${NC} ${name} (Port: ${BLUE}${port}${NC}) - ${RED}NOT RUNNING${NC}"
    fi
}

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  📊 ${CYAN}TradingSystem - Service Status${NC}                     ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Node.js Services:${NC}"
check_port 3103 "Dashboard        "
check_port 3200 "Workspace API    "
check_port 3500 "Status API       "
check_port 4005 "TP-Capital       "
echo ""

echo -e "${CYAN}Docker Containers:${NC}"
CONTAINER_COUNT=$(docker ps -q | wc -l)
if [ "$CONTAINER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}  ✓${NC} ${CONTAINER_COUNT} containers running"
else
    echo -e "${RED}  ✗${NC} No containers running"
fi
echo ""


