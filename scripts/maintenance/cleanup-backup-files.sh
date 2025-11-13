#!/bin/bash
# ==============================================================================
# Cleanup Backup Files Script
# ==============================================================================
# Removes obsolete backup files (.backup, .old, .tmp) throughout the project
# while preserving intentional backup directories like /outputs/env-backups/
#
# Usage: bash scripts/maintenance/cleanup-backup-files.sh [--dry-run]
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DRY_RUN=false

# Parse arguments
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be deleted${NC}"
    echo ""
fi

echo "🧹 Scanning for obsolete backup files..."
echo ""

# Directories to SKIP (intentional backups)
SKIP_DIRS=(
    "node_modules"
    ".git"
    "outputs/env-backups"  # Intentional env backups
    "backups"              # Any directory named 'backups'
)

# Build find exclude arguments
EXCLUDE_ARGS=""
for dir in "${SKIP_DIRS[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS -not -path \"*/$dir/*\""
done

# Find backup files
BACKUP_PATTERNS=(
    "*.backup"
    "*.backup.*"
    "*.old"
    "*.tmp"
    "*~"
)

# Arrays to track results
declare -a FILES_TO_DELETE
declare -a FILES_SKIPPED

# Find all backup files
for pattern in "${BACKUP_PATTERNS[@]}"; do
    while IFS= read -r file; do
        # Check if in skip directory
        skip=false
        for skip_dir in "${SKIP_DIRS[@]}"; do
            if [[ "$file" == *"$skip_dir"* ]]; then
                skip=true
                FILES_SKIPPED+=("$file")
                break
            fi
        done

        if [[ "$skip" == false ]]; then
            FILES_TO_DELETE+=("$file")
        fi
    done < <(find /workspace -type f -name "$pattern" 2>/dev/null)
done

# Report findings
echo "📊 Scan Results:"
echo "  Files to delete: ${#FILES_TO_DELETE[@]}"
echo "  Files skipped (in protected dirs): ${#FILES_SKIPPED[@]}"
echo ""

if [[ ${#FILES_TO_DELETE[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ No backup files found to clean up!${NC}"
    exit 0
fi

# Show files to delete
echo "Files that will be deleted:"
echo "---"
for file in "${FILES_TO_DELETE[@]}"; do
    # Get relative path
    rel_path="${file#/workspace/}"
    # Get file size
    size=$(ls -lh "$file" 2>/dev/null | awk '{print $5}')
    echo "  - $rel_path ($size)"
done
echo ""

# Calculate total size
total_size=$(find "${FILES_TO_DELETE[@]}" -type f -exec du -ch {} + 2>/dev/null | grep total | awk '{print $1}')
echo "Total size to free: $total_size"
echo ""

# Confirm deletion (skip in dry-run)
if [[ "$DRY_RUN" == false ]]; then
    read -p "Delete these ${#FILES_TO_DELETE[@]} files? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  Cleanup cancelled${NC}"
        exit 0
    fi

    # Delete files
    deleted=0
    failed=0

    for file in "${FILES_TO_DELETE[@]}"; do
        if rm "$file" 2>/dev/null; then
            ((deleted++))
        else
            ((failed++))
            echo -e "${RED}✗ Failed to delete: $file${NC}"
        fi
    done

    echo ""
    echo "=========================================="
    echo "📊 Cleanup Summary"
    echo "=========================================="
    echo -e "Deleted:  ${GREEN}$deleted${NC}"
    echo -e "Failed:   ${RED}$failed${NC}"
    echo -e "Skipped:  ${YELLOW}${#FILES_SKIPPED[@]}${NC} (in protected dirs)"
    echo ""

    if [[ $failed -eq 0 ]]; then
        echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
        echo "   Freed: $total_size"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Cleanup completed with some errors${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}🔍 DRY RUN - No files were deleted${NC}"
    echo ""
    echo "To actually delete these files, run:"
    echo "  bash scripts/maintenance/cleanup-backup-files.sh"
fi
