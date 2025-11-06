#!/usr/bin/env bash

# ============================================================================
# Test Ports Endpoint
# ============================================================================
# Tests the /api/ports endpoint of the Service Launcher
#
# Usage:
#   bash scripts/testing/test-ports-endpoint.sh
#
# Requirements:
#   - Service Launcher running on port 3500
#   - curl and jq installed
# ============================================================================

set -euo pipefail

# Configuration
SERVICE_LAUNCHER_URL="${SERVICE_LAUNCHER_URL:-http://localhost:3500}"
PORTS_ENDPOINT="${SERVICE_LAUNCHER_URL}/api/ports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# Tests
# ============================================================================

log_info "Testing Ports Endpoint: ${PORTS_ENDPOINT}"
echo ""

# Test 1: Check if Service Launcher is running
log_info "Test 1: Checking if Service Launcher is running..."
if curl -sf "${SERVICE_LAUNCHER_URL}/health" > /dev/null 2>&1; then
  log_success "Service Launcher is running"
else
  log_error "Service Launcher is not running on ${SERVICE_LAUNCHER_URL}"
  log_info "Please start the Service Launcher first:"
  echo "  cd apps/status && npm run dev"
  exit 1
fi

echo ""

# Test 2: Test /api/ports endpoint
log_info "Test 2: Fetching ports information..."
RESPONSE=$(curl -sf "${PORTS_ENDPOINT}" 2>&1)
HTTP_CODE=$?

if [ $HTTP_CODE -eq 0 ]; then
  log_success "Endpoint responded successfully"
else
  log_error "Failed to fetch ports information (HTTP code: $HTTP_CODE)"
  exit 1
fi

echo ""

# Test 3: Validate JSON structure
log_info "Test 3: Validating JSON structure..."
if echo "$RESPONSE" | jq empty 2>/dev/null; then
  log_success "Valid JSON response"
else
  log_error "Invalid JSON response"
  exit 1
fi

# Test 4: Check required fields
log_info "Test 4: Checking required fields..."
REQUIRED_FIELDS=("success" "timestamp" "durationMs" "stats" "ports")
ALL_FIELDS_PRESENT=true

for field in "${REQUIRED_FIELDS[@]}"; do
  if echo "$RESPONSE" | jq -e ".${field}" > /dev/null 2>&1; then
    log_success "Field '${field}' is present"
  else
    log_error "Field '${field}' is missing"
    ALL_FIELDS_PRESENT=false
  fi
done

if [ "$ALL_FIELDS_PRESENT" = false ]; then
  log_error "Missing required fields"
  exit 1
fi

echo ""

# Test 5: Display statistics
log_info "Test 5: Displaying statistics..."
TOTAL=$(echo "$RESPONSE" | jq -r '.stats.total')
HEALTHY=$(echo "$RESPONSE" | jq -r '.stats.healthy')
UNHEALTHY=$(echo "$RESPONSE" | jq -r '.stats.unhealthy')
DURATION=$(echo "$RESPONSE" | jq -r '.durationMs')

echo ""
echo "  Total Services:     ${TOTAL}"
echo "  Healthy:            ${HEALTHY}"
echo "  Unhealthy:          ${UNHEALTHY}"
echo "  Query Duration:     ${DURATION}ms"
echo ""

# Test 6: Display category breakdown
log_info "Test 6: Category breakdown..."
echo "$RESPONSE" | jq -r '.stats.byCategory | to_entries[] | "  \(.key): \(.value.healthy)/\(.value.total) healthy"'
echo ""

# Test 7: List all ports
log_info "Test 7: Listing all ports..."
echo "$RESPONSE" | jq -r '.ports[] | "  Port \(.port): \(.service.name) (\(.service.category)) - \(if .health.isHealthy then "✓ Healthy" else "✗ Unhealthy" end)"'
echo ""

# Final Summary
log_success "All tests passed! ✅"
log_info "Ports endpoint is working correctly."
echo ""
log_info "You can now access the Ports page in the dashboard:"
echo "  ${BLUE}http://localhost:3103/#/ports${NC}"
echo ""
