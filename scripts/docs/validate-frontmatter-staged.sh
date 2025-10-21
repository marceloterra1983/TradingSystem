#!/bin/bash
# Validate frontmatter in staged markdown files only
# Used by Husky pre-commit hook
# Exit codes: 0 = success, 1 = validation failed, 2 = script error

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Get staged markdown files
STAGED_MD_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(md|mdx)$' || true)

if [ -z "$STAGED_MD_FILES" ]; then
  echo "ℹ️  No markdown files staged"
  exit 0
fi

# Filter for documentation files only (docs/ directory)
DOCS_FILES=$(echo "$STAGED_MD_FILES" | grep '^docs/' || true)

if [ -z "$DOCS_FILES" ]; then
  echo "ℹ️  No documentation files staged (only root-level .md files)"
  exit 0
fi

echo "📝 Validating frontmatter in $(echo "$DOCS_FILES" | wc -l) staged file(s)..."

# Create temporary directory for staged versions
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy staged versions of files to temp directory
while IFS= read -r file; do
  if [ -n "$file" ]; then
    # Create directory structure in temp
    mkdir -p "$TEMP_DIR/$(dirname "$file")"

    # Get staged version of file (not working directory version)
    git show ":$file" > "$TEMP_DIR/$file" 2>/dev/null || {
      echo "⚠️  Warning: Could not get staged version of $file"
      continue
    }
  fi
done <<< "$DOCS_FILES"

# Run validation on temporary directory
if python3 scripts/docs/validate-frontmatter.py \
  --docs-dir "$TEMP_DIR/docs/context" "$TEMP_DIR/docs" \
  --output "$TEMP_DIR/validation-report.json" \
  --verbose; then
  echo "✅ All staged documentation files passed frontmatter validation"
  exit 0
else
  echo ""
  echo "❌ Frontmatter validation failed for staged files"
  echo ""
  echo "📋 Common issues:"
  echo "  - Missing required fields (title, tags, domain, type, summary, status, last_review)"
  echo "  - Invalid domain (must be: frontend, backend, ops, shared)"
  echo "  - Invalid type (must be: guide, reference, adr, prd, rfc, runbook, overview, index, glossary, template, feature)"
  echo "  - Invalid status (must be: draft, active, deprecated)"
  echo "  - Invalid date format (must be: YYYY-MM-DD)"
  echo ""
  echo "📖 See: docs/DOCUMENTATION-STANDARD.md for complete requirements"
  echo ""
  echo "🔧 To fix:"
  echo "  1. Review the errors above"
  echo "  2. Update frontmatter in the affected files"
  echo "  3. Stage the fixes: git add <file>"
  echo "  4. Try committing again"
  echo ""
  echo "⚠️  To bypass validation (NOT RECOMMENDED):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi