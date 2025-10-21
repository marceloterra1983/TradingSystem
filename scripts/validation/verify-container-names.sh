#!/bin/bash
# Verify Container Naming Convention
# Checks that all containers follow the standardized prefix pattern

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not available. Please ensure Docker is installed and running.${NC}"
  exit 1
fi

echo "🔍 Container Naming Verification"
echo "================================="
echo ""

echo "Checking for legacy container names..."
LEGACY_NAMES=(
  "tradingsystem-docs"
  "tradingsystem-docusaurus"
  "tradingsystem-docs-api"
  "docspecs-test"
  "playwright-service"
  "nuq-postgres"
  "langgraph-dev"
  "langgraph-redis-dev"
  "langgraph-postgres-dev"
  "documentation-api"
)

for name in "${LEGACY_NAMES[@]}"; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    echo -e "${RED}❌ FAIL: Legacy container found: ${name}${NC}"
    ((FAILED++))
  else
    echo -e "${GREEN}✓ PASS: No legacy container: ${name}${NC}"
    ((PASSED++))
  fi
done

echo ""
echo "Checking for standardized prefixes..."
PREFIXES=("data-" "infra-" "mon-" "docs-" "firecrawl-")

for prefix in "${PREFIXES[@]}"; do
  count=$(docker ps --format '{{.Names}}' | grep -c "^${prefix}" || true)
  if [[ "${count}" -gt 0 ]]; then
    echo -e "${GREEN}✓ Found ${count} containers with prefix: ${prefix}${NC}"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠️  No containers with prefix: ${prefix}${NC}"
    ((WARNINGS++))
  fi
done

echo ""
echo "Verifying specific containers..."
EXPECTED_CONTAINERS=(
  "data-timescaledb"
  "data-postgress-langgraph"
  "data-qdrant"
  "data-questdb"
  "infra-langgraph"
  "infra-agno-agents"
  "mon-prometheus"
  "mon-grafana"
  "docs-api"
  "firecrawl-api"
)

for container in "${EXPECTED_CONTAINERS[@]}"; do
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    echo -e "${GREEN}✓ PASS: Container running: ${container}${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL: Container not running: ${container}${NC}"
    ((FAILED++))
  fi
done

echo ""
echo "Summary:"
echo "  Passed: ${PASSED}"
echo "  Failed: ${FAILED}"
echo "  Warnings: ${WARNINGS}"

if [[ "${FAILED}" -eq 0 ]]; then
  echo -e "${GREEN}✅ All container names verified!${NC}"
  exit 0
fi

echo -e "${RED}❌ Container naming verification failed${NC}"
exit 1
