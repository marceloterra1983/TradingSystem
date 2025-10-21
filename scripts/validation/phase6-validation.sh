#!/bin/bash
# Phase 6: Validation & Testing
# Container Renaming Migration - Final Validation

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
VALIDATION_LOG="${REPO_ROOT}/validation-results-${TIMESTAMP}.log"

PASSED=0
FAILED=0
WARNINGS=0
CRITICAL_FAILURE=0
TEST_FAILURE=0
INTEGRATION_FAILURE=0

declare -a SUMMARY=()

mkdir -p "${REPO_ROOT}"
touch "${VALIDATION_LOG}"
exec > >(tee -a "${VALIDATION_LOG}") 2>&1

cd "${REPO_ROOT}"

if [[ -f "${REPO_ROOT}/scripts/lib/health.sh" ]]; then
  # shellcheck source=scripts/lib/health.sh
  source "${REPO_ROOT}/scripts/lib/health.sh"
else
  echo -e "${YELLOW}⚠ Unable to locate scripts/lib/health.sh; using built-in health helpers${NC}"
fi

log_section() {
  echo -e "\n${BLUE}==> $1${NC}"
}

log_info() {
  echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
  echo -e "${GREEN}✓ ${1}${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠ ${1}${NC}"
}

log_error() {
  echo -e "${RED}✖ ${1}${NC}"
}

record_pass() {
  local message=$1
  ((PASSED++))
  SUMMARY+=("PASS | ${message}")
  log_success "${message}"
}

record_warn() {
  local message=$1
  ((WARNINGS++))
  SUMMARY+=("WARN | ${message}")
  log_warn "${message}"
}

record_fail() {
  local message=$1
  local severity=${2:-critical}
  ((FAILED++))
  SUMMARY+=("FAIL | ${message}")
  log_error "${message}"

  case "${severity}" in
    critical) CRITICAL_FAILURE=1 ;;
    test) TEST_FAILURE=1 ;;
    integration) INTEGRATION_FAILURE=1 ;;
    *) ;;
  esac
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

wait_for_http() {
  local name=$1
  local url=$2
  local severity=${3:-critical}
  local retries=${4:-12}
  local delay=${5:-5}
  local success=0

  log_info "Checking ${name} health at ${url}"

  for ((attempt=1; attempt<=retries; attempt++)); do
    if command_exists check_http_health && check_http_health "${url}" 5; then
      success=1
      break
    elif curl -fsS --max-time 5 "${url}" >/dev/null 2>&1; then
      success=1
      break
    fi

    log_info "Attempt ${attempt}/${retries} failed for ${name}; retrying in ${delay}s"
    sleep "${delay}"
  done

  if (( success )); then
    record_pass "${name} health check passed (${url})"
    return 0
  fi

  record_fail "${name} health check failed (${url})" "${severity}"
  return 1
}

wait_for_postgres() {
  local name=$1
  local host=$2
  local port=$3
  local severity=${4:-critical}
  local retries=${5:-12}
  local delay=${6:-5}
  local success=0

  if ! command_exists pg_isready; then
    record_warn "pg_isready not available; skipping ${name} readiness check"
    return 0
  fi

  log_info "Checking ${name} readiness at ${host}:${port}"

  for ((attempt=1; attempt<=retries; attempt++)); do
    if pg_isready -h "${host}" -p "${port}" -t 5 >/dev/null 2>&1; then
      success=1
      break
    fi

    log_info "pg_isready attempt ${attempt}/${retries} failed for ${name}; retrying in ${delay}s"
    sleep "${delay}"
  done

  if (( success )); then
    record_pass "${name} PostgreSQL ready (${host}:${port})"
    return 0
  fi

  record_fail "${name} PostgreSQL not ready (${host}:${port})" "${severity}"
  return 1
}

start_stack_phase() {
  local phase=$1
  local label=$2
  local orchestrator="${REPO_ROOT}/scripts/docker/start-stacks.sh"

  log_info "Starting ${label} stack via orchestrator (${phase})"

  if bash "${orchestrator}" --phase "${phase}"; then
    record_pass "${label} stack started via orchestrator"
    return 0
  fi

  record_fail "${label} stack failed to start via orchestrator"
  return 1
}

