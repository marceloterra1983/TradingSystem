#!/bin/bash
# ==============================================================================
# Pre-Deployment Validation Suite
# ==============================================================================
# Purpose: Master validation script that runs all pre-deployment checks
# Usage:   bash scripts/validation/pre-deploy-validation-suite.sh [--strict]
# Exit:    0 = All validations passed
#          1 = Critical errors found (deployment MUST NOT proceed)
#          2 = Warnings only (deployment may proceed with caution)
# ==============================================================================

set -uo pipefail  # Removed -e: We want to collect ALL errors, not stop on first

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

STRICT_MODE=false
REPORT_DIR="reports/deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/pre-deploy-validation-${TIMESTAMP}.md"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --strict)
      STRICT_MODE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create report directory
mkdir -p "$REPORT_DIR"

# ==============================================================================
# Header
# ==============================================================================

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║         PRE-DEPLOYMENT VALIDATION SUITE                      ║"
echo "║         TradingSystem - Quality Gate                         ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Started:${NC} $(date +'%Y-%m-%d %H:%M:%S')"
echo -e "${BLUE}Mode:${NC} $([ "$STRICT_MODE" = true ] && echo "STRICT (warnings = errors)" || echo "STANDARD")"
echo -e "${BLUE}Report:${NC} $REPORT_FILE"
echo ""

# Initialize report
cat > "$REPORT_FILE" <<EOF
---
title: "Pre-Deployment Validation Report"
date: $(date +'%Y-%m-%d')
timestamp: $(date +'%Y-%m-%d %H:%M:%S')
mode: $([ "$STRICT_MODE" = true ] && echo "strict" || echo "standard")
status: in_progress
---

# Pre-Deployment Validation Report

**Date**: $(date +'%Y-%m-%d %H:%M:%S')  
**Mode**: $([ "$STRICT_MODE" = true ] && echo "STRICT" || echo "STANDARD")  
**Operator**: ${USER}  

---

## Validation Results

EOF

# ==============================================================================
# Validation Phases
# ==============================================================================

total_errors=0
total_warnings=0
total_passed=0
phase_count=0

run_phase() {
  local phase_name="$1"
  local script_path="$2"
  local args="${3:-}"
  
  ((phase_count++))
  
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}Phase $phase_count: $phase_name${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  # Add phase header to report
  echo "" >> "$REPORT_FILE"
  echo "### Phase $phase_count: $phase_name" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  
  # Run validation script
  set +e
  output=$(bash "$script_path" $args 2>&1)
  exit_code=$?
  set -e
  
  echo "$output"
  
  # Parse results
  if echo "$output" | grep -q "Passed:"; then
    phase_passed=$(echo "$output" | grep "Passed:" | sed 's/.*Passed:[^0-9]*\([0-9]*\).*/\1/')
    phase_warnings=$(echo "$output" | grep "Warnings:" | sed 's/.*Warnings:[^0-9]*\([0-9]*\).*/\1/')
    phase_errors=$(echo "$output" | grep "Errors:" | sed 's/.*Errors:[^0-9]*\([0-9]*\).*/\1/')
    
    ((total_passed += phase_passed))
    ((total_warnings += phase_warnings))
    ((total_errors += phase_errors))
    
    # Add to report
    echo "- **Passed**: $phase_passed" >> "$REPORT_FILE"
    echo "- **Warnings**: $phase_warnings" >> "$REPORT_FILE"
    echo "- **Errors**: $phase_errors" >> "$REPORT_FILE"
  fi
  
  # Add status to report
  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ Phase passed${NC}"
    echo "- **Status**: ✅ PASSED" >> "$REPORT_FILE"
  elif [ $exit_code -eq 2 ]; then
    echo -e "${YELLOW}⚠️  Phase passed with warnings${NC}"
    echo "- **Status**: ⚠️ PASSED WITH WARNINGS" >> "$REPORT_FILE"
  else
    echo -e "${RED}❌ Phase failed${NC}"
    echo "- **Status**: ❌ FAILED" >> "$REPORT_FILE"
  fi
  
  echo ""
  echo "<details>" >> "$REPORT_FILE"
  echo "<summary>Full Output</summary>" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  echo "$output" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  echo "</details>" >> "$REPORT_FILE"
}

