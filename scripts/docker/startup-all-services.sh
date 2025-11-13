#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Complete System Startup Script
# ==============================================================================
# Purpose: Start all Docker services in the correct dependency order
# Created: 2025-11-12
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_DIR="${PROJECT_ROOT}/tools/compose"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }
log_step() { echo -e "${CYAN}[STEP $1/$2]${NC} $3"; }

wait_for_healthy() {
    local container_name=$1
    local max_wait=${2:-60}
    local waited=0

    while [ $waited -lt $max_wait ]; do
        if docker ps --filter "name=${container_name}" --filter "health=healthy" --format "{{.Names}}" 2>/dev/null | grep -q "${container_name}"; then
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
        printf "."
    done
    echo ""
    return 1
}

cd "${PROJECT_ROOT}"

echo ""
echo "======================================================================"
echo "  🚀 TradingSystem - System Startup"
echo "======================================================================"
echo ""

TOTAL_STEPS=5

# Step 1: Gateway
log_step 1 $TOTAL_STEPS "Starting API Gateway (Traefik)..."
docker compose -f "${COMPOSE_DIR}/docker-compose.0-gateway-stack.yml" up -d
if wait_for_healthy "api-gateway" 30; then
    log_success "Gateway is healthy (http://localhost:9080)"
else
    log_error "Gateway failed to start"
    exit 1
fi
echo ""

# Step 2: Dashboard
log_step 2 $TOTAL_STEPS "Starting Dashboard UI..."
docker compose -f "${COMPOSE_DIR}/docker-compose.1-dashboard-stack.yml" up -d
if wait_for_healthy "dashboard-ui" 60; then
    log_success "Dashboard is healthy (http://localhost:9080/)"
else
    log_warning "Dashboard may need more time"
fi
echo ""

# Step 3: Documentation
log_step 3 $TOTAL_STEPS "Starting Documentation Stack..."
docker compose -f "${COMPOSE_DIR}/docker-compose.2-docs-stack.yml" up -d
if wait_for_healthy "docs-hub" 60 && wait_for_healthy "documentation-api" 30; then
    log_success "Documentation is healthy (http://localhost:9080/docs/)"
else
    log_warning "Documentation may need more time"
fi
echo ""

# Step 4: Workspace
log_step 4 $TOTAL_STEPS "Starting Workspace API..."
docker compose -f "${COMPOSE_DIR}/docker-compose.4-3-workspace-stack.yml" up -d
if wait_for_healthy "workspace-api" 30; then
    log_success "Workspace is healthy (http://localhost:9080/api/workspace/)"
else
    log_warning "Workspace may need more time"
fi
echo ""

# Step 5: n8n (Optional)
log_step 5 $TOTAL_STEPS "Starting n8n Automation Stack..."
if [ -f "${COMPOSE_DIR}/docker-compose-5-1-n8n-stack.yml" ]; then
    docker compose -f "${COMPOSE_DIR}/docker-compose-5-1-n8n-stack.yml" up -d
    sleep 5
    if wait_for_healthy "n8n-postgres" 30 && wait_for_healthy "n8n-redis" 30; then
        if wait_for_healthy "n8n-app" 60 && wait_for_healthy "n8n-proxy" 30; then
            log_success "n8n is healthy (http://localhost:9080/n8n/)"
        else
            log_warning "n8n may need more time"
        fi
    else
        log_warning "n8n dependencies may need more time"
    fi
else
    log_warning "n8n stack not found, skipping"
fi
echo ""

# Summary
echo ""
echo "======================================================================"
echo "  ✨ System Startup Complete!"
echo "======================================================================"
echo ""
echo "📍 Access URLs:"
echo "   • Main Dashboard:    http://localhost:9080/"
echo "   • Gateway Dashboard: http://localhost:9081/"
echo "   • Documentation:     http://localhost:9080/docs/"
echo "   • Workspace API:     http://localhost:9080/api/workspace/"
echo "   • n8n Automation:    http://localhost:9080/n8n/"
echo ""
echo "🔍 Check Status:"
echo "   docker ps --filter 'label=com.tradingsystem.tier'"
echo ""
echo "📋 View Logs:"
echo "   docker logs -f <container-name>"
echo ""
echo "======================================================================"
echo ""
