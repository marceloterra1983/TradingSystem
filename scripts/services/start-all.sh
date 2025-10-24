#!/bin/bash
# TradingSystem - Unified Service Starter
# Starts all local services (non-Docker) with proper dependency checks
#
# Usage: scripts/services/start-all.sh [OPTIONS]
#   --skip-frontend       Skip frontend dashboard
#   --skip-backend        Skip all backend APIs
#   --skip-docs           Skip Docusaurus
#   --force-kill-ports    Kill processes on busy ports
#   --help                Show this help
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"
# shellcheck source=scripts/lib/portcheck.sh
source "$SCRIPT_DIR/../lib/portcheck.sh"
# shellcheck source=scripts/lib/logging.sh
source "$SCRIPT_DIR/../lib/logging.sh"
# shellcheck source=scripts/lib/pidfile.sh
source "$SCRIPT_DIR/../lib/pidfile.sh"

PROJECT_ROOT=$(get_project_root)
FREEZE_NOTICE="$PROJECT_ROOT/FREEZE-NOTICE.md"

check_freeze_guard() {
    if [[ "${ALLOW_FREEZE_BYPASS:-0}" == "1" ]]; then
        return
    fi

    if [[ -f "$FREEZE_NOTICE" ]]; then
        local status_line=""
        if status_line=$(grep -i '^\*\*Status' "$FREEZE_NOTICE" 2>/dev/null | head -n1 | tr -d '\r'); then
            :
        else
            status_line=""
        fi

        if [[ -n "$status_line" ]] && echo "$status_line" | grep -qiE 'ACTIVE|IN PROGRESS|ONGOING|PHASE'; then
            local clean_status="${status_line//\*\*/}"
            log_error "Operational freeze detected (${clean_status})."
            log_info "Set ALLOW_FREEZE_BYPASS=1 to override intentionally."
            exit 1
        fi
    fi
}

# Show help
show_help() {
    cat << EOF
TradingSystem Service Starter

Usage: $(basename "$0") [OPTIONS]

Starts all local Node.js services (frontend, backend APIs, documentation).
Docker services should be started separately using scripts/docker/start-stacks.sh

Options:
  --skip-frontend       Skip frontend dashboard (port 3103)
  --skip-backend        Skip all backend APIs (ports 3200, 3302, 3500, 3600, 3700)
  --skip-docs           Skip Docusaurus (port 3004)
  --force-kill-ports    Kill existing processes on busy ports
  --help                Show this help message

Examples:
  $(basename "$0")                    # Start all services
  $(basename "$0") --skip-docs        # Start without documentation
  $(basename "$0") --force-kill-ports # Force restart all services

Service Ports:
  Frontend:
    3103 - Dashboard (React + Vite)
    3004 - Docusaurus (Docusaurus)

  Backend:
    3200 - Workspace API (Timescale/Postgres)
    3200 - TP-Capital API
    3302 - B3 Market Data API
    3400 - Documentation API (Docker only - see docker-compose.docs.yml)
    3500 - Service Launcher
    3600 - Firecrawl Proxy
    3700 - WebScraper API
    3800 - WebScraper UI (React + Vite)

Environment Variables:
  LOG_DIR             Log directory (default: /tmp/tradingsystem-logs)
  FORCE_KILL_PORT     Force kill ports (0 or 1)
  SKIP_START_ON_BUSY  Skip services on busy ports (default: 1)

Exit Codes:
  0  All services started successfully
  1  One or more services failed to start

Logs:
  Service logs: \$LOG_DIR/<service-name>.log
  PID files: \$LOG_DIR/<service-name>.pid

EOF
}

# Parse arguments
SKIP_FRONTEND=false
SKIP_BACKEND=false
SKIP_DOCS=false
FORCE_KILL_PORTS=${FORCE_KILL_PORT:-false}

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-frontend) SKIP_FRONTEND=true; shift ;;
        --skip-backend) SKIP_BACKEND=true; shift ;;
        --skip-docs) SKIP_DOCS=true; shift ;;
        --force-kill-ports) FORCE_KILL_PORTS=true; shift ;;
        --help) show_help; exit 0 ;;
        *) log_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

check_freeze_guard

# Cleanup function
cleanup() {
    local exit_code=$?
    log_debug "start-all.sh exiting with code: $exit_code"
    exit "$exit_code"
}
trap cleanup EXIT INT TERM

# Service definitions (name:path:port:command)
# NOTE: documentation-api runs as Docker container (see tools/compose/docker-compose.docs.yml)
declare -A SERVICES=(
    ["workspace-api"]="backend/api/workspace:3200:npm run dev"
    ["tp-capital"]="frontend/apps/tp-capital:3200:npm run dev"
    ["b3-market-data"]="frontend/apps/b3-market-data:3302:npm run dev"
    ["webscraper-api"]="backend/api/webscraper-api:3700:npm run dev"
    ["webscraper-ui"]="frontend/apps/WebScraper:3800:npm run dev"
    ["firecrawl-proxy"]="backend/api/firecrawl-proxy:3600:npm run dev"
    ["status"]="frontend/apps/status:3500:npm start"
    ["frontend-dashboard"]="frontend/apps/dashboard:3103:npm run dev"
    ["docusaurus"]="docs/docusaurus:3004:npm run start -- --port 3004"
)

