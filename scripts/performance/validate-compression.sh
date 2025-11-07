#!/bin/bash

#
# Validation Script for OPT-001: Response Compression
#
# Tests compression middleware across all API services:
# - Workspace API (port 3200)
# - Documentation API (port 3401)
# - TP Capital API (port 4005)
#
# Expected Results:
# - Responses > 1KB should be gzip compressed
# - Content-Encoding: gzip header present
# - X-Compression-Ratio header showing % reduction
# - X-Original-Size header showing uncompressed size
# - Compression can be disabled with x-no-compression header
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

# Function to print test results
print_test() {
  local status=$1
  local message=$2

  if [ "$status" == "PASS" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $message"
    ((TESTS_PASSED++))
  elif [ "$status" == "FAIL" ]; then
    echo -e "${RED}✗ FAIL${NC}: $message"
    ((TESTS_FAILED++))
  elif [ "$status" == "SKIP" ]; then
    echo -e "${YELLOW}○ SKIP${NC}: $message"
    ((TESTS_SKIPPED++))
  fi
}

# Function to test compression on an endpoint
test_compression() {
  local service_name=$1
  local url=$2
  local description=$3

  echo -e "\n${YELLOW}Testing: $service_name - $description${NC}"
  echo "URL: $url"

  # Make request with Accept-Encoding: gzip
  local response
  response=$(curl -s -i -H "Accept-Encoding: gzip" "$url" 2>&1)
  local curl_exit=$?

  if [ $curl_exit -ne 0 ]; then
    print_test "SKIP" "$service_name is not running or unreachable"
    return
  fi

  # Check HTTP status
  local http_status=$(echo "$response" | grep -E "^HTTP" | tail -1 | awk '{print $2}')

  if [ "$http_status" != "200" ]; then
    print_test "SKIP" "$service_name returned HTTP $http_status (expected 200)"
    return
  fi

  # Extract headers
  local content_encoding=$(echo "$response" | grep -i "^content-encoding:" | awk '{print $2}' | tr -d '\r\n')
  local compression_ratio=$(echo "$response" | grep -i "^x-compression-ratio:" | awk '{print $2}' | tr -d '\r\n')
  local original_size=$(echo "$response" | grep -i "^x-original-size:" | awk '{print $2}' | tr -d '\r\n')
  local content_length=$(echo "$response" | grep -i "^content-length:" | awk '{print $2}' | tr -d '\r\n')

  # Validate compression
  if [ "$content_encoding" == "gzip" ]; then
    print_test "PASS" "$service_name - Response is gzip compressed"

    if [ -n "$compression_ratio" ]; then
      print_test "PASS" "$service_name - Compression ratio header present: $compression_ratio"
    else
      print_test "FAIL" "$service_name - Missing X-Compression-Ratio header"
    fi

    if [ -n "$original_size" ]; then
      print_test "PASS" "$service_name - Original size header present: ${original_size} bytes"
    else
      print_test "FAIL" "$service_name - Missing X-Original-Size header"
    fi

  else
    # Check if response is small (< 1KB threshold)
    if [ -n "$content_length" ] && [ "$content_length" -lt 1024 ]; then
      print_test "PASS" "$service_name - Small response ($content_length bytes) not compressed (correct)"
    else
      print_test "FAIL" "$service_name - Large response NOT compressed (Content-Encoding: $content_encoding)"
    fi
  fi
}

# Function to test compression disable
test_compression_disable() {
  local service_name=$1
  local url=$2

  echo -e "\n${YELLOW}Testing: $service_name - Compression Disable (x-no-compression)${NC}"

  local response
  response=$(curl -s -i -H "Accept-Encoding: gzip" -H "x-no-compression: true" "$url" 2>&1)
  local curl_exit=$?

  if [ $curl_exit -ne 0 ]; then
    print_test "SKIP" "$service_name is not running"
    return
  fi

  local content_encoding=$(echo "$response" | grep -i "^content-encoding:" | awk '{print $2}' | tr -d '\r\n')

  if [ -z "$content_encoding" ] || [ "$content_encoding" == "identity" ]; then
    print_test "PASS" "$service_name - Compression disabled with x-no-compression header"
  else
    print_test "FAIL" "$service_name - Compression NOT disabled (Content-Encoding: $content_encoding)"
  fi
}

# Main test execution
print_header "OPT-001: Response Compression Validation"

echo "This script validates that gzip compression is working correctly across all API services."
echo "Services will be tested for:"
echo "  1. Gzip compression enabled for responses > 1KB"
echo "  2. Proper compression headers (Content-Encoding, X-Compression-Ratio, X-Original-Size)"
echo "  3. Ability to disable compression with x-no-compression header"
echo ""

# Test Workspace API
print_header "Test 1: Workspace API (Port 3200)"
test_compression "Workspace API" "http://localhost:3200/api/items" "GET /api/items"
test_compression_disable "Workspace API" "http://localhost:3200/api/items"

# Test Documentation API
print_header "Test 2: Documentation API (Port 3401)"
test_compression "Documentation API" "http://localhost:3401/api/docs/search?q=architecture" "GET /api/docs/search"
test_compression_disable "Documentation API" "http://localhost:3401/api/docs/search?q=test"

# Test TP Capital API
print_header "Test 3: TP Capital API (Port 4005)"
test_compression "TP Capital API" "http://localhost:4005/health" "GET /health"
test_compression_disable "TP Capital API" "http://localhost:4005/health"

# Test health endpoints
print_header "Test 4: Health Endpoints"
test_compression "Workspace Health" "http://localhost:3200/health" "GET /health"
test_compression "Documentation Health" "http://localhost:3401/health" "GET /health"

# Summary
print_header "Test Summary"

echo -e "${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "${RED}Failed:${NC}  $TESTS_FAILED"
echo -e "${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$(( (TESTS_PASSED * 100) / TOTAL_TESTS ))
  echo -e "Success Rate: ${SUCCESS_RATE}%"
fi

echo ""

# Exit with appropriate status
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}❌ Compression validation FAILED${NC}"
  echo "Please review the failed tests above and ensure compression middleware is properly configured."
  exit 1
elif [ $TESTS_PASSED -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No services were available for testing${NC}"
  echo "Please start the services and run this script again."
  exit 1
else
  echo -e "${GREEN}✅ All compression tests PASSED${NC}"
  echo ""
  echo "Expected Performance Improvements:"
  echo "  • Payload reduction: ~40%"
  echo "  • Response time savings: ~60ms per request"
  echo "  • Reduced bandwidth consumption"
  echo ""
  echo "To see compression in action:"
  echo "  curl -i -H 'Accept-Encoding: gzip' http://localhost:3200/api/items | grep -i 'content-encoding\\|x-compression'"
  exit 0
fi
