#!/bin/bash
#
# Setup E2E Testing with Playwright for Workspace
#
# This script installs Playwright and browsers, then runs initial tests
#
# Usage: bash scripts/setup-e2e-tests.sh [--skip-install] [--run-tests]
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SKIP_INSTALL=false
RUN_TESTS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-install)
      SKIP_INSTALL=true
      shift
      ;;
    --run-tests)
      RUN_TESTS=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo ""
echo "=============================================="
echo "E2E Testing Setup - Playwright"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${YELLOW}⚠️  Not in frontend/dashboard directory!${NC}"
  echo "Please run from: frontend/dashboard/"
  exit 1
fi

# Step 1: Install Playwright
if [ "$SKIP_INSTALL" = false ]; then
  echo -e "${BLUE}Step 1: Installing Playwright...${NC}"
  echo ""
  
  npm install -D @playwright/test
  
  echo ""
  echo -e "${GREEN}✓ Playwright installed${NC}"
  echo ""
  
  # Step 2: Install browsers
  echo -e "${BLUE}Step 2: Installing Chromium browser...${NC}"
  echo ""
  
  npx playwright install chromium
  
  echo ""
  echo -e "${GREEN}✓ Chromium browser installed${NC}"
  echo ""
else
  echo -e "${YELLOW}Skipping installation (--skip-install)${NC}"
  echo ""
fi

# Step 3: Verify setup
echo -e "${BLUE}Step 3: Verifying setup...${NC}"
echo ""

# Check if playwright.config.ts exists
if [ -f "playwright.config.ts" ]; then
  echo -e "${GREEN}✓ playwright.config.ts found${NC}"
else
  echo -e "${YELLOW}⚠️  playwright.config.ts not found!${NC}"
fi

# Check if test file exists
if [ -f "tests/e2e/workspace.spec.ts" ]; then
  echo -e "${GREEN}✓ tests/e2e/workspace.spec.ts found${NC}"
else
  echo -e "${YELLOW}⚠️  tests/e2e/workspace.spec.ts not found!${NC}"
fi

echo ""

# Step 4: Run tests (if requested)
if [ "$RUN_TESTS" = true ]; then
  echo -e "${BLUE}Step 4: Running E2E tests...${NC}"
  echo ""
  
  npm run test:e2e
  
  echo ""
  echo -e "${GREEN}✓ E2E tests completed${NC}"
  echo ""
  
  # Show report
  echo "To view HTML report, run:"
  echo "  npm run test:e2e:report"
  echo ""
fi

# Final instructions
echo "=============================================="
echo "E2E Testing Setup Complete!"
echo "=============================================="
echo ""
echo "Available commands:"
echo ""
echo "  npm run test:e2e           # Run all tests"
echo "  npm run test:e2e:ui        # Interactive UI mode"
echo "  npm run test:e2e:headed    # See browser while testing"
echo "  npm run test:e2e:debug     # Debug mode"
echo "  npm run test:e2e:report    # View HTML report"
echo ""
echo "Test file:"
echo "  tests/e2e/workspace.spec.ts (20 tests)"
echo ""
echo "Next steps:"
echo "  1. Run: npm run test:e2e:ui"
echo "  2. Watch tests execute in browser"
echo "  3. Fix any failing tests"
echo "  4. Add more test cases as needed"
echo ""
echo "=============================================="
echo ""

