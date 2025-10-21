#!/bin/bash
# Structured logging system with file output and rotation
# Usage: source "$(dirname "$0")/lib/logging.sh"
#
# Provides:
#   - Timestamped file logging
#   - Log rotation
#   - Structured log formats
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

# Prevent multiple sourcing
[[ -n "${_LOGGING_SH_LOADED:-}" ]] && return 0
readonly _LOGGING_SH_LOADED=1

# Source common if not already loaded
if [[ -z "${_COMMON_SH_LOADED:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # shellcheck source=scripts/lib/common.sh
    source "$SCRIPT_DIR/common.sh"
fi

# Log directory configuration
readonly DEFAULT_LOG_DIR="/tmp/tradingsystem-logs"
LOG_DIR="${LOG_DIR:-$DEFAULT_LOG_DIR}"

# Ensure log directory exists
init_logging() {
    mkdir -p "$LOG_DIR"
    chmod 755 "$LOG_DIR" 2>/dev/null || true
}

# Get log file path for service
# Args: $1 - service name
get_log_file() {
    local service_name=$1
    echo "${LOG_DIR}/${service_name}.log"
}

# Log message to file with timestamp
# Args: $1 - service name, $2 - log level, $3 - message
log_to_file() {
    local service_name=$1
    local level=$2
    shift 2
    local message="$*"
    local timestamp
    timestamp=$(get_timestamp)
    local log_file
    log_file=$(get_log_file "$service_name")
    
    echo "[${timestamp}] [${level}] ${message}" >> "$log_file"
}

# Rotate log if too large
# Args: $1 - log file path, $2 - max size in MB (default: 10)
rotate_log_if_needed() {
    local log_file=$1
    local max_size_mb=${2:-10}
    local max_size_bytes=$((max_size_mb * 1024 * 1024))
    
    if [[ ! -f "$log_file" ]]; then
        return 0
    fi
    
    local file_size
    if command_exists stat; then
        # Linux (GNU stat)
        file_size=$(stat -c%s "$log_file" 2>/dev/null || stat -f%z "$log_file" 2>/dev/null || echo 0)
    else
        # Fallback: use wc
        file_size=$(wc -c < "$log_file" 2>/dev/null || echo 0)
    fi
    
    if [[ $file_size -gt $max_size_bytes ]]; then
        log_debug "Rotating log file: $log_file (size: $file_size bytes)"
        mv "$log_file" "${log_file}.old"
        
        # Compress old log in background
        if command_exists gzip; then
            gzip "${log_file}.old" &
        fi
    fi
}

# Clean old log files
# Args: $1 - days to keep (default: 7)
clean_old_logs() {
    local days_to_keep=${1:-7}
    
    if [[ ! -d "$LOG_DIR" ]]; then
        return 0
    fi
    
    log_info "Cleaning logs older than $days_to_keep days from $LOG_DIR"
    
    # Remove old logs
    find "$LOG_DIR" -name "*.log" -type f -mtime +"$days_to_keep" -delete 2>/dev/null || true
    find "$LOG_DIR" -name "*.log.old.gz" -type f -mtime +"$days_to_keep" -delete 2>/dev/null || true
}

# Tail log file
# Args: $1 - service name, $2 - number of lines (default: 50)
tail_log() {
    local service_name=$1
    local lines=${2:-50}
    local log_file
    log_file=$(get_log_file "$service_name")
    
    if [[ ! -f "$log_file" ]]; then
        log_error "Log file not found: $log_file"
        return 1
    fi
    
    tail -n "$lines" "$log_file"
}

# Follow log file (like tail -f)
# Args: $1 - service name
follow_log() {
    local service_name=$1
    local log_file
    log_file=$(get_log_file "$service_name")
    
    if [[ ! -f "$log_file" ]]; then
        log_error "Log file not found: $log_file"
        return 1
    fi
    
    tail -f "$log_file"
}

# List all log files
list_logs() {
    if [[ ! -d "$LOG_DIR" ]]; then
        log_warning "Log directory not found: $LOG_DIR"
        return 1
    fi
    
    echo "Log files in $LOG_DIR:"
    ls -lh "$LOG_DIR"/*.log 2>/dev/null || log_warning "No log files found"
}

# Initialize logging on source
init_logging

# Export functions
export -f log_to_file rotate_log_if_needed clean_old_logs
export -f tail_log follow_log list_logs

