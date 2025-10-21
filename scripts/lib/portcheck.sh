#!/bin/bash
# Port checking and management utilities
# Usage: source "$(dirname "$0")/lib/portcheck.sh"
#
# Provides:
#   - Port availability checking (lsof/ss/netstat fallback)
#   - PID discovery for ports
#   - Graceful port killing
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

# Prevent multiple sourcing
[[ -n "${_PORTCHECK_SH_LOADED:-}" ]] && return 0
readonly _PORTCHECK_SH_LOADED=1

# Source common if not already loaded
if [[ -z "${_COMMON_SH_LOADED:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # shellcheck source=scripts/lib/common.sh
    source "$SCRIPT_DIR/common.sh"
fi

# Detect best available port checker
# Returns: "lsof", "ss", "netstat", or "none"
detect_port_checker() {
    if command_exists lsof; then
        echo "lsof"
    elif command_exists ss; then
        echo "ss"
    elif command_exists netstat; then
        echo "netstat"
    else
        echo "none"
    fi
}

# Check if port is in use
# Args: $1 - port number, $2 - optional checker (auto-detected if not provided)
# Returns: 0 if in use, 1 if free, 2 if unknown (no checker available)
is_port_in_use() {
    local port=$1
    local checker="${2:-$(detect_port_checker)}"
    
    case "$checker" in
        lsof)
            lsof -i:"$port" >/dev/null 2>&1
            ;;
        ss)
            ss -ltn 2>/dev/null | grep -q ":${port} "
            ;;
        netstat)
            netstat -ltn 2>/dev/null | grep -q ":${port} "
            ;;
        *)
            log_warning "No port checking tool available (lsof/ss/netstat)"
            return 2  # Unknown
            ;;
    esac
}

# Get PIDs using a specific port
# Args: $1 - port number, $2 - optional checker
# Output: PIDs (one per line), empty if none
get_port_pids() {
    local port=$1
    local checker="${2:-$(detect_port_checker)}"
    
    case "$checker" in
        lsof)
            lsof -ti:"$port" 2>/dev/null || true
            ;;
        ss)
            # ss format: users:(("node",pid=12345,fd=18))
            ss -ltnp 2>/dev/null | grep ":${port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u || true
            ;;
        netstat)
            # netstat format: tcp 0 0 0.0.0.0:8080 0.0.0.0:* LISTEN 12345/node
            netstat -ltnp 2>/dev/null | grep ":${port} " | awk '{print $7}' | cut -d'/' -f1 | grep -E '^[0-9]+$' | sort -u || true
            ;;
        *)
            return 1
            ;;
    esac
}

# Get process name for PID
# Args: $1 - PID
# Output: Process name
get_process_name() {
    local pid=$1
    ps -p "$pid" -o comm= 2>/dev/null || echo "unknown"
}

# Kill process on port with grace period
# Tries SIGTERM first, then SIGKILL if needed
# Args: $1 - port number, $2 - max attempts (default: 3)
# Returns: 0 if port freed, 1 if still in use
kill_port() {
    local port=$1
    local max_attempts=${2:-3}
    local checker
    checker=$(detect_port_checker)
    
    if [[ "$checker" == "none" ]]; then
        log_error "Cannot kill port: no port checking tool available"
        return 1
    fi
    
    for attempt in $(seq 1 "$max_attempts"); do
        local pids
        pids=$(get_port_pids "$port" "$checker")
        
        if [[ -z "$pids" ]]; then
            log_debug "Port $port is free"
            return 0
        fi
        
        log_debug "Attempt $attempt/$max_attempts: Killing PIDs on port $port: $pids"
        
        # Try graceful termination (SIGTERM)
        echo "$pids" | xargs -r kill 2>/dev/null || true
        sleep 1
        
        # Check if still alive, force kill (SIGKILL)
        pids=$(get_port_pids "$port" "$checker")
        if [[ -n "$pids" ]]; then
            log_debug "Processes still alive, forcing kill (SIGKILL)"
            echo "$pids" | xargs -r kill -9 2>/dev/null || true
            sleep 0.5
        fi
    done
    
    # Final check
    if is_port_in_use "$port" "$checker"; then
        log_error "Failed to free port $port after $max_attempts attempts"
        return 1
    fi
    
    log_success "Port $port freed"
    return 0
}

# Wait for port to become available
# Args: $1 - port, $2 - max wait seconds (default: 30)
# Returns: 0 if port becomes available, 1 if timeout
wait_for_port_free() {
    local port=$1
    local max_wait=${2:-30}
    local checker
    checker=$(detect_port_checker)
    local waited=0
    
    while [[ $waited -lt $max_wait ]]; do
        if ! is_port_in_use "$port" "$checker"; then
            return 0
        fi
        sleep 1
        waited=$((waited + 1))
    done
    
    log_error "Timeout waiting for port $port to become free"
    return 1
}

# Wait for port to become active (service started)
# Args: $1 - port, $2 - max wait seconds (default: 30)
# Returns: 0 if port becomes active, 1 if timeout
wait_for_port_active() {
    local port=$1
    local max_wait=${2:-30}
    local checker
    checker=$(detect_port_checker)
    local waited=0
    
    while [[ $waited -lt $max_wait ]]; do
        if is_port_in_use "$port" "$checker"; then
            return 0
        fi
        sleep 1
        waited=$((waited + 1))
    done
    
    log_error "Timeout waiting for port $port to become active"
    return 1
}

# Check multiple ports and report status
# Args: Array of "name:port" pairs
# Example: check_ports "Dashboard:3101" "API:3200"
check_ports() {
    local checker
    checker=$(detect_port_checker)
    
    for service_port in "$@"; do
        IFS=':' read -r name port <<< "$service_port"
        
        if is_port_in_use "$port" "$checker"; then
            local pids
            pids=$(get_port_pids "$port" "$checker" | head -1)
            log_success "$name (port $port) - RUNNING (PID: ${pids:-unknown})"
        else
            log_error "$name (port $port) - NOT RUNNING"
        fi
    done
}

# Export functions
export -f detect_port_checker is_port_in_use get_port_pids
export -f kill_port wait_for_port_free wait_for_port_active
export -f check_ports

