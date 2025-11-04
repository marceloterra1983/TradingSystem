#!/bin/bash
#
# Stop Workspace Stack
#
# This script stops the complete Workspace stack.
#
# Usage:
#   bash scripts/docker/stop-workspace-stack.sh [--remove-volumes] [--force]
#
# Options:
#   --remove-volumes  : Remove all data volumes (CAUTION: deletes all data!)
#   --force           : Force stop (SIGKILL) without graceful shutdown
#   --keep-network    : Keep workspace_network after stopping
#

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="tools/compose/docker-compose.workspace-stack.yml"
REMOVE_VOLUMES=false
FORCE_STOP=false
KEEP_NETWORK=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --remove-volumes)
      REMOVE_VOLUMES=true
      shift
      ;;
    --force)
      FORCE_STOP=true
      shift
      ;;
    --keep-network)
      KEEP_NETWORK=true
      shift
      ;;
    --help)
      grep '^#' "$0" | sed 's/^# //' | sed 's/^#//'
      exit 0
      ;;
    *)
      echo -e "${YELLOW}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Confirm volume removal
confirm_volume_removal() {
    if [ "$REMOVE_VOLUMES" = true ]; then
        echo ""
        log_warn "⚠️  WARNING: You are about to DELETE ALL WORKSPACE DATA!"
        log_warn "This includes:"
        log_warn "  - All workspace items"
        log_warn "  - All categories"
        log_warn "  - Neon database volumes"
        echo ""
        echo -n "Are you ABSOLUTELY SURE? Type 'DELETE' to confirm: "
        read -r response
        
        if [ "$response" != "DELETE" ]; then
            log_error "Volume removal cancelled"
            exit 1
        fi
        
        log_warn "Proceeding with volume removal..."
    fi
}

# Stop containers
stop_containers() {
    log_step "Stopping Workspace stack..."
    
    cd "$(dirname "$0")/../.." || exit 1
    
    if [ "$FORCE_STOP" = true ]; then
        log_warn "Force stopping containers (SIGKILL)..."
        docker compose -f "$COMPOSE_FILE" kill
    else
        log_info "Gracefully stopping containers (SIGTERM)..."
        docker compose -f "$COMPOSE_FILE" stop
    fi
    
    log_info "✓ Containers stopped"
}

# Remove containers
remove_containers() {
    log_step "Removing containers..."
    
    docker compose -f "$COMPOSE_FILE" rm -f
    
    log_info "✓ Containers removed"
}

# Remove volumes
remove_volumes() {
    if [ "$REMOVE_VOLUMES" = true ]; then
        log_step "Removing volumes..."
        
        docker volume rm -f workspace-db-pageserver-data || true
        docker volume rm -f workspace-db-safekeeper-data || true
        docker volume rm -f workspace-db-compute-data || true
        
        log_info "✓ Volumes removed"
    fi
}

# Remove network
remove_network() {
    if [ "$KEEP_NETWORK" = false ]; then
        log_step "Removing workspace network..."
        
        docker network rm workspace_network 2>/dev/null || true
        
        log_info "✓ Network removed"
    fi
}

# Display summary
display_summary() {
    echo ""
    log_info "=========================================="
    log_info "Workspace Stack Stopped"
    log_info "=========================================="
    echo ""
    
    if [ "$REMOVE_VOLUMES" = true ]; then
        log_warn "⚠️  All data has been deleted!"
        echo ""
        echo "To restore from backup (if available):"
        echo "  bash scripts/database/restore-neon-backup.sh"
    else
        log_info "Data volumes preserved. To start again:"
        echo "  bash scripts/docker/start-workspace-stack.sh"
    fi
    
    echo ""
    echo "Remaining Workspace resources:"
    docker ps -a | grep workspace || echo "  (none)"
    echo ""
    docker volume ls | grep workspace || echo "  (none - all removed)"
    echo ""
    log_info "=========================================="
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "Workspace Stack - Shutdown"
    echo "=========================================="
    echo ""
    
    confirm_volume_removal
    stop_containers
    remove_containers
    remove_volumes
    
    if [ "$KEEP_NETWORK" = false ]; then
        remove_network
    fi
    
    display_summary
    
    log_info "✓ Workspace stack stopped successfully!"
}

# Run main
main "$@"


