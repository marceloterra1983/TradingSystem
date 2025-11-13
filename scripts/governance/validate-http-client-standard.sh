#!/bin/bash
################################################################################
# HTTP Client Standard Validation Script (STD-020)
#
# Purpose: Validates compliance with HTTP Client standardization requirements
# Related: STD-020, ADR-008
# Usage: bash scripts/governance/validate-http-client-standard.sh
################################################################################

# Don't exit on first error - we want to see all validation results
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED_CHECKS=0
PASSED_CHECKS=0

echo "🔍 Validating HTTP Client Standard (STD-020)..."
echo ""

################################################################################
# Helper Functions
################################################################################

pass() {
  echo -e "${GREEN}✅ PASS:${NC} $1"
  ((PASSED_CHECKS++))
}

fail() {
  echo -e "${RED}❌ FAIL:${NC} $1"
  ((FAILED_CHECKS++))
}

warn() {
  echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

check_file_exists() {
  if [ ! -f "$1" ]; then
    fail "File not found: $1"
    return 1
  fi
  return 0
}

################################################################################
# REQ-HTTP-001: Check axios version >= 1.6.0
################################################################################

echo "📦 REQ-HTTP-001: Checking axios version..."

if check_file_exists "frontend/dashboard/package.json"; then
  AXIOS_VERSION=$(grep '"axios":' frontend/dashboard/package.json | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)

  if [ -z "$AXIOS_VERSION" ]; then
    fail "axios not found in package.json"
  else
    MAJOR=$(echo $AXIOS_VERSION | cut -d. -f1)
    MINOR=$(echo $AXIOS_VERSION | cut -d. -f2)

    if [ "$MAJOR" -ge 2 ] || ([ "$MAJOR" -eq 1 ] && [ "$MINOR" -ge 6 ]); then
      pass "axios version $AXIOS_VERSION (>= 1.6.0)"
    else
      fail "axios version $AXIOS_VERSION is too old (must be >= 1.6.0)"
    fi
  fi
fi

echo ""

################################################################################
# REQ-HTTP-002: Check axios-retry is installed
################################################################################

echo "🔄 REQ-HTTP-002: Checking axios-retry installation..."

if check_file_exists "frontend/dashboard/package.json"; then
  if grep -q '"axios-retry":' frontend/dashboard/package.json; then
    RETRY_VERSION=$(grep '"axios-retry":' frontend/dashboard/package.json | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    pass "axios-retry version $RETRY_VERSION installed"
  else
    fail "axios-retry not found in package.json"
  fi
fi

echo ""

################################################################################
# REQ-HTTP-009: Check for hardcoded service URLs
################################################################################

echo "🌐 REQ-HTTP-009: Checking for hardcoded service URLs..."

HARDCODED_URLS_FOUND=0

if [ -d "frontend/dashboard/src/services" ]; then
  # Search for localhost:XXXX patterns (excluding 9082 which is the gateway)
  HARDCODED=$(grep -r "localhost:[0-9]\{4\}" frontend/dashboard/src/services/ | grep -v "localhost:9082" || true)

  if [ -n "$HARDCODED" ]; then
    fail "Found hardcoded service URLs (must use Traefik gateway :9082):"
    echo "$HARDCODED"
    HARDCODED_URLS_FOUND=1
  else
    pass "No hardcoded service URLs found (all via gateway)"
  fi
fi

echo ""

################################################################################
# REQ-HTTP-003: Check for CircuitBreaker implementation
################################################################################

echo "🔌 REQ-HTTP-003: Checking CircuitBreaker implementation..."

if check_file_exists "frontend/dashboard/src/lib/circuit-breaker.ts"; then
  if grep -q "class CircuitBreaker" frontend/dashboard/src/lib/circuit-breaker.ts; then
    if grep -q "CircuitState.CLOSED\|CircuitState.OPEN\|CircuitState.HALF_OPEN" frontend/dashboard/src/lib/circuit-breaker.ts; then
      pass "CircuitBreaker with state machine implemented"
    else
      fail "CircuitBreaker missing state machine (CLOSED/OPEN/HALF_OPEN)"
    fi
  else
    fail "CircuitBreaker class not found in circuit-breaker.ts"
  fi
else
  warn "CircuitBreaker file not yet created (expected during Phase 1)"
fi

echo ""

################################################################################
# REQ-HTTP-004: Check timeout configuration by operation type
################################################################################

echo "⏱️  REQ-HTTP-004: Checking timeout configuration..."

if check_file_exists "frontend/dashboard/src/lib/http-client.ts"; then
  if grep -q "OperationType" frontend/dashboard/src/lib/http-client.ts; then
    if grep -q "TIMEOUT_CONFIG.*Record<OperationType" frontend/dashboard/src/lib/http-client.ts; then
      pass "Timeout configuration by operation type found"
    else
      fail "TIMEOUT_CONFIG not found or incorrectly typed"
    fi
  else
    fail "OperationType enum not found in http-client.ts"
  fi
else
  warn "HttpClient file not yet created (expected during Phase 1)"
fi

echo ""

################################################################################
# REQ-SEC-001: Check for inter-service authentication token
################################################################################

echo "🔐 REQ-SEC-001: Checking inter-service authentication..."

if [ -f "frontend/dashboard/src/lib/http-client.ts" ]; then
  if grep -q "X-Service-Token" frontend/dashboard/src/lib/http-client.ts; then
    if grep -q "VITE_INTER_SERVICE_SECRET" frontend/dashboard/src/lib/http-client.ts; then
      pass "Inter-service authentication header configured"
    else
      fail "X-Service-Token header found but not using VITE_INTER_SERVICE_SECRET"
    fi
  else
    fail "X-Service-Token header not found in HttpClient"
  fi
fi

# Check if environment variable exists in .env.example
if check_file_exists ".env.example"; then
  if grep -q "VITE_INTER_SERVICE_SECRET" .env.example; then
    pass "VITE_INTER_SERVICE_SECRET documented in .env.example"
  else
    fail "VITE_INTER_SERVICE_SECRET not found in .env.example"
  fi
fi

echo ""

################################################################################
# REQ-DOC-001: Check for service client documentation
################################################################################

echo "📚 REQ-DOC-001: Checking service client documentation..."

DOCUMENTED_METHODS=0
TOTAL_METHODS=0

if [ -d "frontend/dashboard/src/services" ]; then
  for SERVICE_FILE in frontend/dashboard/src/services/*.ts; do
    if [ -f "$SERVICE_FILE" ]; then
      # Count public methods (async functions)
      METHODS=$(grep -c "async.*(" "$SERVICE_FILE" 2>/dev/null || echo "0")
      METHODS=$(echo "$METHODS" | tr -d '[:space:]')  # Remove whitespace
      TOTAL_METHODS=$((TOTAL_METHODS + METHODS))

      # Count JSDoc comments (@returns)
      JSDOC=$(grep -c "@returns" "$SERVICE_FILE" 2>/dev/null || echo "0")
      JSDOC=$(echo "$JSDOC" | tr -d '[:space:]')  # Remove whitespace
      DOCUMENTED_METHODS=$((DOCUMENTED_METHODS + JSDOC))
    fi
  done

  if [ "$TOTAL_METHODS" -gt 0 ]; then
    COVERAGE=$((DOCUMENTED_METHODS * 100 / TOTAL_METHODS))
    if [ "$COVERAGE" -ge 80 ]; then
      pass "Service methods documentation: ${COVERAGE}% (${DOCUMENTED_METHODS}/${TOTAL_METHODS} methods)"
    else
      fail "Service methods documentation: ${COVERAGE}% (${DOCUMENTED_METHODS}/${TOTAL_METHODS} methods) - target: 80%"
    fi
  else
    warn "No service methods found yet (expected during Phase 2)"
  fi
fi

echo ""

################################################################################
# REQ-TEST-001: Check test coverage (if tests exist)
################################################################################

echo "🧪 REQ-TEST-001: Checking test coverage..."

if [ -d "frontend/dashboard/__tests__" ] || [ -d "frontend/dashboard/src/__tests__" ]; then
  if [ -f "frontend/dashboard/package.json" ]; then
    if grep -q "test:coverage" frontend/dashboard/package.json; then
      pass "Test coverage script configured in package.json"

      # Try to run coverage (optional, may fail if not implemented yet)
      # cd frontend/dashboard && npm run test:coverage -- --silent 2>/dev/null || warn "Tests not yet passing"
    else
      fail "test:coverage script not found in package.json"
    fi
  fi
else
  warn "No __tests__ directory found yet (expected during Phase 1)"
fi

echo ""

################################################################################
# Additional Checks: Environment Variables
################################################################################

echo "⚙️  Additional: Checking environment variables..."

if check_file_exists ".env.example"; then
  ENV_VARS=(
    "VITE_API_GATEWAY_URL"
    "VITE_INTER_SERVICE_SECRET"
    "VITE_HTTP_TIMEOUT_DEFAULT"
    "VITE_CIRCUIT_BREAKER_ENABLED"
    "VITE_HTTP_RETRY_ENABLED"
    "VITE_HTTP_LOGGING_ENABLED"
  )

  MISSING_VARS=0
  for VAR in "${ENV_VARS[@]}"; do
    if grep -q "^$VAR=" .env.example || grep -q "^# $VAR=" .env.example; then
      pass "$VAR documented"
    else
      fail "$VAR not documented in .env.example"
      MISSING_VARS=$((MISSING_VARS + 1))
    fi
  done

  if [ $MISSING_VARS -eq 0 ]; then
    pass "All required environment variables documented"
  fi
fi

echo ""

################################################################################
# Summary
################################################################################

echo "════════════════════════════════════════════════════════════════"
echo "Summary:"
echo "  ✅ Passed: $PASSED_CHECKS"
echo "  ❌ Failed: $FAILED_CHECKS"
echo "════════════════════════════════════════════════════════════════"

if [ $FAILED_CHECKS -gt 0 ]; then
  echo ""
  echo -e "${RED}❌ HTTP Client Standard validation FAILED${NC}"
  echo "Fix the issues above and re-run this script."
  exit 1
else
  echo ""
  echo -e "${GREEN}✅ HTTP Client Standard validation PASSED${NC}"
  echo "All requirements are met. Ready for implementation."
  exit 0
fi
