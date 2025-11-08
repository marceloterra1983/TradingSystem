#!/bin/bash
# Documentation Audit and Quality Assessment Script
# Purpose: Comprehensive documentation health check and quality metrics
# Usage: bash scripts/docs/audit-documentation.sh [--full|--quick|--quality|--links]

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCS_CONTENT_DIR="./docs/content"
DOCS_ROOT="./docs"
GOVERNANCE_DIR="./governance"
REPORT_DIR="./docs/reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="${REPORT_DIR}/audit-report-${TIMESTAMP}.md"
JSON_REPORT="${REPORT_DIR}/audit-report-${TIMESTAMP}.json"

# Audit mode (default: full)
AUDIT_MODE="${1:---full}"

# Thresholds
MAX_AGE_DAYS=90
MIN_CONTENT_LENGTH=100
MAX_TODO_COUNT=50
MAX_FIXME_COUNT=20

# Create reports directory
mkdir -p "$REPORT_DIR"

# Initialize counters
total_files=0
valid_frontmatter=0
missing_frontmatter=0
outdated_docs=0
todo_count=0
fixme_count=0
broken_internal_links=0
broken_external_links=0
warnings=0
errors=0
score=0
health_status=""
health_color=""

# Start audit
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Documentation Quality Audit & Health Assessment           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Audit Mode:${NC} $AUDIT_MODE"
echo -e "${GREEN}Timestamp:${NC} $(date)"
echo -e "${GREEN}Documentation Root:${NC} $DOCS_CONTENT_DIR"
echo ""

