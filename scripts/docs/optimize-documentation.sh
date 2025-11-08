#!/usr/bin/env bash
# Documentation Optimization Script
# Analyzes and optimizes documentation structure, content, and performance
#
# Usage: bash scripts/docs/optimize-documentation.sh [--analyze|--optimize|--report]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCS_DIR="${REPO_ROOT}/docs/content"
REPORTS_DIR="${REPO_ROOT}/docs/reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
DUPLICATE_CONTENT=0
LONG_FILES=0
MISSING_TOC=0
POOR_READABILITY=0
OUTDATED_IMAGES=0
UNUSED_ASSETS=0

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Documentation Optimization Tool                          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Analyze content duplication
analyze_duplication() {
    print_section "Analyzing Content Duplication"

    local temp_file=$(mktemp)

    # Find files with similar content (using first 100 words as fingerprint)
    find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) | while read -r file; do
        # Extract first 100 words and create hash
        head -n 50 "$file" | tr -s '[:space:]' ' ' | cut -d' ' -f1-100 | md5sum | awk -v f="$file" '{print $1, f}'
    done | sort > "$temp_file"

    # Find duplicate hashes
    local duplicates=$(awk '{print $1}' "$temp_file" | sort | uniq -d)

    if [[ -n "$duplicates" ]]; then
        echo -e "${YELLOW}⚠ Found potential duplicate content:${NC}"
        echo "$duplicates" | while read -r hash; do
            DUPLICATE_CONTENT=$((DUPLICATE_CONTENT + 1))
            echo -e "${YELLOW}  Hash: $hash${NC}"
            grep "^$hash" "$temp_file" | awk '{print "    - " $2}'
        done
    else
        echo -e "${GREEN}✓ No significant content duplication detected${NC}"
    fi

    rm "$temp_file"
    echo ""
}

# Analyze file sizes and complexity
analyze_file_sizes() {
    print_section "Analyzing File Sizes and Complexity"

    echo "Files exceeding 500 lines (consider splitting):"
    find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) -exec wc -l {} + | \
        awk '$1 > 500 {print $1, $2}' | sort -rn | while read -r lines file; do
        LONG_FILES=$((LONG_FILES + 1))
        echo -e "${YELLOW}  • $(basename "$file"): ${lines} lines${NC}"
    done

    if [[ $LONG_FILES -eq 0 ]]; then
        echo -e "${GREEN}✓ All files are within recommended size${NC}"
    fi
    echo ""
}

# Analyze table of contents
analyze_toc() {
    print_section "Analyzing Table of Contents"

    echo "Files > 300 lines missing TOC:"
    find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) | while read -r file; do
        local lines=$(wc -l < "$file")
        if [[ $lines -gt 300 ]]; then
            # Check if file has TOC
            if ! grep -qi "table of contents\|toc\|## contents" "$file"; then
                MISSING_TOC=$((MISSING_TOC + 1))
                echo -e "${YELLOW}  • $(basename "$file") (${lines} lines)${NC}"
            fi
        fi
    done

    if [[ $MISSING_TOC -eq 0 ]]; then
        echo -e "${GREEN}✓ All large files have table of contents${NC}"
    fi
    echo ""
}

# Analyze readability
analyze_readability() {
    print_section "Analyzing Readability"

    echo "Files with potential readability issues:"
    find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) | while read -r file; do
        # Check for very long paragraphs (more than 300 words without line break)
        local long_paragraphs=$(grep -v "^#\|^-\|^\*\|^[0-9]\." "$file" | \
            awk 'BEGIN{RS="\n\n"} NF > 300 {print}' | wc -l)

        # Check for excessive code blocks
        local code_blocks=$(grep -c '```' "$file" || true)
        local total_lines=$(wc -l < "$file")
        local code_ratio=0
        if [[ $total_lines -gt 0 ]]; then
            code_ratio=$((code_blocks * 100 / total_lines))
        fi

        if [[ $long_paragraphs -gt 0 ]] || [[ $code_ratio -gt 50 ]]; then
            POOR_READABILITY=$((POOR_READABILITY + 1))
            echo -e "${YELLOW}  • $(basename "$file")${NC}"
            [[ $long_paragraphs -gt 0 ]] && echo "    - $long_paragraphs long paragraphs (>300 words)"
            [[ $code_ratio -gt 50 ]] && echo "    - High code-to-text ratio: ${code_ratio}%"
        fi
    done

    if [[ $POOR_READABILITY -eq 0 ]]; then
        echo -e "${GREEN}✓ All files have good readability${NC}"
    fi
    echo ""
}

