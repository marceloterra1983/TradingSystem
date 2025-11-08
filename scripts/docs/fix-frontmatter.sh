#!/bin/bash
# Frontmatter Fix Automation Script
# Purpose: Automatically add or fix frontmatter in documentation files
# Usage: bash scripts/docs/fix-frontmatter.sh [--dry-run|--auto-fix] [FILE_PATH]

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MODE="${1:---dry-run}"
TARGET_FILE="${2:-}"
DOCS_CONTENT_DIR="./docs/content"

# Frontmatter template
generate_frontmatter() {
    local file_path="$1"
    local file_name=$(basename "$file_path")
    local file_dir=$(dirname "$file_path")

    # Extract title from filename (remove extension, replace dashes/underscores with spaces, capitalize)
    local title=$(echo "${file_name%.*}" | sed 's/[-_]/ /g' | sed 's/\b\(.\)/\u\1/g')

    # Determine domain from directory structure
    local domain="unknown"
    if [[ "$file_path" =~ /apps/ ]]; then
        domain="applications"
    elif [[ "$file_path" =~ /api/ ]]; then
        domain="backend"
    elif [[ "$file_path" =~ /frontend/ ]]; then
        domain="frontend"
    elif [[ "$file_path" =~ /database/ ]]; then
        domain="database"
    elif [[ "$file_path" =~ /tools/ ]]; then
        domain="devops"
    elif [[ "$file_path" =~ /prd/ ]]; then
        domain="product"
    elif [[ "$file_path" =~ /sdd/ ]]; then
        domain="architecture"
    elif [[ "$file_path" =~ /reference/ ]]; then
        domain="shared"
    elif [[ "$file_path" =~ /governance/ ]]; then
        domain="governance"
    fi

    # Determine type from directory
    local type="guide"
    if [[ "$file_path" =~ /api/ ]]; then
        type="api"
    elif [[ "$file_path" =~ /overview ]]; then
        type="overview"
    elif [[ "$file_path" =~ /config ]]; then
        type="configuration"
    elif [[ "$file_path" =~ /architecture ]]; then
        type="architecture"
    elif [[ "$file_path" =~ /deployment ]]; then
        type="deployment"
    elif [[ "$file_path" =~ /changelog ]]; then
        type="changelog"
    elif [[ "$file_path" =~ /troubleshooting ]]; then
        type="troubleshooting"
    elif [[ "$file_path" =~ /operations ]]; then
        type="operations"
    elif [[ "$file_path" =~ /runbook ]]; then
        type="runbook"
    elif [[ "$file_path" =~ /requirements ]]; then
        type="requirements"
    fi

    # Extract appropriate tags
    local tags="documentation"
    if [[ "$file_path" =~ /apps/ ]]; then
        tags="applications, $tags"
    fi
    if [[ "$file_path" =~ /api/ ]]; then
        tags="api, $tags"
    fi
    if [[ "$file_path" =~ /frontend/ ]]; then
        tags="frontend, $tags"
    fi
    if [[ "$file_path" =~ /database/ ]]; then
        tags="database, $tags"
    fi

    # Generate frontmatter
    cat <<EOF
---
title: "$title"
tags: [$tags]
domain: $domain
type: $type
summary: "Documentation for $title"
status: active
last_review: "$(date +%Y-%m-%d)"
---

EOF
}

# Check if file has frontmatter
has_frontmatter() {
    local file="$1"
    head -n 1 "$file" | grep -q "^---$"
}

# Extract existing frontmatter
extract_frontmatter() {
    local file="$1"
    awk '/^---$/{if(++n==2){exit}} n==1' "$file"
}

# Check for missing fields
check_missing_fields() {
    local frontmatter="$1"
    local missing=()

    local required_fields=("title" "tags" "domain" "type" "summary" "status" "last_review")

    for field in "${required_fields[@]}"; do
        if ! echo "$frontmatter" | grep -q "^${field}:"; then
            missing+=("$field")
        fi
    done

    echo "${missing[@]}"
}

