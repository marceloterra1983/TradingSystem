#!/bin/bash
# ==============================================================================
# Kill Processes on Ports 6380 and 8202
# ==============================================================================
# Description: MUST BE RUN WITH SUDO - Kills processes on specific ports
# Usage: sudo bash scripts/deployment/kill-ports-6380-8202.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}Killing Processes on Ports 6380 & 8202${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# Port 6380 (Redis)
echo -e "${GREEN}[1/2] Port 6380 (Redis)...${NC}"
PIDS_6380=$(lsof -ti :6380 2>/dev/null || echo "")

if [ -n "$PIDS_6380" ]; then
    echo "  Found PIDs: $PIDS_6380"
    for PID in $PIDS_6380; do
        echo "  Killing PID $PID..."
        kill -9 $PID 2>/dev/null || echo "    Already dead"
    done
    echo -e "${GREEN}  ✅ Killed processes on port 6380${NC}"
else
    echo -e "${GREEN}  ✅ Port 6380 already free${NC}"
fi

echo ""

# Port 8202 (LlamaIndex)
echo -e "${GREEN}[2/2] Port 8202 (LlamaIndex)...${NC}"
PIDS_8202=$(lsof -ti :8202 2>/dev/null || echo "")

if [ -n "$PIDS_8202" ]; then
    echo "  Found PIDs: $PIDS_8202"
    for PID in $PIDS_8202; do
        echo "  Killing PID $PID..."
        kill -9 $PID 2>/dev/null || echo "    Already dead"
    done
    echo -e "${GREEN}  ✅ Killed processes on port 8202${NC}"
else
    echo -e "${GREEN}  ✅ Port 8202 already free${NC}"
fi

echo ""
echo "Waiting 3 seconds..."
sleep 3

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Verifying Ports${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Verify
ALL_FREE=true

if ss -tuln | grep -q 6380; then
    echo -e "${RED}❌ Port 6380 still in use${NC}"
    ss -tuln | grep 6380
    ALL_FREE=false
else
    echo -e "${GREEN}✅ Port 6380 is FREE${NC}"
fi

echo ""

if ss -tuln | grep -q 8202; then
    echo -e "${RED}❌ Port 8202 still in use${NC}"
    ss -tuln | grep 8202
    ALL_FREE=false
else
    echo -e "${GREEN}✅ Port 8202 is FREE${NC}"
fi

echo ""

if [ "$ALL_FREE" = true ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ ALL PORTS FREE! Ready for Docker!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Run: docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}⚠️  Some ports still occupied${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Manual check:"
    echo "  sudo lsof -i :6380"
    echo "  sudo lsof -i :8202"
fi

echo ""

