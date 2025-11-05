#!/bin/bash
# ==============================================================================
# Docker Network & Inter-Container Communication Validation
# ==============================================================================
# Purpose: Validate that containers can communicate with each other
# Usage:   bash scripts/validation/validate-network.sh [--test-all]
# Exit:    0 = All validations passed
#          1 = Critical errors found
# ==============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TEST_ALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --test-all)
      TEST_ALL=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Network & Connectivity Validation Script    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

errors=0
warnings=0
passed=0

# ==============================================================================
# Phase 1: Docker Networks
# ==============================================================================

echo -e "${BLUE}━━━ Phase 1: Docker Networks ━━━${NC}"
echo ""

# Check if networks exist
required_networks=(
  "tradingsystem_backend"
  "telegram_backend"
  "tp_capital_backend"
)

for network in "${required_networks[@]}"; do
  if docker network ls | grep -q "$network"; then
    echo -e "${GREEN}✅ Network $network exists${NC}"
    ((passed++))
  else
    echo -e "${YELLOW}⚠️  WARNING: Network $network does not exist${NC}"
    echo -e "   Will be created automatically by docker compose"
    ((warnings++))
  fi
done

echo ""

# ==============================================================================
# Phase 2: Running Containers
# ==============================================================================

echo -e "${BLUE}━━━ Phase 2: Running Containers ━━━${NC}"
echo ""

# Check if critical containers are running
critical_containers=(
  "telegram-timescale:Telegram TimescaleDB"
  "telegram-pgbouncer:Telegram PgBouncer"
  "telegram-gateway-api:Telegram Gateway API"
  "tp-capital-timescale:TP-Capital TimescaleDB"
  "tp-capital-pgbouncer:TP-Capital PgBouncer"
  "tp-capital-api:TP-Capital API"
  "dashboard-ui:Frontend Dashboard"
)

for container_spec in "${critical_containers[@]}"; do
  container_name="${container_spec%%:*}"
  container_desc="${container_spec#*:}"
  
  if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
    # Check health status
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")
    
    if [ "$health" = "healthy" ]; then
      echo -e "${GREEN}✅ $container_name is running and healthy${NC}"
      ((passed++))
    elif [ "$health" = "no-healthcheck" ]; then
      echo -e "${GREEN}✅ $container_name is running${NC} (no health check defined)"
      ((passed++))
    else
      echo -e "${YELLOW}⚠️  WARNING: $container_name is running but unhealthy (status: $health)${NC}"
      ((warnings++))
    fi
  else
    if [ "$TEST_ALL" = true ]; then
      echo -e "${YELLOW}⚠️  WARNING: $container_name is not running${NC}"
      ((warnings++))
    else
      echo -e "ℹ️  INFO: $container_name not running (skipping connectivity tests)"
    fi
  fi
done

echo ""

# ==============================================================================
# Phase 3: Inter-Container Connectivity Tests
# ==============================================================================

if [ "$TEST_ALL" = true ]; then
  echo -e "${BLUE}━━━ Phase 3: Inter-Container Connectivity ━━━${NC}"
  echo ""

  # Test 1: TP-Capital → Telegram Gateway API
  echo -e "Testing: TP-Capital → Telegram Gateway API"
  if docker exec tp-capital-api wget -qO- --timeout=3 http://telegram-gateway-api:4010/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TP-Capital can reach Telegram Gateway API${NC}"
    ((passed++))
  else
    echo -e "${RED}❌ ERROR: TP-Capital cannot reach Telegram Gateway API${NC}"
    echo -e "${YELLOW}   Check: Network configuration, Gateway API health${NC}"
    ((errors++))
  fi

  # Test 2: TP-Capital → TP-Capital TimescaleDB (via PgBouncer)
  echo -e "Testing: TP-Capital → TP-Capital TimescaleDB"
  if docker exec tp-capital-api sh -c 'echo "SELECT 1" | timeout 3 nc tp-capital-pgbouncer 6432' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TP-Capital can reach PgBouncer${NC}"
    ((passed++))
  else
    echo -e "${RED}❌ ERROR: TP-Capital cannot reach PgBouncer${NC}"
    echo -e "${YELLOW}   Check: PgBouncer health, network configuration${NC}"
    ((errors++))
  fi

  # Test 3: Dashboard → TP-Capital API
  echo -e "Testing: Dashboard → TP-Capital API"
  if docker exec dashboard-ui wget -qO- --timeout=3 http://tp-capital-api:4005/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dashboard can reach TP-Capital API${NC}"
    ((passed++))
  else
    echo -e "${RED}❌ ERROR: Dashboard cannot reach TP-Capital API${NC}"
    echo -e "${YELLOW}   Check: Network configuration, TP-Capital health${NC}"
    ((errors++))
  fi

  # Test 4: Host → Services (External Ports)
  echo -e "Testing: Host → Services (External Ports)"
  
  if curl -s --max-time 3 http://localhost:4008/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Host can reach TP-Capital (port 4008)${NC}"
    ((passed++))
  else
    echo -e "${RED}❌ ERROR: Host cannot reach TP-Capital on port 4008${NC}"
    ((errors++))
  fi
  
  if curl -s --max-time 3 http://localhost:4010/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Host can reach Telegram Gateway (port 4010)${NC}"
    ((passed++))
  else
    echo -e "${RED}❌ ERROR: Host cannot reach Telegram Gateway on port 4010${NC}"
    ((errors++))
  fi

  echo ""
fi

# ==============================================================================
# Summary
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Validation Summary:${NC}"
echo -e "  ${GREEN}Passed:${NC}   $passed"
echo -e "  ${YELLOW}Warnings:${NC} $warnings"
echo -e "  ${RED}Errors:${NC}   $errors"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $errors -gt 0 ]; then
  echo -e "${RED}❌ NETWORK VALIDATION FAILED${NC}"
  echo -e "${YELLOW}Fix all errors before proceeding${NC}"
  echo ""
  exit 1
fi

if [ $warnings -gt 0 ]; then
  echo -e "${YELLOW}⚠️  NETWORK VALIDATION PASSED WITH WARNINGS${NC}"
  echo ""
  exit 0
fi

echo -e "${GREEN}✅ NETWORK VALIDATION PASSED${NC}"
echo ""
exit 0

