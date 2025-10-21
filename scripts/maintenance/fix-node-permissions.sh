#!/bin/bash
# ==============================================================================
# TradingSystem - Fix Node.js Binary Permissions
# ==============================================================================
# Este script corrige permissões de execução em todos os binários do node_modules
# Necessário quando node_modules são copiados ou restaurados de backup
# ==============================================================================

set -euo pipefail

# Cores
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo ""
echo -e "${BLUE}🔧 Corrigindo permissões dos binários Node.js...${NC}"
echo ""

# Lista de diretórios com node_modules
DIRS=(
    "frontend/apps/dashboard"
    "docs/docusaurus"
    "backend/api/workspace"
    "frontend/apps/tp-capital"
    "frontend/apps/b3-market-data"
    "frontend/apps/service-launcher"
    "backend/api/firecrawl-proxy"
    "backend/api/webscraper-api"
    "backend/api/documentation-api"
)

FIXED_COUNT=0

for dir in "${DIRS[@]}"; do
    BIN_DIR="$REPO_ROOT/$dir/node_modules/.bin"
    
    if [ -d "$BIN_DIR" ]; then
        echo -e "${YELLOW}→${NC} $dir"
        chmod +x "$BIN_DIR"/* 2>/dev/null || true
        FIXED_COUNT=$((FIXED_COUNT + 1))
    fi
done

echo ""
echo -e "${GREEN}✓${NC} Permissões corrigidas em $FIXED_COUNT diretórios"
echo ""

