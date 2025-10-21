#!/bin/bash
# PID file management with locking and validation
# Usage: source "$(dirname "$0")/lib/pidfile.sh"
#
# Provides:
#   - Safe PID file creation with locking
#   - PID validation
#   - Stale PID cleanup
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

# Prevent multiple sourcing
[[ -n "${_PIDFILE_SH_LOADED:-}" ]] && return 0
readonly _PIDFILE_SH_LOADED=1

# Source dependencies
if [[ -z "${_COMMON_SH_LOADED:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # shellcheck source=scripts/lib/common.sh
    source "$SCRIPT_DIR/common.sh"
fi

if [[ -z "${_LOGGING_SH_LOADED:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # shellcheck source=scripts/lib/logging.sh
    source "$SCRIPT_DIR/logging.sh"
fi

# Get PID file path for service
# Args: $1 - service name
get_pidfile() {
    local service=$1
    echo "$LOG_DIR/${service}.pid"
}

# Get lock file path for PID file
# Args: $1 - service name
get_lockfile() {
    local service=$1
    echo "$LOG_DIR/${service}.pid.lock"
}

# Create PID file with locking
# Args: $1 - service name, $2 - PID
# Returns: 0 on success, 1 on failure
create_pidfile() {
    local service=$1
    local pid=$2
    local pidfile
    pidfile=$(get_pidfile "$service")
    local lockfile
    lockfile=$(get_lockfile "$service")
    
    # Acquire exclusive lock (file descriptor 200)
    exec 200>"$lockfile"
    if ! flock -n 200; then
        log_error "Failed to acquire lock for $service PID file"
        return 1
    fi
    
    # Write PID
    echo "$pid" > "$pidfile"
    
    # Release lock
    flock -u 200
    exec 200>&-
    
    log_debug "Created PID file for $service: $pidfile (PID: $pid)"
    return 0
}

# Read PID from PID file
# Args: $1 - service name
# Output: PID or empty string
read_pidfile() {
    local service=$1
    local pidfile
    pidfile=$(get_pidfile "$service")
    
    if [[ -f "$pidfile" ]]; then
        cat "$pidfile" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Check if PID in PID file is still running
# Args: $1 - service name
# Returns: 0 if running, 1 otherwise
is_pidfile_running() {
    local service=$1
    local pid
    pid=$(read_pidfile "$service")
    
    if [[ -z "$pid" ]]; then
        return 1
    fi
    
    # Check if PID is valid number
    if ! [[ "$pid" =~ ^[0-9]+$ ]]; then
        log_warning "Invalid PID in PID file for $service: $pid"
        return 1
    fi
    
    # Check if process is running
    if kill -0 "$pid" 2>/dev/null; then
        return 0
    fi
    
    log_debug "PID $pid from $service PID file is not running"
    return 1
}

# Get process name for PID in PID file
# Args: $1 - service name
# Output: Process name or empty
get_pidfile_process_name() {
    local service=$1
    local pid
    pid=$(read_pidfile "$service")
    
    if [[ -z "$pid" ]]; then
        echo ""
        return
    fi
    
    ps -p "$pid" -o comm= 2>/dev/null || echo ""
}

# Remove PID file and lock file
# Args: $1 - service name
remove_pidfile() {
    local service=$1
    local pidfile
    pidfile=$(get_pidfile "$service")
    local lockfile
    lockfile=$(get_lockfile "$service")
    
    rm -f "$pidfile" "$lockfile" 2>/dev/null
    log_debug "Removed PID file for $service"
}

# Clean stale PID files (PID not running)
# Args: optional service names, or all if none provided
clean_stale_pidfiles() {
    if [[ $# -eq 0 ]]; then
        # Clean all PID files in LOG_DIR
        for pidfile in "$LOG_DIR"/*.pid; do
            [[ -f "$pidfile" ]] || continue
            
            local service
            service=$(basename "$pidfile" .pid)
            
            if ! is_pidfile_running "$service"; then
                log_info "Removing stale PID file: $service"
                remove_pidfile "$service"
            fi
        done
    else
        # Clean specific services
        for service in "$@"; do
            if ! is_pidfile_running "$service"; then
                log_info "Removing stale PID file: $service"
                remove_pidfile "$service"
            fi
        done
    fi
}

# Stop process using PID file
# Args: $1 - service name, $2 - graceful timeout (default: 5)
# Returns: 0 if stopped, 1 if failed
stop_pidfile_process() {
    local service=$1
    local timeout=${2:-5}
    local pid
    pid=$(read_pidfile "$service")
    
    if [[ -z "$pid" ]]; then
        log_debug "No PID file for $service"
        return 0
    fi
    
    if ! kill -0 "$pid" 2>/dev/null; then
        log_debug "Process $pid not running, cleaning PID file"
        remove_pidfile "$service"
        return 0
    fi
    
    log_info "Stopping $service (PID: $pid)..."
    
    # Try graceful shutdown (SIGTERM)
    kill "$pid" 2>/dev/null || true
    
    # Wait for process to exit
    local waited=0
    while [[ $waited -lt $timeout ]]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            log_success "Process $pid stopped gracefully"
            remove_pidfile "$service"
            return 0
        fi
        sleep 1
        waited=$((waited + 1))
    done
    
    # Force kill (SIGKILL)
    log_warning "Process $pid did not stop gracefully, forcing..."
    kill -9 "$pid" 2>/dev/null || true
    sleep 1
    
    if ! kill -0 "$pid" 2>/dev/null; then
        log_success "Process $pid force-killed"
        remove_pidfile "$service"
        return 0
    fi
    
    log_error "Failed to stop process $pid"
    return 1
}

# Export functions
export -f get_pidfile get_lockfile create_pidfile read_pidfile
export -f is_pidfile_running get_pidfile_process_name
export -f remove_pidfile clean_stale_pidfiles stop_pidfile_process