# Function: Print section header
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function: Count files
count_files() {
    print_section "1. File Discovery and Categorization"

    echo -e "${YELLOW}Scanning documentation files...${NC}"

    # Count all markdown files
    total_files=$(find "$DOCS_CONTENT_DIR" -type f \( -name "*.md" -o -name "*.mdx" \) | wc -l | tr -d ' ')

    # Count by category
    app_docs=$(find "$DOCS_CONTENT_DIR/apps" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    api_docs=$(find "$DOCS_CONTENT_DIR/api" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    frontend_docs=$(find "$DOCS_CONTENT_DIR/frontend" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    tools_docs=$(find "$DOCS_CONTENT_DIR/tools" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    database_docs=$(find "$DOCS_CONTENT_DIR/database" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    prd_docs=$(find "$DOCS_CONTENT_DIR/prd" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    sdd_docs=$(find "$DOCS_CONTENT_DIR/sdd" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    reference_docs=$(find "$DOCS_CONTENT_DIR/reference" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null | wc -l | tr -d ' ' || echo "0")

    echo -e "${GREEN}✓${NC} Total documentation files: ${GREEN}$total_files${NC}"
    echo ""
    echo "  Category Breakdown:"
    echo "  ├─ Apps Documentation:      $app_docs files"
    echo "  ├─ API Documentation:       $api_docs files"
    echo "  ├─ Frontend Documentation:  $frontend_docs files"
    echo "  ├─ Tools Documentation:     $tools_docs files"
    echo "  ├─ Database Documentation:  $database_docs files"
    echo "  ├─ Product Requirements:    $prd_docs files"
    echo "  ├─ Software Design Docs:    $sdd_docs files"
    echo "  └─ Reference Documentation: $reference_docs files"
}

# Function: Validate frontmatter
validate_frontmatter() {
    print_section "2. Frontmatter Validation"

    echo -e "${YELLOW}Checking YAML frontmatter compliance...${NC}"
    echo ""

    local files_checked=0
    local files_with_frontmatter=0
    local files_without_frontmatter=0
    local files_with_incomplete_frontmatter=0

    # Required fields
    local required_fields=("title" "tags" "domain" "type" "summary" "status" "last_review")

    while IFS= read -r file; do
        files_checked=$((files_checked + 1))

        # Check if file has frontmatter
        if head -n 1 "$file" | grep -q "^---$"; then
            files_with_frontmatter=$((files_with_frontmatter + 1))

            # Extract frontmatter
            frontmatter=$(awk '/^---$/{if(++n==2){exit}} n==1' "$file")

            # Check required fields
            local missing_fields=()
            for field in "${required_fields[@]}"; do
                if ! echo "$frontmatter" | grep -q "^${field}:"; then
                    missing_fields+=("$field")
                fi
            done

            if [ ${#missing_fields[@]} -gt 0 ]; then
                files_with_incomplete_frontmatter=$((files_with_incomplete_frontmatter + 1))
                echo -e "  ${YELLOW}⚠${NC}  Incomplete frontmatter: ${file#./}"
                echo "     Missing fields: ${missing_fields[*]}"
            fi

            # Check last_review date (if present)
            if echo "$frontmatter" | grep -q "^last_review:"; then
                last_review=$(echo "$frontmatter" | grep "^last_review:" | sed 's/last_review: *//;s/"//g')

                # Calculate age in days (if date is valid)
                if date -d "$last_review" &>/dev/null; then
                    last_review_epoch=$(date -d "$last_review" +%s)
                    current_epoch=$(date +%s)
                    age_days=$(( (current_epoch - last_review_epoch) / 86400 ))

                    if [ "$age_days" -gt "$MAX_AGE_DAYS" ]; then
                        outdated_docs=$((outdated_docs + 1))
                        echo -e "  ${YELLOW}⚠${NC}  Outdated document (${age_days} days): ${file#./}"
                    fi
                fi
            fi
        else
            files_without_frontmatter=$((files_without_frontmatter + 1))
            echo -e "  ${RED}✗${NC} Missing frontmatter: ${file#./}"
            errors=$((errors + 1))
        fi
    done < <(find "$DOCS_CONTENT_DIR" -type f \( -name "*.md" -o -name "*.mdx" \))

    valid_frontmatter=$files_with_frontmatter
    missing_frontmatter=$files_without_frontmatter

    echo ""
    echo -e "${GREEN}✓${NC} Frontmatter validation complete"
    echo ""
    echo "  Summary:"
    echo "  ├─ Files checked:               $files_checked"
    echo "  ├─ Files with frontmatter:      $files_with_frontmatter"
    echo "  ├─ Files missing frontmatter:   $files_without_frontmatter"
    echo "  ├─ Files with incomplete data:  $files_with_incomplete_frontmatter"
    echo "  └─ Outdated documents (>90d):   $outdated_docs"
}

# Function: Check for TODO/FIXME markers
check_markers() {
    print_section "3. TODO/FIXME Marker Tracking"

    echo -e "${YELLOW}Scanning for outstanding tasks and issues...${NC}"
    echo ""

    # Count TODO markers
    todo_count=$(grep -r -i "TODO" "$DOCS_CONTENT_DIR" --include="*.md" --include="*.mdx" 2>/dev/null | wc -l | tr -d ' ')
    fixme_count=$(grep -r -i "FIXME" "$DOCS_CONTENT_DIR" --include="*.md" --include="*.mdx" 2>/dev/null | wc -l | tr -d ' ')

    echo -e "${GREEN}✓${NC} Marker scan complete"
    echo ""
    echo "  Results:"
    echo "  ├─ TODO markers found:  $todo_count"
    echo "  └─ FIXME markers found: $fixme_count"

    if [ "$todo_count" -gt "$MAX_TODO_COUNT" ]; then
        echo ""
        echo -e "  ${YELLOW}⚠${NC}  High TODO count (threshold: $MAX_TODO_COUNT)"
        warnings=$((warnings + 1))
    fi

    if [ "$fixme_count" -gt "$MAX_FIXME_COUNT" ]; then
        echo ""
        echo -e "  ${YELLOW}⚠${NC}  High FIXME count (threshold: $MAX_FIXME_COUNT)"
        warnings=$((warnings + 1))
    fi

    # Show top 5 files with most TODOs
    if [ "$todo_count" -gt 0 ]; then
        echo ""
        echo "  Top files with TODO markers:"
        grep -r -i "TODO" "$DOCS_CONTENT_DIR" --include="*.md" --include="*.mdx" 2>/dev/null | \
            cut -d: -f1 | sort | uniq -c | sort -rn | head -5 | while read count file; do
            echo "  │  $count TODOs - ${file#./}"
        done
    fi
}

# Function: Analyze content quality
analyze_content_quality() {
    print_section "4. Content Quality Analysis"

    echo -e "${YELLOW}Analyzing content length and structure...${NC}"
    echo ""

    local short_files=0
    local medium_files=0
    local long_files=0
    local total_words=0

    while IFS= read -r file; do
        # Count words (excluding frontmatter)
        word_count=$(awk '/^---$/{if(++n==2){p=1;next}} p' "$file" | wc -w | tr -d ' ')
        total_words=$((total_words + word_count))

        if [ "$word_count" -lt 100 ]; then
            short_files=$((short_files + 1))
        elif [ "$word_count" -lt 500 ]; then
            medium_files=$((medium_files + 1))
        else
            long_files=$((long_files + 1))
        fi

        # Check for very short files (potential stubs)
        if [ "$word_count" -lt "$MIN_CONTENT_LENGTH" ]; then
            echo -e "  ${YELLOW}⚠${NC}  Short content ($word_count words): ${file#./}"
        fi
    done < <(find "$DOCS_CONTENT_DIR" -type f \( -name "*.md" -o -name "*.mdx" \))

    local avg_words=$((total_words / total_files))

    echo ""
    echo -e "${GREEN}✓${NC} Content analysis complete"
    echo ""
    echo "  Statistics:"
    echo "  ├─ Total words:          $total_words"
    echo "  ├─ Average words/file:   $avg_words"
    echo "  ├─ Short files (<100w):  $short_files"
    echo "  ├─ Medium files (100-500w): $medium_files"
    echo "  └─ Long files (>500w):   $long_files"
}

# Function: Check internal links
check_internal_links() {
    print_section "5. Internal Link Validation"

    echo -e "${YELLOW}Validating internal references...${NC}"
    echo ""

    local links_checked=0
    local links_valid=0
    local links_broken=0

    while IFS= read -r file; do
        # Extract markdown links [text](path)
        while IFS= read -r link; do
            # Skip external links (http/https)
            if [[ "$link" =~ ^https?:// ]]; then
                continue
            fi

            links_checked=$((links_checked + 1))

            # Resolve relative path
            file_dir=$(dirname "$file")
            full_path="$file_dir/$link"

            # Normalize path
            full_path=$(realpath -m "$full_path" 2>/dev/null || echo "$full_path")

            # Check if file exists
            if [ ! -f "$full_path" ]; then
                links_broken=$((links_broken + 1))
                echo -e "  ${RED}✗${NC} Broken link in ${file#./}"
                echo "     Target: $link"
            else
                links_valid=$((links_valid + 1))
            fi
        done < <(grep -oP '\]\(\K[^)]+' "$file" 2>/dev/null || true)
    done < <(find "$DOCS_CONTENT_DIR" -type f \( -name "*.md" -o -name "*.mdx" \))

    broken_internal_links=$links_broken

    echo ""
    echo -e "${GREEN}✓${NC} Internal link validation complete"
    echo ""
    echo "  Results:"
    echo "  ├─ Links checked:  $links_checked"
    echo "  ├─ Valid links:    $links_valid"
    echo "  └─ Broken links:   $links_broken"

    if [ "$links_broken" -gt 0 ]; then
        errors=$((errors + links_broken))
    fi
}

# Function: Generate summary report
generate_summary() {
    print_section "Audit Summary"

    # Calculate health score (0-100)
    local max_score=100
    score=$max_score

    # Deduct points for issues
    score=$((score - (missing_frontmatter * 2)))
    score=$((score - (outdated_docs * 1)))
    score=$((score - (broken_internal_links * 3)))
    score=$((score - (errors * 5)))
    score=$((score - (warnings * 2)))

    # Ensure score doesn't go negative
    if [ "$score" -lt 0 ]; then
        score=0
    fi

    # Determine health status
    local health_status
    local health_color
    if [ "$score" -ge 90 ]; then
        health_status="EXCELLENT"
        health_color=$GREEN
    elif [ "$score" -ge 75 ]; then
        health_status="GOOD"
        health_color=$GREEN
    elif [ "$score" -ge 60 ]; then
        health_status="FAIR"
        health_color=$YELLOW
    else
        health_status="NEEDS ATTENTION"
        health_color=$RED
    fi

    echo -e "${health_color}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${health_color}║  Documentation Health Score: ${score}/100 (${health_status})${NC}"
    echo -e "${health_color}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    echo "Key Metrics:"
    echo "  ├─ Total files:              $total_files"
    echo "  ├─ Valid frontmatter:        $valid_frontmatter"
    echo "  ├─ Missing frontmatter:      $missing_frontmatter"
    echo "  ├─ Outdated documents:       $outdated_docs"
    echo "  ├─ TODO markers:             $todo_count"
    echo "  ├─ FIXME markers:            $fixme_count"
    echo "  ├─ Broken internal links:    $broken_internal_links"
    echo "  ├─ Warnings:                 $warnings"
    echo "  └─ Errors:                   $errors"
    echo ""

    if [ "$errors" -gt 0 ]; then
        echo -e "${RED}⚠  Action Required:${NC} $errors critical issues found"
    elif [ "$warnings" -gt 0 ]; then
        echo -e "${YELLOW}⚠  Attention Needed:${NC} $warnings warnings to review"
    else
        echo -e "${GREEN}✓  All checks passed${NC}"
    fi
}

# Function: Save report
save_report() {
    print_section "Report Generation"

    # Generate markdown report
    cat > "$REPORT_FILE" <<EOF
# Documentation Audit Report

**Date**: $(date)
**Audit Mode**: $AUDIT_MODE
**Health Score**: $score/100 ($health_status)

## Executive Summary

This audit assessed $total_files documentation files across the project.

### Key Findings

- **Frontmatter Compliance**: $valid_frontmatter/$total_files files have valid frontmatter
- **Content Freshness**: $outdated_docs files are outdated (>90 days)
- **Outstanding Tasks**: $todo_count TODOs, $fixme_count FIXMEs
- **Link Health**: $broken_internal_links broken internal links
- **Issues**: $errors errors, $warnings warnings

## Detailed Results

### 1. File Discovery

| Category | Count |
|----------|-------|
| Total Files | $total_files |
| Apps Documentation | $app_docs |
| API Documentation | $api_docs |
| Frontend Documentation | $frontend_docs |
| Tools Documentation | $tools_docs |
| Database Documentation | $database_docs |
| Product Requirements | $prd_docs |
| Software Design Docs | $sdd_docs |
| Reference Documentation | $reference_docs |

### 2. Frontmatter Validation

- Files with frontmatter: $valid_frontmatter
- Files missing frontmatter: $missing_frontmatter
- Outdated documents (>90 days): $outdated_docs

### 3. Task Markers

- TODO markers: $todo_count
- FIXME markers: $fixme_count

### 4. Link Validation

- Broken internal links: $broken_internal_links

## Recommendations

EOF

    if [ "$missing_frontmatter" -gt 0 ]; then
        echo "1. Add frontmatter to $missing_frontmatter files" >> "$REPORT_FILE"
    fi

    if [ "$outdated_docs" -gt 0 ]; then
        echo "2. Review and update $outdated_docs outdated documents" >> "$REPORT_FILE"
    fi

    if [ "$broken_internal_links" -gt 0 ]; then
        echo "3. Fix $broken_internal_links broken internal links" >> "$REPORT_FILE"
    fi

    if [ "$todo_count" -gt "$MAX_TODO_COUNT" ]; then
        echo "4. Address high TODO count ($todo_count markers)" >> "$REPORT_FILE"
    fi

    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "*Generated by Documentation Audit Script*" >> "$REPORT_FILE"

    # Generate JSON report
    cat > "$JSON_REPORT" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "auditMode": "$AUDIT_MODE",
  "healthScore": $score,
  "healthStatus": "$health_status",
  "metrics": {
    "totalFiles": $total_files,
    "validFrontmatter": $valid_frontmatter,
    "missingFrontmatter": $missing_frontmatter,
    "outdatedDocs": $outdated_docs,
    "todoCount": $todo_count,
    "fixmeCount": $fixme_count,
    "brokenInternalLinks": $broken_internal_links,
    "warnings": $warnings,
    "errors": $errors
  },
  "categories": {
    "apps": $app_docs,
    "api": $api_docs,
    "frontend": $frontend_docs,
    "tools": $tools_docs,
    "database": $database_docs,
    "prd": $prd_docs,
    "sdd": $sdd_docs,
    "reference": $reference_docs
  }
}
EOF

    echo -e "${GREEN}✓${NC} Reports generated:"
    echo "  ├─ Markdown: ${REPORT_FILE#./}"
    echo "  └─ JSON:     ${JSON_REPORT#./}"
}

# Main execution
main() {
    case "$AUDIT_MODE" in
        --quick)
            count_files
            validate_frontmatter
            check_markers
            ;;
        --quality)
            count_files
            validate_frontmatter
            analyze_content_quality
            ;;
        --links)
            check_internal_links
            ;;
        --full|*)
            count_files
            validate_frontmatter
            check_markers
            analyze_content_quality
            check_internal_links
            ;;
    esac

    generate_summary
    save_report

    echo ""
    echo -e "${GREEN}✓ Documentation audit complete${NC}"
    echo ""

    # Exit with appropriate code
    if [ "$errors" -gt 0 ]; then
        exit 1
    elif [ "$warnings" -gt 10 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main
main
