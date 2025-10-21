#!/bin/bash
# TradingSystem - Stop All Local Services
# Stops all running local services gracefully
#
# Usage: scripts/services/stop-all.sh [OPTIONS]
#   --force         Force kill (SIGKILL) without graceful shutdown
#   --clean-logs    Remove log files after stopping
#   --help          Show this help
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

# Show help
show_help() {
    cat << EOF
TradingSystem Service Stopper

Usage: $(basename "$0") [OPTIONS]

Stops all running local Node.js services gracefully.
Docker containers should be stopped separately using scripts/docker/stop-stacks.sh

Options:
  --force         Force kill (SIGKILL) immediately without graceful shutdown
  --clean-logs    Remove log files after stopping services
  --help          Show this help message

Examples:
  $(basename "$0")              # Gracefully stop all services
  $(basename "$0") --force      # Force kill all services
  $(basename "$0") --clean-logs # Stop and remove logs

Process:
  1. Stop by PID files (graceful SIGTERM with 5s timeout)
  2. If still running, force kill (SIGKILL)
  3. Clean up PID files
  4. Optionally clean logs

Environment Variables:
  LOG_DIR  Log directory (default: /tmp/tradingsystem-logs)

Exit Codes:
  0  All services stopped successfully
  1  Some services failed to stop

EOF
}

# Parse arguments
FORCE_KILL=false
CLEAN_LOGS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force) FORCE_KILL=true; shift ;;
        --clean-logs) CLEAN_LOGS=true; shift ;;
        --help) show_help; exit 0 ;;
        *) log_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

# Cleanup function
cleanup() {
    local exit_code=$?
    log_debug "stop-all.sh exiting with code: $exit_code"
    exit "$exit_code"
}
trap cleanup EXIT INT TERM

# Main execution
main() {
    section "TradingSystem - Stopping Local Services"

    log_info "Log Directory: $LOG_DIR"
    echo ""

    local failed_services=()
    local stopped_count=0

    # Get all PID files
    local pidfiles=()
    if [[ -d "$LOG_DIR" ]]; then
        while IFS= read -r -d '' pidfile; do
            pidfiles+=("$pidfile")
        done < <(find "$LOG_DIR" -name "*.pid" -type f -print0 2>/dev/null)
    fi

    # Define known ports for TradingSystem services
    local ports=(3103 3004 3200 3302 3400 3500 3600 3700 3800)

    if [[ ${#pidfiles[@]} -eq 0 ]]; then
        log_info "No running services found (no PID files)"
        log_info "Checking known ports for running processes..."
        echo ""
    else
        log_info "Found ${#pidfiles[@]} service(s) with PID files to stop"
        echo ""
    fi

    # First, stop services with PID files
    # Disable errexit for PID file processing to avoid stopping on first error
    set +e
    
    for pidfile in "${pidfiles[@]}"; do
        local service
        service=$(basename "$pidfile" .pid)

        log_info "Stopping $service..."

        if [[ "$FORCE_KILL" == "true" ]]; then
            # Immediate force kill
            local pid
            pid=$(read_pidfile "$service")
            if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
                log_success "  Force killed (PID: $pid)"
                remove_pidfile "$service"
                stopped_count=$((stopped_count + 1))
            else
                log_debug "  Process not running"
                remove_pidfile "$service"
            fi
        else
            # Graceful stop with timeout
            stop_pidfile_process "$service" 5
            local stop_result=$?
            if [[ $stop_result -eq 0 ]]; then
                log_success "  $service stopped"
                stopped_count=$((stopped_count + 1))
            else
                log_error "  Failed to stop $service"
                failed_services+=("$service")
            fi
        fi
    done
    
    # Re-enable errexit
    set -e

    # Then, check all known ports for any remaining processes
    log_info "Checking known ports for remaining processes..."
    local found_orphans=false

    # Disable errexit for the entire port checking loop
    set +e
    
    for port in "${ports[@]}"; do
        if is_port_in_use "$port"; then
            found_orphans=true
            local pids
            pids=$(get_port_pids "$port")
            if [[ -n "$pids" ]]; then
                log_warning "Port $port is in use (PID: $pids)"
                log_info "  Killing process(es) on port $port..."
                
                if [[ "$FORCE_KILL" == "true" ]]; then
                    # Force kill immediately
                    echo "$pids" | xargs -r kill -9 2>/dev/null || true
                    sleep 1
                    
                    # Verify port is freed
                    if ! is_port_in_use "$port"; then
                        log_success "  Port $port freed"
                        stopped_count=$((stopped_count + 1))
                    else
                        log_error "  Port $port still in use after force kill"
                    fi
                else
                    # Try graceful kill
                    kill_port "$port"
                    local kill_result=$?
                    
                    if [[ $kill_result -eq 0 ]]; then
                        log_success "  Port $port freed"
                        stopped_count=$((stopped_count + 1))
                    else
                        log_error "  Failed to free port $port"
                    fi
                fi
            fi
        fi
    done
    
    # Re-enable errexit
    set -e

    if [[ "$found_orphans" == "false" ]] && [[ ${#pidfiles[@]} -eq 0 ]]; then
        log_success "No services running"
        exit 0
    fi

    echo ""

    # Final check for any remaining processes
    log_info "Final check for remaining processes..."
    local remaining_found=false

    for port in "${ports[@]}"; do
        if is_port_in_use "$port"; then
            remaining_found=true
            log_warning "Port $port still in use"
            local pids
            pids=$(get_port_pids "$port")
            log_warning "  PIDs: $pids"
            if [[ "$FORCE_KILL" == "false" ]]; then
                log_warning "  Run with --force to kill remaining processes"
            fi
        fi
    done

    if [[ "$remaining_found" == "false" ]]; then
        log_success "No remaining processes found"
    fi

    echo ""

    # Clean logs if requested
    if [[ "$CLEAN_LOGS" == "true" ]]; then
        log_info "Cleaning log files..."
        rm -f "$LOG_DIR"/*.log "$LOG_DIR"/*.log.old* 2>/dev/null || true
        log_success "Log files removed"
        echo ""
    fi

    # Summary
    section "Stop Summary"

    log_info "Stopped services: $stopped_count"

    if [[ ${#failed_services[@]} -eq 0 ]]; then
        log_success "All services stopped successfully!"
        echo ""
        echo "💡 Tips:"
        echo "  Start services: scripts/services/start-all.sh"
        echo "  Check status:   scripts/services/status.sh"
        if [[ "$CLEAN_LOGS" == "false" ]]; then
            echo "  Clean logs:     scripts/services/stop-all.sh --clean-logs"
        fi
        echo ""
        exit 0
    else
        log_error "Failed to stop some services:"
        for service in "${failed_services[@]}"; do
            log_error "  - $service"
        done
        echo ""
        log_info "Try: $(basename "$0") --force"
        exit 1
    fi
}

# Run main
main "$@"
