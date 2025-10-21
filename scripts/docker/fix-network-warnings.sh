#!/usr/bin/env bash
# Fix Docker Network Warnings
# Adds 'external: true' to network declarations to eliminate warnings

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/infrastructure/compose/docker-compose.langgraph-dev.yml"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

backup_file() {
    local file="$1"
    local backup="${file}.backup-$(date +%Y%m%d-%H%M%S)"
    log_info "Creating backup: ${backup}"
    cp "${file}" "${backup}"
}

main() {
    log_info "Fixing Docker network warnings..."
    
    if [ ! -f "${COMPOSE_FILE}" ]; then
        log_error "Compose file not found: ${COMPOSE_FILE}"
        exit 1
    fi
    
    # Backup original file
    backup_file "${COMPOSE_FILE}"
    
    # Check if 'external: true' already exists
    if grep -q "external: true" "${COMPOSE_FILE}"; then
        log_warn "Network already marked as external. Nothing to do."
        exit 0
    fi
    
    log_info "Adding 'external: true' to langgraph-dev network..."
    
    # Use sed to add external: true after the network name line
    sed -i '/name: tradingsystem_langgraph_dev/a\    external: true' "${COMPOSE_FILE}"
    
    log_info "Changes applied to: ${COMPOSE_FILE}"
    
    # Verify the change
    log_info "Verifying changes..."
    if grep -A 1 "name: tradingsystem_langgraph_dev" "${COMPOSE_FILE}" | grep -q "external: true"; then
        log_info "✅ Network configuration updated successfully!"
        
        # Show the changes
        log_info "Updated network configuration:"
        grep -A 2 "langgraph-dev:" "${COMPOSE_FILE}"
    else
        log_error "❌ Failed to update network configuration!"
        log_error "Restoring backup..."
        mv "${COMPOSE_FILE}.backup-"* "${COMPOSE_FILE}"
        exit 1
    fi
    
    # Restart the stack to apply changes
    log_info "Restarting LangGraph Dev stack..."
    cd "${REPO_ROOT}/infrastructure/compose"
    docker compose -f docker-compose.langgraph-dev.yml down
    docker compose -f docker-compose.langgraph-dev.yml up -d
    
    log_info "✅ Network warning fix complete!"
}

main "$@"
