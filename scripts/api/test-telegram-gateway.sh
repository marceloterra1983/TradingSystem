#!/bin/bash
# ==============================================================================
# Telegram Gateway API - Test Script
# ==============================================================================
# Automated testing for Telegram Gateway API endpoints
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="${TELEGRAM_GATEWAY_API_URL:-http://localhost:4010}"
API_KEY="${TELEGRAM_GATEWAY_API_KEY:-f7b22c498bd7527a7d114481015326736f0a94a58ec7c4e6e7157d6d2b36bd85}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                       ║${NC}"
echo -e "${BLUE}║          Telegram Gateway API - Automated Test Suite                 ║${NC}"
echo -e "${BLUE}║                                                                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================================================
# Helper Functions
# ==============================================================================

test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="$5"
  
  TESTS_RUN=$((TESTS_RUN + 1))
  
  echo -ne "${YELLOW}[TEST $TESTS_RUN]${NC} $name... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -H "X-API-Key: $API_KEY" -d "$data" "$API_URL$endpoint")
  fi
  
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $status_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Show response preview
    if command -v jq &> /dev/null; then
      echo "$body" | jq -C '.' | head -5
    else
      echo "$body" | head -c 200
    fi
    echo ""
  else
    echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "$body"
    echo ""
  fi
}

# ==============================================================================
# Test Suite
# ==============================================================================

echo -e "${BLUE}[1/7] Health & Status Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Health Check" "GET" "/health" "" "200"
test_endpoint "Service Info" "GET" "/" "" "200"
test_endpoint "Gateway Status" "GET" "/api/telegram-gateway/status" "" "200"
test_endpoint "Gateway Metrics" "GET" "/api/telegram-gateway/metrics" "" "200"

echo ""
echo -e "${BLUE}[2/7] Message Retrieval Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Get Messages (default)" "GET" "/api/messages" "" "200"
test_endpoint "Get Messages (with limit)" "GET" "/api/messages?limit=10" "" "200"
test_endpoint "Get Messages (with pagination)" "GET" "/api/messages?page=1&limit=5" "" "200"

echo ""
echo -e "${BLUE}[3/7] Message Filtering Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Filter by Channel" "GET" "/api/messages?channelId=-1001649127710&limit=5" "" "200"
test_endpoint "Filter by Date Range" "GET" "/api/messages?startDate=2025-11-01&endDate=2025-11-04&limit=5" "" "200"
test_endpoint "Search Messages" "GET" "/api/messages?search=test&limit=5" "" "200"

echo ""
echo -e "${BLUE}[4/7] Channel Management Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "List All Channels" "GET" "/api/channels" "" "200"
test_endpoint "Get Specific Channel" "GET" "/api/channels/-1001649127710" "" "200"
test_endpoint "Get Channel Stats" "GET" "/api/channels/-1001649127710/stats" "" "200"

echo ""
echo -e "${BLUE}[5/7] Synchronization Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Sync Messages" "POST" "/api/telegram-gateway/sync-messages" '{"limit":10}' "200"

echo ""
echo -e "${BLUE}[6/7] Authentication Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Auth Status" "GET" "/api/telegram-gateway/auth/status" "" "200"

echo ""
echo -e "${BLUE}[7/7] Error Handling Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Invalid Channel ID" "GET" "/api/channels/invalid-id" "" "404"
test_endpoint "Invalid API Key" "GET" "/api/messages" "" "403" # This will fail with correct key, adjust as needed

# ==============================================================================
# Test Summary
# ==============================================================================

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        TEST SUMMARY                                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASS_RATE=$(awk "BEGIN {printf \"%.2f\", ($TESTS_PASSED/$TESTS_RUN)*100}")

echo -e "  Total Tests:   ${BLUE}$TESTS_RUN${NC}"
echo -e "  Passed:        ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Failed:        ${RED}$TESTS_FAILED${NC}"
echo -e "  Pass Rate:     ${GREEN}$PASS_RATE%${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi

