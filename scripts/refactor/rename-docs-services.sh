#!/bin/bash
# ============================================================================
# Rename Documentation Services
# ============================================================================
# Changes:
#   "Documentation Hub" → "Docusaurus"
#   "Documentation API" → "DocsAPI"
#
# Usage:
#   bash scripts/refactor/rename-docs-services.sh [--dry-run] [--execute]
# ============================================================================

set -euo pipefail

DRY_RUN=true

if [[ "${1:-}" == "--execute" ]]; then
    DRY_RUN=false
    echo "🔧 EXECUTING renaming..."
elif [[ "${1:-}" == "--dry-run" ]] || [[ -z "${1:-}" ]]; then
    echo "👁️  DRY-RUN mode (use --execute to apply changes)"
fi

echo ""

# Files to process (excluding cache, node_modules, etc)
declare -a FILES=(
    "README.md"
    "CLAUDE.md"
    "SYSTEM-OVERVIEW.md"
    "docs/README.md"
    "docs/DIRECTORY-STRUCTURE.md"
    "frontend/README.md"
    "backend/README.md"
    "infrastructure/README.md"
    "frontend/apps/b3-market-data/README.md"
    "frontend/apps/service-launcher/README.md"
    "frontend/apps/tp-capital/README.md"
    "docs/context/backend/README.md"
    "docs/context/frontend/README.md"
    "docs/context/ops/README.md"
    "docs/context/shared/README.md"
    "backend/manifest.json"
    "scripts/services/start-all.sh"
    "scripts/services/stop-all.sh"
    "scripts/services/status.sh"
    "scripts/services/diagnose-services.sh"
)

# Renaming rules
declare -A RENAMES=(
    ["Documentation Hub"]="Docusaurus"
    ["documentation hub"]="Docusaurus"
    ["DOCUMENTATION HUB"]="DOCUSAURUS"
    ["docs-hub"]="docusaurus"
    ["Documentation API"]="DocsAPI"
    ["documentation-api"]="docs-api"
    ["documentation_api"]="docs_api"
)

# Process each file
total_changes=0

for file in "${FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        continue
    fi
    
    file_changed=false
    
    # Create backup
    if [[ "$DRY_RUN" == "false" ]]; then
        cp "$file" "$file.bak"
    fi
    
    # Apply each rename rule
    for old_term in "${!RENAMES[@]}"; do
        new_term="${RENAMES[$old_term]}"
        
        # Check if file contains the term
        if grep -q "$old_term" "$file" 2>/dev/null; then
            count=$(grep -c "$old_term" "$file" 2>/dev/null || echo "0")
            
            if [[ $count -gt 0 ]]; then
                echo "  📝 $file"
                echo "     '$old_term' → '$new_term' ($count occurrences)"
                file_changed=true
                total_changes=$((total_changes + count))
                
                if [[ "$DRY_RUN" == "false" ]]; then
                    sed -i "s/$old_term/$new_term/g" "$file"
                fi
            fi
        fi
    done
    
    # Remove backup if file wasn't changed
    if [[ "$DRY_RUN" == "false" ]] && [[ "$file_changed" == "false" ]]; then
        rm -f "$file.bak"
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 Summary: $total_changes total changes across ${#FILES[@]} files"
echo "════════════════════════════════════════════════════════════"

if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    echo "⚠️  This was a DRY-RUN. No files were modified."
    echo "   Run with --execute to apply changes:"
    echo "   bash scripts/refactor/rename-docs-services.sh --execute"
else
    echo ""
    echo "✅ Changes applied! Backups created with .bak extension"
    echo "   Review changes with: git diff"
    echo "   Remove backups with: find . -name '*.bak' -delete"
fi

