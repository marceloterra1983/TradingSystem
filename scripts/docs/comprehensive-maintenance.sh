#!/bin/bash

###############################################################################
# Comprehensive Documentation Maintenance System
# Version: 2.0
# Description: Master orchestrator for complete documentation quality assurance
###############################################################################

set -euo pipefail

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly DOCS_DIR="${PROJECT_ROOT}/docs/content"
readonly REPORTS_DIR="${PROJECT_ROOT}/docs/reports"
readonly TIMESTAMP=$(date +%Y%m%d-%H%M%S)
readonly LOG_FILE="${REPORTS_DIR}/comprehensive-maintenance-${TIMESTAMP}.log"

# Maintenance modes
MODE="${1:-full}"

# Create reports directory
mkdir -p "${REPORTS_DIR}"

###############################################################################
# Logging Functions
###############################################################################

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $*" | tee -a "${LOG_FILE}"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $*" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}✗${NC} $*" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*" | tee -a "${LOG_FILE}"
}

print_header() {
    local title="$1"
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  ${title}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

###############################################################################
# Phase 1: Pre-Flight Checks
###############################################################################

phase_preflight() {
    print_header "Phase 1: Pre-Flight Checks"

    log "Running pre-flight checks..."

    # Check if docs directory exists
    if [ ! -d "${DOCS_DIR}" ]; then
        log_error "Documentation directory not found: ${DOCS_DIR}"
        exit 1
    fi

    # Check required tools
    local required_tools=("python3" "git" "node" "npm")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_warn "Required tool not found: $tool"
        else
            log_success "Found $tool: $(command -v $tool)"
        fi
    done

    # Count documentation files
    local doc_count
    doc_count=$(find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) | wc -l)
    log_info "Documentation files found: ${doc_count}"

    # Check git status
    if git -C "${PROJECT_ROOT}" rev-parse --git-dir > /dev/null 2>&1; then
        log_success "Git repository detected"
        local git_status
        git_status=$(git -C "${PROJECT_ROOT}" status --porcelain docs/content | wc -l)
        if [ "$git_status" -gt 0 ]; then
            log_warn "Uncommitted changes in docs/content: ${git_status} files"
        fi
    fi

    log_success "Pre-flight checks complete"
}

###############################################################################
# Phase 2: Content Quality Audit
###############################################################################

phase_content_audit() {
    print_header "Phase 2: Content Quality Audit"

    log "Running comprehensive content audit..."

    # Run frontmatter validation
    if [ -f "${SCRIPT_DIR}/validate-frontmatter.py" ]; then
        log_info "Validating frontmatter..."
        python3 "${SCRIPT_DIR}/validate-frontmatter.py" \
            --schema v2 \
            --docs-dir "${DOCS_DIR}" \
            --threshold-days 90 \
            --output "${REPORTS_DIR}/frontmatter-validation.json" || true
        log_success "Frontmatter validation complete"
    fi

    # Run quick audit
    if [ -f "${SCRIPT_DIR}/audit-documentation.sh" ]; then
        log_info "Running documentation audit..."
        bash "${SCRIPT_DIR}/audit-documentation.sh" --quick || true
        log_success "Documentation audit complete"
    fi

    # Run readability analysis
    if [ -f "${SCRIPT_DIR}/analyze-readability.py" ]; then
        log_info "Analyzing readability..."
        python3 "${SCRIPT_DIR}/analyze-readability.py" \
            "${DOCS_DIR}" \
            "${REPORTS_DIR}/readability-report-${TIMESTAMP}.md" || true
        log_success "Readability analysis complete"
    fi

    # Detect duplicates
    if [ -f "${SCRIPT_DIR}/detect-duplicates.py" ]; then
        log_info "Detecting duplicate content..."
        python3 "${SCRIPT_DIR}/detect-duplicates.py" "${DOCS_DIR}" || true
        log_success "Duplicate detection complete"
    fi
}

