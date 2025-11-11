#!/bin/bash
# ==============================================================================
# SUDO: Kill Protected Processes
# ==============================================================================
# Description: MUST BE RUN WITH SUDO - Kills root-owned processes
# Usage: sudo bash scripts/deployment/sudo-kill-processes.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}SUDO: Killing Protected Processes${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# Target PIDs (from ps aux output)
PIDS="523 317149 3152 3787 280386 221"

echo -e "${YELLOW}Killing PIDs: $PIDS${NC}"
echo ""

for PID in $PIDS; do
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${GREEN}Killing PID $PID...${NC}"
        kill -9 $PID 2>/dev/null || echo "  Failed or already dead"
    else
        echo -e "  PID $PID not found (already stopped)"
    fi
done

echo ""
echo "Waiting 3 seconds..."
sleep 3

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Verifying ports are free...${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check ports
if ss -tuln | grep -q 11434; then
    echo -e "${RED}❌ Port 11434 still in use!${NC}"
    ss -tuln | grep 11434
else
    echo -e "${GREEN}✅ Port 11434 is free${NC}"
fi

if ss -tuln | grep -q 6380; then
    echo -e "${RED}❌ Port 6380 still in use!${NC}"
    ss -tuln | grep 6380
else
    echo -e "${GREEN}✅ Port 6380 is free${NC}"
fi

if ss -tuln | grep -q 8202; then
    echo -e "${RED}❌ Port 8202 still in use!${NC}"
    ss -tuln | grep 8202
else
    echo -e "${GREEN}✅ Port 8202 is free${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Done! Now run Docker containers${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  cd /home/marce/Projetos/TradingSystem"
echo "  docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d"
echo ""

