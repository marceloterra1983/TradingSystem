#!/usr/bin/env bash
# ============================================================================
# Validate Frontmatter for Staged Files
# ============================================================================
# This script validates YAML frontmatter in staged markdown files only.
# It's called by the Husky pre-commit hook.
#
# Exit Codes:
#   0 - All validations passed
#   1 - Validation errors found

set -e

# Get all staged markdown files
STAGED_MD_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(md|mdx)$' || true)

if [ -z "$STAGED_MD_FILES" ]; then
  echo "ℹ️  No staged markdown files found"
  exit 0
fi

# Count staged files
FILE_COUNT=$(echo "$STAGED_MD_FILES" | wc -l | tr -d ' ')
echo "📄 Found $FILE_COUNT staged markdown file(s)"

# Create temporary directory for staged files
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy staged files to temp directory, preserving structure
echo "$STAGED_MD_FILES" | while IFS= read -r file; do
  if [ -f "$file" ]; then
    mkdir -p "$TEMP_DIR/$(dirname "$file")"
    cp "$file" "$TEMP_DIR/$file"
  fi
done

# Run validation on staged files only
python3 scripts/docs/validate-frontmatter.py \
  --docs-dir "$TEMP_DIR" \
  --output "$TEMP_DIR/validation-report.json" \
  --threshold-days 365

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All staged markdown files passed frontmatter validation"
  exit 0
else
  echo ""
  echo "❌ Frontmatter validation failed for staged files"
  echo ""
  echo "Common issues:"
  echo "  • Missing required fields (title, sidebar_position, tags, domain, type, summary, status, last_review)"
  echo "  • Invalid domain (must be: frontend, backend, ops, shared)"
  echo "  • Invalid type (must be: guide, reference, adr, prd, rfc, runbook, overview, index, glossary, template, feature)"
  echo "  • Invalid status (must be: draft, active, deprecated)"
  echo "  • Invalid date format for last_review (must be: YYYY-MM-DD)"
  echo ""
  echo "See validation report: $TEMP_DIR/validation-report.json"
  echo "See: docs/DOCUMENTATION-STANDARD.md for requirements"
  exit 1
fi



