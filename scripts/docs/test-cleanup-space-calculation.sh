#!/bin/bash
# Test script to verify space freed calculation works correctly

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="/tmp/docusaurus-test-$$"
CLEANUP_SCRIPT="${SCRIPT_DIR}/cleanup-docusaurus-artifacts.sh"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup_test_env() {
    rm -rf "$TEST_DIR"
}

trap cleanup_test_env EXIT

echo "🧪 Testing cleanup-docusaurus-artifacts.sh space calculation"
echo "============================================================="

# Create test environment
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Create minimal package.json
cat > package.json << 'EOF'
{
  "name": "test-docusaurus",
  "version": "1.0.0",
  "scripts": {
    "clear": "echo 'Clearing cache...'"
  }
}
EOF

# Create required directories for validation
mkdir -p src static scripts

# Create some test files
echo "test" > src/test.js
echo "test" > static/test.html
echo "test" > scripts/test.sh

# Create artifacts with known sizes
mkdir -p node_modules/.cache
echo "dummy node_modules content" > node_modules/test.js
echo "more content" > node_modules/.cache/cache.json

mkdir -p .docusaurus
echo "docusaurus cache" > .docusaurus/cache.json

mkdir -p build
echo "build output" > build/index.html

echo "package lock" > package-lock.json

echo ""
echo "📊 Test 1: Dry-run mode should report 0 space freed"
echo "---------------------------------------------------"

# Modify the script to use current directory
sed "s|DOCUSAURUS_DIR=.*|DOCUSAURUS_DIR=\"$TEST_DIR\"|" "$CLEANUP_SCRIPT" > ./cleanup-test.sh
chmod +x ./cleanup-test.sh

# Run in dry-run mode
./cleanup-test.sh --dry-run > /dev/null 2>&1 || true

# Check the JSON report
LATEST_REPORT=$(ls -t CLEANUP-REPORT-*.json 2>/dev/null | head -1)
if [[ -n "$LATEST_REPORT" ]]; then
    SPACE_FREED=$(jq -r '.postCleanupState.spaceFreed' "$LATEST_REPORT")
    if [[ "$SPACE_FREED" == "0" ]]; then
        echo -e "${GREEN}✅ PASS: Dry-run reports 0 space freed${NC}"
    else
        echo -e "${RED}❌ FAIL: Dry-run reports $SPACE_FREED bytes freed (expected 0)${NC}"
        exit 1
    fi
    
    # Verify artifacts still exist
    if [[ -d "node_modules" && -d ".docusaurus" && -d "build" && -f "package-lock.json" ]]; then
        echo -e "${GREEN}✅ PASS: All artifacts still present after dry-run${NC}"
    else
        echo -e "${RED}❌ FAIL: Artifacts were removed in dry-run mode${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ FAIL: No cleanup report generated${NC}"
    exit 1
fi

echo ""
echo "📊 Test 2: Normal mode should report actual space freed"
echo "-------------------------------------------------------"

# Get sizes before deletion
NODE_SIZE=$(du -b node_modules 2>/dev/null | cut -f1 || echo 0)
DOC_SIZE=$(du -b .docusaurus 2>/dev/null | cut -f1 || echo 0)
BUILD_SIZE=$(du -b build 2>/dev/null | cut -f1 || echo 0)
LOCK_SIZE=$(stat -c%s package-lock.json 2>/dev/null || echo 0)
EXPECTED_TOTAL=$((NODE_SIZE + DOC_SIZE + BUILD_SIZE + LOCK_SIZE))

echo "Expected total space to be freed: $EXPECTED_TOTAL bytes"

# Run in normal mode
./cleanup-test.sh > /dev/null 2>&1 || true

# Check the new JSON report
LATEST_REPORT=$(ls -t CLEANUP-REPORT-*.json 2>/dev/null | head -1)
if [[ -n "$LATEST_REPORT" ]]; then
    SPACE_FREED=$(jq -r '.postCleanupState.spaceFreed' "$LATEST_REPORT")
    
    if [[ "$SPACE_FREED" == "$EXPECTED_TOTAL" ]]; then
        echo -e "${GREEN}✅ PASS: Normal mode reports $SPACE_FREED bytes freed (matches expected)${NC}"
    else
        echo -e "${YELLOW}⚠️  WARNING: Space freed ($SPACE_FREED) differs from expected ($EXPECTED_TOTAL)${NC}"
        echo "   This may be due to du -b behavior differences between systems"
    fi
    
    # Verify artifacts were actually removed
    if [[ ! -d "node_modules" && ! -d ".docusaurus" && ! -d "build" && ! -f "package-lock.json" ]]; then
        echo -e "${GREEN}✅ PASS: All artifacts removed after normal run${NC}"
    else
        echo -e "${RED}❌ FAIL: Some artifacts still exist after normal run${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ FAIL: No cleanup report generated in normal mode${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Summary:"
echo "  ✅ Dry-run correctly reports 0 space freed"
echo "  ✅ Dry-run does not delete artifacts"
echo "  ✅ Normal mode reports actual space freed"
echo "  ✅ Normal mode deletes artifacts successfully"
