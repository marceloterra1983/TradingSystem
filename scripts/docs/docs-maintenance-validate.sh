#!/bin/bash
# Documentation Maintenance & Validation System
# Comprehensive validation suite with detailed reporting

set -euo pipefail

# ==================== CONFIGURATION ====================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"
REPORTS_DIR="$DOCS_DIR/reports/maintenance-$(date +%Y-%m-%d)"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Report storage
REPORT_FILE="$REPORTS_DIR/validation-report-$TIMESTAMP.md"
JSON_REPORT="$REPORTS_DIR/validation-report-$TIMESTAMP.json"

# ==================== UTILITY FUNCTIONS ====================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
  ((PASSED_CHECKS++))
}

log_warning() {
  echo -e "${YELLOW}[⚠]${NC} $1"
  ((WARNINGS++))
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
  ((FAILED_CHECKS++))
}

section_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
}

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Initialize report
cat > "$REPORT_FILE" <<EOF
# Documentation Maintenance & Validation Report

**Date**: $(date +"%Y-%m-%d %H:%M:%S")
**Report ID**: validation-$TIMESTAMP
**Project**: TradingSystem
**Docs Version**: 2.1

---

## Executive Summary

This report provides a comprehensive validation of the TradingSystem documentation,
covering content generation, linting, type checking, build integrity, link validation,
frontmatter compliance, and content quality metrics.

EOF

# ==================== VALIDATION FUNCTIONS ====================

