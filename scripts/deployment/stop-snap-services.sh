#!/bin/bash
# ==============================================================================
# Stop Snap Services (Ollama)
# ==============================================================================
# Description: Stops and disables snap services that auto-restart
# Usage: sudo bash scripts/deployment/stop-snap-services.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}Stopping Snap Services${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# Stop Ollama snap service
echo -e "${GREEN}[1/2] Stopping snap.ollama.listener...${NC}"
if systemctl is-active --quiet snap.ollama.listener.service; then
    systemctl stop snap.ollama.listener.service
    echo -e "${GREEN}  ✅ Ollama snap service stopped${NC}"
else
    echo -e "  Ollama snap service not running"
fi

echo ""

# Disable auto-start
echo -e "${GREEN}[2/2] Disabling Ollama snap service...${NC}"
if systemctl is-enabled --quiet snap.ollama.listener.service 2>/dev/null; then
    systemctl disable snap.ollama.listener.service
    echo -e "${GREEN}  ✅ Ollama snap service disabled${NC}"
else
    echo -e "  Ollama snap service already disabled or not found"
fi

echo ""
echo "Waiting 3 seconds for port to be released..."
sleep 3

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Verifying Ports${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check port 11434
if ss -tuln | grep -q 11434; then
    echo -e "${RED}❌ Port 11434 still in use${NC}"
    ss -tuln | grep 11434
    echo ""
    echo "Try: sudo snap stop ollama"
else
    echo -e "${GREEN}✅ Port 11434 is FREE${NC}"
fi

echo ""
echo -e "${YELLOW}Note: To permanently prevent Ollama snap from starting:${NC}"
echo "  sudo snap stop ollama"
echo "  sudo snap disable ollama"
echo ""

