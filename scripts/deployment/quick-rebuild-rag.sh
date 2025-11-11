#!/bin/bash
# ==============================================================================
# Quick Rebuild - RAG Services (Sprint 1)
# ==============================================================================
# Description: Fast rebuild without full deployment script
# Use this for rapid iteration during development
# ==============================================================================

set -e

cd /home/marce/Projetos/TradingSystem

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Quick Rebuild - RAG Services${NC}"
echo ""

# Build only the services that changed
echo -e "${GREEN}Building llamaindex-query...${NC}"
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml build llamaindex-query --no-cache

echo -e "${GREEN}Building rag-service...${NC}"
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml build rag-service --no-cache

echo -e "${GREEN}Building rag-collections-service...${NC}"
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml build rag-collections-service --no-cache

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo -e "${YELLOW}Now restart the services:${NC}"
echo "  docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d --force-recreate llamaindex-query rag-service rag-collections-service"
echo ""

