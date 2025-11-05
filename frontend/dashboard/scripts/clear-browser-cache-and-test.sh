#!/bin/bash
#
# Clear Browser Cache and Run E2E Tests
#
# This script ensures Playwright uses fresh browser state
# without any cached JavaScript from previous runs
#

set -e

cd "$(dirname "$0")/.."

echo ""
echo "=============================================="
echo "E2E Testing with Fresh Browser State"
echo "=============================================="
echo ""

echo "Step 1: Cleaning Playwright browser cache..."
rm -rf ~/.cache/ms-playwright/chromium-*/profile-*
echo "✓ Browser profiles cleared"
echo ""

echo "Step 2: Cleaning test results..."
rm -rf test-results playwright-report
echo "✓ Test artifacts cleared"
echo ""

echo "Step 3: Running Playwright tests with fresh state..."
echo ""

# Run tests
npx playwright test --reporter=list,html

echo ""
echo "=============================================="
echo "Tests Complete!"
echo "=============================================="
echo ""
echo "View HTML report:"
echo "  npm run test:e2e:report"
echo ""

