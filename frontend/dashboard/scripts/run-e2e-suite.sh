#!/bin/bash
# ==============================================================================
# Telegram Gateway - Complete E2E Test Suite Runner
# ==============================================================================
# Runs all E2E tests with comprehensive reporting
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                       ║${NC}"
echo -e "${BLUE}║       🧪 TELEGRAM GATEWAY - E2E TEST SUITE                           ║${NC}"
echo -e "${BLUE}║                                                                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================================================
# Pre-flight Checks
# ==============================================================================

echo -e "${YELLOW}[1/6] Pre-flight checks...${NC}"

# Check if Dashboard is running
if ! curl -s http://localhost:9080 > /dev/null; then
  echo -e "${RED}✗ Dashboard not running on port 9080${NC}"
  echo -e "${YELLOW}Starting Dashboard...${NC}"
  npm run dev &
  sleep 10
fi

# Check if Gateway API is running
if ! curl -s http://localhost:4010/health > /dev/null; then
  echo -e "${YELLOW}⚠ Gateway API not running (tests will use mocks)${NC}"
else
  echo -e "${GREEN}✓ Gateway API is running${NC}"
fi

echo ""

# ==============================================================================
# Run Test Suites
# ==============================================================================

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test_suite() {
  local suite_name="$1"
  local test_file="$2"
  local timeout="${3:-60000}"
  
  echo -e "${CYAN}Running ${suite_name}...${NC}"
  
  if npx playwright test "$test_file" --timeout="$timeout" --reporter=list; then
    echo -e "${GREEN}✓ ${suite_name} PASSED${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗ ${suite_name} FAILED${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo ""
}

# ==============================================================================
# Suite 1: Smoke Tests (Fast, Critical)
# ==============================================================================

echo -e "${YELLOW}[2/6] Smoke Tests (Critical Paths)${NC}"
run_test_suite "Smoke Tests" "telegram-gateway.smoke.spec.ts" 30000

# ==============================================================================
# Suite 2: Functional Tests (User Workflows)
# ==============================================================================

echo -e "${YELLOW}[3/6] Functional Tests (User Workflows)${NC}"
run_test_suite "Functional Tests" "telegram-gateway.functional.spec.ts" 120000

# ==============================================================================
# Suite 3: Accessibility Tests (WCAG 2.1 AA)
# ==============================================================================

echo -e "${YELLOW}[4/6] Accessibility Tests (WCAG 2.1 AA)${NC}"
run_test_suite "Accessibility Tests" "telegram-gateway.accessibility.spec.ts" 60000

# ==============================================================================
# Suite 4: Visual Regression Tests
# ==============================================================================

echo -e "${YELLOW}[5/6] Visual Regression Tests${NC}"
run_test_suite "Visual Regression Tests" "telegram-gateway.visual.spec.ts" 180000

# ==============================================================================
# Cross-Browser Testing
# ==============================================================================

echo -e "${YELLOW}[6/6] Cross-Browser Testing${NC}"

echo -e "${CYAN}Testing on Chromium...${NC}"
if npx playwright test telegram-gateway.smoke.spec.ts --project=chromium --reporter=list; then
  echo -e "${GREEN}✓ Chromium PASSED${NC}"
else
  echo -e "${RED}✗ Chromium FAILED${NC}"
fi

echo -e "${CYAN}Testing on Firefox...${NC}"
if npx playwright test telegram-gateway.smoke.spec.ts --project=firefox --reporter=list; then
  echo -e "${GREEN}✓ Firefox PASSED${NC}"
else
  echo -e "${RED}✗ Firefox FAILED${NC}"
fi

echo -e "${CYAN}Testing on WebKit (Safari)...${NC}"
if npx playwright test telegram-gateway.smoke.spec.ts --project=webkit --reporter=list; then
  echo -e "${GREEN}✓ WebKit PASSED${NC}"
else
  echo -e "${RED}✗ WebKit FAILED${NC}"
fi

echo ""

# ==============================================================================
# Test Summary
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        TEST SUMMARY                                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")

echo -e "  Total Suites:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "  Passed:        ${GREEN}$PASSED_TESTS${NC}"
echo -e "  Failed:        ${RED}$FAILED_TESTS${NC}"
echo -e "  Pass Rate:     ${GREEN}$PASS_RATE%${NC}"
echo ""

# ==============================================================================
# Reports
# ==============================================================================

echo -e "${YELLOW}Test Reports:${NC}"
echo -e "  HTML Report: ${CYAN}npx playwright show-report${NC}"
echo -e "  JSON Report: ${CYAN}cat playwright-report/results.json | jq '.'${NC}"
echo ""

# ==============================================================================
# Exit Code
# ==============================================================================

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ All test suites passed!${NC}"
  echo ""
  echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                                                       ║${NC}"
  echo -e "${GREEN}║                   🎉 E2E TESTS PASSED! 🎉                             ║${NC}"
  echo -e "${GREEN}║                                                                       ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}✗ Some test suites failed${NC}"
  echo ""
  echo -e "${RED}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                                                       ║${NC}"
  echo -e "${RED}║                   ❌ E2E TESTS FAILED ❌                               ║${NC}"
  echo -e "${RED}║                                                                       ║${NC}"
  echo -e "${RED}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi

