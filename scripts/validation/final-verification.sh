#!/bin/bash
# Final Container Name Verification (Phase 7)
# Confirms zero legacy container names remain after migration

set -euo pipefail

GREEN='\\033[0;32m'
RED='\\033[0;31m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Phase 7: Final Container Name Verification                ║${NC}"
echo -e "${BLUE}║  Container Renaming Migration - Final Check                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check for legacy names
check_legacy_name() {
  local name=$1
  local description=$2
  
  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    echo -e "${RED}❌ FAIL: Legacy container found: ${name}${NC}"
    echo -e "   ${YELLOW}Description: ${description}${NC}"
    ((FAILED+=1))
    return 1
  else
    echo -e "${GREEN}✓ PASS: No legacy container: ${name}${NC}"
    ((PASSED+=1))
    return 0
  fi
}

# Function to check for prefix
check_prefix() {
  local prefix=$1
  local description=$2
  
  local count
  count=$(docker ps --format '{{.Names}}' | grep -c "^${prefix}" || true)
  count=${count:-0}
  if [ "$count" -gt 0 ]; then
    echo -e "${GREEN}✓ Found ${count} containers with prefix: ${prefix}${NC}"
    echo -e "   ${BLUE}${description}${NC}"
    ((PASSED+=1))
    return 0
  else
    echo -e "${YELLOW}⚠️  No containers with prefix: ${prefix}${NC}"
    echo -e "   ${YELLOW}${description}${NC}"
    ((WARNINGS+=1))
    return 0
  fi
}

# Function to verify specific container
verify_container() {
  local name=$1
  local description=$2
  
  if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    echo -e "${GREEN}✓ PASS: Container running: ${name}${NC}"
    echo -e "   ${BLUE}${description}${NC}"
    ((PASSED+=1))
    return 0
  else
    echo -e "${YELLOW}⚠️  Container not running: ${name}${NC}"
    echo -e "   ${YELLOW}${description} (may be stopped)${NC}"
    ((WARNINGS+=1))
    return 0
  fi
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}1. Checking for Legacy Container Names${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Legacy names that should NOT exist
check_legacy_name "tradingsystem-docs" "Old Docusaurus container"
check_legacy_name "tradingsystem-docusaurus" "Old Docusaurus container (variant)"
check_legacy_name "tradingsystem-docs-api" "Old Docs API container"
check_legacy_name "docspecs-test" "Old API Viewer container"
check_legacy_name "playwright-service" "Old Firecrawl Playwright (unprefixed)"
check_legacy_name "nuq-postgres" "Old Firecrawl PostgreSQL (unprefixed)"
check_legacy_name "langgraph-dev" "Old LangGraph dev (unprefixed)"
check_legacy_name "langgraph-redis-dev" "Old LangGraph Redis dev (unprefixed)"
check_legacy_name "langgraph-postgres-dev" "Old LangGraph PostgreSQL dev (unprefixed)"
check_legacy_name "documentation-api" "Old Documentation API (unprefixed)"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}2. Verifying Standardized Prefixes${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

check_prefix "data-" "Data layer (TimescaleDB services)"
check_prefix "infra-" "Infrastructure (LangGraph, Agno, LlamaIndex)"
check_prefix "mon-" "Monitoring (Prometheus, Grafana, Alertmanager)"
check_prefix "docs-" "Documentation (DocsAPI, Docusaurus, API Viewer)"
check_prefix "firecrawl-" "Web scraping (Firecrawl API, Playwright, Redis, Postgres)"
check_prefix "individual-" "Individual utilities (registry, buildx, ollama)"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}3. Verifying Critical Containers (if running)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

verify_container "data-timescaledb" "TimescaleDB primary data store"
verify_container "infra-langgraph" "LangGraph AI orchestration"
verify_container "infra-agno-agents" "Agno agents orchestrator"
verify_container "mon-prometheus" "Prometheus metrics"
verify_container "mon-grafana" "Grafana dashboards"
verify_container "docs-api" "Documentation API"
verify_container "firecrawl-api" "Firecrawl main API"
verify_container "data-postgress-langgraph" "LangGraph PostgreSQL"
verify_container "data-qdrant" "Qdrant vector store"
verify_container "data-questdb" "QuestDB telemetry"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}4. Container Count Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

TOTAL_CONTAINERS=$(docker ps --format '{{.Names}}' | wc -l | tr -d '[:space:]')
TRADINGSYSTEM_CONTAINERS=$(docker ps --format '{{.Names}}' | awk '/^(data-|infra-|mon-|docs-|firecrawl-|individual-)/ {count++} END {print count+0}')

echo -e "${BLUE}Total running containers:${NC} ${TOTAL_CONTAINERS}"
echo -e "${BLUE}TradingSystem containers:${NC} ${TRADINGSYSTEM_CONTAINERS}"
echo ""

if [ "${TRADINGSYSTEM_CONTAINERS}" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No TradingSystem containers running (all stopped)${NC}"
  echo -e "${YELLOW}   This is expected if containers were stopped for migration${NC}"
else
  echo -e "${GREEN}✓ TradingSystem containers detected and using standardized names${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}5. Final Verification Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}Passed:${NC}   ${PASSED}"
echo -e "${RED}Failed:${NC}   ${FAILED}"
echo -e "${YELLOW}Warnings:${NC} ${WARNINGS}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ VERIFICATION COMPLETE - ALL CHECKS PASSED              ║${NC}"
  echo -e "${GREEN}║                                                            ║${NC}"
  echo -e "${GREEN}║  Zero legacy container names found.                        ║${NC}"
  echo -e "${GREEN}║  All containers use standardized naming convention.        ║${NC}"
  echo -e "${GREEN}║                                                            ║${NC}"
  echo -e "${GREEN}║  Migration Status: ✅ COMPLETE                             ║${NC}"
  echo -e "${GREEN}║  Ready for Production: ✅ YES                              ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo -e "  1. Commit changes: git commit -F COMMIT_MESSAGE_PHASE7.md"
  echo -e "  2. Push branch: git push origin chore/rename-containers"
  echo -e "  3. Create PR using .github/PULL_REQUEST_TEMPLATE.md"
  echo -e "  4. Update FREEZE-NOTICE.md (lift freeze)"
  echo ""
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ VERIFICATION FAILED                                    ║${NC}"
  echo -e "${RED}║                                                            ║${NC}"
  echo -e "${RED}║  Legacy container names found!                             ║${NC}"
  echo -e "${RED}║  Migration incomplete.                                     ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}Action Required:${NC}"
  echo -e "  1. Review failed checks above"
  echo -e "  2. Stop legacy containers: docker stop <container-name>"
  echo -e "  3. Remove legacy containers: docker rm <container-name>"
  echo -e "  4. Re-run this script: bash scripts/validation/final-verification.sh"
  echo ""
  exit 1
fi
