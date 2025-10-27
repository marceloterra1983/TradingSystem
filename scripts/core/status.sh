#!/bin/bash
# TradingSystem - Service Status Checker
# Checks status of all local services and Docker containers
#
# Usage: scripts/services/status.sh [OPTIONS]
#   --detailed      Show detailed process information
#   --json          Output in JSON format
#   --help          Show this help
#
# Author: TradingSystem Team
# Last Modified: 2025-10-18

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"
# shellcheck source=scripts/lib/portcheck.sh
source "$SCRIPT_DIR/../lib/portcheck.sh"
# shellcheck source=scripts/lib/health.sh
source "$SCRIPT_DIR/../lib/health.sh"
# shellcheck source=scripts/lib/docker.sh
source "$SCRIPT_DIR/../lib/docker.sh"
# shellcheck source=scripts/lib/pidfile.sh
source "$SCRIPT_DIR/../lib/pidfile.sh"

# shellcheck disable=SC2034  # PROJECT_ROOT used by sourced libraries
PROJECT_ROOT=$(get_project_root)

# Show help
show_help() {
    cat << EOF
TradingSystem Status Checker

Usage: $(basename "$0") [OPTIONS]

Checks the status of all TradingSystem services (local and Docker).

Options:
  --detailed      Show detailed process information (CPU, memory, etc.)
  --json          Output status in JSON format
  --skip-dependency-check  Skip validation of local service -> container dependencies
  --help          Show this help message

Examples:
  $(basename "$0")            # Quick status check
  $(basename "$0") --detailed # Detailed information
  $(basename "$0") --json     # JSON output for automation

Exit Codes:
  0  All expected services are running
  1  Some services are not running

EOF
}

# Parse arguments
DETAILED=false
JSON_OUTPUT=false
DEPENDENCY_CHECK=true
declare -a DEPENDENCY_ISSUES=()
declare -a LOCAL_DOCKER_DEPENDENCIES=(
  "Workspace:data-timescaledb"
  "TP Capital:data-timescaledb"
  "WebScraper:data-timescaledb"
  "Firecrawl Proxy:firecrawl-api,firecrawl-playwright,firecrawl-redis,firecrawl-postgres"
)

while [[ $# -gt 0 ]]; do
    case $1 in
        --detailed) DETAILED=true; shift ;;
        --json) JSON_OUTPUT=true; shift ;;
        --skip-dependency-check) DEPENDENCY_CHECK=false; shift ;;
        --help) show_help; exit 0 ;;
        *) log_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

map_docker_health() {
    declare -gA DOCKER_DEP_STATE=()
    for entry in "${HEALTH_DOCKER_RESULTS[@]}"; do
        IFS='|' read -r raw_name status health group service <<< "$entry"
        name="${raw_name#/}"
        [[ -z "$name" ]] && continue
        state="ok"
        if [[ "$status" != "running" && "$status" != "created" ]]; then
            state="$status"
        elif [[ "$health" == "unhealthy" ]]; then
            state="unhealthy"
        fi
        DOCKER_DEP_STATE["$name"]="$state"
    done
}

evaluate_dependency_issues() {
    local -A local_status=()
    for entry in "${HEALTH_LOCAL_RESULTS[@]}"; do
        IFS='|' read -r name status port pid health <<< "$entry"
        [[ -z "$name" ]] && continue
        local_status["$name"]="$status"
    done

    map_docker_health

    for mapping in "${LOCAL_DOCKER_DEPENDENCIES[@]}"; do
        IFS=':' read -r service deps <<< "$mapping"
        [[ -z "$service" || -z "$deps" ]] && continue

        status="${local_status[$service]:-unknown}"
        if [[ "$status" == "down" || "$status" == "unknown" ]]; then
            continue
        fi

        IFS=',' read -ra containers <<< "$deps"
        for container in "${containers[@]}"; do
            dep="${container//[[:space:]]/}"
            [[ -z "$dep" ]] && continue
            state="${DOCKER_DEP_STATE[$dep]:-missing}"
            if [[ "$state" != "ok" ]]; then
                DEPENDENCY_ISSUES+=("$service dependency '${dep}' reports: $state")
            fi
        done
    done

    if [[ ${#DEPENDENCY_ISSUES[@]} -gt 0 ]]; then
        return 1
    fi
    return 0
}

main() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        section "TradingSystem - Service Status"
    fi

    local local_rc=0
    local docker_rc=0
    local db_rc=0

    # Disable errexit temporarily for health checks and summary generation
    set +e
    
    check_all_local_services || local_rc=1
    check_all_docker_stacks || docker_rc=1
    check_database_connectivity || db_rc=1

    local dependency_rc=0
    if [[ "$DEPENDENCY_CHECK" == "true" ]]; then
        evaluate_dependency_issues || dependency_rc=1
    fi

    local overall_rc=0
    if (( local_rc != 0 || docker_rc != 0 || db_rc != 0 || dependency_rc != 0 )); then
        overall_rc=1
    fi

    if [[ "$JSON_OUTPUT" == "true" ]]; then
        generate_health_summary --format json
        if [[ "$DEPENDENCY_CHECK" == "true" && ${#DEPENDENCY_ISSUES[@]} -gt 0 ]]; then
            {
                echo "Dependency issues detected:" >&2
                for issue in "${DEPENDENCY_ISSUES[@]}"; do
                    echo "  - $issue" >&2
                done
            }
        fi
    else
        if [[ "$DETAILED" == "true" ]]; then
            generate_health_summary --format text --detailed
        else
            generate_health_summary --format text
        fi
        echo ""
        if (( overall_rc == 0 )); then
            log_success "All services are running!"
        else
            log_warning "Some services are not running"
            echo ""
            echo "💡 Tips:"
            echo "  Start local services: scripts/services/start-all.sh"
            echo "  Start Docker stacks:  scripts/docker/start-stacks.sh"
            echo "  Diagnose issues:      scripts/services/diagnose.sh"
            echo "  Build images:         scripts/docker/build-images.sh"
            echo "  Retag image:          scripts/services/tag-image.sh <name> <source>"
            echo "  Pull img-* tags:      scripts/services/pull-images.sh"
            if [[ "$DEPENDENCY_CHECK" == "true" && ${#DEPENDENCY_ISSUES[@]} -gt 0 ]]; then
                echo ""
                log_warning "Dependency checks:"
                for issue in "${DEPENDENCY_ISSUES[@]}"; do
                    log_error "  - $issue"
                done
            fi
        fi
        echo ""
    fi
    
    # Re-enable errexit before exit
    set -e

    exit $overall_rc
}

main "$@"
