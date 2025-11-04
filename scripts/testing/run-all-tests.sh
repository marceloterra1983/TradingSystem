#!/bin/bash
#
# Run All Tests Script
# Executes all test suites (frontend + backend) and generates reports
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  TradingSystem - Test Suite Runner  ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Function to run frontend tests
run_frontend_tests() {
  echo -e "${YELLOW}Running Frontend Tests...${NC}"
  cd "$PROJECT_ROOT/frontend/dashboard"

  if [ "$1" == "--coverage" ]; then
    npm run test:coverage
  else
    npm test
  fi

  FRONTEND_EXIT=$?
  cd "$PROJECT_ROOT"
  return $FRONTEND_EXIT
}

# Function to run backend tests
run_backend_tests() {
  local service=$1
  echo -e "${YELLOW}Running Backend Tests: $service${NC}"
  cd "$PROJECT_ROOT/backend/api/$service"

  if [ "$2" == "--coverage" ]; then
    npm run test:coverage
  else
    npm test
  fi

  SERVICE_EXIT=$?
  cd "$PROJECT_ROOT"
  return $SERVICE_EXIT
}

# Parse arguments
COVERAGE=false
FRONTEND_ONLY=false
BACKEND_ONLY=false
SPECIFIC_SERVICE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --coverage)
      COVERAGE=true
      shift
      ;;
    --frontend)
      FRONTEND_ONLY=true
      shift
      ;;
    --backend)
      BACKEND_ONLY=true
      shift
      ;;
    --service=*)
      SPECIFIC_SERVICE="${1#*=}"
      BACKEND_ONLY=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --coverage         Generate coverage reports"
      echo "  --frontend         Run only frontend tests"
      echo "  --backend          Run only backend tests"
      echo "  --service=NAME     Run specific backend service tests"
      echo "  --help             Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                  # Run all tests"
      echo "  $0 --coverage                       # Run all tests with coverage"
      echo "  $0 --frontend --coverage            # Frontend tests with coverage"
      echo "  $0 --service=workspace              # Specific backend service"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Test results tracking
FRONTEND_PASSED=false
BACKEND_SERVICES_PASSED=true

# Run Frontend Tests
if [ "$BACKEND_ONLY" == "false" ]; then
  if $COVERAGE; then
    run_frontend_tests --coverage
  else
    run_frontend_tests
  fi

  if [ $? -eq 0 ]; then
    FRONTEND_PASSED=true
    echo -e "${GREEN}✓ Frontend tests passed${NC}"
  else
    echo -e "${RED}✗ Frontend tests failed${NC}"
  fi
  echo ""
fi

# Run Backend Tests
if [ "$FRONTEND_ONLY" == "false" ]; then
  # Define backend services
  if [ -n "$SPECIFIC_SERVICE" ]; then
    SERVICES=("$SPECIFIC_SERVICE")
  else
    SERVICES=("documentation-api" "workspace" "telegram-gateway")
  fi

  for service in "${SERVICES[@]}"; do
    SERVICE_PATH="$PROJECT_ROOT/backend/api/$service"

    if [ ! -d "$SERVICE_PATH" ]; then
      echo -e "${YELLOW}⚠ Service $service not found, skipping${NC}"
      continue
    fi

    # Check if service has tests
    if [ ! -f "$SERVICE_PATH/package.json" ]; then
      echo -e "${YELLOW}⚠ Service $service has no package.json, skipping${NC}"
      continue
    fi

    # Check if test script exists
    if ! grep -q '"test"' "$SERVICE_PATH/package.json"; then
      echo -e "${YELLOW}⚠ Service $service has no test script, skipping${NC}"
      continue
    fi

    if $COVERAGE; then
      run_backend_tests "$service" --coverage
    else
      run_backend_tests "$service"
    fi

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ $service tests passed${NC}"
    else
      echo -e "${RED}✗ $service tests failed${NC}"
      BACKEND_SERVICES_PASSED=false
    fi
    echo ""
  done
fi

# Summary
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Test Summary${NC}"
echo -e "${GREEN}======================================${NC}"

if [ "$BACKEND_ONLY" == "false" ]; then
  if [ "$FRONTEND_PASSED" == "true" ]; then
    echo -e "Frontend:  ${GREEN}✓ PASSED${NC}"
  else
    echo -e "Frontend:  ${RED}✗ FAILED${NC}"
  fi
fi

if [ "$FRONTEND_ONLY" == "false" ]; then
  if [ "$BACKEND_SERVICES_PASSED" == "true" ]; then
    echo -e "Backend:   ${GREEN}✓ PASSED${NC}"
  else
    echo -e "Backend:   ${RED}✗ FAILED${NC}"
  fi
fi

echo ""

# Exit with appropriate code
if [ "$FRONTEND_PASSED" == "true" ] && [ "$BACKEND_SERVICES_PASSED" == "true" ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed${NC}"
  exit 1
fi
