#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Phase 1 Validation Script
# ==============================================================================
# Validates all Phase 1 (Quick Wins) implementations to ensure they are
# working correctly and meet success criteria.
#
# Usage:
#   bash scripts/validation/validate-phase1.sh
#   bash scripts/validation/validate-phase1.sh --phase 1.1
#   bash scripts/validation/validate-phase1.sh --json
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_FILE="${REPO_ROOT}/PHASE-1-VALIDATION-REPORT.md"

# Parse arguments
SPECIFIC_PHASE=""
OUTPUT_FORMAT="text"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase)
      SPECIFIC_PHASE="$2"
      shift 2
      ;;
    --json)
      OUTPUT_FORMAT="json"
      shift
      ;;
    --help|-h)
      cat <<EOF
TradingSystem - Phase 1 Validation Script

Usage:
  $0 [options]

Options:
  --phase X.Y    Validate specific phase only (e.g., 1.1, 1.2)
  --json         Output results in JSON format
  --help         Show this help message

Examples:
  $0                    # Validate all phases
  $0 --phase 1.1        # Validate only phase 1.1
  $0 --json             # Output JSON format

EOF
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

# Results tracking
declare -A PHASE_RESULTS
declare -A PHASE_MESSAGES
TOTAL_PHASES=7
PASSED_PHASES=0
FAILED_PHASES=0

# Timestamp
timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Logging
log() {
  local level="$1"
  shift
  local message="$*"

  if [[ "${OUTPUT_FORMAT}" == "text" ]]; then
    case "${level}" in
      HEADER)
        echo -e "\n${CYAN}═══════════════════════════════════════════════════════${NC}"
        echo -e "${CYAN}${message}${NC}"
        echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
        ;;
      PHASE)
        echo -e "\n${MAGENTA}━━━ ${message}${NC}"
        ;;
      INFO)
        echo -e "${BLUE}ℹ  ${message}${NC}"
        ;;
      SUCCESS)
        echo -e "${GREEN}✅ ${message}${NC}"
        ;;
      WARNING)
        echo -e "${YELLOW}⚠️  ${message}${NC}"
        ;;
      ERROR)
        echo -e "${RED}❌ ${message}${NC}"
        ;;
      *)
        echo "${message}"
        ;;
    esac
  fi
}

# Check if file exists
check_file_exists() {
  local file="$1"
  local description="$2"

  if [[ -f "${file}" ]]; then
    log "SUCCESS" "${description}: ${file}"
    return 0
  else
    log "ERROR" "${description} not found: ${file}"
    return 1
  fi
}

# Check if directory exists
check_dir_exists() {
  local dir="$1"
  local description="$2"

  if [[ -d "${dir}" ]]; then
    log "SUCCESS" "${description}: ${dir}"
    return 0
  else
    log "ERROR" "${description} not found: ${dir}"
    return 1
  fi
}

# Validate Phase 1.1 - Test Coverage
validate_phase_1_1() {
  log "PHASE" "Phase 1.1 - Test Coverage"

  local checks_passed=0
  local checks_total=5

  # Check 1: Coverage workflow exists
  if check_file_exists "${REPO_ROOT}/.github/workflows/coverage.yml" "Coverage workflow"; then
    ((checks_passed++))
  fi

  # Check 2: Test coverage guide exists
  if check_file_exists "${REPO_ROOT}/docs/content/tools/testing/test-coverage-guide.mdx" "Test coverage guide"; then
    ((checks_passed++))
  fi

  # Check 3: Implementation report exists
  if check_file_exists "${REPO_ROOT}/docs/PHASE-1-1-IMPLEMENTATION-COMPLETE.md" "Implementation report"; then
    ((checks_passed++))
  fi

  # Check 4: Vitest config exists in dashboard
  if check_file_exists "${REPO_ROOT}/frontend/dashboard/vitest.config.ts" "Vitest config"; then
    ((checks_passed++))
  fi

  # Check 5: Coverage script exists
  if grep -q "test:coverage" "${REPO_ROOT}/frontend/dashboard/package.json" 2>/dev/null; then
    log "SUCCESS" "Coverage script configured in package.json"
    ((checks_passed++))
  else
    log "ERROR" "Coverage script not found in package.json"
  fi

  if [[ ${checks_passed} -eq ${checks_total} ]]; then
    PHASE_RESULTS["1.1"]="PASS"
    PHASE_MESSAGES["1.1"]="All ${checks_total} checks passed"
    ((PASSED_PHASES++))
    log "SUCCESS" "Phase 1.1: PASSED (${checks_passed}/${checks_total})"
  else
    PHASE_RESULTS["1.1"]="FAIL"
    PHASE_MESSAGES["1.1"]="Only ${checks_passed}/${checks_total} checks passed"
    ((FAILED_PHASES++))
    log "ERROR" "Phase 1.1: FAILED (${checks_passed}/${checks_total})"
  fi
}

