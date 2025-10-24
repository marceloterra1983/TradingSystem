#!/bin/bash
# TradingSystem Stack Orchestrator
# Usage:
#   bash scripts/docker/start-stacks.sh                # Start all stacks
#   bash scripts/docker/start-stacks.sh --phase data   # Start specific stack
#   bash scripts/docker/start-stacks.sh --list         # Show available phases

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

COMPOSE_CMD=()
COMPOSE_ARGS=()

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

AVAILABLE_PHASES=("infra-core" "data" "timescale" "frontend-apps" "monitoring" "docs" "infra" "langgraph-dev" "firecrawl")
PHASES_TO_START=()

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --phase <name>   Start only the specified phase (can be repeated).
                   Available phases: $(IFS=,; echo "${AVAILABLE_PHASES[*]}")
  --list           List available phases and exit.
  -h, --help       Show this help.

Without arguments, all phases are started sequentially.
EOF
}

detect_compose() {
  if command -v docker >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then
      COMPOSE_CMD=(docker compose)
      return 0
    fi
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  echo -e "${RED}❌ Docker Compose not found. Install the compose plugin or docker-compose binary first.${NC}"
  exit 1
}

compose_cmd() {
  "${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" "$@"
}

phase_exists() {
  local candidate=$1
  for phase in "${AVAILABLE_PHASES[@]}"; do
    if [[ "${candidate}" == "${phase}" ]]; then
      return 0
    fi
  done
  return 1
}

phase_label() {
  local phase=$1
  case "${phase}" in
    infra-core) echo "Infrastructure Core";;
    data) echo "Data";;
    timescale) echo "TimescaleDB";;
    frontend-apps) echo "Frontend Apps DB";;
    monitoring) echo "Monitoring";;
    docs) echo "Documentation";;
    infra) echo "Infrastructure Services";;
    langgraph-dev) echo "LangGraph Development (Port 8112)";;
    firecrawl) echo "Firecrawl";;
    *) echo "${phase}";;
  esac
}

