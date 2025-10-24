#!/usr/bin/env bash
# Cleanup Orphan Docker Containers
# Removes containers that are no longer defined in compose files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_DIR="${REPO_ROOT}/tools/compose"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# List of known orphan containers from warnings
ORPHAN_CONTAINERS=(
    "data-frontend-apps"
)

main() {
    log_info "Starting orphan container cleanup..."
    
    # Check if any orphans exist
    local found=0
    for container in "${ORPHAN_CONTAINERS[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            log_warn "Found orphan container: ${container}"
            found=$((found + 1))
        fi
    done
    
    if [ $found -eq 0 ]; then
        log_info "No orphan containers found. System is clean!"
        exit 0
    fi
    
    log_info "Found ${found} orphan container(s). Proceeding with cleanup..."
    
    # Stop and remove each orphan
    for container in "${ORPHAN_CONTAINERS[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            log_info "Stopping container: ${container}"
            docker stop "${container}" >/dev/null 2>&1 || log_warn "Container already stopped"
            
            log_info "Removing container: ${container}"
            docker rm "${container}" >/dev/null 2>&1 || log_error "Failed to remove ${container}"
            
            # Try to remove associated volumes
            log_info "Checking for volumes associated with ${container}..."
            local volume_name="${container//-/_}_data"
            if docker volume ls --format "{{.Name}}" | grep -q "^${volume_name}$"; then
                log_warn "Found volume: ${volume_name}"
                read -p "Remove volume ${volume_name}? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    docker volume rm "${volume_name}" >/dev/null 2>&1 && log_info "Volume removed" || log_error "Failed to remove volume"
                fi
            fi
        fi
    done
    
    # Run compose files with --remove-orphans flag
    log_info "Running compose files with --remove-orphans flag..."
    
    cd "${COMPOSE_DIR}"
    
    log_info "Cleaning TimescaleDB stack..."
    docker compose -f docker-compose.timescale.yml up -d --remove-orphans
    
    log_info "Cleaning Frontend Apps stack..."
    docker compose -f docker-compose.frontend-apps.yml up -d --remove-orphans
    
    log_info "Cleanup complete!"
    
    # Verify no warnings
    log_info "Verifying cleanup..."
    if docker ps -a --format "{{.Names}}" | grep -E "$(IFS=\|; echo "${ORPHAN_CONTAINERS[*]}")"; then
        log_error "Some orphan containers still exist!"
        exit 1
    else
        log_info "✅ All orphan containers removed successfully!"
    fi
}

main "$@"
