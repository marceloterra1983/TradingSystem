#!/bin/bash
# Automated TypeScript Error Fixes
# This script fixes common TypeScript errors to unblock the build

set -e

echo "🔧 Starting TypeScript error fixes..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
FIXED=0

# Function to fix unused imports in a file
fix_unused_imports() {
  local file="$1"
  local var="$2"

  if [ -f "$file" ]; then
    # Remove the import line or declaration
    if grep -q "^import.*$var.*from" "$file"; then
      echo "  Removing unused import: $var"
      sed -i "/import.*$var.*from/d" "$file"
      ((FIXED++))
    elif grep -q "^const $var" "$file"; then
      echo "  Removing unused const: $var"
      sed -i "/^const $var/d" "$file"
      ((FIXED++))
    elif grep -q "^  $var" "$file"; then
      echo "  Commenting out unused variable: $var"
      sed -i "s/^  $var/  \/\/ $var/" "$file"
      ((FIXED++))
    fi
  fi
}

echo "${YELLOW}Phase 1: Fixing unused imports and variables${NC}"
echo "---------------------------------------------------"

# Fix TelegramGatewayFinal.tsx
echo "📝 Fixing src/components/pages/TelegramGatewayFinal.tsx"
fix_unused_imports "src/components/pages/TelegramGatewayFinal.tsx" "formatDate"

# Fix SimpleStatusCard.tsx
echo "📝 Fixing src/components/pages/telegram-gateway/SimpleStatusCard.tsx"
fix_unused_imports "src/components/pages/telegram-gateway/SimpleStatusCard.tsx" "Activity"

# Fix SignalsTable.refactored.tsx
echo "📝 Fixing src/components/pages/tp-capital/SignalsTable.refactored.tsx"
fix_unused_imports "src/components/pages/tp-capital/SignalsTable.refactored.tsx" "SignalRowType"

# Fix SignalsTable.tsx
echo "📝 Fixing src/components/pages/tp-capital/SignalsTable.tsx"
fix_unused_imports "src/components/pages/tp-capital/SignalsTable.tsx" "DEFAULT_LIMIT"

# Fix SignalsFilterBar.tsx
echo "📝 Fixing src/components/pages/tp-capital/components/SignalsFilterBar.tsx"
FILE="src/components/pages/tp-capital/components/SignalsFilterBar.tsx"
if [ -f "$FILE" ]; then
  sed -i 's/^  typeFilter,$/  \/\/ typeFilter,/' "$FILE"
  sed -i 's/^  typeOptions,$/  \/\/ typeOptions,/' "$FILE"
  sed -i 's/^  onTypeFilterChange,$/  \/\/ onTypeFilterChange,/' "$FILE"
  ((FIXED+=3))
fi

# Fix logger.ts
echo "📝 Fixing src/components/pages/tp-capital/utils/logger.ts"
fix_unused_imports "src/components/pages/tp-capital/utils/logger.ts" "LogLevel"

# Fix GenericLinkPreview.tsx
echo "📝 Fixing src/components/telegram/GenericLinkPreview.tsx"
fix_unused_imports "src/components/telegram/GenericLinkPreview.tsx" "LinkIcon"

# Fix libraryService.ts
echo "📝 Fixing src/services/libraryService.ts"
fix_unused_imports "src/services/libraryService.ts" "trimmedBase"

# Fix test files - comment out unused imports
echo "📝 Fixing test files"
TEST_FILE="src/components/pages/tp-capital/__tests__/SignalsTable.test.tsx"
if [ -f "$TEST_FILE" ]; then
  sed -i 's/^import { render, screen, waitFor, within } from/import { render, screen, waitFor } from/' "$TEST_FILE"
  ((FIXED++))
fi

echo ""
echo "${YELLOW}Phase 2: Adding missing test setup${NC}"
echo "---------------------------------------------------"

# Create vitest setup file if it doesn't exist
if [ ! -f "src/test-setup.ts" ]; then
  echo "📝 Creating src/test-setup.ts"
  cat > src/test-setup.ts << 'EOF'
import '@testing-library/jest-dom';

// Extend Vitest matchers with jest-dom matchers
declare global {
  namespace Vi {
    interface Assertion<T = any> extends jest.Matchers<void, T> {}
    interface AsymmetricMatchersContaining extends jest.Matchers<void, any> {}
  }
}
EOF
  ((FIXED++))
fi

# Update vitest.config.ts to include setup file
if [ -f "vitest.config.ts" ]; then
  echo "📝 Updating vitest.config.ts"
  if ! grep -q "setupFiles" "vitest.config.ts"; then
    sed -i "/test: {/a\    setupFiles: ['./src/test-setup.ts']," "vitest.config.ts"
    ((FIXED++))
  fi
fi

# Create missing tpCapitalApi module
if [ ! -f "src/utils/tpCapitalApi.ts" ]; then
  echo "📝 Creating src/utils/tpCapitalApi.ts"
  mkdir -p src/utils
  cat > src/utils/tpCapitalApi.ts << 'EOF'
/**
 * TP Capital API Client
 * Placeholder for test compatibility
 */

export interface TPCapitalSignal {
  id: string;
  text: string;
  channelId: string;
  date: string;
}

export async function fetchSignals(): Promise<TPCapitalSignal[]> {
  const response = await fetch('/api/tp-capital/signals');
  return response.json();
}

export async function deleteSignal(id: string): Promise<void> {
  await fetch(`/api/tp-capital/signals/${id}`, {
    method: 'DELETE',
  });
}
EOF
  ((FIXED++))
fi

echo ""
echo "${YELLOW}Phase 3: Fixing type errors${NC}"
echo "---------------------------------------------------"

# Add missing props to SignalsFilterBar
echo "📝 Fixing SignalsFilterBar props"
FILTER_FILE="src/components/pages/tp-capital/components/SignalsFilterBar.tsx"
if [ -f "$FILTER_FILE" ]; then
  # Check if fromDate prop exists
  if ! grep -q "fromDate:" "$FILTER_FILE"; then
    echo "  Adding missing date props to interface"
    # This is a placeholder - actual fix requires manual intervention
    echo "  ⚠️  Manual fix required: Add fromDate, toDate, onFromDateChange, onToDateChange to SignalsFilterBarProps"
  fi
fi

echo ""
echo "${GREEN}✅ Cleanup completed!${NC}"
echo ""
echo "Fixed $FIXED issues automatically"
echo ""
echo "${YELLOW}⚠️  Manual fixes still required:${NC}"
echo "  1. Add missing props to SignalsFilterBarProps (fromDate, toDate, etc.)"
echo "  2. Add onDelete prop to SignalRowProps"
echo "  3. Review and test changes"
echo ""
echo "Next steps:"
echo "  1. Run: npm run type-check"
echo "  2. Fix remaining errors manually"
echo "  3. Run: npm run build"
echo ""
