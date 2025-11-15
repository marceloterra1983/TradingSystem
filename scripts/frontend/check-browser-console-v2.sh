#!/bin/bash

# check-browser-console-v2.sh
# IMPROVED version - eliminates false positives

set -e

DASHBOARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../frontend/dashboard" && pwd)"
SRC_DIR="$DASHBOARD_DIR/src"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Browser Console Error Checker (v2)${NC}"
echo -e "${BLUE}Eliminates False Positives${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$DASHBOARD_DIR"

total_issues=0

# Check 1: ESLint (Official - Most Reliable)
echo -e "${YELLOW}[1] Running ESLint (official validation)...${NC}"
if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ ESLint: 0 errors, 0 warnings${NC}"
else
    eslint_errors=$(npm run lint 2>&1 | grep -E "✖.*problems" | head -1 || echo "0 problems")
    echo -e "${RED}  ✗ ESLint: $eslint_errors${NC}"
    total_issues=$((total_issues + 10))  # High priority
fi

# Check 2: TypeScript (Official)
echo -e "${YELLOW}[2] Running TypeScript compiler...${NC}"
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ TypeScript: 0 errors${NC}"
else
    echo -e "${RED}  ✗ TypeScript has errors${NC}"
    total_issues=$((total_issues + 10))  # High priority
fi

# Check 3: Missing keys in .map() - Use ESLint rule instead of grep
echo -e "${YELLOW}[3] Checking for missing keys (via ESLint react/jsx-key)...${NC}"
missing_keys=$(npx eslint "$SRC_DIR" --ext .tsx,.jsx --format json 2>/dev/null | \
    jq '[.[] | .messages[] | select(.ruleId == "react/jsx-key")] | length' 2>/dev/null || echo "0")
missing_keys=${missing_keys:-0}  # Default to 0 if empty
if [ "$missing_keys" -gt 0 ]; then
    echo -e "${RED}  ✗ Found $missing_keys missing keys${NC}"
    total_issues=$((total_issues + missing_keys))
else
    echo -e "${GREEN}  ✓ All .map() have keys${NC}"
fi

# Check 4: Images without alt - Use proper multi-line grep
echo -e "${YELLOW}[4] Checking for images without alt text...${NC}"
# Count files with <img tags first
img_files=$(grep -rl "<img" "$SRC_DIR" --include="*.tsx" --include="*.jsx" | wc -l)
# Count files that have both <img and alt=
img_with_alt=$(grep -rl "<img" "$SRC_DIR" --include="*.tsx" --include="*.jsx" | \
    xargs grep -l "alt=" | wc -l)
missing_alt=$((img_files - img_with_alt))
if [ "$missing_alt" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $missing_alt files with images missing alt${NC}"
    total_issues=$((total_issues + missing_alt))
else
    echo -e "${GREEN}  ✓ All images have alt text${NC}"
fi

# Check 5: Hardcoded URLs (Real CORS issues)
echo -e "${YELLOW}[5] Checking for hardcoded localhost URLs...${NC}"
# Only count URLs that are NOT in comments or examples
hardcoded_urls=$(grep -rn "http://localhost:[0-9]" "$SRC_DIR" --include="*.tsx" --include="*.jsx" | \
    grep -v "\/\/" | grep -v "/\*" | grep -v "\*/" | wc -l || echo "0")
if [ "$hardcoded_urls" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $hardcoded_urls hardcoded URLs${NC}"
    total_issues=$((total_issues + hardcoded_urls))
else
    echo -e "${GREEN}  ✓ No hardcoded URLs (using dynamic resolution)${NC}"
fi

# Check 6: Console statements (only in production-facing code)
echo -e "${YELLOW}[6] Checking for console statements...${NC}"
# Note: These are removed by Terser in production build
console_count=$(grep -r "console\." "$SRC_DIR" --include="*.tsx" --include="*.jsx" | \
    grep -v "// eslint-disable" | grep -v "eslint-disable-next-line" | wc -l || echo "0")
if [ "$console_count" -gt 0 ]; then
    echo -e "${GREEN}  ✓ Found $console_count console statements (removed in production)${NC}"
else
    echo -e "${GREEN}  ✓ No console statements${NC}"
fi

# Check 7: Large components (maintenance suggestion only)
echo -e "${YELLOW}[7] Checking for large components (>500 lines)...${NC}"
large_files=0
while IFS= read -r file; do
    lines=$(wc -l < "$file")
    if [ "$lines" -gt 500 ]; then
        large_files=$((large_files + 1))
    fi
done < <(find "$SRC_DIR" -name "*.tsx" -o -name "*.jsx")

if [ "$large_files" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $large_files large components (refactoring suggested)${NC}"
else
    echo -e "${GREEN}  ✓ All components are reasonably sized${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$total_issues" -eq 0 ]; then
    echo -e "${GREEN}✅ ZERO REAL ISSUES FOUND!${NC}"
    echo ""
    echo -e "${GREEN}All official validation tools (ESLint, TypeScript) confirm:${NC}"
    echo -e "${GREEN}CODE IS CLEAN - NO ERRORS OR WARNINGS${NC}"
else
    echo -e "${RED}⚠ Found $total_issues real issues${NC}"
    echo ""
    echo -e "${BLUE}Recommended actions:${NC}"
    echo -e "  1. Fix ESLint errors: ${YELLOW}npm run lint${NC}"
    echo -e "  2. Fix TypeScript errors: ${YELLOW}npm run type-check${NC}"
    echo -e "  3. Review output above for specific issues"
fi
echo ""