has_compose_services() {
  local compose_file=$1
  [[ "${compose_file}" != /* ]] && compose_file="${REPO_ROOT}/${compose_file}"

  if [[ ! -f "${compose_file}" ]]; then
    return 1
  fi

  set +e
  local services
  services=$(compose_cmd -f "${compose_file}" config --services 2>/dev/null)
  local status=$?
  set -euo pipefail

  if (( status != 0 )); then
    return 1
  fi

  if [[ -z "${services//[$' \t\r\n']/}" ]]; then
    return 1
  fi

  return 0
}

ensure_network() {
  local network=$1
  if ! docker network inspect "${network}" >/dev/null 2>&1; then
    echo -e "${YELLOW}↳ Network ${network} not found. Creating...${NC}"
    if ! docker network create "${network}" >/dev/null; then
      echo -e "${RED}❌ Failed to create network ${network}.${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Network ${network} created${NC}"
  fi
}

start_phase() {
  local phase=$1

  case "${phase}" in
    infra-core)
      local compose="tools/compose/docker-compose.infra.yml"
      if has_compose_services "${compose}"; then
        compose_cmd -f "${REPO_ROOT}/${compose}" up -d
      else
        echo -e "${YELLOW}↳ No infrastructure-core services defined (skipping).${NC}"
      fi
      ;;
    data)
      ensure_network "tradingsystem_data"
      local compose="tools/compose/docker-compose.data.yml"
      if has_compose_services "${compose}"; then
        compose_cmd -f "${REPO_ROOT}/${compose}" up -d
      else
        echo -e "${YELLOW}↳ QuestDB stack retired; nothing to start for 'data'. Use --phase timescale for the new datastore.${NC}"
      fi
      ;;
    timescale)
      local compose="tools/compose/docker-compose.timescale.yml"
      if has_compose_services "${compose}"; then
        ensure_network "tradingsystem_data"
        compose_cmd -f "${REPO_ROOT}/${compose}" up -d
      else
        echo -e "${YELLOW}↳ No TimescaleDB services defined (skipping).${NC}"
      fi
      ;;
    frontend-apps)
      local compose="tools/compose/docker-compose.frontend-apps.yml"
      if has_compose_services "${compose}"; then
        ensure_network "tradingsystem_data"
        compose_cmd -f "${REPO_ROOT}/${compose}" up -d
      else
        echo -e "${YELLOW}↳ No frontend-apps services defined (skipping).${NC}"
      fi
      ;;
    monitoring)
      compose_cmd -f "${REPO_ROOT}/tools/monitoring/docker-compose.yml" up -d --build
      ;;
    docs)
      compose_cmd -f "${REPO_ROOT}/tools/compose/docker-compose.docs.yml" up -d --build
      ;;
    infra)
      compose_cmd -f "${REPO_ROOT}/tools/compose/docker-compose.infra.yml" up -d --build
      ;;
    langgraph-dev)
      echo -e "${BLUE}🔬 Starting LangGraph Development Environment${NC}"
      local compose="tools/compose/docker-compose.langgraph-dev.yml"
      if has_compose_services "${compose}"; then
        compose_cmd -f "${REPO_ROOT}/${compose}" up -d --build
        echo -e "${GREEN}✓ LangGraph dev started on port 8112${NC}"
        echo -e "${YELLOW}  Access: http://localhost:8112${NC}"
        echo -e "${YELLOW}  Studio: https://smith.langchain.com/studio (requires LANGSMITH_API_KEY)${NC}"
      else
        echo -e "${YELLOW}↳ No LangGraph dev services defined (skipping).${NC}"
      fi
      ;;
    firecrawl)
      local firecrawl_dir="${REPO_ROOT}/tools/firecrawl/firecrawl-source"
      if [[ ! -d "${firecrawl_dir}" ]]; then
        echo -e "${RED}❌ Firecrawl submodule missing at ${firecrawl_dir}.${NC}"
        echo -e "${YELLOW}Run: git submodule update --init --recursive${NC}"
        return 1
      fi
      (
        cd "${firecrawl_dir}"
        compose_cmd -f "docker-compose.yaml" up -d --build
      )
      ;;
    *)
      echo -e "${RED}❌ Unknown phase: ${phase}${NC}"
      return 1
      ;;
  esac
}

check_freeze_guard() {
  local freeze_notice="${REPO_ROOT}/FREEZE-NOTICE.md"
  if [[ "${ALLOW_FREEZE_BYPASS:-0}" == "1" ]]; then
    return
  fi

  if [[ -f "${freeze_notice}" ]]; then
    local status_line
    status_line=$(grep -i '^\*\*Status' "$freeze_notice" | head -n1 | tr -d '\r' || true)
    if [[ -n "$status_line" ]] && echo "$status_line" | grep -qiE 'ACTIVE|IN PROGRESS|ONGOING|PHASE'; then
      local clean_status="${status_line//\*\*/}"
      echo -e "${RED}❌ Operational freeze detected (${clean_status}).${NC}"
      echo -e "${YELLOW}Set ALLOW_FREEZE_BYPASS=1 to override intentionally.${NC}"
      exit 1
    fi
  fi
}

parse_args() {
  local phases=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --phase)
        shift
        [[ $# -gt 0 ]] || { echo -e "${RED}❌ --phase requires a value.${NC}"; usage; exit 1; }
        if [[ "$1" == "all" ]]; then
          phases=("${AVAILABLE_PHASES[@]}")
        else
          if ! phase_exists "$1"; then
            echo -e "${RED}❌ Unknown phase: $1${NC}"
            usage
            exit 1
          fi
          phases+=("$1")
        fi
        ;;
      --list)
        echo "Available phases:"
        for phase in "${AVAILABLE_PHASES[@]}"; do
          echo "  - ${phase} ($(phase_label "${phase}"))"
        done
        exit 0
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        usage
        exit 1
        ;;
    esac
    shift
  done

  if [[ ${#phases[@]} -eq 0 ]]; then
    phases=("${AVAILABLE_PHASES[@]}")
  fi

  PHASES_TO_START=("${phases[@]}")
}

detect_compose

if [[ -f "${ENV_FILE}" ]]; then
  COMPOSE_ARGS+=(--env-file "${ENV_FILE}")
else
  echo -e "${YELLOW}⚠️  Root .env not found at ${ENV_FILE}. Compose will use defaults.${NC}"
fi

parse_args "$@"
check_freeze_guard

total=${#PHASES_TO_START[@]}
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
if [[ ${total} -eq ${#AVAILABLE_PHASES[@]} ]]; then
  echo -e "${BLUE}  🚀 Starting TradingSystem - All Stacks${NC}"
else
  echo -e "${BLUE}  🚀 Starting TradingSystem - Selected Stacks${NC}"
fi
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

index=1
for phase in "${PHASES_TO_START[@]}"; do
  label=$(phase_label "${phase}")
  echo -e "${YELLOW}📦 Stack ${index}/${total}: ${label}...${NC}"
  if start_phase "${phase}"; then
    echo -e "${GREEN}✓ ${label} started${NC}"
  else
    echo -e "${RED}❌ Failed to start ${label}${NC}"
    exit 1
  fi

  case "${phase}" in
    data|timescale)
      echo -e "${YELLOW}⏳ Waiting for ${label} services to settle (10s)...${NC}"
      sleep 10
      ;;
  esac

  echo ""
  ((index++))
done

echo -e "${YELLOW}⏳ Waiting for services to initialize (5s)...${NC}"
sleep 5
echo ""

echo -e "${BLUE}📊 Container Status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(infra-|data-|docs-|mon-|firecrawl-|apps-|STATUS)" || true
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🌐 Access URLs${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Data:${NC}"
echo "  QuestDB API:            http://localhost:9000"
echo "  QuestDB UI:             http://localhost:9009"
echo ""
echo -e "${GREEN}Database UI Tools (TimescaleDB):${NC}"
echo "  pgAdmin:                http://localhost:5050"
echo "  pgweb:                  http://localhost:8081"
echo "  Adminer (optional):     http://localhost:8082"
echo "  Azimutt (optional):     http://localhost:8084"
echo ""
echo -e "${GREEN}Monitoring:${NC}"
echo "  Prometheus:             http://localhost:9090"
echo "  Grafana:                http://localhost:3000"
echo ""
echo -e "${GREEN}Documentation:${NC}"
echo "  Docs API:               http://localhost:3400"
echo "  Docusaurus:             http://localhost:3004"
echo ""
echo -e "${GREEN}Infrastructure Services:${NC}"
echo "  LangGraph (Production): http://localhost:8111"
echo "  LangGraph (Dev):        http://localhost:8112"
echo "  Qdrant:                 http://localhost:6333"
echo ""
echo -e "${GREEN}Firecrawl:${NC}"
echo "  Firecrawl API:          http://localhost:3002"
echo "  Firecrawl Proxy:        http://localhost:3600"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Stack startup complete${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
