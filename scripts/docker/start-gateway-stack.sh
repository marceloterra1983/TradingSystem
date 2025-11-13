#!/usr/bin/env bash
# ============================================================
# Start API Gateway Stack (Phase 3 Epic 1)
# ============================================================
# Orchestrates Traefik gateway startup with backend services
# ============================================================

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Project root
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly COMPOSE_DIR="$PROJECT_ROOT/tools/compose"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_success "Docker is running"
}

# Check if networks exist
check_networks() {
    local networks=("tradingsystem-network" "tradingsystem_backend")

    for network in "${networks[@]}"; do
        if ! docker network inspect "$network" > /dev/null 2>&1; then
            log_info "Creating network: $network"
            docker network create "$network"
        else
            log_success "Network exists: $network"
        fi
    done
}

# Start Traefik gateway
start_gateway() {
    log_info "Starting Traefik API Gateway..."

    cd "$COMPOSE_DIR"

    if docker ps --filter name=traefik-gateway --filter status=running | grep -q traefik-gateway; then
        log_warning "Traefik gateway is already running"
        return 0
    fi

    docker compose -f docker-compose.gateway.yml up -d

    # Wait for gateway to be healthy
    log_info "Waiting for gateway to become healthy..."
    local max_wait=30
    local count=0

    while [ $count -lt $max_wait ]; do
        if docker ps --filter name=traefik-gateway --filter health=healthy | grep -q traefik-gateway; then
            log_success "Traefik gateway is healthy"
            return 0
        fi

        echo -n "."
        sleep 1
        ((count++))
    done

    log_error "Traefik gateway failed to become healthy within ${max_wait}s"
    docker logs traefik-gateway --tail 50
    return 1
}

# Start workspace stack
start_workspace() {
    log_info "Starting Workspace stack..."

    cd "$COMPOSE_DIR"

    if docker ps --filter name=workspace-api --filter status=running | grep -q workspace-api; then
        log_warning "Workspace stack is already running"
        return 0
    fi

    docker compose -f docker-compose.4-3-workspace-stack.yml up -d

    # Wait for API to be healthy
    log_info "Waiting for Workspace API to become healthy..."
    local max_wait=60
    local count=0

    while [ $count -lt $max_wait ]; do
        if docker ps --filter name=workspace-api --filter health=healthy | grep -q workspace-api; then
            log_success "Workspace API is healthy"
            return 0
        fi

        echo -n "."
        sleep 1
        ((count++))
    done

    log_error "Workspace API failed to become healthy within ${max_wait}s"
    docker logs workspace-api --tail 50
    return 1
}

# Verify routing
verify_routing() {
    log_info "Verifying Traefik routing..."

    # Check Traefik dashboard
    if curl -s -f http://localhost:8080/api/overview > /dev/null; then
        log_success "Traefik dashboard accessible: http://localhost:8080"
    else
        log_error "Traefik dashboard not accessible"
        return 1
    fi

    # Check Workspace API via gateway
    log_info "Testing Workspace API routing..."
    sleep 5  # Give Traefik time to discover services

    if curl -s -f http://localhost/api/workspace/health > /dev/null; then
        log_success "Workspace API accessible via gateway: http://localhost/api/workspace"
    else
        log_warning "Workspace API not yet routed (may need more time for discovery)"
    fi
}

# Show status
show_status() {
    echo ""
    log_info "=== Gateway Stack Status ==="
    echo ""

    # Traefik
    echo -e "${BLUE}Traefik Gateway:${NC}"
    docker ps --filter name=traefik-gateway --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    # Workspace stack
    echo -e "${BLUE}Workspace Stack:${NC}"
    docker ps --filter label=com.tradingsystem.stack=workspace --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    # URLs
    echo -e "${BLUE}Access URLs:${NC}"
    echo "  • Traefik Dashboard: http://localhost:8080"
    echo "  • Workspace API (via gateway): http://localhost/api/workspace"
    echo "  • Workspace Health: http://localhost/api/workspace/health"
    echo "  • Prometheus Metrics: http://localhost:8080/metrics"
    echo ""
}

# Main execution
main() {
    log_info "Starting API Gateway Stack (Phase 3 Epic 1)"
    echo ""

    check_docker
    check_networks
    echo ""

    start_gateway
    echo ""

    start_workspace
    echo ""

    verify_routing
    echo ""

    show_status

    log_success "Gateway stack started successfully!"
    log_info "View Traefik dashboard: http://localhost:8080"
}

# Handle Ctrl+C
trap 'echo ""; log_warning "Interrupted by user"; exit 130' INT

# Run main function
main "$@"
