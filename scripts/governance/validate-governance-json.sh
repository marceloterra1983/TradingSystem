#!/bin/bash
# Governance JSON Validation Script
# Validates governance snapshot JSON integrity before deployment
#
# Usage:
#   bash scripts/governance/validate-governance-json.sh
#
# Exit codes:
#   0 - Success (JSON valid)
#   1 - JSON parsing error
#   2 - File not found
#   3 - File too large

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Governance JSON Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DASHBOARD_JSON="frontend/dashboard/public/data/governance/latest.json"
REPORTS_JSON="reports/governance/latest.json"

# Step 1: Check file existence
log_info "Step 1/4: Checking file existence..."

if [ ! -f "$DASHBOARD_JSON" ]; then
  log_error "Dashboard JSON not found: $DASHBOARD_JSON"
  log_info "Run: node governance/automation/governance-metrics.mjs"
  exit 2
fi

log_success "Dashboard JSON found"

# Step 2: Check file size
log_info "Step 2/4: Checking file size..."

FILE_SIZE=$(stat -f%z "$DASHBOARD_JSON" 2>/dev/null || stat -c%s "$DASHBOARD_JSON" 2>/dev/null)
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1024 / 1024" | bc)

if (( $(echo "$FILE_SIZE_MB > 5.0" | bc -l) )); then
  log_error "File too large: ${FILE_SIZE_MB}MB (max 5MB)"
  log_warning "Consider reducing artifact preview content length"
  exit 3
fi

log_success "File size OK: ${FILE_SIZE_MB}MB"

# Step 3: Validate JSON syntax
log_info "Step 3/4: Validating JSON syntax..."

VALIDATION_RESULT=$(node -e "
try {
  const fs = require('fs');
  const content = fs.readFileSync('$DASHBOARD_JSON', 'utf8');
  const parsed = JSON.parse(content);

  // Check required fields
  const required = ['metadata', 'totals', 'freshness', 'reviewTracking', 'artifacts'];
  const missing = required.filter(field => !parsed[field]);

  if (missing.length > 0) {
    console.log('MISSING_FIELDS:' + missing.join(','));
    process.exit(1);
  }

  console.log('VALID');
  console.log('ARTIFACTS:' + parsed.artifacts.length);
  console.log('GENERATED:' + parsed.metadata.generatedAt);
} catch (err) {
  console.log('ERROR:' + err.message);
  process.exit(1);
}
" 2>&1)

if echo "$VALIDATION_RESULT" | grep -q "^ERROR:"; then
  ERROR_MSG=$(echo "$VALIDATION_RESULT" | grep "^ERROR:" | cut -d: -f2-)
  log_error "JSON parsing failed: $ERROR_MSG"
  exit 1
fi

if echo "$VALIDATION_RESULT" | grep -q "^MISSING_FIELDS:"; then
  MISSING=$(echo "$VALIDATION_RESULT" | grep "^MISSING_FIELDS:" | cut -d: -f2-)
  log_error "Missing required fields: $MISSING"
  exit 1
fi

ARTIFACT_COUNT=$(echo "$VALIDATION_RESULT" | grep "^ARTIFACTS:" | cut -d: -f2)
GENERATED_AT=$(echo "$VALIDATION_RESULT" | grep "^GENERATED:" | cut -d: -f2)

log_success "JSON is valid"
log_info "Artifacts: $ARTIFACT_COUNT"
log_info "Generated: $GENERATED_AT"

# Step 4: Check for control characters
log_info "Step 4/4: Scanning for control characters..."

CONTROL_CHARS=$(node -e "
const fs = require('fs');
const content = fs.readFileSync('$DASHBOARD_JSON', 'utf8');
const regex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const matches = content.match(regex);
console.log(matches ? matches.length : 0);
")

if [ "$CONTROL_CHARS" -gt 0 ]; then
  log_error "Found $CONTROL_CHARS control characters in JSON"
  log_warning "Run regeneration: node governance/automation/governance-metrics.mjs"
  exit 1
fi

log_success "No control characters found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Validation passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 File: $DASHBOARD_JSON"
echo "📈 Size: ${FILE_SIZE_MB}MB"
echo "📦 Artifacts: $ARTIFACT_COUNT"
echo "🕐 Generated: $GENERATED_AT"
echo ""