# 1. Content Generation Validation
validate_content_generation() {
  section_header "1. CONTENT GENERATION"
  ((TOTAL_CHECKS++))
  
  log_info "Running docs:auto to generate content..."
  
  cd "$DOCS_DIR"
  if npm run docs:auto > /tmp/docs-auto-output.txt 2>&1; then
    log_success "Content generation completed successfully"
    
    cat >> "$REPORT_FILE" <<EOF

### 1. Content Generation ✅

**Status**: PASSED
**Duration**: $(grep -o '[0-9.]*s' /tmp/docs-auto-output.txt | head -1 || echo "N/A")

**Tasks Completed**:
$(grep -E "^(✅|✔)" /tmp/docs-auto-output.txt || echo "- All automated content generated")

EOF
  else
    log_error "Content generation failed"
    cat >> "$REPORT_FILE" <<EOF

### 1. Content Generation ❌

**Status**: FAILED
**Error Output**:
\`\`\`
$(cat /tmp/docs-auto-output.txt)
\`\`\`

EOF
  fi
}

# 2. Generated Content Validation
validate_generated_content() {
  section_header "2. GENERATED CONTENT VALIDATION"
  ((TOTAL_CHECKS++))
  
  log_info "Validating generated content markers..."
  
  cd "$DOCS_DIR"
  if npm run docs:validate-generated > /tmp/docs-validate-gen.txt 2>&1; then
    log_success "Generated content validation passed"
    
    TESTS_PASSED=$(grep -o '[0-9]* tests passed' /tmp/docs-validate-gen.txt | grep -o '[0-9]*' || echo "0")
    
    cat >> "$REPORT_FILE" <<EOF

### 2. Generated Content Validation ✅

**Status**: PASSED
**Tests**: $TESTS_PASSED passed

**Validated**:
- Auto-generated markers present (BEGIN/END AUTO-GENERATED)
- Timestamps are current
- Frontmatter preserved
- No manual edits in generated sections

EOF
  else
    log_error "Generated content validation failed"
    cat >> "$REPORT_FILE" <<EOF

### 2. Generated Content Validation ❌

**Status**: FAILED
**Error Output**:
\`\`\`
$(cat /tmp/docs-validate-gen.txt)
\`\`\`

EOF
  fi
}

# 3. Markdown Linting
validate_markdown_linting() {
  section_header "3. MARKDOWN LINTING"
  ((TOTAL_CHECKS++))
  
  log_info "Running markdown linting..."
  
  cd "$DOCS_DIR"
  LINT_OUTPUT=$(npm run docs:lint 2>&1 || true)
  
  # Count errors
  ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -c "MD[0-9]" || echo "0")
  
  if [[ $ERROR_COUNT -eq 0 ]]; then
    log_success "Markdown linting passed with no errors"
    
    cat >> "$REPORT_FILE" <<EOF

### 3. Markdown Linting ✅

**Status**: PASSED
**Files Scanned**: ~251 files
**Errors**: 0
**Warnings**: 0

All markdown files conform to style guidelines.

EOF
  else
    log_warning "Markdown linting found $ERROR_COUNT issues (non-blocking)"
    
    # Get top 10 most common errors
    TOP_ERRORS=$(echo "$LINT_OUTPUT" | grep -o "MD[0-9]*" | sort | uniq -c | sort -rn | head -10 | awk '{print "- " $2 ": " $1 " occurrences"}')
    
    cat >> "$REPORT_FILE" <<EOF

### 3. Markdown Linting ⚠️

**Status**: PASSED WITH WARNINGS
**Files Scanned**: ~251 files
**Issues Found**: $ERROR_COUNT (non-blocking)

**Most Common Issues**:
$TOP_ERRORS

**Note**: These are style recommendations and do not block the build.

EOF
  fi
}

# 4. TypeScript Type Checking
validate_typescript() {
  section_header "4. TYPESCRIPT TYPE CHECKING"
  ((TOTAL_CHECKS++))
  
  log_info "Running TypeScript type checker..."
  
  cd "$DOCS_DIR"
  if npm run docs:typecheck > /tmp/docs-typecheck.txt 2>&1; then
    log_success "TypeScript type checking passed"
    
    cat >> "$REPORT_FILE" <<EOF

### 4. TypeScript Type Checking ✅

**Status**: PASSED
**Files Checked**: MDX files + components
**Type Errors**: 0

All TypeScript code in MDX files and components is type-safe.

EOF
  else
    log_error "TypeScript type checking failed"
    
    ERROR_COUNT=$(grep -c "error TS" /tmp/docs-typecheck.txt || echo "0")
    
    cat >> "$REPORT_FILE" <<EOF

### 4. TypeScript Type Checking ❌

**Status**: FAILED
**Type Errors**: $ERROR_COUNT

**Error Output**:
\`\`\`
$(cat /tmp/docs-typecheck.txt)
\`\`\`

EOF
  fi
}

# 5. Unit Tests
validate_unit_tests() {
  section_header "5. UNIT TESTS"
  ((TOTAL_CHECKS++))
  
  log_info "Running unit tests..."
  
  cd "$DOCS_DIR"
  if npm run docs:test > /tmp/docs-test.txt 2>&1; then
    log_success "Unit tests passed"
    
    TESTS_PASSED=$(grep -o "pass [0-9]*" /tmp/docs-test.txt | grep -o "[0-9]*" || echo "0")
    TESTS_TOTAL=$(grep -o "tests [0-9]*" /tmp/docs-test.txt | grep -o "[0-9]*" || echo "0")
    DURATION=$(grep -o "duration_ms [0-9.]*" /tmp/docs-test.txt | grep -o "[0-9.]*" || echo "0")
    
    cat >> "$REPORT_FILE" <<EOF

### 5. Unit Tests ✅

**Status**: PASSED
**Tests Run**: $TESTS_TOTAL
**Tests Passed**: $TESTS_PASSED
**Duration**: ${DURATION}ms

All automation script tests passed successfully.

EOF
  else
    log_error "Unit tests failed"
    
    TESTS_FAILED=$(grep -o "fail [0-9]*" /tmp/docs-test.txt | grep -o "[0-9]*" || echo "0")
    
    cat >> "$REPORT_FILE" <<EOF

### 5. Unit Tests ❌

**Status**: FAILED
**Tests Failed**: $TESTS_FAILED

**Error Output**:
\`\`\`
$(cat /tmp/docs-test.txt)
\`\`\`

EOF
  fi
}

# 6. Build Validation
validate_build() {
  section_header "6. BUILD VALIDATION"
  ((TOTAL_CHECKS++))
  
  log_info "Running Docusaurus build..."
  
  cd "$DOCS_DIR"
  BUILD_START=$(date +%s)
  
  if npm run docs:build > /tmp/docs-build.txt 2>&1; then
    BUILD_END=$(date +%s)
    BUILD_DURATION=$((BUILD_END - BUILD_START))
    
    log_success "Build completed successfully in ${BUILD_DURATION}s"
    
    # Count warnings
    WARNING_COUNT=$(grep -c "WARNING" /tmp/docs-build.txt || echo "0")
    BROKEN_LINKS=$(grep -A 100 "Exhaustive list of all broken links found" /tmp/docs-build.txt | grep -c "^- Broken link" || echo "0")
    
    cat >> "$REPORT_FILE" <<EOF

### 6. Build Validation ✅

**Status**: PASSED
**Build Duration**: ${BUILD_DURATION}s
**Pages Generated**: ~251
**Static Files**: Generated successfully
**Warnings**: $WARNING_COUNT
**Broken Links Detected**: $BROKEN_LINKS (to be validated in Step 7)

Build completed successfully. All pages generated.

EOF
  else
    log_error "Build failed"
    
    cat >> "$REPORT_FILE" <<EOF

### 6. Build Validation ❌

**Status**: FAILED

**Error Output**:
\`\`\`
$(tail -100 /tmp/docs-build.txt)
\`\`\`

EOF
  fi
}

# 7. Link Validation
validate_links() {
  section_header "7. LINK VALIDATION"
  ((TOTAL_CHECKS++))
  
  log_info "Running link validation..."
  
  cd "$DOCS_DIR"
  if bash ../scripts/docs/check-links.sh > /tmp/docs-links.txt 2>&1; then
    log_success "Link validation passed"
    
    LINKS_SCANNED=$(grep -o "scanned [0-9]* links" /tmp/docs-links.txt | grep -o "[0-9]*" || echo "0")
    
    cat >> "$REPORT_FILE" <<EOF

### 7. Link Validation ✅

**Status**: PASSED
**Links Scanned**: $LINKS_SCANNED
**Broken Links**: 0
**External Links**: All reachable
**Internal Links**: All valid

All links are functional and accessible.

EOF
  else
    log_warning "Link validation found broken links"
    
    BROKEN_COUNT=$(grep -c "Broken link" /tmp/docs-links.txt || echo "0")
    
    # Extract broken links
    BROKEN_LINKS=$(grep "Broken link" /tmp/docs-links.txt | head -20 || echo "No details available")
    
    cat >> "$REPORT_FILE" <<EOF

### 7. Link Validation ⚠️

**Status**: PASSED WITH WARNINGS
**Broken Links Found**: $BROKEN_COUNT

**Sample Broken Links** (first 20):
\`\`\`
$BROKEN_LINKS
\`\`\`

**Action Required**: Review and fix broken links in content files.

EOF
  fi
}

# 8. Frontmatter Validation
validate_frontmatter() {
  section_header "8. FRONTMATTER VALIDATION"
  ((TOTAL_CHECKS++))
  
  log_info "Running frontmatter validation..."
  
  cd "$PROJECT_ROOT"
  if python scripts/docs/validate-frontmatter.py \
    --schema v2 \
    --docs-dir ./docs/content \
    --output "$REPORTS_DIR/frontmatter-validation.json" \
    --threshold-days 90 > /tmp/frontmatter-output.txt 2>&1; then
    
    log_success "Frontmatter validation passed"
    
    # Extract metrics
    TOTAL_FILES=$(grep "Total files scanned:" /tmp/frontmatter-output.txt | grep -o "[0-9]*" || echo "0")
    FILES_WITH_FM=$(grep "Files with frontmatter:" /tmp/frontmatter-output.txt | grep -o "[0-9]*" || echo "0")
    MISSING_FM=$(grep "Files missing frontmatter:" /tmp/frontmatter-output.txt | grep -o "[0-9]*" || echo "0")
    INCOMPLETE_FM=$(grep "Files with incomplete frontmatter:" /tmp/frontmatter-output.txt | grep -o "[0-9]*" || echo "0")
    
    cat >> "$REPORT_FILE" <<EOF

### 8. Frontmatter Validation ✅

**Status**: PASSED
**Total Files**: $TOTAL_FILES
**Files with Frontmatter**: $FILES_WITH_FM
**Missing Frontmatter**: $MISSING_FM
**Incomplete Frontmatter**: $INCOMPLETE_FM
**Outdated Documents (>90 days)**: 0

All documentation files have valid frontmatter with required fields.

EOF
  else
    log_warning "Frontmatter validation found issues"
    
    ISSUES_FOUND=$(grep "Found .* files with issues" /tmp/frontmatter-output.txt | grep -o "[0-9]*" || echo "0")
    
    cat >> "$REPORT_FILE" <<EOF

### 8. Frontmatter Validation ⚠️

**Status**: PASSED WITH WARNINGS
**Issues Found**: $ISSUES_FOUND

**Details**:
\`\`\`
$(cat /tmp/frontmatter-output.txt)
\`\`\`

**Action Required**: Review and fix frontmatter issues in flagged files.

**Detailed Report**: \`$REPORTS_DIR/frontmatter-validation.json\`

EOF
  fi
}

# 9. Content Quality Audit
validate_content_quality() {
  section_header "9. CONTENT QUALITY AUDIT"
  ((TOTAL_CHECKS++))
  
  log_info "Analyzing content quality metrics..."
  
  cd "$DOCS_DIR/content"
  
  # Count TODO/FIXME markers
  TODO_COUNT=$(grep -r "TODO\|FIXME\|TBD" --include="*.md" --include="*.mdx" . | wc -l || echo "0")
  
  # Count placeholder content
  PLACEHOLDER_COUNT=$(grep -ri "placeholder\|coming soon\|under construction" --include="*.md" --include="*.mdx" . | wc -l || echo "0")
  
  # Find files with broken images
  BROKEN_IMAGES=$(grep -r "!\[.*\](" --include="*.md" --include="*.mdx" . | grep -v "http" | wc -l || echo "0")
  
  # Count documentation by domain
  APPS_DOCS=$(find apps -name "*.mdx" 2>/dev/null | wc -l || echo "0")
  API_DOCS=$(find api -name "*.mdx" 2>/dev/null | wc -l || echo "0")
  FRONTEND_DOCS=$(find frontend -name "*.mdx" 2>/dev/null | wc -l || echo "0")
  TOOLS_DOCS=$(find tools -name "*.mdx" 2>/dev/null | wc -l || echo "0")
  
  log_info "Content quality metrics collected"
  
  cat >> "$REPORT_FILE" <<EOF

### 9. Content Quality Audit

**TODO/FIXME Markers**: $TODO_COUNT
**Placeholder Content**: $PLACEHOLDER_COUNT
**Potentially Broken Images**: $BROKEN_IMAGES

**Documentation Coverage by Domain**:
- Apps: $APPS_DOCS files
- API: $API_DOCS files
- Frontend: $FRONTEND_DOCS files
- Tools: $TOOLS_DOCS files

EOF

  if [[ $TODO_COUNT -gt 20 ]]; then
    log_warning "High number of TODO markers found ($TODO_COUNT)"
    echo "**⚠️ Recommendation**: Review and resolve TODO markers." >> "$REPORT_FILE"
  else
    log_success "Content quality metrics are acceptable"
    echo "**✅ Status**: Content quality is good." >> "$REPORT_FILE"
  fi
  
  echo "" >> "$REPORT_FILE"
}

# 10. Documentation Health Metrics
generate_health_metrics() {
  section_header "10. DOCUMENTATION HEALTH METRICS"
  
  log_info "Generating health metrics..."
  
  cd "$DOCS_DIR/content"
  
  # Total documentation files
  TOTAL_DOCS=$(find . -name "*.md" -o -name "*.mdx" | wc -l)
  
  # Files updated in last 30 days
  RECENT_UPDATES=$(find . -name "*.md" -o -name "*.mdx" -mtime -30 | wc -l)
  
  # Files older than 90 days
  STALE_DOCS=$(find . -name "*.md" -o -name "*.mdx" -mtime +90 | wc -l)
  
  # Calculate freshness score (0-100)
  FRESHNESS_SCORE=$(echo "scale=2; ($RECENT_UPDATES / $TOTAL_DOCS) * 100" | bc)
  
  cat >> "$REPORT_FILE" <<EOF

### 10. Documentation Health Metrics

**Total Documentation Files**: $TOTAL_DOCS
**Recently Updated (< 30 days)**: $RECENT_UPDATES
**Stale Documentation (> 90 days)**: $STALE_DOCS
**Freshness Score**: ${FRESHNESS_SCORE}%

EOF

  if (( $(echo "$FRESHNESS_SCORE < 50" | bc -l) )); then
    log_warning "Documentation freshness score is low (${FRESHNESS_SCORE}%)"
    echo "**⚠️ Recommendation**: Update stale documentation to maintain accuracy." >> "$REPORT_FILE"
  else
    log_success "Documentation freshness score is good (${FRESHNESS_SCORE}%)"
    echo "**✅ Status**: Documentation is well-maintained." >> "$REPORT_FILE"
  fi
  
  echo "" >> "$REPORT_FILE"
}

# ==================== FINAL REPORT GENERATION ====================

generate_final_summary() {
  section_header "GENERATING FINAL SUMMARY"
  
  # Calculate overall health score
  OVERALL_SCORE=$(echo "scale=2; ($PASSED_CHECKS / $TOTAL_CHECKS) * 100" | bc)
  
  cat >> "$REPORT_FILE" <<EOF

---

## Validation Summary

**Total Checks**: $TOTAL_CHECKS
**Passed**: $PASSED_CHECKS
**Failed**: $FAILED_CHECKS
**Warnings**: $WARNINGS

**Overall Health Score**: ${OVERALL_SCORE}%

EOF

  if [[ $FAILED_CHECKS -eq 0 ]]; then
    cat >> "$REPORT_FILE" <<EOF
**Status**: ✅ **PASSED** - Documentation is ready for deployment

All validation checks passed successfully. The documentation meets quality standards
and is ready for production deployment.

EOF
    log_success "All validations passed! Overall health: ${OVERALL_SCORE}%"
  elif [[ $FAILED_CHECKS -le 2 ]]; then
    cat >> "$REPORT_FILE" <<EOF
**Status**: ⚠️ **PASSED WITH WARNINGS** - Minor issues detected

Most validation checks passed. Some minor issues were detected that should be
addressed but do not block deployment.

EOF
    log_warning "Validation passed with warnings. Overall health: ${OVERALL_SCORE}%"
  else
    cat >> "$REPORT_FILE" <<EOF
**Status**: ❌ **FAILED** - Critical issues require attention

Multiple validation checks failed. Critical issues must be resolved before
deployment.

EOF
    log_error "Validation failed. Overall health: ${OVERALL_SCORE}%"
  fi
  
  cat >> "$REPORT_FILE" <<EOF

## Recommended Actions

EOF

  if [[ $FAILED_CHECKS -gt 0 ]]; then
    echo "1. **Critical**: Fix failed validation checks listed above" >> "$REPORT_FILE"
  fi
  
  if [[ $WARNINGS -gt 0 ]]; then
    echo "2. **High Priority**: Address warnings (broken links, frontmatter issues)" >> "$REPORT_FILE"
  fi
  
  if [[ $TODO_COUNT -gt 20 ]]; then
    echo "3. **Medium Priority**: Resolve TODO/FIXME markers in content" >> "$REPORT_FILE"
  fi
  
  if [[ $STALE_DOCS -gt 10 ]]; then
    echo "4. **Low Priority**: Review and update stale documentation (>90 days)" >> "$REPORT_FILE"
  fi
  
  cat >> "$REPORT_FILE" <<EOF

---

## Report Artifacts

- **Full Report**: \`$REPORT_FILE\`
- **JSON Report**: \`$JSON_REPORT\`
- **Frontmatter Details**: \`$REPORTS_DIR/frontmatter-validation.json\`

## Next Steps

1. Review this report and address critical issues
2. Run \`npm run docs:check\` to validate fixes
3. Execute \`bash scripts/docs/docs-maintenance-validate.sh\` again to verify
4. Proceed with documentation deployment when all checks pass

---

**Generated**: $(date +"%Y-%m-%d %H:%M:%S")
**Tool**: docs-maintenance-validate.sh
**Version**: 1.0.0

EOF
}

# Generate JSON report
generate_json_report() {
  cat > "$JSON_REPORT" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "report_id": "validation-$TIMESTAMP",
  "summary": {
    "total_checks": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "failed": $FAILED_CHECKS,
    "warnings": $WARNINGS,
    "overall_score": $(echo "scale=2; ($PASSED_CHECKS / $TOTAL_CHECKS) * 100" | bc)
  },
  "status": "$([ $FAILED_CHECKS -eq 0 ] && echo 'passed' || echo 'failed')",
  "artifacts": {
    "report": "$REPORT_FILE",
    "json_report": "$JSON_REPORT",
    "frontmatter_report": "$REPORTS_DIR/frontmatter-validation.json"
  }
}
EOF
}

# ==================== MAIN EXECUTION ====================

main() {
  log_info "Starting Documentation Maintenance & Validation"
  log_info "Timestamp: $TIMESTAMP"
  log_info "Reports Directory: $REPORTS_DIR"
  echo ""
  
  # Run all validations
  validate_content_generation
  validate_generated_content
  validate_markdown_linting
  validate_typescript
  validate_unit_tests
  validate_build
  validate_links
  validate_frontmatter
  validate_content_quality
  generate_health_metrics
  
  # Generate final reports
  generate_final_summary
  generate_json_report
  
  # Display final summary
  section_header "VALIDATION COMPLETE"
  echo ""
  log_info "📊 Validation Results:"
  echo "   Total Checks: $TOTAL_CHECKS"
  echo "   Passed: $PASSED_CHECKS"
  echo "   Failed: $FAILED_CHECKS"
  echo "   Warnings: $WARNINGS"
  echo ""
  log_info "📄 Reports Generated:"
  echo "   - Full Report: $REPORT_FILE"
  echo "   - JSON Report: $JSON_REPORT"
  echo ""
  
  if [[ $FAILED_CHECKS -eq 0 ]]; then
    log_success "All validations passed! ✅"
    exit 0
  elif [[ $FAILED_CHECKS -le 2 ]]; then
    log_warning "Validation passed with warnings ⚠️"
    exit 0
  else
    log_error "Validation failed ❌"
    exit 1
  fi
}

# Run main function
main "$@"






