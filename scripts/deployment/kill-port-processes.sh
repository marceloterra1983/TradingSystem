#!/bin/bash
# ==============================================================================
# Kill Processes Using RAG Ports
# ==============================================================================
# Description: Force kills processes on ports 6380, 11434
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Force Killing Port Processes${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Port 6380 (Redis)
echo -e "${GREEN}[1/2] Killing process on port 6380...${NC}"
fuser -k 6380/tcp 2>/dev/null || echo "  No process found or already killed"
sleep 1

# Port 11434 (Ollama)
echo -e "${GREEN}[2/2] Killing process on port 11434...${NC}"
fuser -k 11434/tcp 2>/dev/null || echo "  No process found or already killed"
sleep 1

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Ports should be free now!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Verify
echo "Verifying ports..."
ss -tuln | grep -E "(6380|11434)" || echo "✅ All ports free!"
echo ""