# Analyze images and assets
analyze_images() {
    print_section "Analyzing Images and Assets"

    # Find all image references in markdown
    local temp_refs=$(mktemp)
    find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) -exec grep -oh '!\[.*\]([^)]*\.png\|\.jpg\|\.gif\|\.svg)' {} \; | \
        sed 's/.*(\(.*\))/\1/' | sort -u > "$temp_refs"

    echo "Checking image references..."
    local broken_count=0
    while read -r img_path; do
        # Resolve relative paths
        local full_path="${REPO_ROOT}/${img_path}"
        if [[ ! -f "$full_path" ]]; then
            broken_count=$((broken_count + 1))
            echo -e "${YELLOW}  • Broken reference: $img_path${NC}"
        fi
    done < "$temp_refs"

    OUTDATED_IMAGES=$broken_count

    if [[ $broken_count -eq 0 ]]; then
        echo -e "${GREEN}✓ All image references are valid${NC}"
    fi

    rm "$temp_refs"
    echo ""
}

# Find unused assets
find_unused_assets() {
    print_section "Finding Unused Assets"

    if [[ -d "${REPO_ROOT}/docs/static" ]]; then
        echo "Scanning for unused static assets..."
        find "${REPO_ROOT}/docs/static" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.gif" -o -name "*.svg" \) | while read -r asset; do
            local basename=$(basename "$asset")
            # Search for references to this file
            if ! grep -rq "$basename" "${DOCS_DIR}"; then
                UNUSED_ASSETS=$((UNUSED_ASSETS + 1))
                echo -e "${YELLOW}  • Unused: $asset${NC}"
            fi
        done

        if [[ $UNUSED_ASSETS -eq 0 ]]; then
            echo -e "${GREEN}✓ All static assets are referenced${NC}"
        fi
    else
        echo "No static assets directory found"
    fi
    echo ""
}

