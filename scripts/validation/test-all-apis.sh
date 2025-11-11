#!/usr/bin/env bash
#
# test-all-apis.sh
# Testa conectividade de TODAS as APIs e serviços do Dashboard
#
# Usage:
#   bash scripts/validation/test-all-apis.sh
#   bash scripts/validation/test-all-apis.sh --json
#   bash scripts/validation/test-all-apis.sh --verbose
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Flags
FORMAT="text"
VERBOSE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --json)
      FORMAT="json"
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--json] [--verbose] [--help]"
      echo ""
      echo "Testa conectividade de TODAS as APIs e serviços do Dashboard"
      echo ""
      echo "Options:"
      echo "  --json     Retorna resultado em JSON"
      echo "  --verbose  Mostra detalhes de cada teste"
      echo "  --help     Mostra esta mensagem"
      exit 0
      ;;
  esac
done

# Test results
declare -A RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function: Test HTTP endpoint
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local method="${4:-GET}"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [[ "$VERBOSE" == "true" ]] && [[ "$FORMAT" == "text" ]]; then
    echo -ne "${CYAN}Testing:${NC} $name ... "
  fi

  local http_code
  if [[ "$method" == "GET" ]]; then
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
  else
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -X "$method" "$url" 2>/dev/null || echo "000")
  fi

  # Check result
  local status="PASS"
  if [[ "$http_code" == "000" ]]; then
    status="UNREACHABLE"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  elif [[ "$http_code" == "$expected_status" ]]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
  elif [[ "$expected_status" == "200" ]] && [[ "$http_code" =~ ^(301|302|307|308)$ ]]; then
    # Accept redirects as success for 200 expected
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    status="FAIL"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi

  RESULTS["$name"]="$status|$http_code|$url"

  if [[ "$VERBOSE" == "true" ]] && [[ "$FORMAT" == "text" ]]; then
    if [[ "$status" == "PASS" ]]; then
      echo -e "${GREEN}✓${NC} ($http_code)"
    elif [[ "$status" == "UNREACHABLE" ]]; then
      echo -e "${RED}✗ UNREACHABLE${NC}"
    else
      echo -e "${YELLOW}⚠${NC} ($http_code, expected $expected_status)"
    fi
  fi
}

print_header() {
  if [[ "$FORMAT" == "text" ]]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  fi
}

# ==============================================================================
# TESTS START
# ==============================================================================

if [[ "$FORMAT" == "text" ]]; then
  echo -e "${CYAN}"
  echo "┌─────────────────────────────────────────────────────┐"
  echo "│     TradingSystem - API Connectivity Tests         │"
  echo "└─────────────────────────────────────────────────────┘"
  echo -e "${NC}"
fi

# ------------------------------------------------------------------------------
# 1. Gateway & Infrastructure
# ------------------------------------------------------------------------------
print_header "Gateway & Infrastructure"
test_endpoint "Traefik Gateway" "http://localhost:9080/" "200"
test_endpoint "Traefik Dashboard" "http://localhost:9081/dashboard/" "200"

# ------------------------------------------------------------------------------
# 2. Frontend Applications
# ------------------------------------------------------------------------------
print_header "Frontend Applications"
test_endpoint "Main Dashboard" "http://localhost:9080/" "200"
test_endpoint "Documentation Hub" "http://localhost:3404/" "200"

# ------------------------------------------------------------------------------
# 3. Backend APIs
# ------------------------------------------------------------------------------
print_header "Backend APIs"
test_endpoint "Workspace API" "http://localhost:3200/api/health" "200"
test_endpoint "TP Capital API" "http://localhost:4008/health" "200"
test_endpoint "Documentation API" "http://localhost:3405/health" "200"
test_endpoint "Telegram Gateway API" "http://localhost:14010/health" "200"
test_endpoint "Firecrawl Proxy" "http://localhost:3600/health" "200"

# ------------------------------------------------------------------------------
# 4. Database UIs (Direct Access)
# ------------------------------------------------------------------------------
print_header "Database UIs (Direct Access)"
test_endpoint "pgAdmin" "http://localhost:5050/" "302" # Redirects to login
test_endpoint "Adminer" "http://localhost:3910/" "200"
test_endpoint "pgWeb" "http://localhost:5052/" "200"
test_endpoint "QuestDB Console" "http://localhost:9000/" "200"