run_test_suite() {
  local name=$1
  local dir=$2
  shift 2

  log_info "Running ${name} tests in ${dir}"
  if (cd "${REPO_ROOT}/${dir}" && "$@"); then
    record_pass "${name} tests passed"
    return 0
  fi

  record_fail "${name} tests failed" "test"
  return 1
}

integration_http_check() {
  local name=$1
  local url=$2
  wait_for_http "${name}" "${url}" "integration" 6 5
}

log_section "Phase 6 - Validation & Testing"
log_info "Validation log: ${VALIDATION_LOG}"
log_info "Repository root: ${REPO_ROOT}"

log_section "Pre-flight Checks"

if docker info >/dev/null 2>&1; then
  record_pass "Docker daemon reachable"
else
  record_fail "Docker daemon not running or inaccessible"
fi

if [[ "${ALLOW_FREEZE_BYPASS:-0}" == "1" ]]; then
  record_pass "Freeze bypass enabled (ALLOW_FREEZE_BYPASS=1)"
else
  record_warn "Freeze bypass not enabled (export ALLOW_FREEZE_BYPASS=1)"
fi

if compgen -G "${REPO_ROOT}/backups/rename-containers-*" >/dev/null; then
  record_pass "Backup directory detected (backups/rename-containers-*)"
else
  record_fail "Backup directory not found (backups/rename-containers-*)" 
fi

compose_files=(
  "infrastructure/compose/docker-compose.data.yml"
  "infrastructure/monitoring/docker-compose.yml"
  "infrastructure/compose/docker-compose.docs.yml"
  "infrastructure/compose/docker-compose.infra.yml"
  "infrastructure/firecrawl/firecrawl-source/docker-compose.yaml"
)

for file in "${compose_files[@]}"; do
  if (cd "${REPO_ROOT}" && docker compose -f "${file}" config >/dev/null 2>&1); then
    record_pass "Compose file valid: ${file}"
  else
    record_fail "Compose file invalid: ${file}"
  fi
done

if [[ -f "${REPO_ROOT}/.env" ]]; then
  if grep -q "FIRECRAWL_PROXY_BASE_URL=http://localhost:3002" "${REPO_ROOT}/.env"; then
    record_pass "Root .env contains updated Firecrawl proxy URL"
  else
    record_warn "Root .env missing updated Firecrawl proxy URL (expected port 3002)"
  fi
else
  record_warn "Root .env file not found; ensure environment variables are configured"
fi

log_section "Sequential Stack Startup"

start_stack_phase "data" "Data" || true
wait_for_http "QuestDB" "http://localhost:9000/ping" || true
wait_for_postgres "TimescaleDB" "localhost" 5433 || true

start_stack_phase "monitoring" "Monitoring" || true
wait_for_http "Prometheus" "http://localhost:9090/-/healthy" || true
wait_for_http "Grafana" "http://localhost:3000/api/health" || true

start_stack_phase "docs" "Docs" || true
wait_for_http "DocsAPI" "http://localhost:3400/health" || true
wait_for_http "Docs API Viewer" "http://localhost:3101/" "integration" 6 5 || true

start_stack_phase "infra" "Infra" || true
wait_for_http "LangGraph" "http://localhost:8111/health" || true
wait_for_http "Qdrant" "http://localhost:6333/" || true
wait_for_postgres "Infra Postgres" "localhost" 5432 || true

start_stack_phase "firecrawl" "Firecrawl" || true
wait_for_http "Firecrawl API" "http://localhost:3002/v0/health/readiness" || true
wait_for_http "Firecrawl Proxy" "http://localhost:3600/health" "integration" 6 5 || true

log_info "Active containers snapshot (names and status):"
docker ps --format 'table {{.Names}}\t{{.Status}}' | sort | sed '2,$s/^/  /'
if docker ps --format '{{.Names}}' | grep -qE '^(data-|infra-|mon-|docs-|firecrawl-)'; then
  record_pass "Detected containers with expected prefixes"
else
  record_warn "No containers with expected prefixes detected"
fi

log_section "Test Suite Execution"

