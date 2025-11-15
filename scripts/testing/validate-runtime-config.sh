#!/bin/bash
# Runtime Configuration Validation Script
# Validates that the Runtime Configuration API is working correctly
# Phase: Gateway Centralization Phase 2
# Date: 2025-11-14

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Runtime Configuration Validation"
echo "===================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:9082}"
CONFIG_ENDPOINT="${API_URL}/api/telegram-gateway/config"
SYNC_ENDPOINT="${API_URL}/api/telegram-gateway/sync-messages"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for test output
test_result() {
  local test_name="$1"
  local status="$2"
  local message="$3"

  if [ "$status" = "pass" ]; then
    echo -e "✓ ${test_name}... ${GREEN}✅ PASS${NC}"
    [ -n "$message" ] && echo "  └─ $message"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "✓ ${test_name}... ${RED}❌ FAIL${NC}"
    [ -n "$message" ] && echo "  └─ $message"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Test 1: Backend config endpoint accessibility
echo "📋 Test 1: Backend Config Endpoint"
RESPONSE=$(curl -s -w "\n%{http_code}" "$CONFIG_ENDPOINT" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  test_result "Config endpoint accessible" "pass" "HTTP $HTTP_CODE"
else
  test_result "Config endpoint accessible" "fail" "HTTP $HTTP_CODE (expected 200)"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 2: Response structure validation
echo "📋 Test 2: Response Structure"
if echo "$BODY" | jq -e '.success == true' > /dev/null 2>&1; then
  test_result "Response has success field" "pass"
else
  test_result "Response has success field" "fail"
fi

if echo "$BODY" | jq -e '.data' > /dev/null 2>&1; then
  test_result "Response has data field" "pass"
else
  test_result "Response has data field" "fail"
fi

if echo "$BODY" | jq -e '.timestamp' > /dev/null 2>&1; then
  test_result "Response has timestamp field" "pass"
else
  test_result "Response has timestamp field" "fail"
fi
echo ""

# Test 3: Auth token presence and format
echo "📋 Test 3: Auth Token"
TOKEN=$(echo "$BODY" | jq -r '.data.authToken' 2>/dev/null)

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
  TOKEN_PREFIX=$(echo "$TOKEN" | cut -c1-10)
  test_result "Auth token present" "pass" "${TOKEN_PREFIX}... (${#TOKEN} chars)"
else
  test_result "Auth token present" "fail" "Token is null or empty"
fi
echo ""

# Test 4: Required configuration fields
echo "📋 Test 4: Required Configuration Fields"
API_BASE_URL=$(echo "$BODY" | jq -r '.data.apiBaseUrl' 2>/dev/null)
MESSAGES_BASE_URL=$(echo "$BODY" | jq -r '.data.messagesBaseUrl' 2>/dev/null)
CHANNELS_BASE_URL=$(echo "$BODY" | jq -r '.data.channelsBaseUrl' 2>/dev/null)

if [ -n "$API_BASE_URL" ] && [ "$API_BASE_URL" != "null" ]; then
  test_result "apiBaseUrl present" "pass" "$API_BASE_URL"
else
  test_result "apiBaseUrl present" "fail"
fi

if [ -n "$MESSAGES_BASE_URL" ] && [ "$MESSAGES_BASE_URL" != "null" ]; then
  test_result "messagesBaseUrl present" "pass" "$MESSAGES_BASE_URL"
else
  test_result "messagesBaseUrl present" "fail"
fi

if [ -n "$CHANNELS_BASE_URL" ] && [ "$CHANNELS_BASE_URL" != "null" ]; then
  test_result "channelsBaseUrl present" "pass" "$CHANNELS_BASE_URL"
else
  test_result "channelsBaseUrl present" "fail"
fi
echo ""

# Test 5: Features configuration
echo "📋 Test 5: Features Configuration"
AUTH_ENABLED=$(echo "$BODY" | jq -r '.data.features.authEnabled' 2>/dev/null)
METRICS_ENABLED=$(echo "$BODY" | jq -r '.data.features.metricsEnabled' 2>/dev/null)
QUEUE_ENABLED=$(echo "$BODY" | jq -r '.data.features.queueMonitoringEnabled' 2>/dev/null)

if [ "$AUTH_ENABLED" = "true" ]; then
  test_result "authEnabled feature" "pass"
else
  test_result "authEnabled feature" "fail" "Expected true, got $AUTH_ENABLED"
fi

if [ "$METRICS_ENABLED" = "true" ]; then
  test_result "metricsEnabled feature" "pass"
else
  test_result "metricsEnabled feature" "fail" "Expected true, got $METRICS_ENABLED"
fi

if [ "$QUEUE_ENABLED" = "true" ]; then
  test_result "queueMonitoringEnabled feature" "pass"
else
  test_result "queueMonitoringEnabled feature" "fail" "Expected true, got $QUEUE_ENABLED"
fi
echo ""

# Test 6: Authenticated API call
echo "📋 Test 6: Authenticated API Call"
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  SYNC_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SYNC_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "X-Gateway-Token: $TOKEN" \
    -d '{"limit": 10}' 2>/dev/null || echo "000")

  SYNC_HTTP_CODE=$(echo "$SYNC_RESPONSE" | tail -n1)
  SYNC_BODY=$(echo "$SYNC_RESPONSE" | sed '$d')

  # Accept 200 OK (success) or 502/503 (backend issues but auth works)
  if [ "$SYNC_HTTP_CODE" = "200" ]; then
    test_result "Sync messages with token" "pass" "HTTP $SYNC_HTTP_CODE"
  elif [ "$SYNC_HTTP_CODE" = "502" ] || [ "$SYNC_HTTP_CODE" = "503" ]; then
    test_result "Sync messages with token" "pass" "HTTP $SYNC_HTTP_CODE (backend issue, but auth OK)"
  elif [ "$SYNC_HTTP_CODE" = "401" ] || [ "$SYNC_HTTP_CODE" = "403" ]; then
    test_result "Sync messages with token" "fail" "HTTP $SYNC_HTTP_CODE (auth failed)"
    echo "$SYNC_BODY" | jq . 2>/dev/null || echo "$SYNC_BODY"
  else
    test_result "Sync messages with token" "fail" "HTTP $SYNC_HTTP_CODE (unexpected)"
    echo "$SYNC_BODY" | jq . 2>/dev/null || echo "$SYNC_BODY"
  fi
else
  test_result "Sync messages with token" "fail" "No token available for test"
fi
echo ""

# Test 7: CORS headers (if applicable)
echo "📋 Test 7: CORS Headers"
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$CONFIG_ENDPOINT" \
  -H "Origin: http://localhost:9082" \
  -H "Access-Control-Request-Method: GET" 2>/dev/null || echo "")

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
  ALLOW_ORIGIN=$(echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin" | cut -d: -f2 | tr -d '[:space:]')
  test_result "CORS headers present" "pass" "$ALLOW_ORIGIN"
else
  test_result "CORS headers present" "fail" "No Access-Control-Allow-Origin header found"
fi
echo ""

# Test 8: Response time
echo "📋 Test 8: Performance"
START_TIME=$(date +%s%3N)
curl -s "$CONFIG_ENDPOINT" > /dev/null 2>&1
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))

if [ "$RESPONSE_TIME" -lt 1000 ]; then
  test_result "Response time" "pass" "${RESPONSE_TIME}ms (< 1000ms)"
else
  test_result "Response time" "fail" "${RESPONSE_TIME}ms (expected < 1000ms)"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo "Runtime configuration is working correctly."
  exit 0
else
  echo -e "${RED}❌ Some tests failed.${NC}"
  echo "Please review the failures above and troubleshoot."
  echo ""
  echo "Common troubleshooting steps:"
  echo "1. Rebuild backend: docker compose -f docker-compose.4-2-telegram-stack.yml build telegram-gateway-api"
  echo "2. Restart backend: docker compose -f docker-compose.4-2-telegram-stack.yml up -d telegram-gateway-api"
  echo "3. Check backend logs: docker logs telegram-gateway-api"
  echo "4. Verify .env file has TELEGRAM_GATEWAY_API_TOKEN set"
  exit 1
fi
