#!/bin/bash
# ==============================================================================
# Gateway Routing Test Script
# ==============================================================================
# Tests that the Traefik API Gateway is correctly routing to all services
# and that NO duplicate instances exist.
#
# Usage: bash scripts/maintenance/test-gateway-routing.sh
# ==============================================================================

set -e

echo "🔍 Testing Traefik API Gateway Routing"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3

    echo -n "Testing: $description... "

    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        ((FAILED++))
    fi
}

# Test that old ports are NOT accessible
test_port_closed() {
    local port=$1
    local description=$2

    echo -n "Testing: $description should be CLOSED... "

    if nc -z localhost $port 2>/dev/null; then
        echo -e "${RED}✗ FAIL${NC} (Port $port is OPEN - should be closed!)"
        ((FAILED++))
    else
        echo -e "${GREEN}✓ PASS${NC} (Port $port is correctly closed)"
        ((PASSED++))
    fi
}

# ==============================================================================
# Phase 1: Verify Old Ports are Closed
# ==============================================================================
echo "📌 Phase 1: Verify No Duplicate Instances"
echo ""

test_port_closed 9080 "Native Vite on port 9080"
test_port_closed 8092 "Direct Docker port 8092"

echo ""

# ==============================================================================
# Phase 2: Verify Gateway is Responding
# ==============================================================================
echo "📌 Phase 2: Verify Gateway Endpoints"
echo ""

# Gateway itself should respond
test_endpoint "http://localhost:9082/ping" "200" "Traefik ping endpoint"

# Dashboard should be accessible via gateway
test_endpoint "http://localhost:9082/" "200" "Dashboard via gateway"

# Traefik dashboard should be accessible
test_endpoint "http://localhost:9083/dashboard/" "200" "Traefik admin dashboard"

echo ""

# ==============================================================================
# Phase 3: Verify Service Routing
# ==============================================================================
echo "📌 Phase 3: Verify Service Routing"
echo ""

# API endpoints via gateway
test_endpoint "http://localhost:9082/api/workspace/health" "200" "Workspace API health"
test_endpoint "http://localhost:9082/docs/" "200" "Documentation hub"

echo ""

# ==============================================================================
# Phase 4: Verify Container Health
# ==============================================================================
echo "📌 Phase 4: Verify Container Health"
echo ""

containers=("api-gateway" "dashboard-ui")

for container in "${containers[@]}"; do
    echo -n "Container: $container... "

    status=$(docker ps --filter "name=$container" --format "{{.Status}}" 2>/dev/null | head -1)

    if [[ $status == *"healthy"* ]]; then
        echo -e "${GREEN}✓ HEALTHY${NC}"
        ((PASSED++))
    elif [[ $status == *"Up"* ]]; then
        echo -e "${YELLOW}⚠ UP (no healthcheck)${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ UNHEALTHY${NC} ($status)"
        ((FAILED++))
    fi
done

echo ""

# ==============================================================================
# Phase 5: Verify No Native Processes
# ==============================================================================
echo "📌 Phase 5: Verify No Native Vite Processes"
echo ""

echo -n "Checking for native Vite processes... "

vite_processes=$(ps aux | grep "vite.*9080" | grep -v grep | wc -l)

if [ "$vite_processes" -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} (No native Vite processes found)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Found $vite_processes native Vite process(es))"
    echo "   Run: pkill -f 'vite.*9080' to kill them"
    ((FAILED++))
fi

echo ""

# ==============================================================================
# Summary
# ==============================================================================
echo "========================================"
echo "📊 Test Summary"
echo "========================================"
echo ""
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo ""
    echo "✅ Dashboard is accessible ONLY via gateway:"
    echo "   👉 http://localhost:9082/"
    echo ""
    echo "✅ No duplicate instances found"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo ""
    echo "See above for details on failed tests."
    echo "Review the Architecture Review document:"
    echo "   docs/ARCHITECTURE-REVIEW-DASHBOARD-DUPLICATION.md"
    exit 1
fi
