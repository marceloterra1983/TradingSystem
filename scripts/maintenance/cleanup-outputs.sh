#!/bin/bash
# ==============================================================================
# Outputs Directory Cleanup Script
# ==============================================================================
# Cleans obsolete files from /workspace/outputs/ directory
# Preserves recent data and intentional backups
#
# Usage: bash scripts/maintenance/cleanup-outputs.sh [--dry-run]
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DRY_RUN=false

# Parse arguments
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be deleted${NC}"
    echo ""
fi

OUTPUTS_DIR="/workspace/outputs"

echo "🧹 Analyzing outputs directory..."
echo ""

# Current sizes
echo "📊 Current Directory Sizes:"
du -sh "$OUTPUTS_DIR"/* 2>/dev/null | sort -hr | head -15
echo ""

# Categories to clean
declare -a CATEGORIES_TO_CLEAN

# 1. Old GitHub Actions logs (keep last 10 runs)
echo -e "${BLUE}1. Analyzing GitHub Actions logs...${NC}"
GITHUB_ACTIONS_DIR="$OUTPUTS_DIR/github-actions"
if [[ -d "$GITHUB_ACTIONS_DIR" ]]; then
    TOTAL_RUNS=$(ls -1 "$GITHUB_ACTIONS_DIR" | wc -l)
    KEEP_RUNS=10

    if [[ $TOTAL_RUNS -gt $KEEP_RUNS ]]; then
        TO_DELETE=$((TOTAL_RUNS - KEEP_RUNS))
        echo "  Total runs: $TOTAL_RUNS"
        echo "  Keeping: $KEEP_RUNS most recent"
        echo "  To delete: $TO_DELETE old runs"

        # Get old runs to delete
        OLD_RUNS=$(ls -t "$GITHUB_ACTIONS_DIR" | tail -n +$((KEEP_RUNS + 1)))
        for run in $OLD_RUNS; do
            CATEGORIES_TO_CLEAN+=("github-actions/$run")
        done
    else
        echo "  Total runs: $TOTAL_RUNS (all recent, keeping all)"
    fi
else
    echo "  Directory not found - skipping"
fi
echo ""

# 2. Old Course Crawler outputs (keep last 7 days)
echo -e "${BLUE}2. Analyzing Course Crawler outputs...${NC}"
COURSE_CRAWLER_DIR="$OUTPUTS_DIR/course-crawler"
if [[ -d "$COURSE_CRAWLER_DIR" ]]; then
    TOTAL_SESSIONS=$(ls -1 "$COURSE_CRAWLER_DIR" | wc -l)

    # Find sessions older than 7 days
    OLD_SESSIONS=$(find "$COURSE_CRAWLER_DIR" -maxdepth 1 -type d -mtime +7 2>/dev/null | wc -l)

    echo "  Total sessions: $TOTAL_SESSIONS"
    echo "  Sessions >7 days old: $OLD_SESSIONS"

    if [[ $OLD_SESSIONS -gt 0 ]]; then
        while IFS= read -r session; do
            rel_path="${session#$OUTPUTS_DIR/}"
            CATEGORIES_TO_CLEAN+=("$rel_path")
        done < <(find "$COURSE_CRAWLER_DIR" -maxdepth 1 -type d -mtime +7 2>/dev/null)
    fi
else
    echo "  Directory not found - skipping"
fi
echo ""

# 3. Obsolete documentation files (BUILD-OPTIMIZATION from Nov 8)
echo -e "${BLUE}3. Analyzing obsolete documentation...${NC}"
OBSOLETE_DOCS=(
    "BUILD-OPTIMIZATION-ANALYSIS-2025-11-08.md"
    "BUILD-OPTIMIZATION-EXECUTIVE-SUMMARY-2025-11-08.md"
    "BUILD-OPTIMIZATION-FINAL-SUMMARY-2025-11-08.md"
    "BUILD-OPTIMIZATION-IMPLEMENTATION-2025-11-08.md"
    "BUILD-OPTIMIZATION-PHASE2-RESULTS-2025-11-08.md"
    "BUILD-OPTIMIZATION-PHASE3-RESULTS-2025-11-08.md"
    "BUILD-OPTIMIZATION-QUICK-REFERENCE-2025-11-08.md"
    "BUILD-OPTIMIZATION-SUMMARY-2025-11-08.md"
    "config-migration-timeline.txt"
    "PORT-MAP-VISUALIZATION.txt"
    "README-CRAWLER-COURSE-META.md"
)

FOUND_DOCS=0
for doc in "${OBSOLETE_DOCS[@]}"; do
    if [[ -f "$OUTPUTS_DIR/$doc" ]]; then
        CATEGORIES_TO_CLEAN+=("$doc")
        ((FOUND_DOCS++))
    fi
done
echo "  Obsolete docs found: $FOUND_DOCS"
echo ""

# 4. Empty or small directories
echo -e "${BLUE}4. Analyzing empty/small directories...${NC}"
SMALL_DIRS=$(find "$OUTPUTS_DIR" -maxdepth 1 -type d -empty 2>/dev/null | wc -l)
echo "  Empty directories: $SMALL_DIRS"

if [[ $SMALL_DIRS -gt 0 ]]; then
    while IFS= read -r dir; do
        rel_path="${dir#$OUTPUTS_DIR/}"
        if [[ -n "$rel_path" ]]; then
            CATEGORIES_TO_CLEAN+=("$rel_path")
        fi
    done < <(find "$OUTPUTS_DIR" -maxdepth 1 -type d -empty 2>/dev/null)
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Cleanup Summary"
echo "=========================================="
echo "Total items to clean: ${#CATEGORIES_TO_CLEAN[@]}"
echo ""

if [[ ${#CATEGORIES_TO_CLEAN[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ No cleanup needed!${NC}"
    exit 0
fi

# Show what will be deleted
echo "Items to be deleted:"
echo "---"
for item in "${CATEGORIES_TO_CLEAN[@]}"; do
    full_path="$OUTPUTS_DIR/$item"
    if [[ -d "$full_path" ]]; then
        size=$(du -sh "$full_path" 2>/dev/null | awk '{print $1}')
        echo "  📁 $item ($size)"
    elif [[ -f "$full_path" ]]; then
        size=$(ls -lh "$full_path" 2>/dev/null | awk '{print $5}')
        echo "  📄 $item ($size)"
    fi
done
echo ""

# Calculate total size to free
TOTAL_SIZE=0
for item in "${CATEGORIES_TO_CLEAN[@]}"; do
    full_path="$OUTPUTS_DIR/$item"
    if [[ -e "$full_path" ]]; then
        size_kb=$(du -sk "$full_path" 2>/dev/null | awk '{print $1}')
        TOTAL_SIZE=$((TOTAL_SIZE + size_kb))
    fi
done

# Convert KB to MB
TOTAL_SIZE_MB=$((TOTAL_SIZE / 1024))
echo "Total size to free: ${TOTAL_SIZE_MB}MB"
echo ""

# Execute cleanup
if [[ "$DRY_RUN" == false ]]; then
    read -p "Proceed with cleanup? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  Cleanup cancelled${NC}"
        exit 0
    fi

    deleted=0
    failed=0

    for item in "${CATEGORIES_TO_CLEAN[@]}"; do
        full_path="$OUTPUTS_DIR/$item"
        if rm -rf "$full_path" 2>/dev/null; then
            ((deleted++))
        else
            ((failed++))
            echo -e "${RED}✗ Failed to delete: $item${NC}"
        fi
    done

    echo ""
    echo "=========================================="
    echo "📊 Cleanup Results"
    echo "=========================================="
    echo -e "Deleted:  ${GREEN}$deleted${NC}"
    echo -e "Failed:   ${RED}$failed${NC}"
    echo -e "Freed:    ${GREEN}${TOTAL_SIZE_MB}MB${NC}"
    echo ""

    if [[ $failed -eq 0 ]]; then
        echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"

        # Show new sizes
        echo ""
        echo "📊 New Directory Sizes:"
        du -sh "$OUTPUTS_DIR"/* 2>/dev/null | sort -hr | head -10

        exit 0
    else
        echo -e "${YELLOW}⚠️  Cleanup completed with some errors${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}🔍 DRY RUN - No files were deleted${NC}"
    echo ""
    echo "To actually delete these items, run:"
    echo "  bash scripts/maintenance/cleanup-outputs.sh"
fi
