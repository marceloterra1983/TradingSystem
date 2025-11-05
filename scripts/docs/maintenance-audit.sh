#!/bin/bash
# Documentation Maintenance and Quality Audit System
# Part of TradingSystem Documentation Governance
# Version: 1.1.0
# Last Updated: 2025-11-03

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
DOCS_CONTENT_DIR="${PROJECT_ROOT}/docs/content"
DOCS_GOVERNANCE_DIR="${PROJECT_ROOT}/governance"
REPORT_DIR="${PROJECT_ROOT}/docs/reports"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
REPORT_FILE="${REPORT_DIR}/maintenance-audit-${TIMESTAMP}.md"

# Thresholds
STALE_DAYS=90
MIN_WORDS=50
MAX_LINE_LENGTH=120

# CI configuration
CI_MODE=false
CI_THRESHOLD=10

# Statistics
total_files=0
stale_files=0
short_files=0
missing_frontmatter=0
invalid_owner_count=0
invalid_last_reviewed=0
broken_links=0
issues_found=0

# Create report directory
mkdir -p "${REPORT_DIR}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Initialize report
init_report() {
    cat > "${REPORT_FILE}" << EOF
---
title: Documentation Maintenance Audit Report
date: $(date +%Y-%m-%d)
type: audit-report
tags: [documentation, maintenance, quality-assurance]
domain: governance
status: generated
---

# Documentation Maintenance Audit Report

**Generated**: $(date '+%Y-%m-%d %H:%M:%S')
**Auditor**: Automated Maintenance System
**Scope**: TradingSystem Documentation

---

## Executive Summary

EOF
}

# Content Quality Audit
audit_content_quality() {
    log_info "Starting content quality audit..."

    echo -e "\n## 1. Content Quality Audit\n" >> "${REPORT_FILE}"
    echo "### File Discovery and Categorization\n" >> "${REPORT_FILE}"

    # Count files by type
    local md_files=$(find "${DOCS_CONTENT_DIR}" -name "*.md" 2>/dev/null | wc -l)
    local mdx_files=$(find "${DOCS_CONTENT_DIR}" -name "*.mdx" 2>/dev/null | wc -l)
    local total=$((md_files + mdx_files))
    total_files=$total

    cat >> "${REPORT_FILE}" << EOF
| Category | Count |
|----------|-------|
| Markdown (.md) | ${md_files} |
| MDX (.mdx) | ${mdx_files} |
| **Total** | **${total}** |

EOF

    log_success "Found ${total} documentation files"
}

