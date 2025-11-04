#!/bin/bash
# ==============================================================================
# Stop Native RAG Services (Non-Docker)
# ==============================================================================
# Description: Para serviços Ollama e Redis rodando nativamente
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Stopping Native RAG Services${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check port 11434 (Ollama)
echo -e "${GREEN}[1/2] Checking port 11434 (Ollama)...${NC}"
OLLAMA_PID=$(lsof -ti:11434 2>/dev/null || echo "")

if [ -n "$OLLAMA_PID" ]; then
    echo -e "${YELLOW}  Found Ollama process (PID: $OLLAMA_PID)${NC}"
    echo "  Killing process..."
    kill -9 $OLLAMA_PID 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}  ✅ Ollama stopped${NC}"
else
    echo -e "${GREEN}  ✅ Port 11434 is free${NC}"
fi

echo ""

# Check port 6380 (Redis)
echo -e "${GREEN}[2/2] Checking port 6380 (Redis)...${NC}"
REDIS_PID=$(lsof -ti:6380 2>/dev/null || echo "")

if [ -n "$REDIS_PID" ]; then
    echo -e "${YELLOW}  Found Redis process (PID: $REDIS_PID)${NC}"
    echo "  Killing process..."
    kill -9 $REDIS_PID 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}  ✅ Redis stopped${NC}"
else
    echo -e "${GREEN}  ✅ Port 6380 is free${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Ports freed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "You can now start Docker containers:"
echo "  docker compose -f tools/compose/docker-compose.rag.yml up -d"
echo ""

