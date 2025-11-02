#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Health Check Aggregator
# ==============================================================================
# Emite um payload JSON compatível com o Service Launcher e permite checagens
# específicas (ex.: Kestra) usando docker + HTTP probes simples.
# ==============================================================================

set -euo pipefail

FORMAT="json"
BASE_STATUS="healthy"
REQUESTED_SERVICES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --format)
      FORMAT="${2:-json}"
      shift 2
      ;;
    --status)
      BASE_STATUS="${2:-healthy}"
      shift 2
      ;;
    --services)
      shift
      [[ $# -gt 0 ]] || { echo "Missing value for --services"; exit 1; }
      IFS=',' read -r -a parsed <<< "$1"
      REQUESTED_SERVICES+=("${parsed[@]}")
      shift
      ;;
    *)
      shift
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -o allexport
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +o allexport
fi

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

local_services=()
overall_status="${BASE_STATUS}"
services_checked=0

append_local_service() {
  local name="$1"
  local status="$2"
  local endpoint="$3"
  local message="$4"

  local_services+=("{\"name\":\"${name}\",\"status\":\"${status}\",\"endpoint\":\"${endpoint}\",\"message\":\"${message}\"}")
  services_checked=$((services_checked + 1))
}

promote_status() {
  local service_state="$1"
  case "${service_state}" in
    healthy)
      ;;
    degraded)
      if [[ "${overall_status}" == "healthy" ]]; then
        overall_status="degraded"
      fi
      ;;
    down|unhealthy)
      overall_status="unhealthy"
      ;;
  esac
}

should_check_kestra=0
if [[ ${#REQUESTED_SERVICES[@]} -eq 0 ]]; then
  should_check_kestra=1
else
  for svc in "${REQUESTED_SERVICES[@]}"; do
    case "${svc}" in
      kestra|kestra-orchestrator)
        should_check_kestra=1
        ;;
    esac
  done
fi

check_kestra() {
  local port="${KESTRA_HTTP_PORT:-8080}"
  local management_port="${KESTRA_MANAGEMENT_PORT:-8081}"
  local base="http://localhost:${port}"
  local management_base="http://localhost:${management_port}"
  local endpoints=("${management_base}/health" "${base}/actuator/health" "${base}/health")
  local container_name="${KESTRA_CONTAINER_NAME:-tools-kestra}"
  local container_id
  container_id="$(docker ps --filter "name=^${container_name}$" --format '{{.ID}}' | head -n1 || true)"
  if [[ -z "${container_id}" ]]; then
    container_id="$(docker ps --filter 'ancestor=kestra/kestra:latest' --format '{{.ID}}' | head -n1 || true)"
  fi

  if [[ -z "${container_id}" ]]; then
    append_local_service "kestra-orchestrator" "down" "${base}" "Container not running"
    promote_status "down"
    return
  fi

  local curl_status="degraded"
  local message="Container ${container_id}"

  if command -v curl >/dev/null 2>&1; then
    for endpoint in "${endpoints[@]}"; do
      if curl -fsS --max-time 5 "${endpoint}" >/dev/null 2>&1; then
        curl_status="healthy"
        message="HTTP 200 from ${endpoint##${base}}"
        break
      fi
    done
    if [[ "${curl_status}" != "healthy" ]]; then
      message="Container ${container_id} reachable but health probe failed (tried /actuator/health, /health)"
    fi
  else
    curl_status="degraded"
    message="Container ${container_id} (curl not available for health probe)"
  fi

  append_local_service "kestra-orchestrator" "${curl_status}" "${base}" "${message}"
  promote_status "${curl_status}"
}

if (( should_check_kestra )); then
  if command -v docker >/dev/null 2>&1; then
    check_kestra || true
  else
    append_local_service "kestra-orchestrator" "unknown" "docker-unavailable" "Docker CLI not found"
    promote_status "degraded"
  fi
fi

if [[ "${FORMAT}" != "json" ]]; then
  echo "overallHealth=${overall_status}"
  exit 0
fi

local_services_json="[]"
if (( ${#local_services[@]} > 0 )); then
  local_services_json="[$(IFS=,; echo "${local_services[*]}")]"
fi

cat <<JSON
{
  "success": true,
  "overallHealth": "${overall_status}",
  "timestamp": "$(timestamp)",
  "localServices": ${local_services_json},
  "dockerContainers": [],
  "databases": [],
  "summary": {
    "allOk": $( [[ "${overall_status}" == "healthy" ]] && echo "true" || echo "false" ),
    "servicesChecked": ${services_checked},
    "containersChecked": 0,
    "databasesChecked": 0
  },
  "remediation": []
}
JSON