# Start service function
start_service() {
    local name=$1
    local definition="${SERVICES[$name]}"

    IFS=':' read -r path port command <<< "$definition"

    section "Starting $name (Port $port)"

    # Check if service directory exists
    if [[ ! -d "$PROJECT_ROOT/$path" ]]; then
        log_error "Service directory not found: $PROJECT_ROOT/$path"
        return 1
    fi

    # Check if already running via PID file
    if is_pidfile_running "$name"; then
        log_success "$name already running (PID: $(read_pidfile "$name"))"
        return 0
    fi

    # Port check
    if is_port_in_use "$port"; then
        if [[ "$FORCE_KILL_PORTS" == "true" ]]; then
            log_warning "Port $port busy, killing processes..."
            if kill_port "$port"; then
                log_success "Port $port freed"
            else
                log_error "Failed to free port $port"
                return 1
            fi
        else
            log_warning "Port $port already in use"
            if [[ "${SKIP_START_ON_BUSY:-1}" == "1" ]]; then
                log_info "Assuming $name is already running. Use --force-kill-ports to restart."
                return 0
            else
                log_error "Port conflict on $port"
                return 1
            fi
        fi
    fi

    # Install deps if needed
    if [[ ! -d "$PROJECT_ROOT/$path/node_modules" ]]; then
        log_info "Installing dependencies for $name..."
        (cd "$PROJECT_ROOT/$path" && npm install)
    fi

    # Copy .env if needed
    if [[ ! -f "$PROJECT_ROOT/$path/.env" ]] && [[ -f "$PROJECT_ROOT/$path/.env.example" ]]; then
        log_info "Creating .env from .env.example"
        cp "$PROJECT_ROOT/$path/.env.example" "$PROJECT_ROOT/$path/.env"
    fi

    # Start in background
    local log_file
    log_file=$(get_log_file "$name")

    (
        cd "$PROJECT_ROOT/$path" || exit 1
        exec bash -c "$command"
    ) > "$log_file" 2>&1 &

    local pid=$!

    # Create PID file
    create_pidfile "$name" "$pid"

    # Wait for port to become active
    if wait_for_port_active "$port" 10; then
        log_success "$name started successfully"
        log_info "  PID: $pid"
        log_info "  Port: http://localhost:$port"
        log_info "  Log: $log_file"
        return 0
    else
        log_error "$name failed to start (port $port not listening)"
        log_error "  Check log: $log_file"
        log_error "  Last 10 lines:"
        tail -n 10 "$log_file" | sed 's/^/    /'
        remove_pidfile "$name"
        return 1
    fi
}

# Main execution
main() {
    section "TradingSystem - Starting Local Services"

    log_info "Project Root: $PROJECT_ROOT"
    log_info "Log Directory: $LOG_DIR"
    echo ""

    # Check prerequisites
    require_command "node" "Install Node.js: https://nodejs.org/" || exit 1
    require_command "npm" "Install npm (usually comes with Node.js)" || exit 1

    # Clean stale PID files
    clean_stale_pidfiles

    local failed_services=()

    # Start backend services
    if [[ "$SKIP_BACKEND" == "false" ]]; then
        for service in workspace-api tp-capital b3-market-data firecrawl-proxy webscraper-api status; do
            if ! start_service "$service"; then
                failed_services+=("$service")
            fi
        done
    else
        log_info "Skipping backend services (--skip-backend)"
    fi

    # Start frontend
    if [[ "$SKIP_FRONTEND" == "false" ]]; then
        if ! start_service "frontend-dashboard"; then
            failed_services+=("frontend-dashboard")
        fi
    else
        log_info "Skipping frontend dashboard (--skip-frontend)"
    fi

    # Start documentation
    if [[ "$SKIP_DOCS" == "false" ]]; then
        if ! start_service "docusaurus"; then
            failed_services+=("docusaurus")
        fi
    else
        log_info "Skipping Docusaurus (--skip-docs)"
    fi

    # Summary
    section "Startup Summary"

    if [[ ${#failed_services[@]} -eq 0 ]]; then
        log_success "All services started successfully!"
        echo ""
        echo "📊 Access URLs:"
        echo "  Dashboard:          http://localhost:3103"
        echo "  Documentation:      http://localhost:3004"
        echo "  Workspace API:      http://localhost:3200"
        echo "  TP-Capital:         http://localhost:3200"
        echo "  B3:                 http://localhost:3302"
        echo "  Documentation API:  http://localhost:3400 (Docker container)"
        echo "  Service Launcher:   http://localhost:3500"
        echo "  Firecrawl Proxy:    http://localhost:3600"
        echo "  WebScraper API:     http://localhost:3700"
        echo ""
        echo "📝 Logs: $LOG_DIR/"
        echo ""
        echo "💡 Tips:"
        echo "  Check status:  scripts/services/status.sh"
        echo "  Stop services: scripts/services/stop-all.sh"
        echo "  View logs:     tail -f $LOG_DIR/<service-name>.log"
        echo ""
        exit 0
    else
        log_error "Some services failed to start:"
        for service in "${failed_services[@]}"; do
            log_error "  - $service"
        done
        echo ""
        log_info "Check logs in: $LOG_DIR/"
        log_info "Run diagnostics: scripts/services/diagnose.sh"
        exit 1
    fi
}

# Run main
main "$@"
