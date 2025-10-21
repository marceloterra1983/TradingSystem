#!/bin/bash
# LangGraph Deployment Validation Script
# Verifies all components are running and connected

set -e

echo "🔍 LangGraph Deployment Validation"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    
    echo -n "Testing $name... "
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$response_code" = "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $response_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $response_code, expected $expected_code)"
        ((FAILED++))
        return 1
    fi
}

# Function to test Docker container
test_container() {
    local name="$1"
    local container="$2"
    
    echo -n "Testing container $name... "
    
    status=$(docker ps --filter "name=$container" --format "{{.Status}}" | grep -q "Up" && echo "running" || echo "down")
    
    if [ "$status" = "running" ]; then
        echo -e "${GREEN}✅ RUNNING${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ DOWN${NC}"
        ((FAILED++))
        return 1
    fi
}

# Test database table
test_database() {
    local name="$1"
    local command="$2"
    
    echo -n "Testing database $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "📦 Container Status"
echo "-------------------"
test_container "LangGraph" "infra-langgraph"
test_container "Agno Agents" "infra-agno-agents"
test_container "PostgreSQL" "data-postgress-langgraph"
test_container "QuestDB" "data-questdb"
test_container "Qdrant" "data-qdrant"
echo ""

echo "🌐 API Endpoints"
echo "----------------"
test_endpoint "LangGraph Root" "http://localhost:8111/"
test_endpoint "LangGraph Health" "http://localhost:8111/health"
test_endpoint "Agno Health" "http://localhost:8200/health"
echo ""

echo "💾 Database Tables"
echo "------------------"
test_database "PostgreSQL: langgraph_checkpoints" \
    "docker exec -i data-postgress-langgraph psql -U postgres -d tradingsystem -c 'SELECT 1 FROM langgraph_checkpoints LIMIT 0'"
test_database "PostgreSQL: langgraph_runs" \
    "docker exec -i data-postgress-langgraph psql -U postgres -d tradingsystem -c 'SELECT 1 FROM langgraph_runs LIMIT 0'"
echo ""

echo "🔄 Workflow Execution"
echo "---------------------"

# Test Docs Review
echo -n "Testing Docs Review Workflow... "
response=$(curl -X POST http://localhost:8111/workflows/docs/review \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test\nContent","operation":"review"}' \
  -s)

status=$(echo "$response" | jq -r '.status')
if [ "$status" = "completed" ]; then
    echo -e "${GREEN}✅ PASS${NC} (status: completed)"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (status: $status)"
    ((FAILED++))
fi

echo ""
echo "📊 Summary"
echo "=========="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo "🎉 LangGraph Service is fully operational!"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed${NC}"
    echo "Check logs: docker logs infra-langgraph"
    exit 1
fi