# Check file freshness
check_freshness() {
    log_info "Checking file freshness (stale threshold: ${STALE_DAYS} days)..."

    echo -e "### Content Freshness Analysis\n" >> "${REPORT_FILE}"
    echo "Files not modified in the last ${STALE_DAYS} days:\n" >> "${REPORT_FILE}"

    local stale_list="${REPORT_DIR}/stale-files-${TIMESTAMP}.txt"
    > "${stale_list}"

    while IFS= read -r file; do
        local mtime=$(stat -c %Y "$file" 2>/dev/null || echo 0)
        local current=$(date +%s)
        local age_days=$(( (current - mtime) / 86400 ))

        if [ "$age_days" -gt "$STALE_DAYS" ]; then
            echo "$file (${age_days} days old)" >> "${stale_list}"
            ((stale_files++)) || true
        fi
    done < <(find "${DOCS_CONTENT_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null)

    if [ "$stale_files" -gt 0 ]; then
        echo "- **Stale files found**: ${stale_files}" >> "${REPORT_FILE}"
        echo "- **Details**: See \`stale-files-${TIMESTAMP}.txt\`" >> "${REPORT_FILE}"
        log_warning "Found ${stale_files} stale files (>90 days old)"
    else
        echo "- ✅ **All files are fresh** (modified within ${STALE_DAYS} days)" >> "${REPORT_FILE}"
        log_success "All files are fresh"
    fi

    echo "" >> "${REPORT_FILE}"
}

# Validate frontmatter
validate_frontmatter() {
    log_info "Validating YAML frontmatter..."

    echo -e "### Frontmatter Validation\n" >> "${REPORT_FILE}"

    if ! command -v python3 >/dev/null 2>&1; then
        echo "- ❌ python3 is required for frontmatter validation but is not available." >> "${REPORT_FILE}"
        log_error "python3 not available; skipping frontmatter validation."
        ((issues_found++))
        return
    fi

    if ! command -v jq >/dev/null 2>&1; then
        echo "- ❌ jq is required to parse validation output but is not installed." >> "${REPORT_FILE}"
        log_error "jq not available; skipping frontmatter validation."
        ((issues_found++))
        return
    fi

    local validation_script="${PROJECT_ROOT}/scripts/docs/validate-frontmatter.py"
    if [[ ! -f "${validation_script}" ]]; then
        echo "- ❌ Validation script not found at ${validation_script}" >> "${REPORT_FILE}"
        log_error "Validation script missing; cannot validate frontmatter."
        ((issues_found++))
        return
    fi

    local validation_report="${REPORT_DIR}/frontmatter-validation-${TIMESTAMP}.json"
    log_info "Running Python frontmatter validator..."
    if python3 "${validation_script}" --schema v2 --docs-dir "${DOCS_CONTENT_DIR}" --output "${validation_report}"; then
        log_success "Frontmatter validator completed."
    else
        local validator_exit=$?
        log_warning "Frontmatter validator reported issues (exit code ${validator_exit}). Continuing with report generation."
    fi

    if [[ ! -f "${validation_report}" ]]; then
        echo "- ❌ Validation report was not generated (expected ${validation_report})." >> "${REPORT_FILE}"
        log_error "Frontmatter validation report missing."
        ((issues_found++))
        return
    fi

    local missing_list="${REPORT_DIR}/missing-frontmatter-${TIMESTAMP}.txt"
    local invalid_owner_list="${REPORT_DIR}/invalid-owners-${TIMESTAMP}.txt"
    local invalid_last_reviewed_list="${REPORT_DIR}/invalid-last-reviewed-${TIMESTAMP}.txt"
    > "${missing_list}"
    > "${invalid_owner_list}"
    > "${invalid_last_reviewed_list}"

    local missing_only
    missing_only=$(jq '[.missing_frontmatter[]?] | length' "${validation_report}")
    local incomplete_count
    incomplete_count=$(jq '[.incomplete_frontmatter[]?] | length' "${validation_report}")
    missing_frontmatter=$((missing_only + incomplete_count))

    invalid_owner_count=$(jq '[.invalid_values[]? | select(.field=="owner")] | length' "${validation_report}")
    invalid_last_reviewed=$(jq '[.invalid_values[]? | select(.field=="lastReviewed" or .field=="last_review")] | length' "${validation_report}")

    jq -r '
        .missing_frontmatter[]? | "\(.): missing frontmatter"
    ' "${validation_report}" >> "${missing_list}"

    jq -r '
        .incomplete_frontmatter[]? | "\(.file): missing \(.missing_fields | join(", "))"
    ' "${validation_report}" >> "${missing_list}"

    jq -r '
        .invalid_values[]?
        | select(.field=="owner")
        | "\(.file): owner '\''\(.value // "unknown")'\'' not in allowed list"
    ' "${validation_report}" >> "${invalid_owner_list}"

    jq -r '
        .invalid_values[]?
        | select(.field=="lastReviewed" or .field=="last_review")
        | "\(.file): invalid lastReviewed '\''\(.value // "unknown")'\''"
    ' "${validation_report}" >> "${invalid_last_reviewed_list}"

    if [ "${missing_frontmatter}" -gt 0 ]; then
        echo "- ⚠️ **Files with incomplete frontmatter**: ${missing_frontmatter}" >> "${REPORT_FILE}"
        echo "- **Details**: See \`missing-frontmatter-${TIMESTAMP}.txt\`" >> "${REPORT_FILE}"
        log_warning "Found ${missing_frontmatter} files with incomplete frontmatter"
        ((issues_found += missing_frontmatter))
    else
        echo "- ✅ **All files have complete frontmatter**" >> "${REPORT_FILE}"
        log_success "All files have complete frontmatter"
    fi

    if [ "$invalid_owner_count" -gt 0 ]; then
        echo "- ⚠️ **Files with invalid owners**: ${invalid_owner_count}" >> "${REPORT_FILE}"
        echo "- **Details**: See \`invalid-owners-${TIMESTAMP}.txt\`" >> "${REPORT_FILE}"
        log_warning "Found ${invalid_owner_count} files with invalid owners"
        ((issues_found += invalid_owner_count))
    else
        echo "- ✅ **All owners match the approved ownership list**" >> "${REPORT_FILE}"
        log_success "All owners are valid"
    fi

    if [ "$invalid_last_reviewed" -gt 0 ]; then
        echo "- ⚠️ **Files with invalid lastReviewed dates**: ${invalid_last_reviewed}" >> "${REPORT_FILE}"
        echo "- **Details**: See \`invalid-last-reviewed-${TIMESTAMP}.txt\`" >> "${REPORT_FILE}"
        log_warning "Found ${invalid_last_reviewed} files with invalid lastReviewed dates"
        ((issues_found += invalid_last_reviewed))
    else
        echo "- ✅ **All lastReviewed fields use YYYY-MM-DD format**" >> "${REPORT_FILE}"
        log_success "All lastReviewed fields use the correct format"
    fi

    echo "" >> "${REPORT_FILE}"
}

# Check file sizes and word counts
check_content_size() {
    log_info "Analyzing content size and word counts..."

    echo -e "### Content Size Analysis\n" >> "${REPORT_FILE}"

    local short_list="${REPORT_DIR}/short-files-${TIMESTAMP}.txt"
    > "${short_list}"

    local total_words=0
    local file_count=0

    while IFS= read -r file; do
        # Count words (excluding frontmatter)
        local words=$(sed '/^---$/,/^---$/d' "$file" | wc -w)
        total_words=$((total_words + words))
        ((file_count++))

        if [ "$words" -lt "$MIN_WORDS" ]; then
            echo "$file (${words} words)" >> "${short_list}"
            ((short_files++)) || true
        fi
    done < <(find "${DOCS_CONTENT_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null)

    local avg_words=$((total_words / file_count))

    cat >> "${REPORT_FILE}" << EOF
| Metric | Value |
|--------|-------|
| Total words | ${total_words} |
| Average words per file | ${avg_words} |
| Files below ${MIN_WORDS} words | ${short_files} |

EOF

    if [ "$short_files" -gt 0 ]; then
        echo "- ⚠️ **Short files needing expansion**: ${short_files}" >> "${REPORT_FILE}"
        echo "- **Details**: See \`short-files-${TIMESTAMP}.txt\`" >> "${REPORT_FILE}"
        log_warning "Found ${short_files} short files (<${MIN_WORDS} words)"
        ((issues_found += short_files))
    fi

    echo "" >> "${REPORT_FILE}"
}

# Validate internal links
validate_internal_links() {
    log_info "Validating internal links..."

    echo -e "## 2. Link and Reference Validation\n" >> "${REPORT_FILE}"
    echo "### Internal Links\n" >> "${REPORT_FILE}"

    local broken_list="${REPORT_DIR}/broken-links-${TIMESTAMP}.txt"
    > "${broken_list}"

    local checked=0

    while IFS= read -r file; do
        # Extract markdown links
        while IFS= read -r link; do
            if [[ "$link" =~ ^\[.*\]\((.*)\) ]]; then
                local href="${BASH_REMATCH[1]}"

                # Skip external links, anchors, and special protocols
                if [[ "$href" =~ ^https?:// ]] || [[ "$href" =~ ^# ]] || [[ "$href" =~ ^mailto: ]]; then
                    continue
                fi

                # Resolve relative path
                local dir=$(dirname "$file")
                local clean_href="${href%%#*}"
                clean_href="${clean_href%%\?*}"

                if [[ -z "${clean_href}" ]]; then
                    continue
                fi

                local target=""
                if [[ "${clean_href}" == /* ]]; then
                    local root_candidate="${DOCS_CONTENT_DIR}${clean_href}"
                    if [[ -e "${root_candidate}" ]]; then
                        target="${root_candidate}"
                    elif [[ -e "${root_candidate}.md" ]]; then
                        target="${root_candidate}.md"
                    elif [[ -e "${root_candidate}.mdx" ]]; then
                        target="${root_candidate}.mdx"
                    else
                        # Treat as site-root slug; skip to avoid false positives
                        continue
                    fi
                else
                    target="${dir}/${clean_href}"
                fi

                local normalized_target
                normalized_target=$(realpath -m "${target}" 2>/dev/null || printf '%s' "${target}")

                # Check if target exists
                if [ ! -e "${normalized_target}" ]; then
                    echo "$file: broken link to $href" >> "${broken_list}"
                    ((broken_links++)) || true
                fi

                ((checked++))
            fi
        done < <(grep -oP '\[.*?\]\(.*?\)' "$file" 2>/dev/null || true)
    done < <(find "${DOCS_CONTENT_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null)

    cat >> "${REPORT_FILE}" << EOF
| Metric | Value |
|--------|-------|
| Internal links checked | ${checked} |
| Broken links found | ${broken_links} |

EOF

    if [ "$broken_links" -gt 0 ]; then
        echo "- ⚠️ **Broken internal links**: ${broken_links}" >> "${REPORT_FILE}"
        echo "- **Details**: See \`broken-links-${TIMESTAMP}.txt\`" >> "${REPORT_FILE}"
        log_warning "Found ${broken_links} broken internal links"
        ((issues_found += broken_links))
    else
        echo "- ✅ **All internal links valid**" >> "${REPORT_FILE}"
        log_success "All internal links are valid"
    fi

    echo "" >> "${REPORT_FILE}"
}

# Check style consistency
check_style_consistency() {
    log_info "Checking style consistency..."

    echo -e "## 3. Style and Consistency Check\n" >> "${REPORT_FILE}"

    local style_issues=0
    local long_lines=0

    while IFS= read -r file; do
        # Check line length (skip code blocks)
        local in_code_block=false
        while IFS= read -r line; do
            if [[ "$line" =~ ^\`\`\` ]]; then
                in_code_block=$([[ "$in_code_block" == "false" ]] && echo "true" || echo "false")
                continue
            fi

            if [ "$in_code_block" == "false" ]; then
                local line_length=${#line}
                if [ "$line_length" -gt "$MAX_LINE_LENGTH" ]; then
                    ((long_lines++))
                fi
            fi
        done < "$file"
    done < <(find "${DOCS_CONTENT_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) 2>/dev/null)

    cat >> "${REPORT_FILE}" << EOF
| Check | Result |
|-------|--------|
| Lines exceeding ${MAX_LINE_LENGTH} chars | ${long_lines} |

EOF

    if [ "$long_lines" -gt 0 ]; then
        log_warning "Found ${long_lines} lines exceeding ${MAX_LINE_LENGTH} characters"
    else
        log_success "All lines within ${MAX_LINE_LENGTH} character limit"
    fi

    echo "" >> "${REPORT_FILE}"
}

# Generate summary
generate_summary() {
    log_info "Generating summary..."

    # Calculate health score (0-100)
    local max_issues=$((total_files * 3)) # Assume max 3 issues per file
    local health_score=$((100 - (issues_found * 100 / max_issues)))
    [ "$health_score" -lt 0 ] && health_score=0

    # Determine health status
    local health_status="Excellent"
    local health_emoji="🟢"
    if [ "$health_score" -lt 90 ]; then
        health_status="Good"
        health_emoji="🟡"
    fi
    if [ "$health_score" -lt 70 ]; then
        health_status="Fair"
        health_emoji="🟠"
    fi
    if [ "$health_score" -lt 50 ]; then
        health_status="Poor"
        health_emoji="🔴"
    fi

    # Update executive summary
    sed -i "/## Executive Summary/a\\
\\
**Overall Health Score**: ${health_emoji} ${health_score}/100 (${health_status})\\
\\
| Metric | Count |\\
|--------|-------|\\
| Total files audited | ${total_files} |\\
| Stale files (>90 days) | ${stale_files} |\\
| Short files (<50 words) | ${short_files} |\\
| Incomplete frontmatter | ${missing_frontmatter} |\\
| Invalid owners | ${invalid_owner_count} |\\
| Invalid lastReviewed dates | ${invalid_last_reviewed} |\\
| Broken internal links | ${broken_links} |\\
| **Total issues** | **${issues_found}** |\\
" "${REPORT_FILE}"

    # Add recommendations
    cat >> "${REPORT_FILE}" << EOF

## Recommendations

### Priority 1 (Critical)
$([ "$missing_frontmatter" -gt 0 ] && echo "- ⚠️ Fix ${missing_frontmatter} files with incomplete frontmatter" || echo "- ✅ No critical issues")
$([ "$invalid_owner_count" -gt 0 ] && echo "- ⚠️ Resolve ${invalid_owner_count} files with invalid owners" || echo "")
$([ "$invalid_last_reviewed" -gt 0 ] && echo "- ⚠️ Correct ${invalid_last_reviewed} files with invalid lastReviewed dates" || echo "")
$([ "$broken_links" -gt 0 ] && echo "- ⚠️ Repair ${broken_links} broken internal links" || echo "")

### Priority 2 (Important)
$([ "$stale_files" -gt 10 ] && echo "- ⚠️ Review and update ${stale_files} stale files" || echo "- ✅ Documentation freshness is acceptable")
$([ "$short_files" -gt 5 ] && echo "- ⚠️ Expand ${short_files} short documentation files" || echo "")

### Priority 3 (Improvement)
- 📊 Continue monitoring documentation health
- 🔄 Schedule quarterly maintenance reviews
- 📝 Update governance procedures as needed

---

## Next Steps

1. **Review detailed logs** in \`docs/reports/\`
2. **Address critical issues** (Priority 1) within 1 week
3. **Plan updates** for important issues (Priority 2) within 1 month
4. **Schedule next audit** in 90 days ($(date -d "+90 days" +%Y-%m-%d))

---

**Report Generated**: $(date '+%Y-%m-%d %H:%M:%S')
**Audit Version**: 1.1.0
**Automation**: TradingSystem Documentation Maintenance System

EOF
}

# Main execution
main() {
    log_info "Starting Documentation Maintenance Audit..."
    echo ""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --ci-mode)
                CI_MODE=true
                shift
                ;;
            --ci-threshold)
                if [[ $# -lt 2 ]]; then
                    log_error "Missing value for --ci-threshold"
                    exit 1
                fi
                CI_THRESHOLD="$2"
                shift 2
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    init_report
    audit_content_quality
    check_freshness
    validate_frontmatter
    check_content_size
    validate_internal_links
    check_style_consistency
    generate_summary

    echo ""
    log_success "Audit complete!"
    log_info "Report saved to: ${REPORT_FILE}"
    echo ""

    # Print summary
    echo -e "${CYAN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     Documentation Health Summary     ║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC} Total files:           ${total_files}"
    echo -e "${CYAN}║${NC} Issues found:          ${issues_found}"
    echo -e "${CYAN}║${NC} Stale files:           ${stale_files}"
    echo -e "${CYAN}║${NC} Incomplete frontmatter: ${missing_frontmatter}"
    echo -e "${CYAN}║${NC} Broken links:          ${broken_links}"
    echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}"
    echo ""

    if [ "${CI_MODE}" = true ]; then
        if [ "${issues_found}" -gt "${CI_THRESHOLD}" ]; then
            log_error "CI Mode: Found ${issues_found} issues (threshold: ${CI_THRESHOLD})"
            exit 1
        else
            log_success "CI Mode: Issues within threshold (${issues_found}/${CI_THRESHOLD})"
            exit 0
        fi
    fi
}

# Run main function
main "$@"