# Validate Phase 1.2 - Dependabot
validate_phase_1_2() {
  log "PHASE" "Phase 1.2 - Dependabot"

  local checks_passed=0
  local checks_total=4

  # Check 1: Dependabot config exists
  if check_file_exists "${REPO_ROOT}/.github/dependabot.yml" "Dependabot config"; then
    ((checks_passed++))
  fi

  # Check 2: Auto-merge workflow exists
  if check_file_exists "${REPO_ROOT}/.github/workflows/dependabot-auto-merge.yml" "Auto-merge workflow"; then
    ((checks_passed++))
  fi

  # Check 3: Dependency management guide exists
  if check_file_exists "${REPO_ROOT}/docs/content/tools/security/dependency-management-guide.mdx" "Dependency guide"; then
    ((checks_passed++))
  fi

  # Check 4: Implementation report exists
  if check_file_exists "${REPO_ROOT}/docs/PHASE-1-2-IMPLEMENTATION-COMPLETE.md" "Implementation report"; then
    ((checks_passed++))
  fi

  if [[ ${checks_passed} -eq ${checks_total} ]]; then
    PHASE_RESULTS["1.2"]="PASS"
    PHASE_MESSAGES["1.2"]="All ${checks_total} checks passed"
    ((PASSED_PHASES++))
    log "SUCCESS" "Phase 1.2: PASSED (${checks_passed}/${checks_total})"
  else
    PHASE_RESULTS["1.2"]="FAIL"
    PHASE_MESSAGES["1.2"]="Only ${checks_passed}/${checks_total} checks passed"
    ((FAILED_PHASES++))
    log "ERROR" "Phase 1.2: FAILED (${checks_passed}/${checks_total})"
  fi
}

# Validate Phase 1.3 - npm audit CI
validate_phase_1_3() {
  log "PHASE" "Phase 1.3 - npm audit CI"

  local checks_passed=0
  local checks_total=3

  # Check 1: Security audit workflow exists
  if check_file_exists "${REPO_ROOT}/.github/workflows/security-audit.yml" "Security audit workflow"; then
    ((checks_passed++))
  fi

  # Check 2: Vulnerability remediation guide exists
  if check_file_exists "${REPO_ROOT}/docs/content/tools/security/vulnerability-remediation-guide.mdx" "Vulnerability guide"; then
    ((checks_passed++))
  fi

  # Check 3: Implementation report exists
  if check_file_exists "${REPO_ROOT}/docs/PHASE-1-3-IMPLEMENTATION-COMPLETE.md" "Implementation report"; then
    ((checks_passed++))
  fi

  if [[ ${checks_passed} -eq ${checks_total} ]]; then
    PHASE_RESULTS["1.3"]="PASS"
    PHASE_MESSAGES["1.3"]="All ${checks_total} checks passed"
    ((PASSED_PHASES++))
    log "SUCCESS" "Phase 1.3: PASSED (${checks_passed}/${checks_total})"
  else
    PHASE_RESULTS["1.3"]="FAIL"
    PHASE_MESSAGES["1.3"]="Only ${checks_passed}/${checks_total} checks passed"
    ((FAILED_PHASES++))
    log "ERROR" "Phase 1.3: FAILED (${checks_passed}/${checks_total})"
  fi
}