# Generate optimization report
generate_report() {
    print_section "Optimization Summary"

    local report_file="${REPORTS_DIR}/optimization-report-${TIMESTAMP}.md"

    cat > "$report_file" <<EOF
# Documentation Optimization Report

**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Audit Mode**: --optimize

## Executive Summary

This report identifies optimization opportunities to improve documentation quality, performance, and maintainability.

## Findings

### Content Duplication
- **Potential duplicates found**: ${DUPLICATE_CONTENT}
- **Recommendation**: Review duplicate content for consolidation opportunities

### File Size and Complexity
- **Files exceeding 500 lines**: ${LONG_FILES}
- **Recommendation**: Split long files into focused topics for better navigation

### Navigation and Structure
- **Large files missing TOC**: ${MISSING_TOC}
- **Recommendation**: Add table of contents to files > 300 lines

### Readability
- **Files with readability issues**: ${POOR_READABILITY}
- **Recommendation**: Break long paragraphs, balance code-to-text ratio

### Assets and Media
- **Broken image references**: ${OUTDATED_IMAGES}
- **Unused static assets**: ${UNUSED_ASSETS}
- **Recommendation**: Clean up unused assets, fix broken references

## Overall Health Score

EOF

    # Calculate optimization score
    local total_issues=$((DUPLICATE_CONTENT + LONG_FILES + MISSING_TOC + POOR_READABILITY + OUTDATED_IMAGES + UNUSED_ASSETS))
    local optimization_score=100

    # Deduct points based on issues
    optimization_score=$((optimization_score - (DUPLICATE_CONTENT * 5)))
    optimization_score=$((optimization_score - (LONG_FILES * 2)))
    optimization_score=$((optimization_score - (MISSING_TOC * 3)))
    optimization_score=$((optimization_score - (POOR_READABILITY * 3)))
    optimization_score=$((optimization_score - (OUTDATED_IMAGES * 5)))
    optimization_score=$((optimization_score - (UNUSED_ASSETS * 1)))

    # Ensure score doesn't go negative
    [[ $optimization_score -lt 0 ]] && optimization_score=0

    local status="NEEDS OPTIMIZATION"
    [[ $optimization_score -ge 90 ]] && status="EXCELLENT"
    [[ $optimization_score -ge 75 ]] && [[ $optimization_score -lt 90 ]] && status="GOOD"
    [[ $optimization_score -ge 60 ]] && [[ $optimization_score -lt 75 ]] && status="FAIR"

    cat >> "$report_file" <<EOF
**Optimization Score**: ${optimization_score}/100 (${status})

## Recommended Actions

### High Priority
EOF

    [[ $OUTDATED_IMAGES -gt 0 ]] && echo "1. Fix ${OUTDATED_IMAGES} broken image references" >> "$report_file"
    [[ $DUPLICATE_CONTENT -gt 0 ]] && echo "2. Review and consolidate ${DUPLICATE_CONTENT} duplicate content sections" >> "$report_file"

    cat >> "$report_file" <<EOF

### Medium Priority
EOF

    [[ $LONG_FILES -gt 0 ]] && echo "3. Split ${LONG_FILES} oversized files into focused topics" >> "$report_file"
    [[ $MISSING_TOC -gt 0 ]] && echo "4. Add table of contents to ${MISSING_TOC} large files" >> "$report_file"

    cat >> "$report_file" <<EOF

### Low Priority
EOF

    [[ $POOR_READABILITY -gt 0 ]] && echo "5. Improve readability in ${POOR_READABILITY} files" >> "$report_file"
    [[ $UNUSED_ASSETS -gt 0 ]] && echo "6. Clean up ${UNUSED_ASSETS} unused static assets" >> "$report_file"

    cat >> "$report_file" <<EOF

## Next Steps

1. Review this report and prioritize optimization tasks
2. Create tracking issues for each optimization area
3. Schedule optimization work in upcoming sprint
4. Run optimization analysis monthly to track progress

---

*Generated by Documentation Optimization Tool*
EOF

    echo -e "${GREEN}✓ Report generated: $report_file${NC}"
    echo ""

    # Display summary
    echo -e "${BLUE}Optimization Score: ${optimization_score}/100 (${status})${NC}"
    echo ""
    echo "Issues Found:"
    echo "  ├─ Content Duplication:    $DUPLICATE_CONTENT"
    echo "  ├─ Long Files:             $LONG_FILES"
    echo "  ├─ Missing TOC:            $MISSING_TOC"
    echo "  ├─ Readability Issues:     $POOR_READABILITY"
    echo "  ├─ Broken Images:          $OUTDATED_IMAGES"
    echo "  └─ Unused Assets:          $UNUSED_ASSETS"
    echo ""

    return $optimization_score
}

# Main execution
main() {
    print_header

    local mode="${1:---analyze}"

    case "$mode" in
        --analyze)
            analyze_duplication
            analyze_file_sizes
            analyze_toc
            analyze_readability
            analyze_images
            find_unused_assets
            generate_report
            ;;
        --optimize)
            echo "Optimization mode: Implementing automated fixes..."
            echo "This mode will be implemented in future versions"
            ;;
        --report)
            generate_report
            ;;
        --help)
            echo "Usage: $0 [--analyze|--optimize|--report|--help]"
            echo ""
            echo "Options:"
            echo "  --analyze   Run full optimization analysis (default)"
            echo "  --optimize  Apply automated optimization fixes"
            echo "  --report    Generate optimization report only"
            echo "  --help      Show this help message"
            ;;
        *)
            echo "Unknown option: $mode"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Ensure reports directory exists
mkdir -p "${REPORTS_DIR}"

main "$@"
