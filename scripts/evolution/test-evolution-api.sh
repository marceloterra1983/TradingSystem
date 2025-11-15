#!/bin/bash
#
# Evolution API - Comprehensive Test Suite
# Tests all critical endpoints and services
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Evolution API Stack - Test Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo

# Load environment
if [ -f "/workspace/.env" ]; then
    set -a
    source "/workspace/.env"
    set +a
fi

EVOLUTION_API_URL="http://localhost:4100"
EVOLUTION_MANAGER_URL="http://localhost:4203"
EVOLUTION_MINIO_URL="http://localhost:9311"
API_KEY="${EVOLUTION_API_GLOBAL_KEY:-}"

TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    local method="${4:-GET}"
    local headers="${5:-}"

    echo -n "Testing: $name... "

    if [ -n "$headers" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "$headers" 2>/dev/null || echo "000")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" 2>/dev/null || echo "000")
    fi

    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_code, Got: $response)"
        ((TESTS_FAILED++))
    fi
}

# Test container health
test_container_health() {
    local container="$1"
    echo -n "Testing: $container health... "

    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")

    if [ "$health" = "healthy" ]; then
        echo -e "${GREEN}✓ HEALTHY${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ UNHEALTHY${NC} (Status: $health)"
        ((TESTS_FAILED++))
    fi
}

echo -e "${YELLOW}[1/4] Testing Container Health${NC}"
echo "─────────────────────────────────────────────────────"
test_container_health "evolution-api"
test_container_health "evolution-manager"
test_container_health "evolution-postgres"
test_container_health "evolution-redis"
test_container_health "evolution-minio"
test_container_health "evolution-pgbouncer"
echo

echo -e "${YELLOW}[2/4] Testing HTTP Endpoints${NC}"
echo "─────────────────────────────────────────────────────"
# Note: These may return 000 in WSL2 container context, but will work from Windows host
test_endpoint "Evolution API Root" "$EVOLUTION_API_URL/" "200"
test_endpoint "Evolution Manager UI" "$EVOLUTION_MANAGER_URL/" "200"
test_endpoint "MinIO Console" "$EVOLUTION_MINIO_URL/" "200"
echo

echo -e "${YELLOW}[3/4] Testing Database Connectivity${NC}"
echo "─────────────────────────────────────────────────────"
echo -n "Testing: PostgreSQL connection... "
if docker exec evolution-postgres psql -U evolution -d evolution -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((TESTS_FAILED++))
fi

echo -n "Testing: Redis connection... "
if docker exec evolution-redis redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((TESTS_FAILED++))
fi

echo -n "Testing: MinIO health... "
if docker exec evolution-minio curl -s http://127.0.0.1:9000/minio/health/ready >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((TESTS_FAILED++))
fi
echo

echo -e "${YELLOW}[4/4] Testing Port Bindings${NC}"
echo "─────────────────────────────────────────────────────"
echo -n "Testing: Evolution API port binding... "
binding=$(docker ps --filter "name=evolution-api" --format "{{.Ports}}" | grep -o "0.0.0.0:4100" || echo "")
if [ -n "$binding" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Bound to 0.0.0.0:4100)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Not bound to 0.0.0.0)"
    ((TESTS_FAILED++))
fi

echo -n "Testing: Evolution Manager port binding... "
binding=$(docker ps --filter "name=evolution-manager" --format "{{.Ports}}" | grep -o "0.0.0.0:4203" || echo "")
if [ -n "$binding" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Bound to 0.0.0.0:4203)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Not bound to 0.0.0.0)"
    ((TESTS_FAILED++))
fi

echo -n "Testing: MinIO port binding... "
binding=$(docker ps --filter "name=evolution-minio" --format "{{.Ports}}" | grep -o "0.0.0.0:9311" || echo "")
if [ -n "$binding" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Bound to 0.0.0.0:9311)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Not bound to 0.0.0.0)"
    ((TESTS_FAILED++))
fi
echo

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Test Results${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo
    echo -e "${BLUE}Access URLs (from Windows host):${NC}"
    echo "  - Evolution API: http://localhost:4100"
    echo "  - Evolution Manager: http://localhost:4203"
    echo "  - MinIO Console: http://localhost:9311"
    echo
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please check the output above.${NC}"
    echo
    exit 1
fi
