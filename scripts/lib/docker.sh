#!/bin/bash
# Docker utilities for TradingSystem
# Usage: source "$(dirname "$0")/lib/docker.sh"
#
# Provides:
#   - Docker availability checks
#   - Container management helpers
#   - Docker Compose wrappers
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

# Prevent multiple sourcing
[[ -n "${_DOCKER_SH_LOADED:-}" ]] && return 0
readonly _DOCKER_SH_LOADED=1

# Source common if not already loaded
if [[ -z "${_COMMON_SH_LOADED:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # shellcheck source=scripts/lib/common.sh
    source "$SCRIPT_DIR/common.sh"
fi

# Check if Docker is available and working
# Returns: 0 if Docker is working, 1 otherwise
check_docker() {
    if ! command_exists docker; then
        log_error "Docker is not installed"
        return 1
    fi
    
    if ! docker info &>/dev/null; then
        log_error "Docker daemon is not running or requires sudo"
        log_error "Try: sudo systemctl start docker"
        return 1
    fi
    
    return 0
}

# Check if user is in docker group
# Returns: 0 if in group, 1 otherwise
check_docker_group() {
    if groups | grep -q docker; then
        return 0
    fi
    
    log_warning "User is not in docker group"
    log_warning "Run: sudo usermod -aG docker \$USER"
    log_warning "Then logout and login again"
    return 1
}

# Check if Docker Compose is available
# Returns: 0 if available, 1 otherwise
check_docker_compose() {
    # Try docker compose (v2 plugin)
    if docker compose version &>/dev/null; then
        return 0
    fi
    
    # Try docker-compose (v1 standalone)
    if command_exists docker-compose; then
        return 0
    fi
    
    log_error "Docker Compose not available"
    log_error "Install: sudo apt install docker-compose-plugin"
    return 1
}

# Get docker compose command (v1 or v2)
# Output: "docker compose" or "docker-compose"
get_compose_cmd() {
    if docker compose version &>/dev/null; then
        echo "docker compose"
    elif command_exists docker-compose; then
        echo "docker-compose"
    else
        log_error "Docker Compose not found"
        return 1
    fi
}

# Check if container is running
# Args: $1 - container name or ID
# Returns: 0 if running, 1 otherwise
is_container_running() {
    local container=$1
    docker ps --format '{{.Names}}' | grep -q "^${container}$"
}

# Get container status
# Args: $1 - container name or ID
# Output: Status string (running, exited, etc.)
get_container_status() {
    local container=$1
    docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not-found"
}

# Wait for container to be healthy
# Args: $1 - container name, $2 - max wait seconds (default: 30)
# Returns: 0 if healthy, 1 if timeout
wait_for_container_healthy() {
    local container=$1
    local max_wait=${2:-30}
    local waited=0
    
    while [[ $waited -lt $max_wait ]]; do
        local status
        status=$(get_container_status "$container")
        
        if [[ "$status" == "running" ]]; then
            # Check health if healthcheck is defined
            local health
            health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
            
            if [[ "$health" == "healthy" ]] || [[ "$health" == "none" ]]; then
                log_success "Container $container is healthy"
                return 0
            fi
        fi
        
        sleep 1
        waited=$((waited + 1))
    done
    
    log_error "Timeout waiting for container $container to be healthy"
    return 1
}

# Stop container gracefully
# Args: $1 - container name, $2 - timeout seconds (default: 10)
stop_container() {
    local container=$1
    local timeout=${2:-10}
    
    if ! is_container_running "$container"; then
        log_debug "Container $container is not running"
        return 0
    fi
    
    log_info "Stopping container: $container"
    docker stop --time "$timeout" "$container" >/dev/null
    log_success "Container $container stopped"
}

# Remove container
# Args: $1 - container name, $2 - force (default: false)
remove_container() {
    local container=$1
    local force=${2:-false}
    
    local args=()
    [[ "$force" == "true" ]] && args+=("--force")
    
    if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        log_info "Removing container: $container"
        docker rm "${args[@]}" "$container" >/dev/null
        log_success "Container $container removed"
    else
        log_debug "Container $container does not exist"
    fi
}

# List all TradingSystem containers
list_trading_containers() {
    docker ps -a --filter "label=com.tradingsystem=true" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Clean up stopped containers
cleanup_stopped_containers() {
    local stopped
    stopped=$(docker ps -a --filter "status=exited" --filter "label=com.tradingsystem=true" --format '{{.Names}}')
    
    if [[ -z "$stopped" ]]; then
        log_info "No stopped containers to clean up"
        return 0
    fi
    
    log_info "Cleaning up stopped containers..."
    echo "$stopped" | while read -r container; do
        remove_container "$container" false
    done
}

# Export functions
export -f check_docker check_docker_group check_docker_compose get_compose_cmd
export -f is_container_running get_container_status wait_for_container_healthy
export -f stop_container remove_container list_trading_containers cleanup_stopped_containers