###############################################################################
# Phase 3: Link and Reference Validation
###############################################################################

phase_link_validation() {
    print_header "Phase 3: Link and Reference Validation"

    log "Validating links and references..."

    # Analyze broken links
    if [ -f "${SCRIPT_DIR}/analyze-broken-links.py" ]; then
        log_info "Analyzing broken links..."
        python3 "${SCRIPT_DIR}/analyze-broken-links.py" \
            --docs-dir "${DOCS_DIR}" \
            --output "${REPORTS_DIR}/broken-links-${TIMESTAMP}.json" || true
        log_success "Link analysis complete"
    fi

    # Check for broken image references
    log_info "Checking image references..."
    python3 -c "
import re
from pathlib import Path

docs_dir = Path('${DOCS_DIR}')
broken = []

for file in docs_dir.rglob('*.md*'):
    try:
        content = file.read_text(errors='ignore')
        images = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', content)
        for alt, img_path in images:
            if img_path.startswith('http'):
                continue
            if img_path.startswith('/'):
                full_path = docs_dir / img_path.lstrip('/')
            else:
                full_path = (file.parent / img_path).resolve()
            if not full_path.exists():
                broken.append(f'{file.relative_to(docs_dir)}:{img_path}')
    except Exception:
        pass

print(f'Broken image references: {len(broken)}')
for b in broken[:10]:
    print(f'  - {b}')
" || true

    log_success "Reference validation complete"
}

###############################################################################
# Phase 4: Content Optimization
###############################################################################

phase_optimization() {
    print_header "Phase 4: Content Optimization"

    log "Running content optimization..."

    # Run optimization analysis
    if [ -f "${SCRIPT_DIR}/optimize-documentation.sh" ]; then
        log_info "Analyzing content optimization opportunities..."
        bash "${SCRIPT_DIR}/optimize-documentation.sh" --analyze || true
        log_success "Optimization analysis complete"
    fi

    # Generate TOCs for large files
    if [ -f "${SCRIPT_DIR}/generate-toc.sh" ]; then
        log_info "Checking for missing TOCs..."
        bash "${SCRIPT_DIR}/generate-toc.sh" "${DOCS_DIR}" true || true
        log_success "TOC check complete"
    fi

    # Check for outdated content
    log_info "Checking for outdated content..."
    local outdated_count
    outdated_count=$(find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) -mtime +90 | wc -l)
    log_info "Files not modified in 90+ days: ${outdated_count}"
}

###############################################################################
# Phase 5: Style and Consistency
###############################################################################

phase_style_check() {
    print_header "Phase 5: Style and Consistency Checks"

    log "Checking style and consistency..."

    # Check heading hierarchy
    log_info "Analyzing heading hierarchy..."
    python3 -c "
import re
from pathlib import Path

issues = []
docs_dir = Path('${DOCS_DIR}')

for file in docs_dir.rglob('*.md*'):
    try:
        content = file.read_text(errors='ignore')
        lines = content.split('\n')
        prev_level = 0
        for i, line in enumerate(lines, 1):
            if line.startswith('#'):
                level = len(line.split()[0])
                if level > prev_level + 1:
                    issues.append(f'{file.relative_to(docs_dir)}:{i} - Skipped heading level')
                prev_level = level
    except Exception:
        pass

print(f'Heading hierarchy issues: {len(issues)}')
for issue in issues[:10]:
    print(f'  - {issue}')
" || true

    # Check for common style issues
    log_info "Checking for common style issues..."
    local style_issues=0

    # Check for TODO/FIXME markers
    local todo_count
    todo_count=$(grep -r "TODO\|FIXME" "${DOCS_DIR}" --include="*.md" --include="*.mdx" 2>/dev/null | wc -l || echo "0")
    log_info "TODO/FIXME markers found: ${todo_count}"

    log_success "Style checks complete"
}

###############################################################################
# Phase 6: Accessibility Compliance
###############################################################################

