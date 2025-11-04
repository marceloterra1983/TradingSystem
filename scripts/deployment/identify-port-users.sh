#!/bin/bash
# ==============================================================================
# Identify Port Users
# ==============================================================================
# Description: Shows which processes are using RAG ports
# Usage: sudo bash scripts/deployment/identify-port-users.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Identifying Port Users${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Port 11434 (Ollama)
echo -e "${GREEN}[1/3] Port 11434 (Ollama):${NC}"
if lsof -i :11434 2>/dev/null | grep -v COMMAND; then
    echo ""
else
    echo -e "${YELLOW}  No process found (port is free)${NC}"
fi

echo ""

# Port 6380 (Redis)
echo -e "${GREEN}[2/3] Port 6380 (Redis):${NC}"
if lsof -i :6380 2>/dev/null | grep -v COMMAND; then
    echo ""
else
    echo -e "${YELLOW}  No process found (port is free)${NC}"
fi

echo ""

# Port 8202 (LlamaIndex Query)
echo -e "${GREEN}[3/3] Port 8202 (LlamaIndex):${NC}"
if lsof -i :8202 2>/dev/null | grep -v COMMAND; then
    echo ""
else
    echo -e "${YELLOW}  No process found (port is free)${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Systemd services:"
systemctl list-units --type=service --state=running | grep -E "(ollama|redis|llamaindex)" || echo "  None found"

echo ""
echo "Snap services:"
snap services | grep -E "(ollama|redis)" || echo "  None found"

echo ""

