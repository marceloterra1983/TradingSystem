#!/bin/bash
# ==============================================================================
# Configure Inter-Service Secret for RAG Services
# ==============================================================================
# Description: Adds INTER_SERVICE_SECRET to .env file (if not already present)
# Usage: bash scripts/setup/configure-inter-service-secret.sh
# ==============================================================================

set -e  # Exit on error

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
ENV_FILE="$PROJECT_ROOT/.env"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RAG Services - Inter-Service Auth Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERROR: .env file not found at $ENV_FILE${NC}"
    exit 1
fi

# Check if INTER_SERVICE_SECRET already exists
if grep -q "^INTER_SERVICE_SECRET=" "$ENV_FILE"; then
    echo -e "${YELLOW}INTER_SERVICE_SECRET already exists in .env${NC}"
    echo ""
    echo "Current value (first 16 chars): $(grep "^INTER_SERVICE_SECRET=" $ENV_FILE | cut -d= -f2 | cut -c1-16)***"
    echo ""
    read -p "Do you want to regenerate it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Keeping existing secret. Skipping.${NC}"
        exit 0
    fi
    
    # Remove old secret
    sed -i '/^INTER_SERVICE_SECRET=/d' "$ENV_FILE"
    echo -e "${YELLOW}Old secret removed.${NC}"
fi

# Generate new secret (64 hex characters = 32 bytes)
echo "Generating secure 32-byte random secret..."
SECRET=$(openssl rand -hex 32)

# Add to .env
echo "" >> "$ENV_FILE"
echo "# Inter-Service Authentication (RAG Services)" >> "$ENV_FILE"
echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$ENV_FILE"
echo "INTER_SERVICE_SECRET=$SECRET" >> "$ENV_FILE"

echo -e "${GREEN}✅ INTER_SERVICE_SECRET added to .env${NC}"
echo ""
echo "Secret (first 16 chars): ${SECRET:0:16}***"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "  - Keep this secret secure (never commit to Git)"
echo "  - All RAG services must use the same secret"
echo "  - Rotate secret periodically (recommended: every 90 days)"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Rebuild Docker images: docker-compose -f tools/compose/docker-compose.4-4-rag-stack.yml build"
echo "  2. Restart services: docker-compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d"
echo "  3. Verify health: curl http://localhost:8202/health | jq '.circuitBreakers'"
echo ""

