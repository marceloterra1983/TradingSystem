#!/bin/bash
# ==============================================================================
# Environment Variables Validation Script
# ==============================================================================
# Purpose: Validate that all CRITICAL and REQUIRED environment variables
#          are defined and non-empty before starting services
# Usage:   bash scripts/validation/validate-env.sh [--strict] [--ci-mode]
# Exit:    0 = All validations passed
#          1 = Critical errors found
#          2 = Warnings only (non-critical)
# ==============================================================================

# set -e  # Disabled: We want to collect ALL errors, not fail on first

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
STRICT_MODE=false
CI_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --strict)
      STRICT_MODE=true
      shift
      ;;
    --ci-mode)
      CI_MODE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ==============================================================================
# Load Environment Variables
# ==============================================================================

if [ ! -f .env ]; then
  echo -e "${RED}❌ ERROR: .env file not found in project root!${NC}"
  echo -e "${YELLOW}   Expected location: $(pwd)/.env${NC}"
  exit 1
fi

echo -e "${BLUE}📋 Loading environment variables from .env...${NC}"
set -a
source .env
set +a

# ==============================================================================
# Variable Definitions
# ==============================================================================

# CRITICAL: Service WILL FAIL if these are empty
CRITICAL_VARS=(
  "TELEGRAM_DB_PASSWORD:Telegram TimescaleDB password"
  "TP_CAPITAL_DB_PASSWORD:TP-Capital TimescaleDB password"
  "TELEGRAM_GATEWAY_API_KEY:Telegram Gateway API authentication"
  "TP_CAPITAL_API_KEY:TP-Capital API authentication"
)

# REQUIRED: Service may degrade if these are empty
REQUIRED_VARS=(
  "TELEGRAM_GATEWAY_URL:Telegram Gateway endpoint"
  "NODE_ENV:Node.js environment mode"
  "LOG_LEVEL:Logging verbosity"
  "REDIS_HOST:Redis cache hostname"
)

# OPTIONAL: Have sensible defaults
OPTIONAL_VARS=(
  "TP_CAPITAL_API_PORT:TP-Capital external port (default: 4008)"
  "TELEGRAM_GATEWAY_API_PORT:Gateway API port (default: 4010)"
  "DASHBOARD_PORT:Frontend dashboard port (default: 9080)"
)

# ==============================================================================
# Validation Functions
# ==============================================================================

errors=0
warnings=0
passed=0

check_critical() {
  local var_spec="$1"
  local var_name="${var_spec%%:*}"
  local var_desc="${var_spec#*:}"
  local value="${!var_name}"
  
  if [ -z "$value" ]; then
    echo -e "${RED}❌ CRITICAL: $var_name is not set or empty!${NC}"
    echo -e "${YELLOW}   Description: $var_desc${NC}"
    ((errors++))
  else
    echo -e "${GREEN}✅ $var_name is set${NC} (length: ${#value} chars)"
    ((passed++))
  fi
}

check_required() {
  local var_spec="$1"
  local var_name="${var_spec%%:*}"
  local var_desc="${var_spec#*:}"
  local value="${!var_name}"
  
  if [ -z "$value" ]; then
    echo -e "${YELLOW}⚠️  WARNING: $var_name is not set${NC}"
    echo -e "   Description: $var_desc"
    ((warnings++))
    
    if [ "$STRICT_MODE" = true ]; then
      ((errors++))
    fi
  else
    echo -e "${GREEN}✅ $var_name is set${NC} (value: ${value:0:20}...)"
    ((passed++))
  fi
}

check_optional() {
  local var_spec="$1"
  local var_name="${var_spec%%:*}"
  local var_desc="${var_spec#*:}"
  local value="${!var_name}"
  
  if [ -z "$value" ]; then
    echo -e "ℹ️  INFO: $var_name not set (will use default)"
    echo -e "   $var_desc"
  else
    echo -e "${GREEN}✅ $var_name is set${NC} (value: $value)"
    ((passed++))
  fi
}

# ==============================================================================
# Run Validations
# ==============================================================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Environment Variables Validation Script     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Phase 1: CRITICAL Variables
echo -e "${BLUE}━━━ Phase 1: CRITICAL Variables ━━━${NC}"
echo ""
for var_spec in "${CRITICAL_VARS[@]}"; do
  check_critical "$var_spec"
done

echo ""

# Phase 2: REQUIRED Variables
echo -e "${BLUE}━━━ Phase 2: REQUIRED Variables ━━━${NC}"
echo ""
for var_spec in "${REQUIRED_VARS[@]}"; do
  check_required "$var_spec"
done

echo ""

# Phase 3: OPTIONAL Variables
echo -e "${BLUE}━━━ Phase 3: OPTIONAL Variables ━━━${NC}"
echo ""
for var_spec in "${OPTIONAL_VARS[@]}"; do
  check_optional "$var_spec"
done

echo ""

# ==============================================================================
# Summary & Exit
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Validation Summary:${NC}"
echo -e "  ${GREEN}Passed:${NC}   $passed"
echo -e "  ${YELLOW}Warnings:${NC} $warnings"
echo -e "  ${RED}Errors:${NC}   $errors"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $errors -gt 0 ]; then
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo -e "${YELLOW}Fix all CRITICAL errors before deployment!${NC}"
  echo ""
  
  if [ "$CI_MODE" = true ]; then
    echo "::error::Environment validation failed with $errors errors"
  fi
  
  exit 1
fi

if [ $warnings -gt 0 ]; then
  echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS${NC}"
  echo -e "${YELLOW}Consider setting all REQUIRED variables${NC}"
  echo ""
  
  if [ "$STRICT_MODE" = true ]; then
    echo -e "${RED}❌ STRICT MODE: Treating warnings as errors${NC}"
    exit 1
  fi
  
  exit 2
fi

echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
echo -e "${GREEN}All environment variables are correctly configured${NC}"
echo ""
exit 0

