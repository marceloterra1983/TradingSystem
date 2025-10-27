#!/bin/bash
# Health check functions for TradingSystem services
# Usage: source "$(dirname "$0")/lib/health.sh"
#
# Provides:
#   - HTTP health checks
#   - MCP server health checks
#   - Container health checks
#
# Author: TradingSystem Team
# Last Modified: 2025-10-18
# Based on: tools/scripts/health-checks.sh

# Prevent multiple sourcing
[[ -n "${_HEALTH_SH_LOADED:-}" ]] && return 0
readonly _HEALTH_SH_LOADED=1

# Source common if not already loaded
if [[ -z "${_COMMON_SH_LOADED:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # shellcheck source=scripts/lib/common.sh
    source "$SCRIPT_DIR/common.sh"
fi

# Global health configuration
: "${HEALTH_TIMEOUT_SECONDS:=3}"
: "${HEALTH_PARALLEL_WORKERS:=4}"

declare -a HEALTH_LOCAL_RESULTS=()
declare -a HEALTH_DOCKER_RESULTS=()
declare -a HEALTH_DATABASE_RESULTS=()
declare -a HEALTH_LOCAL_LATENCIES=()
declare -a HEALTH_DOCKER_LATENCIES=()
declare -a HEALTH_DATABASE_LATENCIES=()

__health_measure_latency() {
    local __result_var=$1
    shift

    local start using_ns=false
    local start_cmd="date +%s%N"
    if date +%s%N >/dev/null 2>&1; then
        start=$($start_cmd)
        using_ns=true
    else
        start=$(date +%s)
    fi

    "$@"
    local rc=$?

    local end
    if [[ "$using_ns" == true ]]; then
        end=$($start_cmd)
        local delta=$((end - start))
        local duration="0"
        if command_exists awk; then
            duration=$(awk -v ns="$delta" 'BEGIN { printf "%.6f", ns / 1000000000 }')
        else
            duration=0
        fi
        printf -v "$__result_var" '%s' "$duration"
    else
        end=$(date +%s)
        local delta=$((end - start))
        local duration="0"
        if command_exists awk; then
            duration=$(awk -v sec="$delta" 'BEGIN { printf "%.6f", sec }')
        else
            duration=$delta
        fi
        printf -v "$__result_var" '%s' "$duration"
    fi

    return $rc
}

health_escape_prom_label() {
    local s=${1//\\/\\\\}
    s=${s//\"/\\\"}
    printf '%s' "$s"
}

__health_pg_isready() {
    local host=$1
    local port=$2
    local user=$3
    local timeout=${4:-5}
    pg_isready -h "$host" -p "$port" -U "$user" -t "$timeout" >/dev/null 2>&1
}

DEFAULT_LOCAL_SERVICES=(
    "Dashboard|VITE_PORT|3103|"
    "Status|SERVICE_LAUNCHER_PORT|3500|/health"
    "Documentation API|DOCUMENTATION_API_PORT|3400|/health"
    "Docusaurus|DOCUSAURUS_PORT|3205|"
    "TP Capital|TP_CAPITAL_PORT|4005|/health"
    "Workspace|WORKSPACE_PORT|3200|/health"
    "Firecrawl Proxy|FIRECRAWL_PROXY_PORT|3600|/health"
)

# HTTP health check with timeout
# Args: $1 - URL, $2 - timeout in seconds (default: HEALTH_TIMEOUT_SECONDS)
# Returns: 0 if healthy (HTTP 200-299), 1 otherwise
check_http_health() {
    local url=$1
    local timeout=${2:-$HEALTH_TIMEOUT_SECONDS}

    if ! command_exists curl; then
        log_warning "curl not available for health check"
        return 1
    fi

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")

    if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
        return 0
    fi

    log_debug "HTTP health check failed: $url (HTTP $http_code)"
    return 1
}

# Check MCP server health using multiple fallback endpoints
# Args: $1 - port number
# Returns: 0 if healthy, 1 if unhealthy
check_mcp_health() {
    local port=$1

    if ! command_exists curl; then
        log_warning "curl not available - cannot perform MCP health checks"
        return 1
    fi

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_TIMEOUT_SECONDS" "http://localhost:${port}/messages/" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "401" ]] || [[ "$http_code" == "405" ]]; then
        return 0
    fi

    if curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "http://localhost:${port}/health" >/dev/null 2>&1; then
        return 0
    fi

    if curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "http://localhost:${port}/api/status" >/dev/null 2>&1; then
        return 0
    fi

    return 1
}

# Get MCP health status with detailed HTTP code
# Args: $1 - port number
# Returns: Status string or error code
get_mcp_health_detail() {
    local port=$1

    if ! command_exists curl; then
        echo "no-curl"
        return 1
    fi

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_TIMEOUT_SECONDS" "http://localhost:${port}/messages/" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "401" ]] || [[ "$http_code" == "405" ]]; then
        echo "messages-${http_code}"
        return 0
    fi

    if curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "http://localhost:${port}/health" >/dev/null 2>&1; then
        echo "health"
        return 0
    fi

    if curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "http://localhost:${port}/api/status" >/dev/null 2>&1; then
        echo "status"
        return 0
    fi

    echo "failed-${http_code}"
    return 1
}

# Check if Docker container is healthy
# Args: $1 - container name or ID
# Returns: 0 if healthy, 1 otherwise
check_container_health() {
    local container=$1

    if ! command_exists docker; then
        log_warning "docker not available for health check"
        return 1
    fi

    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        log_debug "Container not running: $container"
        return 1
    fi

    local health_status
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

    if [[ "$health_status" == "healthy" ]] || [[ "$health_status" == "none" ]]; then
        return 0
    fi

    log_debug "Container unhealthy: $container (status: $health_status)"
    return 1
}

# Check TimescaleDB health (primary datastore)
# Returns: 0 if healthy, 1 otherwise
check_timescaledb_health() {
    local host=${TIMESCALEDB_HOST:-localhost}
    local port=${TIMESCALEDB_PORT:-5433}

    if command_exists pg_isready; then
        if pg_isready -h "${host}" -p "${port}" -t 5 >/dev/null 2>&1; then
            return 0
        fi
    fi

    check_container_health "data-timescaledb"
}

# Backwards compatibility shim (QuestDB removed)
check_questdb_health() {
    log_warning "check_questdb_health is deprecated; falling back to check_timescaledb_health"
    check_timescaledb_health
}

# Resolve port from environment variable with fallback
# Args: $1 - environment variable name, $2 - default port
resolve_port() {
    local env_var=$1
    local default_port=$2
    local value="${!env_var:-}"

    if [[ -n "$value" ]]; then
        echo "$value"
    else
        echo "$default_port"
    fi
}

# Internal helper to evaluate local service health without logging
# Args: $1 - service name, $2 - port, $3 - optional health endpoint
# Output: status|pid|health|port_rc
__health_evaluate_local_service() {
    local service_name=$1
    local port=$2
    local health_endpoint=${3:-}
    local latency_enabled=false
    local port_latency="0"
    local http_latency_total="0"
    local latency_value=""

    if [[ -z "${_PORTCHECK_SH_LOADED:-}" ]]; then
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        # shellcheck source=scripts/lib/portcheck.sh
        source "$script_dir/portcheck.sh"
    fi

    local port_checker
    port_checker=$(detect_port_checker)

    local port_rc=1

    if [[ "${HEALTH_TRACK_LATENCY:-false}" == "true" ]]; then
        latency_enabled=true
        __health_measure_latency port_latency is_port_in_use "$port" "$port_checker"
        port_rc=$?
    else
        is_port_in_use "$port" "$port_checker"
        port_rc=$?
    fi

    local status="down"
    local health="unknown"
    local pid=""
    local rc=1

    case "$port_rc" in
        0)
            status="running"
            pid=$(get_port_pids "$port" "$port_checker" | head -1 2>/dev/null || true)
            if [[ -n "$health_endpoint" ]]; then
                local http_rc=1
                if [[ "$latency_enabled" == true ]]; then
                    local http_latency="0"
                    __health_measure_latency http_latency check_http_health "http://localhost:${port}${health_endpoint}" "$HEALTH_TIMEOUT_SECONDS"
                    http_rc=$?
                    if command_exists awk; then
                        http_latency_total=$(awk -v total="$http_latency_total" -v add="$http_latency" 'BEGIN { printf "%.6f", total + add }')
                    else
                        http_latency_total=$http_latency
                    fi
                else
                    check_http_health "http://localhost:${port}${health_endpoint}" "$HEALTH_TIMEOUT_SECONDS"
                    http_rc=$?
                fi
                if [[ $http_rc -eq 0 ]]; then
                    status="healthy"
                    health="healthy"
                    rc=0
                else
                    status="unhealthy"
                    health="unhealthy"
                    rc=1
                fi
            else
                rc=0
            fi
            ;;
        1)
            status="down"
            rc=1
            ;;
        2)
            status="unknown"
            rc=1
            if [[ -n "$health_endpoint" ]]; then
                local http_rc=1
                if [[ "$latency_enabled" == true ]]; then
                    local http_latency="0"
                    __health_measure_latency http_latency check_http_health "http://localhost:${port}${health_endpoint}" "$HEALTH_TIMEOUT_SECONDS"
                    http_rc=$?
                    if command_exists awk; then
                        http_latency_total=$(awk -v total="$http_latency_total" -v add="$http_latency" 'BEGIN { printf "%.6f", total + add }')
                    else
                        http_latency_total=$http_latency
                    fi
                else
                    check_http_health "http://localhost:${port}${health_endpoint}" "$HEALTH_TIMEOUT_SECONDS"
                    http_rc=$?
                fi
                if [[ $http_rc -eq 0 ]]; then
                    status="healthy"
                    health="healthy"
                    rc=0
                fi
            fi
            ;;
    esac

    if [[ "$latency_enabled" == true ]]; then
        if command_exists awk; then
            latency_value=$(awk -v port="$port_latency" -v http="$http_latency_total" 'BEGIN { printf "%.6f", port + http }')
        else
            latency_value=$port_latency
        fi
    fi

    echo "${status}|${pid:-}|${health}|${port_rc}|${latency_value}"
    return $rc
}

# Check service health by port with optional HTTP endpoint
# Args: $1 - service name, $2 - port, $3 - optional health endpoint
# Output: Prints status message
check_service_health() {
    local service_name=$1
    local port=$2
    local health_endpoint=${3:-}

    local evaluation
    evaluation=$(__health_evaluate_local_service "$service_name" "$port" "$health_endpoint")
    local rc=$?
    IFS='|' read -r status _ health port_rc <<< "$evaluation"

    if [[ "$port_rc" == "2" ]]; then
        log_warning "$service_name (port $port) - Port availability indeterminate (install lsof/ss/netstat for precise checks)"
        if [[ "$status" == "healthy" ]]; then
            log_success "$service_name (port $port) - HEALTHY (verified via HTTP)"
            return 0
        fi
        log_warning "$service_name (port $port) - STATUS UNKNOWN"
        return 1
    fi

    case "$status" in
        healthy)
            log_success "$service_name (port $port) - HEALTHY"
            ;;
        running)
            log_success "$service_name (port $port) - RUNNING"
            ;;
        unhealthy)
            log_warning "$service_name (port $port) - RUNNING but health check failed"
            ;;
        down)
            log_error "$service_name (port $port) - NOT RUNNING"
            ;;
        *)
            log_warning "$service_name (port $port) - STATUS UNKNOWN"
            ;;
    esac

    return $rc
}

