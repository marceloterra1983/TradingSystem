#!/usr/bin/env bash
# ============================================================================
# Governance Frontmatter Validation (Non-blocking)
# ============================================================================
# This script executes the existing Python validator across the documentation
# tree, stores the JSON report under outputs/governance/ and surfaces a summary.
# Validation findings are reported as warnings only (exit code 0) so pipelines
# can keep running while we work on the long-tail of legacy documents.
# ============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_DIR="$ROOT_DIR/outputs/governance"
REPORT_FILE="$REPORT_DIR/frontmatter-validation-legacy.json"

mkdir -p "$REPORT_DIR"

echo "📋 Running legacy frontmatter validation..."

if python3 "$ROOT_DIR/scripts/docs/validate-frontmatter.py" \
  --docs-dir "$ROOT_DIR/docs/content" \
  --schema legacy \
  --threshold-days 365 \
  --output "$REPORT_FILE"; then
  echo "✅ Frontmatter validation completed without blocking issues."
  exit 0
fi

echo "⚠️  Frontmatter issues detected (non-blocking)."
echo "   • See detailed report: $REPORT_FILE"
echo "   • Validator will return non-zero until legacy docs are updated."
exit 0