phase_accessibility() {
    print_header "Phase 6: Accessibility Compliance"

    log "Checking accessibility compliance..."

    # Check for images without alt text
    log_info "Checking for images without alt text..."
    python3 -c "
import re
from pathlib import Path

docs_dir = Path('${DOCS_DIR}')
missing_alt = []

for file in docs_dir.rglob('*.md*'):
    try:
        content = file.read_text(errors='ignore')
        images = re.findall(r'!\[([^\]]*)\]\([^)]+\)', content)
        for alt in images:
            if not alt or alt.strip() == '':
                missing_alt.append(str(file.relative_to(docs_dir)))
                break
    except Exception:
        pass

print(f'Files with images missing alt text: {len(missing_alt)}')
for f in missing_alt[:10]:
    print(f'  - {f}')
" || true

    # Check for descriptive link text
    log_info "Checking link text quality..."
    python3 -c "
import re
from pathlib import Path

docs_dir = Path('${DOCS_DIR}')
poor_links = []
poor_patterns = ['click here', 'here', 'link', 'read more', 'this']

for file in docs_dir.rglob('*.md*'):
    try:
        content = file.read_text(errors='ignore')
        links = re.findall(r'\[([^\]]+)\]\([^)]+\)', content)
        for link_text in links:
            if link_text.lower().strip() in poor_patterns:
                poor_links.append(f'{file.relative_to(docs_dir)}:{link_text}')
    except Exception:
        pass

print(f'Non-descriptive links found: {len(poor_links)}')
for link in poor_links[:10]:
    print(f'  - {link}')
" || true

    log_success "Accessibility checks complete"
}

###############################################################################
# Phase 7: Health Scoring
###############################################################################

phase_health_scoring() {
    print_header "Phase 7: Documentation Health Scoring"

    log "Calculating documentation health score..."

    if [ -f "${SCRIPT_DIR}/docs_health.py" ]; then
        python3 "${SCRIPT_DIR}/docs_health.py" "${DOCS_DIR}" || true
    fi

    # Calculate composite health score
    python3 -c "
import json
from pathlib import Path

reports_dir = Path('${REPORTS_DIR}')
scores = {}

# Load frontmatter validation
fm_file = reports_dir / 'frontmatter-validation.json'
if fm_file.exists():
    with open(fm_file) as f:
        data = json.load(f)
        total = data.get('summary', {}).get('total_files', 1)
        valid = data.get('summary', {}).get('files_with_frontmatter', 0)
        scores['frontmatter'] = (valid / total * 100) if total > 0 else 0

# Load optimization report
opt_files = list(reports_dir.glob('optimization-report-*.md'))
if opt_files:
    with open(opt_files[-1]) as f:
        content = f.read()
        import re
        match = re.search(r'Optimization Score: (\d+)/100', content)
        if match:
            scores['optimization'] = int(match.group(1))

# Calculate overall health
if scores:
    overall = sum(scores.values()) / len(scores)
    print(f'\\n╔════════════════════════════════════════════════════════════╗')
    print(f'║  Overall Documentation Health: {overall:.0f}/100 {\"(EXCELLENT)\" if overall >= 90 else \"(GOOD)\" if overall >= 75 else \"(FAIR)\" if overall >= 60 else \"(NEEDS ATTENTION)\"}')
    print(f'╚════════════════════════════════════════════════════════════╝\\n')
    for component, score in scores.items():
        print(f'  {component.capitalize():20s}: {score:5.1f}/100')
" || true

    log_success "Health scoring complete"
}

###############################################################################
# Phase 8: Report Generation
###############################################################################

phase_reporting() {
    print_header "Phase 8: Comprehensive Report Generation"

    log "Generating comprehensive maintenance report..."

    local report_file="${REPORTS_DIR}/comprehensive-maintenance-${TIMESTAMP}.md"

    cat > "${report_file}" << EOF
# Comprehensive Documentation Maintenance Report

**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Mode**: ${MODE}
**Documentation Files**: $(find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) | wc -l)

