#!/bin/bash
# Comprehensive health check orchestrator for TradingSystem
# Description : Enterprise-grade health reporter with remediation guidance and monitoring output
# Version     : 1.0.0
# Author      : TradingSystem Automation Team
# Last Edited : 2025-10-18

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"
# shellcheck source=scripts/lib/health.sh
source "$SCRIPT_DIR/../lib/health.sh"

PROJECT_ROOT=$(get_project_root)

if [[ -f "$PROJECT_ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$PROJECT_ROOT/.env"
    set +a
fi

declare -A SERVICE_PATHS=(
    ["Dashboard"]="frontend/dashboard"
    ["Workspace API"]="backend/api/workspace"
    ["TP Capital"]="apps/tp-capital"
    ["B3 Market Data"]="apps/b3-market-data"
    ["Documentation API"]="backend/api/documentation-api"
    ["Status API"]="apps/status"
    ["Firecrawl Proxy"]="backend/api/firecrawl-proxy"
    ["WebScraper API"]="backend/api/webscraper-api"
    ["Docusaurus"]="docs"
)

declare -A STACK_COMPOSE_FILES=(
    ["data-timescale"]="tools/compose/docker-compose.timescale.yml"
    ["monitoring"]="tools/monitoring/docker-compose.yml"
    ["docs"]="tools/compose/docker-compose.docs.yml"
    ["infra"]="tools/compose/docker-compose.infra.yml"
    ["firecrawl"]="tools/firecrawl/firecrawl-source/docker-compose.yaml"
)

declare -a CRITICAL_SERVICES=("timescaledb" "Service Launcher" "Dashboard")
declare -a REMEDIATION_TARGETS=()
declare -A REMEDIATION_MAP=()
declare -A LATENCY_PERCENTILES=()

REMEDIATION_DOC="docs/context/ops/health-monitoring.md"

OUTPUT_FORMAT="text"
VERBOSE_MODE=false
CHECK_SERVICES=true
CHECK_CONTAINERS=true
CHECK_DATABASES=true

OVERALL_HEALTH_STATUS="healthy"
OVERALL_EXIT_CODE=0

show_help() {
    cat <<'EOF'
Usage: health-check-all.sh [OPTIONS]

Options:
  --format [text|json|prometheus]   Output format (default: text)
  --verbose                         Include detailed process information where available
  --services-only                   Check only local services
  --containers-only                 Check only docker containers
  --help                            Show this help message

Examples:
  health-check-all.sh                          # Full check with text output
  health-check-all.sh --format json            # JSON output for automation
  health-check-all.sh --format prometheus      # Prometheus metrics
  health-check-all.sh --services-only          # Check only local services
  health-check-all.sh --containers-only        # Check only Docker containers
  health-check-all.sh --verbose --format text  # Detailed text report
EOF
}

add_remediation() {
    local target=$1
    local message=$2
    if [[ -z "${REMEDIATION_MAP[$target]:-}" ]]; then
        REMEDIATION_MAP["$target"]="$message"
        REMEDIATION_TARGETS+=("$target")
    else
        REMEDIATION_MAP["$target"]+=$'\n'"$message"
    fi
}

calculate_percentile() {
    local percentile=$1
    shift
    local -a values=("$@")

    if [[ ${#values[@]} -eq 0 ]]; then
        printf "0.000000"
        return 0
    fi

    local -a sorted=()
    mapfile -t sorted < <(printf '%s\n' "${values[@]}" | LC_ALL=C sort -n)
    local count=${#sorted[@]}

    local pos
    pos=$(awk -v p="$percentile" -v c="$count" 'BEGIN { printf "%.6f", (p/100)*(c-1) }')
    local lower_index
    lower_index=$(awk -v pos="$pos" 'BEGIN { printf "%d", int(pos) }')
    local upper_index=$lower_index
    if (( upper_index < count - 1 )); then
        upper_index=$((lower_index + 1))
    fi
    local weight
    weight=$(awk -v pos="$pos" -v lower="$lower_index" 'BEGIN { printf "%.6f", pos - lower }')

    local lower_value=${sorted[$lower_index]}
    local upper_value=${sorted[$upper_index]}

    local result
    result=$(awk -v l="$lower_value" -v u="$upper_value" -v w="$weight" 'BEGIN { printf "%.6f", l + (u - l) * w }')
    printf '%s' "$result"
}

collect_latency_values() {
    local source_name=$1
    local target_name=$2
    declare -n source_ref="$source_name"
    declare -n target_ref="$target_name"
    target_ref=()

    for entry in "${source_ref[@]}"; do
        IFS='|' read -r _ _ value <<< "$entry"
        if [[ -n "${value:-}" ]]; then
            target_ref+=("$value")
        fi
    done
}

calculate_overall_health() {
    local has_issue=false
    local has_critical=false

    declare -A critical_lookup=()
    for critical in "${CRITICAL_SERVICES[@]}"; do
        critical_lookup["$critical"]=1
    done

    if [[ "$CHECK_SERVICES" == true ]]; then
        for entry in "${HEALTH_LOCAL_RESULTS[@]}"; do
            IFS='|' read -r name status _ _ health <<< "$entry"
            if [[ "$status" == "down" || "$status" == "unknown" ]]; then
                has_issue=true
                if [[ -n "${critical_lookup[$name]:-}" ]]; then
                    has_critical=true
                fi
            fi
            if [[ "$health" == "unhealthy" ]]; then
                has_issue=true
                if [[ -n "${critical_lookup[$name]:-}" ]]; then
                    has_critical=true
                fi
            fi
        done
    fi

    if [[ "$CHECK_CONTAINERS" == true ]]; then
        for entry in "${HEALTH_DOCKER_RESULTS[@]}"; do
            IFS='|' read -r name status health group service <<< "$entry"
            if [[ "$name" == "docker" ]]; then
                has_issue=true
                has_critical=true
                continue
            fi
            if [[ "$status" == "restarting" || "$status" == "dead" || "$status" == "exited" ]]; then
                has_issue=true
                if [[ "$name" == "data-timescaledb" ]]; then
                    has_critical=true
                fi
            elif [[ "$status" != "running" && "$status" != "created" ]]; then
                has_issue=true
            fi
            if [[ "$health" == "unhealthy" && "$name" == "data-timescaledb" ]]; then
                has_issue=true
                has_critical=true
            elif [[ "$health" == "unhealthy" ]]; then
                has_issue=true
            fi
        done
    fi

    if [[ "$CHECK_DATABASES" == true ]]; then
        for entry in "${HEALTH_DATABASE_RESULTS[@]}"; do
            IFS='|' read -r name status _ _ <<< "$entry"
            if [[ "$status" != "up" ]]; then
                has_issue=true
                if [[ "$name" == "timescaledb" ]]; then
                    has_critical=true
                fi
            fi
        done
    fi

    if [[ "$has_critical" == true ]]; then
        OVERALL_HEALTH_STATUS="critical"
        OVERALL_EXIT_CODE=2
    elif [[ "$has_issue" == true ]]; then
        OVERALL_HEALTH_STATUS="degraded"
        OVERALL_EXIT_CODE=1
    else
        OVERALL_HEALTH_STATUS="healthy"
        OVERALL_EXIT_CODE=0
    fi
}

generate_remediation_suggestions() {
    REMEDIATION_TARGETS=()
    REMEDIATION_MAP=()
    local suggestions_added=false

    if [[ "$CHECK_SERVICES" == true ]]; then
        for entry in "${HEALTH_LOCAL_RESULTS[@]}"; do
            IFS='|' read -r name status port pid health <<< "$entry"
            case "$status" in
                down)
                    local path="${SERVICE_PATHS[$name]:-}"
                    local start_cmd="Start service: cd $PROJECT_ROOT/${path:-<service_path>} && npm run dev"
                    add_remediation "$name" "$start_cmd"
                    add_remediation "$name" "Inspect process logs under $PROJECT_ROOT/logs (if available)."
                    add_remediation "$name" "Check port usage: lsof -i :${port} || ss -tulpn | grep ${port}"
                    suggestions_added=true
                    ;;
                unhealthy)
                    add_remediation "$name" "Verify health endpoint http://localhost:${port} response."
                    add_remediation "$name" "Review recent logs for errors impacting health checks."
                    add_remediation "$name" "Restart service process if issues persist."
                    suggestions_added=true
                    ;;
                unknown)
                    add_remediation "$name" "Confirm required port tooling (lsof/ss/netstat) is installed."
                    add_remediation "$name" "Verify service at http://localhost:${port} responds successfully."
                    suggestions_added=true
                    ;;
            esac
            if [[ "$health" == "unhealthy" ]]; then
                add_remediation "$name" "Investigate failing health endpoint and restart service if needed."
                suggestions_added=true
            fi
        done
    fi

    if [[ "$CHECK_CONTAINERS" == true ]]; then
        for entry in "${HEALTH_DOCKER_RESULTS[@]}"; do
            IFS='|' read -r name status health group service <<< "$entry"
            if [[ "$name" == "docker" ]]; then
                add_remediation "Docker Engine" "Ensure Docker daemon is running and accessible."
                suggestions_added=true
                continue
            fi

            if [[ "$status" == "running" || "$status" == "created" ]] && [[ "$health" != "unhealthy" ]]; then
                continue
            fi

            local target="${service:-$name} (container)"
            add_remediation "$target" "Inspect logs: docker logs ${name} --tail=200"
            if [[ "$status" == "exited" || "$status" == "dead" ]]; then
                add_remediation "$target" "Restart container: docker restart ${name}"
            elif [[ "$status" == "restarting" ]]; then
                add_remediation "$target" "Check crash loop logs and environment configuration."
            elif [[ "$status" != "running" ]]; then
                add_remediation "$target" "Start container: docker start ${name}"
            fi

            local compose_file="${STACK_COMPOSE_FILES[$group]:-}"
            if [[ -n "$compose_file" ]]; then
                add_remediation "$target" "Recreate stack: docker compose -f $compose_file up -d"
            fi
            add_remediation "$target" "Stack launcher: scripts/docker/start-stacks.sh --phase ${group:-<stack_name>}"
            if [[ "$health" == "unhealthy" ]]; then
                add_remediation "$target" "Review container healthcheck command output for root causes."
            fi
            suggestions_added=true
        done
    fi

    if [[ "$CHECK_DATABASES" == true ]]; then
        for entry in "${HEALTH_DATABASE_RESULTS[@]}"; do
            IFS='|' read -r name status host port <<< "$entry"
            if [[ "$status" == "down" ]]; then
                add_remediation "${name^} (database)" "Start database stack: docker compose -f ${STACK_COMPOSE_FILES["data-timescale"]} up -d"
                add_remediation "${name^} (database)" "Validate connectivity: pg_isready -h ${host} -p ${port}"
                suggestions_added=true
            elif [[ "$status" == "unknown" ]]; then
                add_remediation "${name^} (database)" "Confirm pg_isready or Docker health checks are available on this host."
                suggestions_added=true
            fi
        done
    fi

    if [[ "$suggestions_added" == true ]]; then
        add_remediation "Documentation" "Consult $REMEDIATION_DOC for detailed troubleshooting playbooks."
    fi
}

build_remediation_json() {
    if [[ ${#REMEDIATION_TARGETS[@]} -eq 0 ]]; then
        printf '[]'
        return 0
    fi
    local json="["
    local first=true
    for target in "${REMEDIATION_TARGETS[@]}"; do
        local messages="${REMEDIATION_MAP[$target]}"
        local -a lines=()
        IFS=$'\n' read -r -d '' -a lines <<< "${messages}"$'\0'
        local suggestion_str="["
        local msg_first=true
        for line in "${lines[@]}"; do
            [[ -z "$line" ]] && continue
            local escaped=$(health_escape_json "$line")
            if [[ "$msg_first" == true ]]; then
                suggestion_str+="\"$escaped\""
                msg_first=false
            else
                suggestion_str+=",\"$escaped\""
            fi
        done
        suggestion_str+="]"
        local escaped_target
        escaped_target=$(health_escape_json "$target")
        local entry
        entry=$(printf '{"target":"%s","actions":%s}' "$escaped_target" "$suggestion_str")
        if [[ "$first" == true ]]; then
            json+="$entry"
            first=false
        else
            json+=",$entry"
        fi
    done
    json+="]"
    printf '%s' "$json"
}

print_remediation_text() {
    if [[ ${#REMEDIATION_TARGETS[@]} -eq 0 ]]; then
        return
    fi

    echo ""
    echo "Remediation Suggestions:"
    for target in "${REMEDIATION_TARGETS[@]}"; do
        echo "  - $target"
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            echo "    • $line"
        done <<< "${REMEDIATION_MAP[$target]}"
    done
}

compute_latency_percentiles() {
    local -a service_values=()
    local -a container_values=()
    local -a database_values=()
    local -a all_values=()

    collect_latency_values "HEALTH_LOCAL_LATENCIES" service_values
    collect_latency_values "HEALTH_DOCKER_LATENCIES" container_values
    collect_latency_values "HEALTH_DATABASE_LATENCIES" database_values
    all_values=("${service_values[@]}" "${container_values[@]}" "${database_values[@]}")

    LATENCY_PERCENTILES["services_p50"]=$(calculate_percentile 50 "${service_values[@]}")
    LATENCY_PERCENTILES["services_p95"]=$(calculate_percentile 95 "${service_values[@]}")
    LATENCY_PERCENTILES["services_p99"]=$(calculate_percentile 99 "${service_values[@]}")

    LATENCY_PERCENTILES["containers_p50"]=$(calculate_percentile 50 "${container_values[@]}")
    LATENCY_PERCENTILES["containers_p95"]=$(calculate_percentile 95 "${container_values[@]}")
    LATENCY_PERCENTILES["containers_p99"]=$(calculate_percentile 99 "${container_values[@]}")

    LATENCY_PERCENTILES["databases_p50"]=$(calculate_percentile 50 "${database_values[@]}")
    LATENCY_PERCENTILES["databases_p95"]=$(calculate_percentile 95 "${database_values[@]}")
    LATENCY_PERCENTILES["databases_p99"]=$(calculate_percentile 99 "${database_values[@]}")

    LATENCY_PERCENTILES["overall_p50"]=$(calculate_percentile 50 "${all_values[@]}")
    LATENCY_PERCENTILES["overall_p95"]=$(calculate_percentile 95 "${all_values[@]}")
    LATENCY_PERCENTILES["overall_p99"]=$(calculate_percentile 99 "${all_values[@]}")
}

append_prometheus_extras() {
    compute_latency_percentiles
    printf '# HELP tradingsystem_health_latency_percentile_seconds Latency percentiles for health checks\n'
    printf '# TYPE tradingsystem_health_latency_percentile_seconds gauge\n'
    for scope in services containers databases overall; do
        local p50=${LATENCY_PERCENTILES["${scope}_p50"]}
        local p95=${LATENCY_PERCENTILES["${scope}_p95"]}
        local p99=${LATENCY_PERCENTILES["${scope}_p99"]}
        printf 'tradingsystem_health_latency_percentile_seconds{scope="%s",percentile="50"} %s\n' "$scope" "$p50"
        printf 'tradingsystem_health_latency_percentile_seconds{scope="%s",percentile="95"} %s\n' "$scope" "$p95"
        printf 'tradingsystem_health_latency_percentile_seconds{scope="%s",percentile="99"} %s\n' "$scope" "$p99"
    done
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --format)
                OUTPUT_FORMAT=$2
                shift 2
                ;;
            --verbose)
                VERBOSE_MODE=true
                shift
                ;;
            --services-only)
                CHECK_SERVICES=true
                CHECK_CONTAINERS=false
                CHECK_DATABASES=false
                shift
                ;;
            --containers-only)
                CHECK_SERVICES=false
                CHECK_CONTAINERS=true
                CHECK_DATABASES=false
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown argument: $1"
                show_help
                exit 1
                ;;
        esac
    done

    if [[ "$OUTPUT_FORMAT" != "text" && "$OUTPUT_FORMAT" != "json" && "$OUTPUT_FORMAT" != "prometheus" ]]; then
        log_error "Invalid format: $OUTPUT_FORMAT"
        exit 1
    fi

    export HEALTH_TRACK_LATENCY=true
    export HEALTH_OVERALL_STATUS="healthy"
}

main() {
    parse_arguments "$@"

    local service_rc=0
    local container_rc=0
    local database_rc=0

    if [[ "$CHECK_SERVICES" == true ]]; then
        if [[ "$VERBOSE_MODE" == true ]]; then
            export HEALTH_PARALLEL=false
            export HEALTH_PARALLEL_WORKERS=1
        fi
        check_all_local_services || service_rc=$?
    fi

    if [[ "$CHECK_CONTAINERS" == true ]]; then
        check_all_docker_stacks || container_rc=$?
    fi

    if [[ "$CHECK_DATABASES" == true ]]; then
        check_database_connectivity || database_rc=$?
    fi

    calculate_overall_health
    export HEALTH_OVERALL_STATUS="$OVERALL_HEALTH_STATUS"
    generate_remediation_suggestions

    local summary_args=(--format "$OUTPUT_FORMAT")
    if [[ "$VERBOSE_MODE" == true && "$OUTPUT_FORMAT" == "text" ]]; then
        summary_args+=(--detailed)
    fi

    local summary_output
    summary_output=$(generate_health_summary "${summary_args[@]}")

    case "$OUTPUT_FORMAT" in
        text)
            printf '%s\n' "$summary_output"
            print_remediation_text
            ;;
        json)
            local remediation_json
            remediation_json=$(build_remediation_json)
            local escaped_status
            escaped_status=$(health_escape_json "$OVERALL_HEALTH_STATUS")
            local json_output
            json_output=$(python3 - "$summary_output" "$escaped_status" "$remediation_json" <<'PY'
import json
import sys

base = json.loads(sys.argv[1])
overall = sys.argv[2]
remediation = json.loads(sys.argv[3])

base["overallHealth"] = overall
base["remediation"] = remediation

print(json.dumps(base, ensure_ascii=False, indent=2))
PY
)
            printf '%s\n' "$json_output"
            ;;
        prometheus)
            printf '%s\n' "$summary_output"
            append_prometheus_extras
            ;;
    esac

    exit "$OVERALL_EXIT_CODE"
}

main "$@"