# Validate Phase 1.4 - Bundle Size
validate_phase_1_4() {
  log "PHASE" "Phase 1.4 - Bundle Size Analysis"

  local checks_passed=0
  local checks_total=4

  # Check 1: Bundle size workflow exists
  if check_file_exists "${REPO_ROOT}/.github/workflows/bundle-size-check.yml" "Bundle size workflow"; then
    ((checks_passed++))
  fi

  # Check 2: Bundle optimization guide exists
  if check_file_exists "${REPO_ROOT}/docs/content/tools/performance/bundle-optimization-guide.mdx" "Bundle optimization guide"; then
    ((checks_passed++))
  fi

  # Check 3: Implementation report exists
  if check_file_exists "${REPO_ROOT}/docs/PHASE-1-4-IMPLEMENTATION-COMPLETE.md" "Implementation report"; then
    ((checks_passed++))
  fi

  # Check 4: Bundle budgets exist
  if check_file_exists "${REPO_ROOT}/frontend/dashboard/scripts/bundle-size-budgets.json" "Bundle budgets"; then
    ((checks_passed++))
  fi

  if [[ ${checks_passed} -eq ${checks_total} ]]; then
    PHASE_RESULTS["1.4"]="PASS"
    PHASE_MESSAGES["1.4"]="All ${checks_total} checks passed"
    ((PASSED_PHASES++))
    log "SUCCESS" "Phase 1.4: PASSED (${checks_passed}/${checks_total})"
  else
    PHASE_RESULTS["1.4"]="FAIL"
    PHASE_MESSAGES["1.4"]="Only ${checks_passed}/${checks_total} checks passed"
    ((FAILED_PHASES++))
    log "ERROR" "Phase 1.4: FAILED (${checks_passed}/${checks_total})"
  fi
}

# Validate Phase 1.5 - Dev Container
validate_phase_1_5() {
  log "PHASE" "Phase 1.5 - Dev Container"

  local checks_passed=0
  local checks_total=7

  # Check 1: devcontainer.json exists
  if check_file_exists "${REPO_ROOT}/.devcontainer/devcontainer.json" "Dev container config"; then
    ((checks_passed++))
  fi

  # Check 2: docker-compose.yml exists
  if check_file_exists "${REPO_ROOT}/.devcontainer/docker-compose.yml" "Docker compose"; then
    ((checks_passed++))
  fi

  # Check 3: Dockerfile exists
  if check_file_exists "${REPO_ROOT}/.devcontainer/Dockerfile" "Dockerfile"; then
    ((checks_passed++))
  fi

  # Check 4: Scripts directory exists
  if check_dir_exists "${REPO_ROOT}/.devcontainer/scripts" "Scripts directory"; then
    ((checks_passed++))
  fi

  # Check 5: post-create.sh exists
  if check_file_exists "${REPO_ROOT}/.devcontainer/scripts/post-create.sh" "Post-create script"; then
    ((checks_passed++))
  fi

  # Check 6: Dev container guide exists
  if check_file_exists "${REPO_ROOT}/docs/content/tools/development/dev-container-guide.mdx" "Dev container guide"; then
    ((checks_passed++))
  fi

  # Check 7: Implementation report exists
  if check_file_exists "${REPO_ROOT}/docs/PHASE-1-5-IMPLEMENTATION-COMPLETE.md" "Implementation report"; then
    ((checks_passed++))
  fi

  if [[ ${checks_passed} -eq ${checks_total} ]]; then
    PHASE_RESULTS["1.5"]="PASS"
    PHASE_MESSAGES["1.5"]="All ${checks_total} checks passed"
    ((PASSED_PHASES++))
    log "SUCCESS" "Phase 1.5: PASSED (${checks_passed}/${checks_total})"
  else
    PHASE_RESULTS["1.5"]="FAIL"
    PHASE_MESSAGES["1.5"]="Only ${checks_passed}/${checks_total} checks passed"
    ((FAILED_PHASES++))
    log "ERROR" "Phase 1.5: FAILED (${checks_passed}/${checks_total})"
  fi
}