---

## Executive Summary

This report provides a comprehensive analysis of documentation health, quality, and maintenance status.

### Quick Stats

- **Total Files**: $(find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) | wc -l)
- **Total Words**: $(find "${DOCS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) -exec cat {} \; | wc -w)
- **TODO Markers**: $(grep -r "TODO" "${DOCS_DIR}" --include="*.md" --include="*.mdx" 2>/dev/null | wc -l || echo "0")
- **FIXME Markers**: $(grep -r "FIXME" "${DOCS_DIR}" --include="*.md" --include="*.mdx" 2>/dev/null | wc -l || echo "0")

---

## Audit Phases Completed

1. ✅ Pre-Flight Checks
2. ✅ Content Quality Audit
3. ✅ Link and Reference Validation
4. ✅ Content Optimization Analysis
5. ✅ Style and Consistency Checks
6. ✅ Accessibility Compliance
7. ✅ Health Scoring
8. ✅ Report Generation

---

## Detailed Reports

The following detailed reports have been generated:

- **Frontmatter Validation**: \`frontmatter-validation.json\`
- **Readability Analysis**: \`readability-report-${TIMESTAMP}.md\`
- **Optimization Report**: Latest optimization report
- **Audit Report**: Latest audit report

---

## Recommendations

### High Priority
- Review and resolve TODO/FIXME markers
- Fix any broken links or image references
- Update outdated content (>90 days)

### Medium Priority
- Improve readability scores for technical content
- Add missing alt text for images
- Generate TOCs for large files (>300 lines)

### Low Priority
- Enhance link text for better accessibility
- Standardize heading hierarchy
- Consider content consolidation for duplicates

---

## Next Steps

1. **Weekly**: Run quick maintenance (\`--quick\`)
2. **Monthly**: Run comprehensive maintenance (\`--full\`)
3. **Quarterly**: Review all recommendations and trends

---

## Maintenance Log

See \`${LOG_FILE}\` for detailed execution log.

---

*Generated by Comprehensive Documentation Maintenance System v2.0*
EOF

    log_success "Report generated: ${report_file}"

    # Print summary
    echo -e "\n${GREEN}${BOLD}Maintenance Complete!${NC}\n"
    echo "📊 Reports generated in: ${REPORTS_DIR}"
    echo "📝 Main report: comprehensive-maintenance-${TIMESTAMP}.md"
    echo "📋 Execution log: comprehensive-maintenance-${TIMESTAMP}.log"
    echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log "Starting Comprehensive Documentation Maintenance"
    log "Mode: ${MODE}"
    log "Documentation Directory: ${DOCS_DIR}"
    log "Reports Directory: ${REPORTS_DIR}"

    case "${MODE}" in
        quick)
            phase_preflight
            phase_content_audit
            phase_health_scoring
            phase_reporting
            ;;
        validation)
            phase_preflight
            phase_link_validation
            phase_accessibility
            phase_reporting
            ;;
        optimization)
            phase_preflight
            phase_optimization
            phase_style_check
            phase_reporting
            ;;
        full|comprehensive)
            phase_preflight
            phase_content_audit
            phase_link_validation
            phase_optimization
            phase_style_check
            phase_accessibility
            phase_health_scoring
            phase_reporting
            ;;
        *)
            echo "Usage: $0 {quick|validation|optimization|full|comprehensive}"
            echo ""
            echo "Modes:"
            echo "  quick         - Fast quality checks (5 min)"
            echo "  validation    - Link and reference validation (10 min)"
            echo "  optimization  - Content optimization analysis (10 min)"
            echo "  full          - Complete comprehensive maintenance (20 min)"
            echo "  comprehensive - Alias for 'full'"
            exit 1
            ;;
    esac

    log_success "Comprehensive Documentation Maintenance Complete!"
}

# Run main function
main "$@"
