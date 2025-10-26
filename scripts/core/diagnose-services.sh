#!/bin/bash
# Service Diagnostic Script for TradingSystem
# Checks all services and identifies issues

set -e

echo "=================================="
echo "  TradingSystem Service Diagnostic"
echo "=================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if port is in use
check_port() {
    local port=$1
    local service=$2

    if ss -tuln | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Port $port ($service) is LISTENING"
        return 0
    else
        echo -e "${RED}✗${NC} Port $port ($service) is NOT listening"
        return 1
    fi
}

# Check if node_modules exists
check_dependencies() {
    local dir=$1
    local service=$2

    if [ -d "$dir/node_modules" ]; then
        echo -e "${GREEN}✓${NC} $service - Dependencies installed"
        return 0
    else
        echo -e "${RED}✗${NC} $service - Dependencies MISSING"
        return 1
    fi
}

# Check if .env file exists
check_env_file() {
    local dir=$1
    local service=$2

    if [ -f "$dir/.env" ]; then
        echo -e "${GREEN}✓${NC} $service - .env file exists"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $service - .env file MISSING (will use .env.example)"
        return 1
    fi
}

echo "1. Checking Port Status..."
echo "----------------------------"
check_port 3101 "Dashboard" || true
check_port 3205 "Docusaurus" || true
check_port 3200 "Workspace" || true
check_port 3200 "TP-Capital" || true
check_port 3400 "DocsAPI" || true
check_port 3302 "B3" || true
check_port 3500 "Laucher" || true
check_port 9000 "QuestDB HTTP" || true
check_port 9009 "QuestDB ILP" || true
echo ""

echo "2. Checking Dependencies..."
echo "----------------------------"
check_dependencies "/home/marce/projetos/TradingSystem/frontend/dashboard" "Dashboard" || true
check_dependencies "/home/marce/projetos/TradingSystem/docs" "Docusaurus" || true
check_dependencies "/home/marce/projetos/TradingSystem/backend/api/workspace" "Workspace" || true
check_dependencies "/home/marce/projetos/TradingSystem/apps/tp-capital" "TP-Capital" || true
check_dependencies "/home/marce/projetos/TradingSystem/apps/b3-market-data" "B3" || true
# DocsAPI runs as Docker container (see docker-compose.docs.yml)
check_dependencies "/home/marce/projetos/TradingSystem/apps/status" "Status" || true
echo ""

echo "3. Checking Configuration Files..."
echo "----------------------------"
check_env_file "/home/marce/projetos/TradingSystem/frontend/dashboard" "Dashboard" || true
check_env_file "/home/marce/projetos/TradingSystem/backend/api/workspace" "Workspace" || true
check_env_file "/home/marce/projetos/TradingSystem/apps/tp-capital" "TP-Capital" || true
check_env_file "/home/marce/projetos/TradingSystem/apps/b3-market-data" "B3" || true
# DocsAPI runs as Docker container (see docker-compose.docs.yml)
check_env_file "/home/marce/projetos/TradingSystem/apps/status" "Status" || true
echo ""

echo "4. Checking Running Node Processes..."
echo "----------------------------"
ps aux | grep -E 'node|vite|npm' | grep -v grep | awk '{print $2, $11, $12, $13, $14}' || echo "No Node.js processes found"
echo ""

echo "5. Port Configuration Summary..."
echo "----------------------------"
echo "Expected ports:"
echo "  - 3101: Dashboard (React + Vite)"
echo "  - 3205: Docusaurus (Docusaurus)"
echo "  - 3200: Workspace"
echo "  - 3200: TP-Capital"
echo "  - 3400: DocsAPI"
echo "  - 3302: B3"
echo "  - 3500: Laucher"
echo "  - 9000: QuestDB HTTP"
echo "  - 9009: QuestDB ILP"
echo ""

echo "6. Quick Fix Commands..."
echo "----------------------------"
echo "To install missing dependencies:"
echo "  cd frontend/dashboard && npm install"
echo "  cd backend/api/workspace && npm install"
echo "  cd apps/tp-capital && npm install"
echo "  cd apps/b3-market-data && npm install"
echo "  # DocsAPI: docker compose -f tools/compose/docker-compose.docs.yml up -d"
echo "  cd apps/status && npm install"
echo ""
echo "To start services:"
echo "  bash scripts/start-all-services.sh"
echo ""
echo "=================================="