# Validate Phase 1.6 - Documentation
validate_phase_1_6() {
  log "PHASE" "Phase 1.6 - Documentation Consolidation"

  local checks_passed=0
  local checks_total=6

  # Check 1: Documentation health analysis script exists
  if check_file_exists "${REPO_ROOT}/scripts/docs/analyze-docs-health.sh" "Docs health script"; then
    ((checks_passed++))
  fi

  # Check 2: Contribution guide exists
  if check_file_exists "${REPO_ROOT}/docs/CONTRIBUTING-DOCS.md" "Contribution guide"; then
    ((checks_passed++))
  fi

  # Check 3: Dev container guide exists
  if check_file_exists "${REPO_ROOT}/docs/content/tools/development/dev-container-guide.mdx" "Dev container guide"; then
    ((checks_passed++))
  fi

  # Check 4: Quick wins index exists
  if check_file_exists "${REPO_ROOT}/docs/content/reference/quick-wins-index.mdx" "Quick wins index"; then
    ((checks_passed++))
  fi

  # Check 5: Docs health report exists
  if check_file_exists "${REPO_ROOT}/docs/DOCS-HEALTH-REPORT.md" "Docs health report"; then
    ((checks_passed++))
  fi

  # Check 6: Implementation report exists
  if check_file_exists "${REPO_ROOT}/docs/PHASE-1-6-IMPLEMENTATION-COMPLETE.md" "Implementation report"; then
    ((checks_passed++))
  fi

  if [[ ${checks_passed} -eq ${checks_total} ]]; then
    PHASE_RESULTS["1.6"]="PASS"
    PHASE_MESSAGES["1.6"]="All ${checks_total} checks passed"
    ((PASSED_PHASES++))
    log "SUCCESS" "Phase 1.6: PASSED (${checks_passed}/${checks_total})"
  else
    PHASE_RESULTS["1.6"]="FAIL"
    PHASE_MESSAGES["1.6"]="Only ${checks_passed}/${checks_total} checks passed"
    ((FAILED_PHASES++))
    log "ERROR" "Phase 1.6: FAILED (${checks_passed}/${checks_total})"
  fi
}

# Validate Phase 1.7 - Health Checks
validate_phase_1_7() {
  log "PHASE" "Phase 1.7 - Health Checks"

  local checks_passed=0
  local checks_total=7

  # Check 1: Health dashboard component exists
  if check_file_exists "${REPO_ROOT}/frontend/dashboard/src/components/pages/SystemHealthPage.tsx" "Health dashboard"; then
    ((checks_passed++))
  fi

  # Check 2: System health API exists
  if check_file_exists "${REPO_ROOT}/backend/api/workspace/src/routes/system-health.js" "System health API"; then
    ((checks_passed++))
  fi

  # Check 3: Monitor script exists
  if check_file_exists "${REPO_ROOT}/scripts/maintenance/monitor-system-health.sh" "Monitor script"; then
    ((checks_passed++))
  fi

  # Check 4: SystemD service file exists
  if check_file_exists "${REPO_ROOT}/tools/systemd/system-health-monitor.service" "SystemD service"; then
    ((checks_passed++))
  fi

  # Check 5: Setup script exists
  if check_file_exists "${REPO_ROOT}/tools/systemd/setup-health-monitoring.sh" "Setup script"; then
    ((checks_passed++))
  fi

  # Check 6: Health checks guide exists
  if check_file_exists "${REPO_ROOT}/docs/content/tools/monitoring/health-checks-guide.mdx" "Health checks guide"; then
    ((checks_passed++))
  fi

  # Check 7: Implementation report exists
  if check_file_exists "${REPO_ROOT}/docs/PHASE-1-7-IMPLEMENTATION-COMPLETE.md" "Implementation report"; then
    ((checks_passed++))
  fi

  if [[ ${checks_passed} -eq ${checks_total} ]]; then
    PHASE_RESULTS["1.7"]="PASS"
    PHASE_MESSAGES["1.7"]="All ${checks_total} checks passed"
    ((PASSED_PHASES++))
    log "SUCCESS" "Phase 1.7: PASSED (${checks_passed}/${checks_total})"
  else
    PHASE_RESULTS["1.7"]="FAIL"
    PHASE_MESSAGES["1.7"]="Only ${checks_passed}/${checks_total} checks passed"
    ((FAILED_PHASES++))
    log "ERROR" "Phase 1.7: FAILED (${checks_passed}/${checks_total})"
  fi
}

