#!/bin/bash
#
# Start Workspace Stack
#
# This script starts the complete Workspace stack including:
# - Neon Database (pageserver, safekeeper, compute)
# - Workspace API service
#
# Usage:
#   bash scripts/docker/start-workspace-stack.sh [--build] [--force-recreate]
#
# Options:
#   --build           : Rebuild images before starting
#   --force-recreate  : Recreate containers even if config hasn't changed
#   --detach          : Run in background (default)
#   --logs            : Follow logs after starting
#

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="tools/compose/docker-compose.4-3-workspace-stack.yml"
BUILD_FLAG=""
RECREATE_FLAG=""
DETACH_FLAG="-d"
FOLLOW_LOGS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --build)
      BUILD_FLAG="--build"
      shift
      ;;
    --force-recreate)
      RECREATE_FLAG="--force-recreate"
      shift
      ;;
    --logs)
      FOLLOW_LOGS=true
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if network exists
    if ! docker network ls | grep -q "tradingsystem_backend"; then
        log_info "Creating tradingsystem_backend network..."
        docker network create tradingsystem_backend
    fi
    
    # Check if Neon image exists
    if ! docker images | grep -q "neon-local"; then
        log_info "Neon image not found. Building from source..."
        log_info "This will take ~30 minutes on first build..."
        bash scripts/database/build-neon-from-source.sh
    fi
    
    log_info "✓ Prerequisites satisfied"
}

# Start stack
start_stack() {
    log_step "Starting Workspace stack..."
    
    cd "$(dirname "$0")/../.." || exit 1
    
    docker compose -f "$COMPOSE_FILE" up $DETACH_FLAG $BUILD_FLAG $RECREATE_FLAG
    
    if [ "$DETACH_FLAG" = "-d" ]; then
        log_info "✓ Workspace stack started in background"
    fi
}

# Display status
display_status() {
    log_step "Checking container status..."
    echo ""
    
    docker compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "=========================================="
    log_info "Workspace Stack Status"
    log_info "=========================================="
    echo ""
    echo "Services:"
    echo "  ├─ workspace-db-pageserver  : Port 6400 (PostgreSQL), 9898 (HTTP)"
    echo "  ├─ workspace-db-safekeeper  : Port 5454 (PostgreSQL), 7676 (HTTP)"
    echo "  ├─ workspace-db-compute     : Port 5433 (PostgreSQL)"
    echo "  └─ workspace-api            : Port 3200 (HTTP REST)"
    echo ""
    echo "Access Points:"
    echo "  API: http://localhost:3200"
    echo "  Health: http://localhost:3200/health"
    echo "  Metrics: http://localhost:3200/metrics"
    echo "  Database: postgresql://postgres@localhost:5433/workspace"
    echo ""
    echo "Commands:"
    echo "  View logs: docker compose -f $COMPOSE_FILE logs -f"
    echo "  Stop stack: docker compose -f $COMPOSE_FILE down"
    echo "  Restart: docker compose -f $COMPOSE_FILE restart"
    echo ""
    log_info "=========================================="
}

# Follow logs
follow_logs() {
    if [ "$FOLLOW_LOGS" = true ]; then
        log_step "Following logs (Ctrl+C to stop)..."
        docker compose -f "$COMPOSE_FILE" logs -f
    fi
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "Workspace Stack - Startup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    start_stack
    
    if [ "$DETACH_FLAG" = "-d" ]; then
        sleep 5  # Wait for containers to initialize
        display_status
    fi
    
    follow_logs
    
    log_info "✓ Workspace stack ready!"
}

# Run main
main "$@"