# Check all configured local services
# Args: Optional list of definitions (name|env_var|default_port|health_endpoint)
# Populates HEALTH_LOCAL_RESULTS and returns non-zero on unhealthy/down/unknown
check_all_local_services() {
    local definitions=("$@")
    [[ ${#definitions[@]} -eq 0 ]] && definitions=("${DEFAULT_LOCAL_SERVICES[@]}")

    HEALTH_LOCAL_RESULTS=()
    HEALTH_LOCAL_LATENCIES=()
    local overall_rc=0

    if [[ "${HEALTH_PARALLEL:-false}" == "true" ]]; then
        local tmpdir
        tmpdir=$(mktemp -d 2>/dev/null || mktemp -d -t health_local)
        local -a pids=()
        local idx=0
        local max_workers=${HEALTH_PARALLEL_WORKERS:-4}

        for entry in "${definitions[@]}"; do
            IFS='|' read -r name env_var default_port health_endpoint <<< "$entry"
            [[ -z "$name" ]] && continue
            while [[ "$max_workers" -gt 0 && $(jobs -pr | wc -l 2>/dev/null | tr -d ' ') -ge "$max_workers" ]]; do
                local oldest
                oldest=$(jobs -pr | head -n1)
                if [[ -z "$oldest" ]]; then
                    break
                fi
                if ! wait "$oldest"; then
                    overall_rc=1
                fi
            done
            (
                local port
                port=$(resolve_port "$env_var" "$default_port")
                local evaluation
                evaluation=$(__health_evaluate_local_service "$name" "$port" "$health_endpoint")
                local rc=$?
                printf '%s|%s|%s\n' "$name" "$port" "$evaluation" > "$tmpdir/$idx"
                exit $rc
            ) &
            pids+=("$!:$idx")
            ((idx++))
        done

        for pid_info in "${pids[@]}"; do
            IFS=':' read -r pid index <<< "$pid_info"
            if ! wait "$pid"; then
                overall_rc=1
            fi
        done

        for ((i=0; i<idx; i++)); do
            if [[ -f "$tmpdir/$i" ]]; then
                local line
                line=$(<"$tmpdir/$i")
                IFS='|' read -r name port status pid health port_rc latency <<< "$line"
                HEALTH_LOCAL_RESULTS+=("$name|$status|$port|$pid|$health")
                if [[ "${HEALTH_TRACK_LATENCY:-false}" == "true" && -n "$latency" ]]; then
                    HEALTH_LOCAL_LATENCIES+=("$name|$port|$latency")
                fi
                if [[ "$status" == "down" || "$status" == "unhealthy" || "$status" == "unknown" ]]; then
                    overall_rc=1
                fi
            fi
        done

        rm -rf "$tmpdir"
    else
        for entry in "${definitions[@]}"; do
            IFS='|' read -r name env_var default_port health_endpoint <<< "$entry"
            [[ -z "$name" ]] && continue
            local port
            port=$(resolve_port "$env_var" "$default_port")
            local evaluation
            evaluation=$(__health_evaluate_local_service "$name" "$port" "$health_endpoint")
            local rc=$?
            IFS='|' read -r status pid health _ latency <<< "$evaluation"
            HEALTH_LOCAL_RESULTS+=("$name|$status|$port|$pid|$health")
            if [[ "${HEALTH_TRACK_LATENCY:-false}" == "true" && -n "$latency" ]]; then
                HEALTH_LOCAL_LATENCIES+=("$name|$port|$latency")
            fi
            if [[ "$status" == "down" || "$status" == "unhealthy" || "$status" == "unknown" ]]; then
                overall_rc=1
            fi
            (( rc != 0 )) && overall_rc=1
        done
    fi

    return $overall_rc
}

__health_process_docker_inspect_line() {
    local line=$1
    [[ -z "$line" ]] && return 2

    IFS='|' read -r raw_name stack_label service_label compose_project compose_service status health <<< "$line"
    local name="${raw_name#/}"
    local stack="${stack_label//<no value>/}"
    local service="${service_label//<no value>/}"
    local project="${compose_project//<no value>/}"
    local compose_service_name="${compose_service//<no value>/}"
    local container_status="${status//<no value>/}"
    local health_status="${health//<no value>/}"

    local include=false
    if [[ -n "$stack" ]]; then
        include=true
    elif [[ -n "$project" ]]; then
        if [[ "$project" == tradingsystem* || "$project" == firecrawl* || "$project" == infra* || "$project" == infrastructure* || "$project" == monitoring* || "$project" == docs* || "$project" == documentation* || "$project" == services* || "$project" == data* || "$project" == database* ]]; then
            include=true
        fi
    elif [[ "$name" == firecrawl-* ]]; then
        include=true
    fi

    if [[ "$include" == false ]]; then
        return 2
    fi

    if [[ -z "$stack" && "$name" == firecrawl-* ]]; then
        stack="firecrawl"
    fi

    local group_key
    # Priorizar agrupamento por nome do container sobre stack/project
    if [[ "$name" == data-* ]] || [[ "$name" == timescaledb-* ]]; then
        group_key="database"
    elif [[ "$name" == docs-* ]]; then
        group_key="documentation"
    elif [[ "$name" == firecrawl-* ]]; then
        group_key="firecrawl"
    elif [[ "$name" == mon-* ]]; then
        group_key="monitoring"
    elif [[ "$name" == infra-* ]]; then
        group_key="infrastructure"
    elif [[ -n "$stack" ]]; then
        group_key="$stack"
    elif [[ -n "$project" ]]; then
        group_key="$project"
    else
        group_key="individual"
    fi

    local display_service
    if [[ -n "$service" ]]; then
        display_service="$service"
    elif [[ -n "$compose_service_name" ]]; then
        display_service="$compose_service_name"
    else
        display_service="$name"
    fi

    echo "$name|$container_status|$health_status|$group_key|$display_service"

    if [[ "$container_status" == "restarting" || "$container_status" == "dead" || "$container_status" == "exited" ]]; then
        return 1
    elif [[ "$container_status" != "running" && "$container_status" != "created" ]]; then
        return 1
    fi

    if [[ "$health_status" == "unhealthy" ]]; then
        return 1
    fi

    return 0
}

# Check all docker stacks and containers
# Populates HEALTH_DOCKER_RESULTS with name|status|health|groupKey|serviceName
check_all_docker_stacks() {
    HEALTH_DOCKER_RESULTS=()
    HEALTH_DOCKER_LATENCIES=()

    if ! command_exists docker; then
        HEALTH_DOCKER_RESULTS+=("docker|unavailable|||system")
        return 1
    fi

    local overall_rc=0
    declare -A seen_containers=()

    if declare -p STACK_COMPOSE_FILES >/dev/null 2>&1; then
        local project_root=""
        if command_exists get_project_root; then
            project_root=$(get_project_root)
        fi

        for stack in "${!STACK_COMPOSE_FILES[@]}"; do
            local compose_rel="${STACK_COMPOSE_FILES[$stack]}"
            [[ -z "$compose_rel" ]] && continue

            local compose_path="$compose_rel"
            if [[ ! -f "$compose_path" && -n "$project_root" ]]; then
                compose_path="$project_root/$compose_rel"
            fi
            if [[ ! -f "$compose_path" ]]; then
                continue
            fi

            local compose_output=""
            local compose_latency=""
            local compose_rc=0
            if [[ "${HEALTH_TRACK_LATENCY:-false}" == "true" ]]; then
                if compose_output=$(__health_measure_latency compose_latency docker compose -f "$compose_path" ps --format json); then
                    compose_rc=0
                else
                    compose_rc=$?
                fi
            else
                if compose_output=$(docker compose -f "$compose_path" ps --format json); then
                    compose_rc=0
                else
                    compose_rc=$?
                fi
            fi

            if [[ $compose_rc -ne 0 ]]; then
                HEALTH_DOCKER_RESULTS+=("$stack|compose_error|unknown|$stack|$stack")
                overall_rc=1
                continue
            fi

            if [[ -z "${compose_output// }" ]]; then
                continue
            fi

            local parsed_output=""
            parsed_output=$(python3 - "$stack" "$compose_output" <<'PY'
import json, sys

stack = sys.argv[1]
payload = sys.argv[2].strip()

if not payload:
    sys.exit(0)

try:
    data = json.loads(payload)
except json.JSONDecodeError:
    sys.exit(3)

if isinstance(data, dict):
    candidates = None
    for key in ("containers", "Containers", "services", "Services"):
        value = data.get(key)
        if value:
            candidates = value
            break
    if candidates is None:
        data = []
    elif isinstance(candidates, dict):
        data = list((candidates or {}).values())
    else:
        data = candidates
elif not isinstance(data, list):
    data = []

rows = []
for item in data:
    if not item:
        continue
    name = item.get("Name") or item.get("name") or ""
    service = item.get("Service") or item.get("service") or name

    raw_state = item.get("State") or item.get("state")
    status = ""
    health = item.get("Health") or item.get("health") or ""

    if isinstance(raw_state, dict):
        status = raw_state.get("Status") or raw_state.get("status") or ""
        inner_health = raw_state.get("Health") or raw_state.get("health")
        if inner_health:
            health = inner_health
    elif isinstance(raw_state, str):
        status = raw_state
    else:
        status = item.get("Status") or item.get("status") or ""

    if isinstance(health, dict):
        health = health.get("Status") or health.get("status") or ""

    rows.append("|".join([name, status, health, stack, service]))

print("\n".join(rows), end="")
PY
)
            local parse_rc=$?
            if [[ $parse_rc -ne 0 ]]; then
                HEALTH_DOCKER_RESULTS+=("$stack|compose_parse_error|unknown|$stack|$stack")
                overall_rc=1
                continue
            fi

            if [[ -z "$parsed_output" ]]; then
                continue
            fi

            while IFS= read -r line; do
                [[ -z "$line" ]] && continue
                IFS='|' read -r cname cstatus chealth cgroup cservice <<< "$line"
                [[ -z "$cname" ]] && continue
                [[ -z "$cstatus" ]] && cstatus="unknown"
                [[ -z "$chealth" ]] && chealth="unknown"
                HEALTH_DOCKER_RESULTS+=("$cname|$cstatus|$chealth|$cgroup|$cservice")
                seen_containers["$cname"]=1
                if [[ "${HEALTH_TRACK_LATENCY:-false}" == "true" && -n "$compose_latency" ]]; then
                    HEALTH_DOCKER_LATENCIES+=("$cname|$cgroup|$compose_latency")
                fi
                if [[ "$cstatus" == "restarting" || "$cstatus" == "dead" || "$cstatus" == "exited" ]]; then
                    overall_rc=1
                elif [[ "$cstatus" != "running" && "$cstatus" != "created" ]]; then
                    overall_rc=1
                fi
                if [[ "$chealth" == "unhealthy" ]]; then
                    overall_rc=1
                fi
            done <<< "$parsed_output"
        done
    fi

    local docker_lines
    if ! docker_lines=$(docker ps -a --format '{{.Names}}' 2>/dev/null); then
        HEALTH_DOCKER_RESULTS+=("docker|error|||system")
        return 1
    fi

    if [[ -z "$docker_lines" ]]; then
        return $overall_rc
    fi

    mapfile -t docker_names <<< "$docker_lines"
    local -a remaining=()
    for name in "${docker_names[@]}"; do
        [[ -z "$name" ]] && continue
        if [[ -n "${seen_containers[$name]:-}" ]]; then
            continue
        fi
        remaining+=("$name")
    done

    if [[ ${#remaining[@]} -eq 0 ]]; then
        return $overall_rc
    fi

    local inspect_format='{{.Name}}|{{index .Config.Labels "com.tradingsystem.stack"}}|{{index .Config.Labels "com.tradingsystem.service"}}|{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.service"}}|{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}'
    mapfile -t inspect_data < <(docker inspect --format "$inspect_format" "${remaining[@]}" 2>/dev/null || true)

    if [[ ${#inspect_data[@]} -eq 0 ]]; then
        return $overall_rc
    fi

    for line in "${inspect_data[@]}"; do
        [[ -z "$line" ]] && continue

        local processed=""
        local latency=""
        local rc_local=0
        if [[ "${HEALTH_TRACK_LATENCY:-false}" == "true" ]]; then
            processed=$(__health_measure_latency latency __health_process_docker_inspect_line "$line")
            rc_local=$?
        else
            processed=$(__health_process_docker_inspect_line "$line")
            rc_local=$?
        fi

        if [[ $rc_local -eq 2 ]]; then
            continue
        fi

        [[ -z "$processed" ]] && continue

        HEALTH_DOCKER_RESULTS+=("$processed")

        if [[ "${HEALTH_TRACK_LATENCY:-false}" == "true" && -n "$latency" ]]; then
            IFS='|' read -r latency_name _ _ latency_group _ <<< "$processed"
            HEALTH_DOCKER_LATENCIES+=("$latency_name|$latency_group|$latency")
        fi

        if [[ $rc_local -ne 0 ]]; then
            overall_rc=1
        fi
    done

    return $overall_rc
}

# Check TimescaleDB connectivity with pg_isready when available
check_database_connectivity() {
    HEALTH_DATABASE_RESULTS=()
    HEALTH_DATABASE_LATENCIES=()
    local host=${TIMESCALEDB_HOST:-localhost}
    local port=${TIMESCALEDB_PORT:-5433}
    local user=${TIMESCALEDB_USER:-timescale}

    if command_exists pg_isready; then
        local latency="0"
        local pg_rc=1
        if [[ "${HEALTH_TRACK_LATENCY:-false}" == "true" ]]; then
            __health_measure_latency latency __health_pg_isready "$host" "$port" "$user" 5
            pg_rc=$?
            HEALTH_DATABASE_LATENCIES+=("timescaledb|$host|$latency")
        else
            __health_pg_isready "$host" "$port" "$user" 5
            pg_rc=$?
        fi

        if [[ $pg_rc -eq 0 ]]; then
            HEALTH_DATABASE_RESULTS+=("timescaledb|up|$host|$port")
            return 0
        fi
        HEALTH_DATABASE_RESULTS+=("timescaledb|down|$host|$port")
        return 1
    fi

    local latency="0"
    local rc=1
    if [[ "${HEALTH_TRACK_LATENCY:-false}" == "true" ]]; then
        __health_measure_latency latency check_timescaledb_health
        rc=$?
        HEALTH_DATABASE_LATENCIES+=("timescaledb|$host|$latency")
    else
        if check_timescaledb_health; then
            rc=0
        else
            rc=1
        fi
    fi

    if [[ $rc -eq 0 ]]; then
        HEALTH_DATABASE_RESULTS+=("timescaledb|unknown|$host|$port")
        return 0
    fi

    HEALTH_DATABASE_RESULTS+=("timescaledb|down|$host|$port")
    return 1
}

# Escape string for JSON output
health_escape_json() {
    local s=${1//\\/\\\\}
    s=${s//\"/\\\"}
    s=${s//$'\n'/\\n}
    printf '%s' "$s"
}

# Generate health summary in text or JSON format
generate_health_summary() {
    local format="text"
    local detailed=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --format)
                format=$2
                shift 2
                ;;
            --detailed)
                detailed=true
                shift
                ;;
            *)
                log_error "generate_health_summary: unknown argument $1"
                return 1
                ;;
        esac
    done

    local all_ok=true
    local has_issue=false

    for entry in "${HEALTH_LOCAL_RESULTS[@]}"; do
        IFS='|' read -r _ status _ _ health <<< "$entry"
        if [[ "$status" == "down" || "$status" == "unhealthy" || "$status" == "unknown" ]]; then
            all_ok=false
            has_issue=true
        fi
        if [[ "$health" == "unhealthy" ]]; then
            all_ok=false
            has_issue=true
        fi
    done

    for entry in "${HEALTH_DOCKER_RESULTS[@]}"; do
        IFS='|' read -r name status health _ _ <<< "$entry"
        if [[ "$name" == "docker" ]]; then
            all_ok=false
            has_issue=true
            continue
        fi
        if [[ "$status" == "restarting" || "$status" == "dead" || "$status" == "exited" ]]; then
            all_ok=false
            has_issue=true
        elif [[ "$status" != "running" && "$status" != "created" ]]; then
            all_ok=false
            has_issue=true
        fi
        if [[ "$health" == "unhealthy" ]]; then
            all_ok=false
            has_issue=true
        fi
    done

    for entry in "${HEALTH_DATABASE_RESULTS[@]}"; do
        IFS='|' read -r _ status _ _ <<< "$entry"
        if [[ "$status" != "up" && "$status" != "unknown" ]]; then
            all_ok=false
            has_issue=true
        fi
    done

    local all_ok_str="false"
    [[ "$all_ok" == true ]] && all_ok_str="true"

    local computed_health="healthy"
    if [[ "$has_issue" == true ]]; then
        computed_health="degraded"
    fi
    local overall_health="${HEALTH_OVERALL_STATUS:-$computed_health}"

    declare -A local_latency_map=()
    for entry in "${HEALTH_LOCAL_LATENCIES[@]}"; do
        IFS='|' read -r lname lport lvalue <<< "$entry"
        [[ -z "$lname" ]] && continue
        local_latency_map["$lname|$lport"]="$lvalue"
    done

    declare -A docker_latency_map=()
    for entry in "${HEALTH_DOCKER_LATENCIES[@]}"; do
        IFS='|' read -r dname dgroup dvalue <<< "$entry"
        [[ -z "$dname" ]] && continue
        docker_latency_map["$dname|$dgroup"]="$dvalue"
    done

    declare -A database_latency_map=()
    for entry in "${HEALTH_DATABASE_LATENCIES[@]}"; do
        IFS='|' read -r dbname dbhost dbvalue <<< "$entry"
        [[ -z "$dbname" ]] && continue
        database_latency_map["$dbname|$dbhost"]="$dbvalue"
    done

    case "$format" in
        json)
            echo "{"
            echo '  "localServices": ['
            local first=true
            for entry in "${HEALTH_LOCAL_RESULTS[@]}"; do
                IFS='|' read -r name status port pid health <<< "$entry"
                if [[ "$first" == true ]]; then
                    first=false
                else
                    echo ","
                fi
                local latency_key="$name|$port"
                local latency_value="${local_latency_map[$latency_key]:-}"
                local latency_json="null"
                if [[ -n "$latency_value" ]]; then
                    latency_json="$latency_value"
                fi
                printf '    {"name":"%s","status":"%s","port":"%s","pid":"%s","health":"%s","latencySeconds":%s}' \
                    "$(health_escape_json "$name")" \
                    "$(health_escape_json "$status")" \
                    "$(health_escape_json "$port")" \
                    "$(health_escape_json "${pid:-}")" \
                    "$(health_escape_json "${health:-unknown}")" \
                    "$latency_json"
            done
            echo
            echo '  ],'
            echo '  "dockerContainers": ['
            first=true
            for entry in "${HEALTH_DOCKER_RESULTS[@]}"; do
                IFS='|' read -r name status health group service <<< "$entry"
                if [[ "$first" == true ]]; then
                    first=false
                else
                    echo ","
                fi
                local docker_latency_key="$name|$group"
                local docker_latency_value="${docker_latency_map[$docker_latency_key]:-}"
                local docker_latency_json="null"
                if [[ -n "$docker_latency_value" ]]; then
                    docker_latency_json="$docker_latency_value"
                fi
                printf '    {"name":"%s","status":"%s","health":"%s","group":"%s","serviceName":"%s","latencySeconds":%s}' \
                    "$(health_escape_json "$name")" \
                    "$(health_escape_json "$status")" \
                    "$(health_escape_json "${health:-unknown}")" \
                    "$(health_escape_json "${group:-}")" \
                    "$(health_escape_json "${service:-}")" \
                    "$docker_latency_json"
            done
            echo
            echo '  ],'
            echo '  "databases": ['
            first=true
            for entry in "${HEALTH_DATABASE_RESULTS[@]}"; do
                IFS='|' read -r name status host port <<< "$entry"
                if [[ "$first" == true ]]; then
                    first=false
                else
                    echo ","
                fi
                local db_latency_key="$name|$host"
                local db_latency_value="${database_latency_map[$db_latency_key]:-}"
                local db_latency_json="null"
                if [[ -n "$db_latency_value" ]]; then
                    db_latency_json="$db_latency_value"
                fi
                printf '    {"name":"%s","status":"%s","host":"%s","port":"%s","latencySeconds":%s}' \
                    "$(health_escape_json "$name")" \
                    "$(health_escape_json "$status")" \
                    "$(health_escape_json "$host")" \
                    "$(health_escape_json "$port")" \
                    "$db_latency_json"
            done
            echo
            printf '  ],\n  "summary": {"allOk": %s}\n' "$all_ok_str"
            echo "}"
            return 0
            ;;
        prometheus)
            local timestamp
            timestamp=$(date +%s)

            printf '# HELP tradingsystem_service_up Service availability status (1=up, 0=down)\n'
            printf '# TYPE tradingsystem_service_up gauge\n'
            for entry in "${HEALTH_LOCAL_RESULTS[@]}"; do
                IFS='|' read -r name status port pid health <<< "$entry"
                local up_value=0
                case "$status" in
                    healthy|running)
                        up_value=1
                        ;;
                esac
                printf 'tradingsystem_service_up{name="%s",port="%s"} %s\n' \
                    "$(health_escape_prom_label "$name")" \
                    "$(health_escape_prom_label "$port")" \
                    "$up_value"
            done

            printf '# HELP tradingsystem_service_health_status Service health status labeled metric (1=reported status)\n'
            printf '# TYPE tradingsystem_service_health_status gauge\n'
            for entry in "${HEALTH_LOCAL_RESULTS[@]}"; do
                IFS='|' read -r name status _ _ _ <<< "$entry"
                printf 'tradingsystem_service_health_status{name="%s",status="%s"} 1\n' \
                    "$(health_escape_prom_label "$name")" \
                    "$(health_escape_prom_label "$status")"
            done

            printf '# HELP tradingsystem_service_health_check_duration_seconds Service health check duration in seconds\n'
            printf '# TYPE tradingsystem_service_health_check_duration_seconds gauge\n'
            for entry in "${HEALTH_LOCAL_LATENCIES[@]}"; do
                IFS='|' read -r lname lport lvalue <<< "$entry"
                local latency_value="${lvalue:-0}"
                printf 'tradingsystem_service_health_check_duration_seconds{name="%s",port="%s"} %s\n' \
                    "$(health_escape_prom_label "$lname")" \
                    "$(health_escape_prom_label "$lport")" \
                    "$latency_value"
            done

            printf '# HELP tradingsystem_container_up Docker container running status (1=running, 0=down)\n'
            printf '# TYPE tradingsystem_container_up gauge\n'
            for entry in "${HEALTH_DOCKER_RESULTS[@]}"; do
                IFS='|' read -r name status health group service <<< "$entry"
                if [[ "$name" == "docker" ]]; then
                    continue
                fi
                local up_value=0
                if [[ "$status" == "running" || "$status" == "created" ]]; then
                    up_value=1
                fi
                printf 'tradingsystem_container_up{name="%s",stack="%s",service="%s"} %s\n' \
                    "$(health_escape_prom_label "$name")" \
                    "$(health_escape_prom_label "${group:-}")" \
                    "$(health_escape_prom_label "${service:-}")" \
                    "$up_value"
            done

            printf '# HELP tradingsystem_container_health_status Container health status labeled metric (1=reported status)\n'
            printf '# TYPE tradingsystem_container_health_status gauge\n'
            for entry in "${HEALTH_DOCKER_RESULTS[@]}"; do
                IFS='|' read -r name status health group service <<< "$entry"
                if [[ "$name" == "docker" ]]; then
                    continue
                fi
                local label="${health:-$status}"
                printf 'tradingsystem_container_health_status{name="%s",stack="%s",service="%s",status="%s"} 1\n' \
                    "$(health_escape_prom_label "$name")" \
                    "$(health_escape_prom_label "${group:-}")" \
                    "$(health_escape_prom_label "${service:-}")" \
                    "$(health_escape_prom_label "$label")"
            done

            printf '# HELP tradingsystem_container_health_check_duration_seconds Container health check duration in seconds\n'
            printf '# TYPE tradingsystem_container_health_check_duration_seconds gauge\n'
            for entry in "${HEALTH_DOCKER_LATENCIES[@]}"; do
                IFS='|' read -r cname cgroup cvalue <<< "$entry"
                local latency_value="${cvalue:-0}"
                printf 'tradingsystem_container_health_check_duration_seconds{name="%s",stack="%s"} %s\n' \
                    "$(health_escape_prom_label "$cname")" \
                    "$(health_escape_prom_label "${cgroup:-}")" \
                    "$latency_value"
            done

            printf '# HELP tradingsystem_database_up Database availability status (1=up, 0=down)\n'
            printf '# TYPE tradingsystem_database_up gauge\n'
            for entry in "${HEALTH_DATABASE_RESULTS[@]}"; do
                IFS='|' read -r name status host port <<< "$entry"
                local up_value=0
                if [[ "$status" == "up" || "$status" == "unknown" ]]; then
                    up_value=1
                fi
                printf 'tradingsystem_database_up{name="%s",host="%s",port="%s"} %s\n' \
                    "$(health_escape_prom_label "$name")" \
                    "$(health_escape_prom_label "$host")" \
                    "$(health_escape_prom_label "$port")" \
                    "$up_value"
            done

            printf '# HELP tradingsystem_database_health_check_duration_seconds Database health check duration in seconds\n'
            printf '# TYPE tradingsystem_database_health_check_duration_seconds gauge\n'
            for entry in "${HEALTH_DATABASE_LATENCIES[@]}"; do
                IFS='|' read -r dname dhost dvalue <<< "$entry"
                local latency_value="${dvalue:-0}"
                printf 'tradingsystem_database_health_check_duration_seconds{name="%s",host="%s"} %s\n' \
                    "$(health_escape_prom_label "$dname")" \
                    "$(health_escape_prom_label "$dhost")" \
                    "$latency_value"
            done

            printf '# HELP tradingsystem_overall_health Overall health status indicator (1=reported status)\n'
            printf '# TYPE tradingsystem_overall_health gauge\n'
            printf 'tradingsystem_overall_health{status="%s"} 1\n' \
                "$(health_escape_prom_label "$overall_health")"

            printf '# HELP tradingsystem_health_check_timestamp_seconds Unix timestamp of last health check execution\n'
            printf '# TYPE tradingsystem_health_check_timestamp_seconds gauge\n'
            printf 'tradingsystem_health_check_timestamp_seconds %s\n' "$timestamp"

            return 0
            ;;
        text)
            if [[ ${#HEALTH_LOCAL_RESULTS[@]} -gt 0 ]]; then
                echo -e "${COLOR_BLUE}📊 Local Services:${COLOR_NC}"
                for entry in "${HEALTH_LOCAL_RESULTS[@]}"; do
                    IFS='|' read -r name status port pid health <<< "$entry"
                    local printed_with_pid=false
                    case "$status" in
                        healthy)
                            printf "  %-25s ${COLOR_GREEN}✓ HEALTHY${COLOR_NC} (PID: %s, Port: %s)\n" "$name" "${pid:-unknown}" "$port"
                            printed_with_pid=true
                            ;;
                        running)
                            printf "  %-25s ${COLOR_GREEN}✓ RUNNING${COLOR_NC} (PID: %s, Port: %s)\n" "$name" "${pid:-unknown}" "$port"
                            printed_with_pid=true
                            ;;
                        unhealthy)
                            printf "  %-25s ${COLOR_YELLOW}⚠ UNHEALTHY${COLOR_NC} (PID: %s, Port: %s)\n" "$name" "${pid:-unknown}" "$port"
                            printed_with_pid=true
                            ;;
                        down)
                            printf "  %-25s ${COLOR_RED}✗ DOWN${COLOR_NC} (Port: %s)\n" "$name" "$port"
                            continue
                            ;;
                        *)
                            printf "  %-25s ${COLOR_YELLOW}⚠ UNKNOWN${COLOR_NC} (Port: %s)\n" "$name" "$port"
                            continue
                            ;;
                    esac

                    if [[ "$detailed" == "true" && "$printed_with_pid" == true && -n "$pid" ]]; then
                        local details
                        details=$(ps -p "$pid" -o %cpu,%mem,etime,cmd --no-headers 2>/dev/null | head -1 | awk '{print $1"% CPU, "$2"% MEM, uptime "$3}')
                        if [[ -n "$details" ]]; then
                            printf "    Details: %s\n" "$details"
                        fi
                    fi

                    if [[ "$detailed" == "true" ]]; then
                        local latency_key="$name|$port"
                        local latency_value="${local_latency_map[$latency_key]:-}"
                        if [[ -n "$latency_value" ]]; then
                            printf "    Latency: %.3fs\n" "$latency_value"
                        fi
                    fi
                done
                echo ""
            fi

            echo -e "${COLOR_BLUE}🐳 Docker Containers:${COLOR_NC}"
            local docker_state=""
            local -a docker_filtered=()
            for entry in "${HEALTH_DOCKER_RESULTS[@]}"; do
                IFS='|' read -r name status health group service <<< "$entry"
                if [[ "$name" == "docker" ]]; then
                    docker_state="$status"
                    continue
                fi
                docker_filtered+=("$entry")
            done

            case "$docker_state" in
                unavailable)
                    printf "  ${COLOR_YELLOW}Docker command not available${COLOR_NC}\n"
                    ;;
                error)
                    printf "  ${COLOR_RED}Unable to query Docker daemon${COLOR_NC}\n"
                    ;;
            esac

            if [[ ${#docker_filtered[@]} -eq 0 ]]; then
                if [[ -z "$docker_state" ]]; then
                    printf "  ${COLOR_YELLOW}No TradingSystem containers running${COLOR_NC}\n"
                fi
            else
                declare -A group_entries=()
                declare -A group_order=()
                local order=0

                for entry in "${docker_filtered[@]}"; do
                    IFS='|' read -r name status health group service <<< "$entry"
                    group_entries["$group"]+="$name|$status|$health|$service"$'\n'
                    if [[ -z "${group_order[$group]:-}" ]]; then
                        group_order["$group"]=$order
                        ((order++))
                    fi
                done

                mapfile -t sorted_groups < <(
                    for key in "${!group_order[@]}"; do
                        printf '%s|%s\n' "${group_order[$key]}" "$key"
                    done | sort -t'|' -k1n | cut -d'|' -f2
                )

                for group in "${sorted_groups[@]}"; do
                    [[ -z "$group" ]] && continue
                    local display_name
                    case "$group" in
                        "database")
                            display_name="database"
                            ;;
                        "documentation")
                            display_name="documentation"
                            ;;
                        "firecrawl")
                            display_name="firecrawl"
                            ;;
                        "infrastructure")
                            display_name="infrastructure"
                            ;;
                        "monitoring")
                            display_name="monitoring"
                            ;;
                        "individual")
                            display_name="individual"
                            ;;
                        *)
                            display_name="$group"
                            ;;
                    esac
                    printf "  ${COLOR_BLUE}%s${COLOR_NC}\n" "$display_name"

                    while IFS='|' read -r name status health service; do
                        [[ -z "$name" ]] && continue
                        
                        # Determinar status simplificado: UP ou DOWN
                        local simple_status badge color
                        if [[ "$status" == "running" ]]; then
                            simple_status="UP"
                            badge="✓"
                            color=$COLOR_GREEN
                        else
                            simple_status="DOWN"
                            badge="✗"
                            color=$COLOR_RED
                        fi
                        
                        # Extrair portas do container
                        local ports
                        ports=$(docker ps -a --filter "name=^${name}$" --format '{{.Ports}}' 2>/dev/null | head -1)
                        
                        # Simplificar exibição de portas (pegar apenas portas externas)
                        local port_display=""
                        if [[ -n "$ports" ]]; then
                            # Extrair portas no formato 0.0.0.0:PORT ou 127.0.0.1:PORT
                            local external_ports
                            external_ports=$(echo "$ports" | grep -oE '0\.0\.0\.0:[0-9]+|127\.0\.0\.1:[0-9]+' | sed 's/.*://' | tr '\n' ',' | sed 's/,$//')
                            if [[ -n "$external_ports" ]]; then
                                port_display="Port: $external_ports"
                            else
                                port_display="Port: internal"
                            fi
                        else
                            port_display="Port: none"
                        fi
                        
                        echo -e "    $(printf '%-30s' "$service") $color$badge $(printf '%-6s' "$simple_status")$COLOR_NC  $(printf '%-20s' "$port_display")"
                    done <<< "${group_entries[$group]}"

                    echo ""
                done
            fi

            if [[ ${#HEALTH_DATABASE_RESULTS[@]} -gt 0 ]]; then
                echo -e "${COLOR_BLUE}🗄️ Databases:${COLOR_NC}"
                for entry in "${HEALTH_DATABASE_RESULTS[@]}"; do
                    IFS='|' read -r name status host port <<< "$entry"
                    case "$status" in
                        up)
                            printf "  %-18s ${COLOR_GREEN}✓ UP${COLOR_NC} (Host: %s, Port: %s)\n" "$name" "$host" "$port"
                            ;;
                        unknown)
                            printf "  %-18s ${COLOR_YELLOW}⚠ UNKNOWN${COLOR_NC} (Host: %s, Port: %s)\n" "$name" "$host" "$port"
                            ;;
                        *)
                            printf "  %-18s ${COLOR_RED}✗ DOWN${COLOR_NC} (Host: %s, Port: %s)\n" "$name" "$host" "$port"
                            ;;
                    esac
                    if [[ "$detailed" == "true" ]]; then
                        local latency_key="$name|$host"
                        local latency_value="${database_latency_map[$latency_key]:-}"
                        if [[ -n "$latency_value" ]]; then
                            printf "    Latency: %.3fs\n" "$latency_value"
                        fi
                    fi
                done
                echo ""
            fi

            return 0
            ;;
        *)
            log_error "generate_health_summary: unsupported format '$format'"
            return 1
            ;;
    esac

    return 0
}

# Export functions
export -f check_http_health check_mcp_health get_mcp_health_detail
export -f check_container_health check_timescaledb_health check_questdb_health
export -f check_service_health resolve_port check_all_local_services
export -f check_all_docker_stacks check_database_connectivity generate_health_summary
