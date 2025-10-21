#!/usr/bin/env bash
# ============================================================================
# WebScraper API - Validation Tests
# ============================================================================
# Runs comprehensive API validation tests
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

API_URL="http://localhost:3700"
TESTS_PASSED=0
TESTS_FAILED=0

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       WebScraper API - Validation Test Suite                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Helper function to run test
run_test() {
    local test_name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    local expected_status="${5:-200}"
    
    echo -ne "${BLUE}[TEST]${NC} $test_name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    fi
    
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status_code)"
        echo -e "   Response: ${body:0:100}..."
        ((TESTS_FAILED++))
        return 1
    fi
}

# ============================================================================
# Core Endpoints
# ============================================================================
echo -e "${YELLOW}[1/6] Testing Core Endpoints...${NC}"
echo ""

run_test "Root endpoint" "/"
run_test "Health check" "/health"
run_test "Metrics endpoint" "/metrics"

echo ""

# ============================================================================
# Jobs API
# ============================================================================
echo -e "${YELLOW}[2/6] Testing Jobs API...${NC}"
echo ""

run_test "List jobs (empty)" "/api/v1/jobs"
run_test "List jobs with pagination" "/api/v1/jobs?page=1&limit=10"
run_test "List jobs with status filter" "/api/v1/jobs?status=completed"

# Create a test job
TEST_JOB_DATA='{
  "type": "scrape",
  "url": "https://example.com/test",
  "status": "completed",
  "options": {
    "format": "markdown",
    "includeMetadata": true
  },
  "results": {
    "content": "# Test Result\n\nValidation test content.",
    "metadata": {
      "title": "Test Page",
      "description": "Validation test"
    }
  }
}'

echo -ne "${BLUE}[TEST]${NC} Create test job... "
create_response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/jobs" \
    -H "Content-Type: application/json" \
    -d "$TEST_JOB_DATA" 2>/dev/null)

create_status=$(echo "$create_response" | tail -n 1)
create_body=$(echo "$create_response" | head -n -1)

if [ "$create_status" -eq "201" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP 201)"
    ((TESTS_PASSED++))
    
    # Extract job ID
    JOB_ID=$(echo "$create_body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$JOB_ID" ]; then
        echo -e "   Job ID: ${CYAN}$JOB_ID${NC}"
        
        # Test get single job
        run_test "Get job by ID" "/api/v1/jobs/$JOB_ID"
        
        # Test delete job
        run_test "Delete job" "/api/v1/jobs/$JOB_ID" "DELETE" "" "204"
    fi
else
    echo -e "${RED}✗ FAIL${NC} (Expected 201, got $create_status)"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# Templates API
# ============================================================================
echo -e "${YELLOW}[3/6] Testing Templates API...${NC}"
echo ""

run_test "List templates (empty)" "/api/v1/templates"

# Create a test template
TEST_TEMPLATE_DATA='{
  "name": "Test Template",
  "description": "Validation test template",
  "urlPattern": "https://example.com/*",
  "options": {
    "format": "markdown",
    "onlyMainContent": true
  }
}'

echo -ne "${BLUE}[TEST]${NC} Create test template... "
template_response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/templates" \
    -H "Content-Type: application/json" \
    -d "$TEST_TEMPLATE_DATA" 2>/dev/null)

template_status=$(echo "$template_response" | tail -n 1)
template_body=$(echo "$template_response" | head -n -1)

if [ "$template_status" -eq "201" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP 201)"
    ((TESTS_PASSED++))
    
    # Extract template ID
    TEMPLATE_ID=$(echo "$template_body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$TEMPLATE_ID" ]; then
        echo -e "   Template ID: ${CYAN}$TEMPLATE_ID${NC}"
        
        # Test update template
        UPDATE_DATA='{"description": "Updated description"}'
        run_test "Update template" "/api/v1/templates/$TEMPLATE_ID" "PUT" "$UPDATE_DATA"
        
        # Test delete template
        run_test "Delete template" "/api/v1/templates/$TEMPLATE_ID" "DELETE" "" "204"
    fi
else
    echo -e "${RED}✗ FAIL${NC} (Expected 201, got $template_status)"
    ((TESTS_FAILED++))
fi

echo ""

# ============================================================================
# Schedules API
# ============================================================================
echo -e "${YELLOW}[4/6] Testing Schedules API...${NC}"
echo ""

run_test "List schedules" "/api/v1/schedules"

echo ""

# ============================================================================
# Statistics API
# ============================================================================
echo -e "${YELLOW}[5/6] Testing Statistics API...${NC}"
echo ""

run_test "Get statistics" "/api/v1/statistics"

echo ""

# ============================================================================
# Exports API
# ============================================================================
echo -e "${YELLOW}[6/6] Testing Exports API...${NC}"
echo ""

run_test "List exports" "/api/v1/exports"

echo ""

# ============================================================================
# Summary
# ============================================================================
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=$(( TESTS_PASSED * 100 / TOTAL_TESTS ))

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                      Test Results                              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "   Total Tests:    ${CYAN}$TOTAL_TESTS${NC}"
echo -e "   Passed:         ${GREEN}$TESTS_PASSED${NC}"
echo -e "   Failed:         ${RED}$TESTS_FAILED${NC}"
echo -e "   Pass Rate:      ${CYAN}${PASS_RATE}%${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC} 🎉"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC} Please review the output above."
    echo ""
    exit 1
fi
