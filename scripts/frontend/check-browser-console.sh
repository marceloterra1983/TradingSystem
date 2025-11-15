#!/bin/bash

# check-browser-console.sh
# Check for common browser console error patterns in code

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
echo -e "${BLUE}Browser Console Error Patterns Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$DASHBOARD_DIR"

total_issues=0

# Check 1: Missing keys in map()
echo -e "${YELLOW}[1] Checking for missing keys in map()...${NC}"
missing_keys=$(grep -r "\.map(" "$SRC_DIR" --include="*.tsx" --include="*.jsx" -A 2 | \
    grep -v "key=" | grep "<" | wc -l || echo "0")
if [ "$missing_keys" -gt 0 ]; then
    echo -e "${RED}  ✗ Found $missing_keys potential missing keys${NC}"
    total_issues=$((total_issues + missing_keys))
else
    echo -e "${GREEN}  ✓ No missing keys found${NC}"
fi

# Check 2: Hardcoded localhost URLs (CORS issues)
echo -e "${YELLOW}[2] Checking for hardcoded localhost URLs...${NC}"
hardcoded_urls=$(grep -r "http://localhost" "$SRC_DIR" --include="*.tsx" --include="*.jsx" | \
    wc -l || echo "0")
if [ "$hardcoded_urls" -gt 0 ]; then
    echo -e "${RED}  ✗ Found $hardcoded_urls hardcoded URLs${NC}"
    grep -rn "http://localhost" "$SRC_DIR" --include="*.tsx" --include="*.jsx" | head -10
    total_issues=$((total_issues + hardcoded_urls))
else
    echo -e "${GREEN}  ✓ No hardcoded URLs found${NC}"
fi

# Check 3: Unguarded console statements
echo -e "${YELLOW}[3] Checking for unguarded console statements...${NC}"
console_statements=$(grep -r "console\." "$SRC_DIR" --include="*.tsx" --include="*.jsx" | \
    grep -v "// eslint-disable" | \
    grep -v "eslint-disable-next-line" | \
    wc -l || echo "0")
if [ "$console_statements" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $console_statements console statements${NC}"
    total_issues=$((total_issues + console_statements / 4))  # Less critical
else
    echo -e "${GREEN}  ✓ All console statements are guarded${NC}"
fi

# Check 4: Deprecated React patterns
echo -e "${YELLOW}[4] Checking for deprecated React patterns...${NC}"
deprecated_patterns=0

# componentWillMount, componentWillReceiveProps, etc.
if grep -r "componentWillMount\|componentWillReceiveProps\|componentWillUpdate" "$SRC_DIR" \
    --include="*.tsx" --include="*.jsx" > /dev/null 2>&1; then
    echo -e "${RED}  ✗ Found deprecated lifecycle methods${NC}"
    deprecated_patterns=$((deprecated_patterns + 1))
fi

# String refs
if grep -r 'ref="[^"]*"' "$SRC_DIR" --include="*.tsx" --include="*.jsx" > /dev/null 2>&1; then
    echo -e "${RED}  ✗ Found string refs (deprecated)${NC}"
    deprecated_patterns=$((deprecated_patterns + 1))
fi

if [ "$deprecated_patterns" -eq 0 ]; then
    echo -e "${GREEN}  ✓ No deprecated patterns found${NC}"
else
    total_issues=$((total_issues + deprecated_patterns))
fi

# Check 5: Missing alt attributes on images
echo -e "${YELLOW}[5] Checking for images without alt text...${NC}"
missing_alt=$(grep -r "<img" "$SRC_DIR" --include="*.tsx" --include="*.jsx" | \
    grep -v "alt=" | wc -l || echo "0")
if [ "$missing_alt" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $missing_alt images without alt text${NC}"
    total_issues=$((total_issues + missing_alt / 2))  # Less critical
else
    echo -e "${GREEN}  ✓ All images have alt text${NC}"
fi

# Check 6: useEffect dependency issues
echo -e "${YELLOW}[6] Checking for potential useEffect dependency issues...${NC}"
useeffect_count=$(grep -r "useEffect" "$SRC_DIR" --include="*.tsx" --include="*.jsx" | \
    grep "eslint-disable.*exhaustive-deps" | wc -l || echo "0")
if [ "$useeffect_count" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $useeffect_count useEffect with disabled dep warnings${NC}"
    total_issues=$((total_issues + useeffect_count / 3))  # Less critical
else
    echo -e "${GREEN}  ✓ No disabled dependency warnings${NC}"
fi

# Check 7: Prop types warnings
echo -e "${YELLOW}[7] Checking PropTypes usage...${NC}"
proptype_files=$(find "$SRC_DIR" -name "*.jsx" | wc -l || echo "0")
if [ "$proptype_files" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $proptype_files .jsx files (consider TypeScript)${NC}"
else
    echo -e "${GREEN}  ✓ All components use TypeScript${NC}"
fi

# Check 8: Event handler naming
echo -e "${YELLOW}[8] Checking event handler naming conventions...${NC}"
bad_handlers=$(grep -r "on[A-Z][a-zA-Z]*\s*=" "$SRC_DIR" --include="*.tsx" --include="*.jsx" | \
    grep -v "onClick\|onChange\|onSubmit\|onFocus\|onBlur\|onKeyDown\|onKeyUp\|onKeyPress\|onMouseEnter\|onMouseLeave" | \
    wc -l || echo "0")
if [ "$bad_handlers" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $bad_handlers potential custom event handlers${NC}"
else
    echo -e "${GREEN}  ✓ Event handlers follow conventions${NC}"
fi

# Check 9: Inline styles (performance)
echo -e "${YELLOW}[9] Checking for inline styles...${NC}"
inline_styles=$(grep -r 'style={{' "$SRC_DIR" --include="*.tsx" --include="*.jsx" | \
    wc -l || echo "0")
if [ "$inline_styles" -gt 50 ]; then
    echo -e "${YELLOW}  ⚠ Found $inline_styles inline styles (consider CSS classes)${NC}"
    total_issues=$((total_issues + inline_styles / 20))  # Very low priority
else
    echo -e "${GREEN}  ✓ Minimal inline styles${NC}"
fi

# Check 10: Large components (maintainability)
echo -e "${YELLOW}[10] Checking for large components...${NC}"
large_files=0
while IFS= read -r file; do
    lines=$(wc -l < "$file")
    if [ "$lines" -gt 500 ]; then
        large_files=$((large_files + 1))
        echo -e "${YELLOW}    $file: $lines lines${NC}"
    fi
done < <(find "$SRC_DIR" -name "*.tsx" -o -name "*.jsx")

if [ "$large_files" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $large_files large components (>500 lines)${NC}"
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
    echo -e "${GREEN}✓ No critical issues found!${NC}"
else
    echo -e "${YELLOW}⚠ Found approximately $total_issues issues${NC}"
    echo ""
    echo -e "${BLUE}Recommended actions:${NC}"
    echo -e "  1. Run: ${YELLOW}npm run lint:fix${NC}"
    echo -e "  2. Run: ${YELLOW}bash scripts/frontend/auto-fix-issues.sh${NC}"
    echo -e "  3. Review: ${YELLOW}npm run type-check${NC}"
fi
echo ""
