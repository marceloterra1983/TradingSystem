#!/bin/bash
# ============================================================================
# Test DocsAPI Container
# ============================================================================
# Validates that DocsAPI is running correctly in Docker
# ============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:3400"
TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}
    
    echo -n "  Testing $name... "
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [[ "$response_code" == "$expected_code" ]]; then
        echo -e "${GREEN}✅ PASS${NC} ($response_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_code, Got: $response_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

test_json_response() {
    local name=$1
    local url=$2
    local json_key=$3
    
    echo -n "  Testing $name... "
    
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "\"$json_key\""; then
        echo -e "${GREEN}✅ PASS${NC} (Found '$json_key' in response)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Missing '$json_key' in response)"
        echo "     Response: $response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              DocsAPI Container Test Suite                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if container is running
echo "🔍 Checking container status..."
if ! docker ps | grep -q docs-api; then
    echo -e "${RED}❌ DocsAPI container is not running${NC}"
    echo ""
    echo "Start it with:"
    echo "  docker compose --env-file .env -f tools/compose/docker-compose.docs.yml up -d"
    exit 1
fi
echo -e "${GREEN}✅ Container is running${NC}"
echo ""

# Health Check
echo "🏥 Health Check:"
test_json_response "Health endpoint" "$BASE_URL/health" "status"
echo ""

# Root endpoint
echo "📋 API Information:"
test_json_response "Root endpoint" "$BASE_URL/" "service"
echo ""

# Specs endpoints
echo "📄 Specification Endpoints:"
test_endpoint "OpenAPI spec" "$BASE_URL/spec/openapi.yaml"
test_endpoint "AsyncAPI spec" "$BASE_URL/spec/asyncapi.yaml"
echo ""

# API v1 endpoints
echo "🔌 API v1 Endpoints:"
test_json_response "Systems list" "$BASE_URL/api/v1/systems" "success"
test_json_response "Ideas list" "$BASE_URL/api/v1/ideas" "success"
test_json_response "Stats" "$BASE_URL/api/v1/stats" "systems"
echo ""

# Spec status
echo "📊 Spec Validation:"
test_json_response "Spec status" "$BASE_URL/api/v1/docs/status" "openapi"
echo ""

# Search functionality
echo "🔍 Search Functionality:"
test_json_response "Search endpoint" "$BASE_URL/api/v1/search?q=test" "query"
echo ""

# Container health
echo "🐳 Docker Health:"
health_status=$(docker inspect --format='{{.State.Health.Status}}' docs-api 2>/dev/null || echo "unknown")
if [[ "$health_status" == "healthy" ]]; then
    echo -e "  ${GREEN}✅ Container health: $health_status${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "  ${RED}❌ Container health: $health_status${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Test Summary                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "  Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "DocsAPI is running correctly at: $BASE_URL"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check logs:${NC}"
    echo "  docker compose --env-file .env -f tools/compose/docker-compose.docs.yml logs docs-api"
    exit 1
fi