# Fix frontmatter for a single file
fix_file_frontmatter() {
    local file="$1"
    local backup_file="${file}.backup"

    echo -e "${BLUE}Processing:${NC} ${file#./}"

    if ! has_frontmatter "$file"; then
        echo -e "  ${YELLOW}⚠${NC}  No frontmatter found"

        if [ "$MODE" = "--auto-fix" ]; then
            # Create backup
            cp "$file" "$backup_file"

            # Generate and prepend frontmatter
            local new_frontmatter=$(generate_frontmatter "$file")
            local original_content=$(cat "$file")

            echo "$new_frontmatter$original_content" > "$file"

            echo -e "  ${GREEN}✓${NC}  Frontmatter added"
            echo -e "  ${BLUE}ℹ${NC}  Backup saved: ${backup_file#./}"
        else
            echo -e "  ${BLUE}ℹ${NC}  Would add frontmatter (use --auto-fix to apply)"
        fi
    else
        # Check for missing fields
        local frontmatter=$(extract_frontmatter "$file")
        local missing_fields=$(check_missing_fields "$frontmatter")

        if [ -n "$missing_fields" ]; then
            echo -e "  ${YELLOW}⚠${NC}  Incomplete frontmatter"
            echo -e "     Missing fields: $missing_fields"

            if [ "$MODE" = "--auto-fix" ]; then
                echo -e "  ${BLUE}ℹ${NC}  Manual review required for field completion"
                echo -e "     Generated template available via --generate-template"
            fi
        else
            echo -e "  ${GREEN}✓${NC}  Frontmatter complete"
        fi
    fi

    echo ""
}

# Process files
process_files() {
    local files=()

    if [ -n "$TARGET_FILE" ]; then
        # Process single file
        if [ -f "$TARGET_FILE" ]; then
            files=("$TARGET_FILE")
        else
            echo -e "${RED}✗${NC} File not found: $TARGET_FILE"
            exit 1
        fi
    else
        # Process all markdown files
        while IFS= read -r file; do
            files+=("$file")
        done < <(find "$DOCS_CONTENT_DIR" -type f \( -name "*.md" -o -name "*.mdx" \))
    fi

    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Frontmatter Fix Automation                                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Mode:${NC} $MODE"
    echo -e "${GREEN}Files to process:${NC} ${#files[@]}"
    echo ""

    local fixed_count=0
    local incomplete_count=0
    local complete_count=0

    for file in "${files[@]}"; do
        if ! has_frontmatter "$file"; then
            fixed_count=$((fixed_count + 1))
            fix_file_frontmatter "$file"
        elif [ -n "$(check_missing_fields "$(extract_frontmatter "$file")")" ]; then
            incomplete_count=$((incomplete_count + 1))
            fix_file_frontmatter "$file"
        else
            complete_count=$((complete_count + 1))
            if [ -n "$TARGET_FILE" ]; then
                fix_file_frontmatter "$file"
            fi
        fi
    done

    echo ""
    echo -e "${GREEN}═══ Summary ═══${NC}"
    echo ""
    echo "  ├─ Files processed:       ${#files[@]}"
    echo "  ├─ Fixed (added):         $fixed_count"
    echo "  ├─ Incomplete:            $incomplete_count"
    echo "  └─ Complete:              $complete_count"
    echo ""

    if [ "$MODE" = "--dry-run" ]; then
        echo -e "${YELLOW}ℹ${NC}  Dry run mode - no changes were made"
        echo -e "${BLUE}ℹ${NC}  Use --auto-fix to apply changes"
    else
        echo -e "${GREEN}✓${NC}  Frontmatter fixes applied"
        echo -e "${YELLOW}⚠${NC}  Review backup files before committing"
    fi
}

# Main
main() {
    case "$MODE" in
        --dry-run|--auto-fix)
            process_files
            ;;
        --help)
            cat <<EOF
Frontmatter Fix Automation Script

Usage: bash scripts/docs/fix-frontmatter.sh [OPTIONS] [FILE]

OPTIONS:
  --dry-run       Preview changes without applying them (default)
  --auto-fix      Automatically fix frontmatter issues
  --help          Show this help message

ARGUMENTS:
  FILE            Optional: Specific file to process (processes all if omitted)

EXAMPLES:
  # Preview all fixes
  bash scripts/docs/fix-frontmatter.sh --dry-run

  # Fix all files automatically
  bash scripts/docs/fix-frontmatter.sh --auto-fix

  # Fix specific file
  bash scripts/docs/fix-frontmatter.sh --auto-fix docs/content/api/overview.mdx

BACKUP:
  Original files are backed up with .backup extension before modification.
  Review backups before committing changes.

EOF
            ;;
        *)
            echo -e "${RED}✗${NC} Invalid mode: $MODE"
            echo -e "${BLUE}ℹ${NC}  Use --help for usage information"
            exit 1
            ;;
    esac
}

# Run
main