run_test_suite "DocsAPI" "backend/api/documentation-api" npm run test || true
run_test_suite "Dashboard" "frontend/apps/dashboard" npm run test || true
run_test_suite "Firecrawl Proxy" "backend/api/firecrawl-proxy" npm run test:integration || true
run_test_suite "LangGraph validation" "." bash infrastructure/langgraph/validate-deployment.sh || true

log_section "Integration Validation"

integration_http_check "Service Launcher health" "http://localhost:3500/health" || true

service_status_json=""
if service_status_json=$(curl -fsS --max-time 10 "http://localhost:3500/api/status" 2>/dev/null); then
  if command_exists jq; then
    if [[ -z $(echo "${service_status_json}" | jq -r '.services[] | select(.status != "ok") | .name') ]]; then
      record_pass "Service Launcher status endpoint reports all services OK"
    else
      record_fail "Service Launcher status endpoint reports degraded services" "integration"
      echo "${service_status_json}" | jq '.services[] | select(.status != "ok")' || true
    fi
  else
    record_warn "jq not available; skipping detailed Service Launcher status analysis"
  fi
else
  record_fail "Service Launcher status endpoint unreachable" "integration"
fi

integration_http_check "Firecrawl Proxy health" "http://localhost:3600/health" || true
if curl -fsS --max-time 20 -H "Content-Type: application/json" -d '{"url":"https://example.com"}' \
  "http://localhost:3600/api/scrape" >/dev/null 2>&1; then
  record_pass "Firecrawl proxy can reach Firecrawl API (scrape request succeeded)"
else
  record_fail "Firecrawl proxy failed scrape request to Firecrawl API" "integration"
fi

dashboard_html=""
if dashboard_html=$(curl -fsS --max-time 10 "http://localhost:3103/" 2>/dev/null); then
  record_pass "Dashboard accessible on http://localhost:3103/"
  if [[ "${dashboard_html}" == *"Firecrawl"* && "${dashboard_html}" == *"Apps"* ]]; then
    record_pass "Dashboard UI displays Firecrawl and Apps labels"
  else
    record_fail "Dashboard UI missing expected Firecrawl/Apps labels" "integration"
  fi
else
  record_warn "Dashboard not reachable on http://localhost:3103/ (ensure dashboard is running)"
fi

log_section "Container Name Verification"

legacy_names=(
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
  "docs-documentation-api"
  "frontend-apps-db"
  "infra-postgres"
  "infra-qdrant"
  "infra-questdb"
)

for name in "${legacy_names[@]}"; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    record_fail "Legacy container still present: ${name}"
  else
    record_pass "Legacy container not found: ${name}"
  fi
done

prefixes=("data-" "infra-" "mon-" "docs-" "firecrawl-" "individual-")

for prefix in "${prefixes[@]}"; do
  count=$(docker ps --format '{{.Names}}' | grep -c "^${prefix}" || true)
  if [[ "${count}" -gt 0 ]]; then
    record_pass "Found ${count} containers with prefix ${prefix}"
  else
    record_warn "No running containers detected with prefix ${prefix}"
  fi
done

expected_containers=(
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

for container in "${expected_containers[@]}"; do
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    record_pass "Container running: ${container}"
  else
    record_fail "Container not running: ${container}"
  fi
done

log_section "Summary"
log_info "Passed: ${PASSED}"
log_info "Failed: ${FAILED}"
log_info "Warnings: ${WARNINGS}"

echo -e "\nDetails:"
for entry in "${SUMMARY[@]}"; do
  case "${entry}" in
    PASS*) echo -e "${GREEN}${entry}${NC}" ;;
    WARN*) echo -e "${YELLOW}${entry}${NC}" ;;
    FAIL*) echo -e "${RED}${entry}${NC}" ;;
    *) echo "${entry}" ;;
  esac
done

log_info "Validation log saved to ${VALIDATION_LOG}"

if (( CRITICAL_FAILURE )); then
  log_error "Validation completed with critical failures"
  exit 1
fi

if (( TEST_FAILURE )); then
  log_error "Validation completed with test failures"
  exit 2
fi

if (( INTEGRATION_FAILURE )); then
  log_error "Validation completed with integration failures"
  exit 3
fi

log_success "Phase 6 validation completed successfully"
exit 0