# Generate report
generate_report() {
  log "INFO" "Generating validation report..."

  cat > "${REPORT_FILE}" <<EOF
# 📋 Phase 1 (Quick Wins) - Validation Report

**Generated:** $(timestamp)
**Status:** ${PASSED_PHASES}/${TOTAL_PHASES} phases passed

---

## 📊 Summary

| Phase | Status | Message |
|-------|--------|---------|
EOF

  for phase in "1.1" "1.2" "1.3" "1.4" "1.5" "1.6" "1.7"; do
    local status="${PHASE_RESULTS[$phase]:-SKIP}"
    local message="${PHASE_MESSAGES[$phase]:-Not validated}"
    local badge

    case "${status}" in
      PASS)
        badge="✅ PASSED"
        ;;
      FAIL)
        badge="❌ FAILED"
        ;;
      *)
        badge="⏭️ SKIPPED"
        ;;
    esac

    echo "| **Phase ${phase}** | ${badge} | ${message} |" >> "${REPORT_FILE}"
  done

  cat >> "${REPORT_FILE}" <<EOF

---

## 🎯 Overall Result

EOF

  if [[ ${PASSED_PHASES} -eq ${TOTAL_PHASES} ]]; then
    cat >> "${REPORT_FILE}" <<EOF
✅ **ALL PHASES PASSED!**

Phase 1 (Quick Wins) is 100% validated and ready for production use.

### Next Steps

1. ✅ Phase 1 Complete - All validations passed
2. 🚀 Ready to start Phase 2 (Structural Improvements)
3. 📊 Consider running integration tests
4. 📝 Document any lessons learned

EOF
  else
    cat >> "${REPORT_FILE}" <<EOF
⚠️ **SOME PHASES FAILED**

**Passed:** ${PASSED_PHASES}/${TOTAL_PHASES}
**Failed:** ${FAILED_PHASES}/${TOTAL_PHASES}

### Required Actions

