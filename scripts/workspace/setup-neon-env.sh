#!/bin/bash
#
# Setup Neon Environment Variables for Workspace Stack
#
# This script adds Neon configuration to the root .env file
# Run from project root: bash scripts/workspace/setup-neon-env.sh
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=============================================="
echo "Workspace Stack - Neon Environment Setup"
echo "=============================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}ERROR: .env file not found in project root!${NC}"
    echo ""
    echo "Please create .env file first or run from project root directory."
    exit 1
fi

# Check if Neon variables already exist
if grep -q "LIBRARY_DB_STRATEGY=neon" .env; then
    echo -e "${YELLOW}WARNING: Neon variables already exist in .env${NC}"
    echo ""
    echo -n "Overwrite existing configuration? (yes/no): "
    read -r response
    if [ "$response" != "yes" ]; then
        echo -e "${YELLOW}Setup cancelled.${NC}"
        exit 0
    fi
    
    # Backup existing .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Created backup: .env.backup.$(date +%Y%m%d_%H%M%S)${NC}"
fi

# Add Neon variables
echo ""
echo -e "${BLUE}Adding Neon configuration to .env...${NC}"
echo ""

cat >> .env << 'EOF'

# ============================================
# WORKSPACE - NEON DATABASE CONFIGURATION
# Added by: scripts/workspace/setup-neon-env.sh
# Date: $(date +%Y-%m-%d)
# ============================================

# Database Strategy (CRÍTICO: Define qual DB usar)
LIBRARY_DB_STRATEGY=neon

# Neon Connection (Internal Docker Network)
NEON_HOST=workspace-db-compute
NEON_PORT=55432
NEON_DATABASE=workspace
NEON_USER=postgres
NEON_PASSWORD=neon_secure_pass
NEON_SCHEMA=workspace

# Connection String
NEON_DATABASE_URL=postgresql://postgres:neon_secure_pass@workspace-db-compute:55432/workspace

# Connection Pool Settings
NEON_POOL_MAX=50
NEON_POOL_MIN=2
NEON_IDLE_TIMEOUT=30000
NEON_CONNECTION_TIMEOUT=5000

# Query Timeouts
NEON_STATEMENT_TIMEOUT=30000
NEON_QUERY_TIMEOUT=30000

# SSL (dev = false, prod = true)
NEON_SSL=false

# Workspace API
WORKSPACE_PORT=3200
WORKSPACE_EXTERNAL_PORT=3200

# CORS
CORS_ORIGIN=http://localhost:3103,http://localhost:3400,http://localhost:3401

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120

# Logging & Metrics
LOG_LEVEL=info
METRICS_ENABLED=true
CORRELATION_ID_HEADER=x-correlation-id

EOF

echo -e "${GREEN}✓ Neon configuration added to .env${NC}"
echo ""
echo "=============================================="
echo "Configuration Summary"
echo "=============================================="
echo ""
echo "Database Strategy: neon"
echo "Database Host: workspace-db-compute (Docker internal)"
echo "Database Port: 55432 (internal) → 5433 (external)"
echo "Database Name: workspace"
echo "Schema: workspace"
echo ""
echo "API Configuration:"
echo "  Port: 3200"
echo "  Log Level: info"
echo "  Rate Limit: 120 req/min"
echo ""
echo "=============================================="
echo "Next Steps"
echo "=============================================="
echo ""
echo "1. Build Neon image (if not already built):"
echo "   bash scripts/database/build-neon-from-source.sh"
echo ""
echo "2. Start Workspace stack:"
echo "   bash scripts/docker/start-workspace-stack.sh"
echo ""
echo "3. Initialize database:"
echo "   bash scripts/database/init-neon-workspace.sh"
echo ""
echo "4. Test connection:"
echo "   bash scripts/database/test-neon-connection.sh"
echo ""
echo "5. Verify API:"
echo "   curl http://localhost:3200/health | jq ."
echo ""
echo "=============================================="
echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""

