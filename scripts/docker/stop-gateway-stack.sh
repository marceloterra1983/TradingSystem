#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Complete System Shutdown Script
# ==============================================================================
# Purpose: Stop all Docker services in the correct order (reverse of startup)
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

cd "${PROJECT_ROOT}"

echo ""
echo "======================================================================"
echo "  🛑 TradingSystem - System Shutdown"
echo "======================================================================"
echo ""

TOTAL_STEPS=5

# Step 1: n8n (reverse order)
log_step 1 $TOTAL_STEPS "Stopping n8n Automation Stack..."
if [ -f "${COMPOSE_DIR}/docker-compose-5-1-n8n-stack.yml" ]; then
    docker compose -f "${COMPOSE_DIR}/docker-compose-5-1-n8n-stack.yml" down
    log_success "n8n stopped"
else
    log_warning "n8n stack not found, skipping"
fi
echo ""

# Step 2: Workspace
log_step 2 $TOTAL_STEPS "Stopping Workspace API..."
docker compose -f "${COMPOSE_DIR}/docker-compose.4-3-workspace-stack.yml" down
log_success "Workspace stopped"
echo ""

# Step 3: Documentation
log_step 3 $TOTAL_STEPS "Stopping Documentation Stack..."
docker compose -f "${COMPOSE_DIR}/docker-compose.2-docs-stack.yml" down
log_success "Documentation stopped"
echo ""

# Step 4: Dashboard
log_step 4 $TOTAL_STEPS "Stopping Dashboard UI..."
docker compose -f "${COMPOSE_DIR}/docker-compose.1-dashboard-stack.yml" down
log_success "Dashboard stopped"
echo ""

# Step 5: Gateway (last)
log_step 5 $TOTAL_STEPS "Stopping API Gateway..."
docker compose -f "${COMPOSE_DIR}/docker-compose.0-gateway-stack.yml" down
log_success "Gateway stopped"
echo ""

echo ""
echo "======================================================================"
echo "  ✨ System Shutdown Complete!"
echo "======================================================================"
echo ""
echo "All services have been stopped."
echo ""
echo "To restart: bash scripts/docker/startup-all-services.sh"
echo ""
echo "======================================================================"
echo ""