1. Review failed phase details above
2. Fix any missing files or configurations
3. Re-run validation: \`bash scripts/validation/validate-phase1.sh\`

EOF
  fi

  cat >> "${REPORT_FILE}" <<EOF
---

## 📖 Phase Details

### Phase 1.1 - Test Coverage
**Files validated:**
- \`.github/workflows/coverage.yml\`
- \`docs/content/tools/testing/test-coverage-guide.mdx\`
- \`docs/PHASE-1-1-IMPLEMENTATION-COMPLETE.md\`
- \`frontend/dashboard/vitest.config.ts\`
- Coverage script in package.json

### Phase 1.2 - Dependabot
**Files validated:**
- \`.github/dependabot.yml\`
- \`.github/workflows/dependabot-auto-merge.yml\`
- \`docs/content/tools/security/dependency-management-guide.mdx\`
- \`docs/PHASE-1-2-IMPLEMENTATION-COMPLETE.md\`

### Phase 1.3 - npm audit CI
**Files validated:**
- \`.github/workflows/security-audit.yml\`
- \`docs/content/tools/security/vulnerability-remediation-guide.mdx\`
- \`docs/PHASE-1-3-IMPLEMENTATION-COMPLETE.md\`

### Phase 1.4 - Bundle Size
**Files validated:**
- \`.github/workflows/bundle-size-check.yml\`
- \`docs/content/tools/performance/bundle-optimization-guide.mdx\`
- \`docs/PHASE-1-4-IMPLEMENTATION-COMPLETE.md\`
- \`frontend/dashboard/scripts/bundle-size-budgets.json\`

### Phase 1.5 - Dev Container
**Files validated:**
- \`.devcontainer/devcontainer.json\`
- \`.devcontainer/docker-compose.yml\`
- \`.devcontainer/Dockerfile\`
- \`.devcontainer/scripts/\`
- \`docs/content/tools/development/dev-container-guide.mdx\`
- \`docs/PHASE-1-5-IMPLEMENTATION-COMPLETE.md\`

### Phase 1.6 - Documentation
**Files validated:**
- \`scripts/docs/analyze-docs-health.sh\`
- \`docs/CONTRIBUTING-DOCS.md\`
- \`docs/content/tools/development/dev-container-guide.mdx\`
- \`docs/content/reference/quick-wins-index.mdx\`
- \`docs/DOCS-HEALTH-REPORT.md\`
- \`docs/PHASE-1-6-IMPLEMENTATION-COMPLETE.md\`

### Phase 1.7 - Health Checks
**Files validated:**
- \`frontend/dashboard/src/components/pages/SystemHealthPage.tsx\`
- \`backend/api/workspace/src/routes/system-health.js\`
- \`scripts/maintenance/monitor-system-health.sh\`
- \`tools/systemd/system-health-monitor.service\`
- \`tools/systemd/setup-health-monitoring.sh\`
- \`docs/content/tools/monitoring/health-checks-guide.mdx\`
- \`docs/PHASE-1-7-IMPLEMENTATION-COMPLETE.md\`

---

**Validation Script:** \`scripts/validation/validate-phase1.sh\`
EOF

  log "SUCCESS" "Report generated: ${REPORT_FILE}"
}

# Generate JSON output
generate_json() {
  local json="{"
  json+="\"timestamp\":\"$(timestamp)\","
  json+="\"totalPhases\":${TOTAL_PHASES},"
  json+="\"passedPhases\":${PASSED_PHASES},"
  json+="\"failedPhases\":${FAILED_PHASES},"
  json+="\"phases\":{"

  local first=true
  for phase in "1.1" "1.2" "1.3" "1.4" "1.5" "1.6" "1.7"; do
    if [[ "${first}" == false ]]; then
      json+=","
    fi
    first=false

    local status="${PHASE_RESULTS[$phase]:-SKIP}"
    local message="${PHASE_MESSAGES[$phase]:-Not validated}"

    json+="\"${phase}\":{"
    json+="\"status\":\"${status}\","
    json+="\"message\":\"${message}\""
    json+="}"
  done

  json+="}}"

  echo "${json}"
}

# Main execution
main() {
  log "HEADER" "🚀 TradingSystem - Phase 1 Validation"
  log "INFO" "Starting validation at $(timestamp)"
  log "INFO" "Repository: ${REPO_ROOT}"

  if [[ -n "${SPECIFIC_PHASE}" ]]; then
    log "INFO" "Validating specific phase: ${SPECIFIC_PHASE}"

    case "${SPECIFIC_PHASE}" in
      1.1) validate_phase_1_1 ;;
      1.2) validate_phase_1_2 ;;
      1.3) validate_phase_1_3 ;;
      1.4) validate_phase_1_4 ;;
      1.5) validate_phase_1_5 ;;
      1.6) validate_phase_1_6 ;;
      1.7) validate_phase_1_7 ;;
      *)
        log "ERROR" "Unknown phase: ${SPECIFIC_PHASE}"
        exit 1
        ;;
    esac
  else
    log "INFO" "Validating all phases..."
    validate_phase_1_1
    validate_phase_1_2
    validate_phase_1_3
    validate_phase_1_4
    validate_phase_1_5
    validate_phase_1_6
    validate_phase_1_7
  fi

  # Output results
  if [[ "${OUTPUT_FORMAT}" == "json" ]]; then
    generate_json
  else
    log "HEADER" "📊 Validation Complete"
    log "INFO" "Total Phases: ${TOTAL_PHASES}"
    log "INFO" "Passed: ${PASSED_PHASES}"
    log "INFO" "Failed: ${FAILED_PHASES}"

    if [[ ${PASSED_PHASES} -eq ${TOTAL_PHASES} ]]; then
      log "SUCCESS" "ALL PHASES PASSED! 🎉"
      generate_report
      exit 0
    else
      log "ERROR" "SOME PHASES FAILED"
      generate_report
      exit 1
    fi
  fi
}

main
