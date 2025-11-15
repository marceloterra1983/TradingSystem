#!/bin/bash

# fix-console-errors.sh
# Comprehensive script to identify and fix all console warnings/errors in the dashboard

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DASHBOARD_DIR="$PROJECT_ROOT/frontend/dashboard"
REPORT_DIR="$DASHBOARD_DIR/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create reports directory
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Dashboard Console Errors Fix Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$DASHBOARD_DIR"

# Step 1: Run ESLint and capture issues
echo -e "${YELLOW}[1/9] Running ESLint analysis...${NC}"
npx eslint . \
    --ignore-pattern 'public/sw.js' \
    --ignore-pattern 'dist/' \
    --ignore-pattern 'node_modules/' \
    --format json \
    --output-file "$REPORT_DIR/eslint-report-${TIMESTAMP}.json" \
    2>&1 || true

# Generate human-readable ESLint report
npx eslint . \
    --ignore-pattern 'public/sw.js' \
    --ignore-pattern 'dist/' \
    --ignore-pattern 'node_modules/' \
    --format stylish \
    > "$REPORT_DIR/eslint-report-${TIMESTAMP}.txt" 2>&1 || true

echo -e "${GREEN}✓ ESLint report saved to: $REPORT_DIR/eslint-report-${TIMESTAMP}.txt${NC}"

# Step 2: Check for unused imports
echo -e "${YELLOW}[2/9] Checking for unused imports...${NC}"
npx eslint . \
    --ignore-pattern 'public/sw.js' \
    --ignore-pattern 'dist/' \
    --rule 'no-unused-vars: error' \
    --rule '@typescript-eslint/no-unused-vars: error' \
    --format compact \
    > "$REPORT_DIR/unused-imports-${TIMESTAMP}.txt" 2>&1 || true

echo -e "${GREEN}✓ Unused imports report saved${NC}"

# Step 3: Check for missing PropTypes
echo -e "${YELLOW}[3/9] Checking for PropTypes issues...${NC}"
grep -r "PropTypes" src/ --include="*.jsx" --include="*.tsx" || echo "No PropTypes found"

# Step 4: Check for React warnings patterns
echo -e "${YELLOW}[4/9] Scanning for React anti-patterns...${NC}"
cat > "$REPORT_DIR/react-warnings-${TIMESTAMP}.txt" << 'EOF'
# React Anti-patterns Found:

## Missing Keys in Lists
EOF

grep -rn "\.map(" src/ --include="*.jsx" --include="*.tsx" | \
    grep -v "key=" >> "$REPORT_DIR/react-warnings-${TIMESTAMP}.txt" || true

echo "" >> "$REPORT_DIR/react-warnings-${TIMESTAMP}.txt"
echo "## useEffect Dependencies" >> "$REPORT_DIR/react-warnings-${TIMESTAMP}.txt"
grep -rn "useEffect" src/ --include="*.jsx" --include="*.tsx" | \
    grep -v "eslint-disable" >> "$REPORT_DIR/react-warnings-${TIMESTAMP}.txt" || true

echo -e "${GREEN}✓ React warnings scan complete${NC}"

# Step 5: Check TypeScript errors
echo -e "${YELLOW}[5/9] Running TypeScript type check...${NC}"
npm run type-check > "$REPORT_DIR/typescript-errors-${TIMESTAMP}.txt" 2>&1 || true
echo -e "${GREEN}✓ TypeScript check complete${NC}"

# Step 6: Check for hardcoded URLs (CORS issues)
echo -e "${YELLOW}[6/9] Checking for hardcoded URLs...${NC}"
grep -rn "http://localhost" src/ --include="*.jsx" --include="*.tsx" \
    > "$REPORT_DIR/hardcoded-urls-${TIMESTAMP}.txt" || echo "No hardcoded URLs found"
echo -e "${GREEN}✓ URL check complete${NC}"

# Step 7: Check for console.log statements
echo -e "${YELLOW}[7/9] Checking for console statements...${NC}"
grep -rn "console\." src/ --include="*.jsx" --include="*.tsx" \
    > "$REPORT_DIR/console-statements-${TIMESTAMP}.txt" || echo "No console statements found"
echo -e "${GREEN}✓ Console statements check complete${NC}"

# Step 8: Analyze bundle size
echo -e "${YELLOW}[8/9] Analyzing bundle size...${NC}"
npm run build > "$REPORT_DIR/build-output-${TIMESTAMP}.txt" 2>&1 || true
echo -e "${GREEN}✓ Build analysis complete${NC}"

# Step 9: Generate comprehensive report
echo -e "${YELLOW}[9/9] Generating comprehensive report...${NC}"

cat > "$REPORT_DIR/COMPREHENSIVE-REPORT-${TIMESTAMP}.md" << EOF
# Dashboard Console Errors - Comprehensive Report
Generated: $(date)

## Summary

This report identifies all console warnings and errors in the dashboard.

## 1. ESLint Issues

\`\`\`
$(cat "$REPORT_DIR/eslint-report-${TIMESTAMP}.txt" | head -100)
\`\`\`

Full report: [eslint-report-${TIMESTAMP}.txt](./eslint-report-${TIMESTAMP}.txt)

## 2. Unused Imports

\`\`\`
$(cat "$REPORT_DIR/unused-imports-${TIMESTAMP}.txt" | head -50)
\`\`\`

## 3. React Anti-patterns

\`\`\`
$(cat "$REPORT_DIR/react-warnings-${TIMESTAMP}.txt" | head -50)
\`\`\`

## 4. TypeScript Errors

\`\`\`
$(cat "$REPORT_DIR/typescript-errors-${TIMESTAMP}.txt" | head -50)
\`\`\`

## 5. Hardcoded URLs (CORS Issues)

\`\`\`
$(cat "$REPORT_DIR/hardcoded-urls-${TIMESTAMP}.txt" | head -30)
\`\`\`

## 6. Console Statements

\`\`\`
$(cat "$REPORT_DIR/console-statements-${TIMESTAMP}.txt" | head -30)
\`\`\`

## Next Steps

### High Priority
1. Fix ESLint errors (run: \`npm run lint:fix\`)
2. Remove unused imports
3. Add missing keys to list items
4. Fix TypeScript errors

### Medium Priority
1. Replace hardcoded URLs with relative paths
2. Remove or guard console statements
3. Fix useEffect dependencies

### Low Priority
1. Optimize bundle size
2. Remove dead code

## Automated Fixes

Run the following commands to auto-fix what can be fixed:

\`\`\`bash
# Auto-fix ESLint issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check

# Build and verify
npm run build
\`\`\`

## Manual Fixes Required

See individual report files in: \`$REPORT_DIR/\`
EOF

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Comprehensive report generated!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Report location:${NC}"
echo -e "  $REPORT_DIR/COMPREHENSIVE-REPORT-${TIMESTAMP}.md"
echo ""
echo -e "${BLUE}Quick commands to fix:${NC}"
echo -e "  ${YELLOW}cd $DASHBOARD_DIR${NC}"
echo -e "  ${YELLOW}npm run lint:fix${NC}        # Auto-fix ESLint issues"
echo -e "  ${YELLOW}npm run format${NC}          # Format code"
echo -e "  ${YELLOW}npm run type-check${NC}      # Check TypeScript"
echo ""
echo -e "${BLUE}View full report:${NC}"
echo -e "  ${YELLOW}cat $REPORT_DIR/COMPREHENSIVE-REPORT-${TIMESTAMP}.md${NC}"
echo ""
