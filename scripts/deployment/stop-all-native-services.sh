#!/bin/bash
# ==============================================================================
# Stop ALL Native Services (Ollama + LlamaIndex + Redis)
# ==============================================================================
# Description: Kills all native processes that conflict with Docker containers
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Stopping ALL Native RAG Services${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${GREEN}[1/3] Stopping Ollama processes...${NC}"
pkill -9 ollama 2>/dev/null || echo "  No Ollama processes found"

echo ""
echo -e "${GREEN}[2/3] Stopping LlamaIndex/uvicorn processes...${NC}"
pkill -9 uvicorn 2>/dev/null || echo "  No uvicorn processes found"
pkill -9 python3 2>/dev/null || echo "  No python3 processes found (or some protected)"

echo ""
echo -e "${GREEN}[3/3] Stopping Redis processes...${NC}"
pkill -9 redis 2>/dev/null || echo "  No Redis processes found"

echo ""
echo "Waiting 3 seconds for processes to terminate..."
sleep 3

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Native Services Stopped!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Verify
echo "Verifying processes..."
REMAINING=$(ps aux | grep -E "(ollama|uvicorn|llamaindex)" | grep -v grep | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}✅ All native services stopped!${NC}"
else
    echo -e "${YELLOW}⚠️  $REMAINING processes still running (may be protected)${NC}"
    ps aux | grep -E "(ollama|uvicorn|llamaindex)" | grep -v grep
fi

echo ""
echo "You can now start Docker containers:"
echo "  docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d"
echo ""

