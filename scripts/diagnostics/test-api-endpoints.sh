#!/usr/bin/env bash
set -euo pipefail

echo "🔍 API Endpoints Diagnostics"
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    echo -n "Testing $name... "
    
    if response=$(curl -s -w "\n%{http_code}" -m 10 "$url" 2>/dev/null); then
        status_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        
        if [ "$status_code" = "$expected_status" ]; then
            echo -e "${GREEN}✓${NC} (HTTP $status_code)"
            if [ -n "$body" ]; then
                echo "   Response: $(echo "$body" | head -c 100)..."
            fi
        else
            echo -e "${YELLOW}⚠${NC} (HTTP $status_code, expected $expected_status)"
            echo "   Response: $(echo "$body" | head -c 200)"
        fi
    else
        echo -e "${RED}✗${NC} (Connection failed)"
    fi
}

echo "🎯 Direct Backend Services (localhost:PORT)"
echo "---------------------------------------------"
echo ""

test_endpoint "Workspace API (3200)" "http://localhost:3200/health"
test_endpoint "Workspace Items" "http://localhost:3200/api/items"
test_endpoint "TP Capital (3201)" "http://localhost:3201/health"
test_endpoint "TP Capital Signals" "http://localhost:3201/signals"
test_endpoint "TP Capital Logs" "http://localhost:3201/logs"
test_endpoint "B3 Market Data (3302)" "http://localhost:3302/health"
test_endpoint "Documentation API (3400)" "http://localhost:3400/health"
test_endpoint "Service Launcher (3500)" "http://localhost:3500/health"
test_endpoint "Firecrawl Proxy (3600)" "http://localhost:3600/health"
test_endpoint "WebScraper API (3700)" "http://localhost:3700/health"

echo ""
echo "🔀 Dashboard Proxy Endpoints (via localhost:3103)"
echo "---------------------------------------------------"
echo ""

test_endpoint "Dashboard Root" "http://localhost:3103/"
test_endpoint "Proxy: /api/library" "http://localhost:3103/api/library/items"
test_endpoint "Proxy: /api/tp-capital" "http://localhost:3103/api/tp-capital/signals"
test_endpoint "Proxy: /api/b3" "http://localhost:3103/api/b3/health"
test_endpoint "Proxy: /api/docs" "http://localhost:3103/api/docs/health"
test_endpoint "Proxy: /api/launcher" "http://localhost:3103/api/launcher/health"
test_endpoint "Proxy: /api/firecrawl" "http://localhost:3103/api/firecrawl/health"
test_endpoint "Proxy: /api/webscraper" "http://localhost:3103/api/webscraper/jobs"

echo ""
echo "📊 Summary"
echo "----------"
echo ""
echo -e "${BLUE}If direct backend tests pass but proxy tests fail:${NC}"
echo "  → Dashboard needs to be restarted to pick up Vite proxy config"
echo "  → Run: bash scripts/services/restart-dashboard.sh"
echo ""
echo -e "${BLUE}If direct backend tests fail:${NC}"
echo "  → Backend service is not running or has wrong port"
echo "  → Check: status-quick"
echo ""