# ==============================================================================
# Execute Validation Phases
# ==============================================================================

# Phase 1: Environment Variables
if [ -f "scripts/validation/validate-env.sh" ]; then
  run_phase "Environment Variables" "scripts/validation/validate-env.sh" "$([ "$STRICT_MODE" = true ] && echo "--strict" || echo "")"
else
  echo -e "${YELLOW}⚠️  WARNING: validate-env.sh not found (skipping)${NC}"
  ((total_warnings++))
fi

# Phase 2: Network & Connectivity
if [ -f "scripts/validation/validate-network.sh" ]; then
  run_phase "Network & Connectivity" "scripts/validation/validate-network.sh" "--test-all"
else
  echo -e "${YELLOW}⚠️  WARNING: validate-network.sh not found (skipping)${NC}"
  ((total_warnings++))
fi

# Phase 3: Docker Compose Configuration
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Phase $((phase_count + 1)): Docker Compose Configuration${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

compose_errors=0
compose_passed=0

# Check syntax of all compose files
for compose_file in tools/compose/docker-compose*.yml; do
  if [ -f "$compose_file" ]; then
    echo -e "Checking: $compose_file"
    if docker compose -f "$compose_file" config > /dev/null 2>&1; then
      echo -e "${GREEN}✅ YAML syntax valid${NC}"
      ((compose_passed++))
    else
      echo -e "${RED}❌ YAML syntax error${NC}"
      ((compose_errors++))
    fi
  fi
done

((total_passed += compose_passed))
((total_errors += compose_errors))

echo ""

# ==============================================================================
# Final Report
# ==============================================================================

# Complete report
cat >> "$REPORT_FILE" <<EOF

---

## Final Summary

| Metric | Count |
|--------|-------|
| **Total Passed** | $total_passed |
| **Total Warnings** | $total_warnings |
| **Total Errors** | $total_errors |

EOF

# Determine overall status
if [ $total_errors -gt 0 ]; then
  final_status="❌ FAILED"
  final_color="$RED"
  exit_code=1
elif [ $total_warnings -gt 0 ]; then
  if [ "$STRICT_MODE" = true ]; then
    final_status="❌ FAILED (STRICT MODE)"
    final_color="$RED"
    exit_code=1
  else
    final_status="⚠️ PASSED WITH WARNINGS"
    final_color="$YELLOW"
    exit_code=2
  fi
else
  final_status="✅ PASSED"
  final_color="$GREEN"
  exit_code=0
fi

# Update report status
sed -i "s/status: in_progress/status: $(echo "$final_status" | sed 's/[^a-z]//g')/" "$REPORT_FILE"

# Add final status to report
echo "## Overall Status" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Result**: $final_status" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $exit_code -eq 0 ]; then
  echo "✅ **DEPLOYMENT APPROVED** - All checks passed" >> "$REPORT_FILE"
elif [ $exit_code -eq 2 ]; then
  echo "⚠️ **DEPLOYMENT MAY PROCEED** - Review warnings before proceeding" >> "$REPORT_FILE"
else
  echo "❌ **DEPLOYMENT BLOCKED** - Fix all errors before proceeding" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "**Generated**: $(date +'%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"

# Print final summary
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}FINAL SUMMARY${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}   $total_passed"
echo -e "  ${YELLOW}Warnings:${NC} $total_warnings"
echo -e "  ${RED}Errors:${NC}   $total_errors"
echo ""
echo -e "${final_color}$final_status${NC}"
echo ""
echo -e "${BLUE}Report saved to:${NC} $REPORT_FILE"
echo ""

if [ $exit_code -eq 0 ]; then
  echo -e "${GREEN}✅ DEPLOYMENT APPROVED${NC}"
  echo -e "${GREEN}All checks passed - proceed with deployment${NC}"
elif [ $exit_code -eq 2 ]; then
  echo -e "${YELLOW}⚠️  DEPLOYMENT MAY PROCEED WITH CAUTION${NC}"
  echo -e "${YELLOW}Review warnings before deploying to production${NC}"
else
  echo -e "${RED}❌ DEPLOYMENT BLOCKED${NC}"
  echo -e "${RED}Fix all critical errors before proceeding${NC}"
fi

echo ""

exit $exit_code