# ------------------------------------------------------------------------------
# 5. Database UIs (via Traefik Gateway)
# ------------------------------------------------------------------------------
print_header "Database UIs (via Traefik Gateway)"
test_endpoint "pgAdmin (Gateway)" "http://localhost:9080/db-ui/pgadmin" "302"
test_endpoint "Adminer (Gateway)" "http://localhost:9080/db-ui/adminer" "200"
test_endpoint "pgWeb (Gateway)" "http://localhost:9080/db-ui/pgweb" "200"
test_endpoint "QuestDB (Gateway)" "http://localhost:9080/db-ui/questdb" "200"

# ------------------------------------------------------------------------------
# 6. Automation Tools (Direct Access)
# ------------------------------------------------------------------------------
print_header "Automation Tools"
test_endpoint "n8n" "http://localhost:5678/" "200"
test_endpoint "Kestra" "http://localhost:8080/" "200"

# ------------------------------------------------------------------------------
# 7. Monitoring Tools (Direct Access)
# ------------------------------------------------------------------------------
print_header "Monitoring Tools"
test_endpoint "Grafana" "http://localhost:3101/" "302" # Redirects to login
test_endpoint "Prometheus" "http://localhost:9091/" "200"

# ------------------------------------------------------------------------------
# 8. RAG Services
# ------------------------------------------------------------------------------
print_header "RAG Services"
test_endpoint "RAG Service API" "http://localhost:3402/health" "200"
test_endpoint "LlamaIndex Query" "http://localhost:8202/health" "200"
test_endpoint "Qdrant" "http://localhost:6333/" "200"

# ------------------------------------------------------------------------------
# 9. Course Crawler Stack
# ------------------------------------------------------------------------------
print_header "Course Crawler Stack"
test_endpoint "Course Crawler API" "http://localhost:3601/health" "200"
test_endpoint "Course Crawler UI" "http://localhost:4201/" "200"

# ------------------------------------------------------------------------------
# 10. Telegram Stack
# ------------------------------------------------------------------------------
print_header "Telegram Stack"
test_endpoint "TimescaleDB (via pgAdmin)" "http://localhost:5050/" "302"
test_endpoint "Redis Master" "http://localhost:6379/" "000" # Redis doesn't speak HTTP
test_endpoint "RabbitMQ Management" "http://localhost:15672/" "200"

# ==============================================================================
# RESULTS SUMMARY
# ==============================================================================

if [[ "$FORMAT" == "json" ]]; then
  # JSON output
  echo "{"
  echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\","
  echo "  \"total\": $TOTAL_TESTS,"
  echo "  \"passed\": $PASSED_TESTS,"
  echo "  \"failed\": $FAILED_TESTS,"
  echo "  \"success_rate\": $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}"),"
  echo "  \"results\": {"

  local first=true
  for name in "${!RESULTS[@]}"; do
    IFS='|' read -r status code url <<< "${RESULTS[$name]}"

    if [[ "$first" == "true" ]]; then
      first=false
    else
      echo ","
    fi

    echo -n "    \"$name\": {\"status\": \"$status\", \"http_code\": \"$code\", \"url\": \"$url\"}"
  done

  echo ""
  echo "  }"
  echo "}"
else
  # Text output
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  SUMMARY${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  Total Tests:   ${CYAN}$TOTAL_TESTS${NC}"
  echo -e "  Passed:        ${GREEN}$PASSED_TESTS${NC}"
  echo -e "  Failed:        ${RED}$FAILED_TESTS${NC}"
  echo -e "  Success Rate:  $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
  echo ""

  if [[ $FAILED_TESTS -gt 0 ]]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  FAILED TESTS${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    for name in "${!RESULTS[@]}"; do
      IFS='|' read -r status code url <<< "${RESULTS[$name]}"

      if [[ "$status" != "PASS" ]]; then
        if [[ "$status" == "UNREACHABLE" ]]; then
          echo -e "  ${RED}✗${NC} $name - UNREACHABLE"
        else
          echo -e "  ${YELLOW}⚠${NC} $name - HTTP $code (expected success)"
        fi
        echo -e "    ${CYAN}URL:${NC} $url"
      fi
    done
    echo ""
  fi

  if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
  else
    echo -e "${YELLOW}⚠ Some tests failed. Check logs above.${NC}"
  fi
  echo ""
fi

# Exit with proper code
if [[ $FAILED_TESTS -eq 0 ]]; then
  exit 0
else
  exit 1
fi
