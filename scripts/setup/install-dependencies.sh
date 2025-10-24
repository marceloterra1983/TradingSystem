#!/bin/bash
# TradingSystem Dependencies Installation
# Installs npm dependencies for all services
#
# Usage: bash scripts/setup/install-dependencies.sh [--service SERVICE_NAME]
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

PROJECT_ROOT=$(get_project_root)

# Show help
show_help() {
    cat << EOF
TradingSystem Dependencies Installation

Usage: $(basename "$0") [OPTIONS]

Installs npm dependencies for all Node.js services.

Options:
  --service NAME    Install dependencies for specific service only
  --help            Show this help message

Examples:
  $(basename "$0")                       # Install all dependencies
  $(basename "$0") --service dashboard   # Install only dashboard dependencies

Services:
  Backend:
    - workspace
    - tp-capital-signals
    - b3-market-data
    - documentation-api
    - status
  
  Frontend:
    - dashboard
    - docs

EOF
}

# Parse arguments
SPECIFIC_SERVICE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --service) SPECIFIC_SERVICE=$2; shift 2 ;;
        --help) show_help; exit 0 ;;
        *) log_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

# Service definitions (name:path)
declare -A SERVICES=(
    ["workspace"]="backend/api/workspace"
    ["tp-capital-signals"]="frontend/apps/tp-capital"
    ["b3-market-data"]="frontend/apps/b3-market-data"
    ["documentation-api"]="backend/api/documentation-api"
    ["status"]="frontend/apps/status"
    ["dashboard"]="frontend/apps/dashboard"
    ["docs"]="docs/docusaurus"
)

# Install dependencies for a service
install_deps() {
    local name=$1
    local path=$2
    
    log_info "Installing $name..."
    
    if [[ ! -d "$PROJECT_ROOT/$path" ]]; then
        log_error "  Directory not found: $PROJECT_ROOT/$path"
        return 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/$path/package.json" ]]; then
        log_warning "  No package.json found, skipping"
        return 0
    fi
    
    # Check if node_modules exists
    if [[ -d "$PROJECT_ROOT/$path/node_modules" ]]; then
        log_info "  Dependencies already installed, updating..."
    else
        log_info "  Installing dependencies..."
    fi
    
    (cd "$PROJECT_ROOT/$path" && npm install) >/dev/null 2>&1
    
    if [[ $? -eq 0 ]]; then
        log_success "  $name dependencies installed"
    else
        log_error "  $name failed to install dependencies"
        log_error "  Try manually: cd $path && npm install"
        return 1
    fi
}

section "TradingSystem Dependencies Installation"

log_info "Project Root: $PROJECT_ROOT"
echo ""

# Check prerequisites
require_command "node" "Install Node.js: https://nodejs.org/" || exit 1
require_command "npm" "Install npm (usually comes with Node.js)" || exit 1

echo ""

# Install dependencies
if [[ -n "$SPECIFIC_SERVICE" ]]; then
    # Install specific service
    if [[ -n "${SERVICES[$SPECIFIC_SERVICE]:-}" ]]; then
        install_deps "$SPECIFIC_SERVICE" "${SERVICES[$SPECIFIC_SERVICE]}"
    else
        log_error "Unknown service: $SPECIFIC_SERVICE"
        log_info "Available services: ${!SERVICES[*]}"
        exit 1
    fi
else
    # Install all services
    log_info "1. Backend API Services"
    hr
    install_deps "workspace" "backend/api/workspace"
    install_deps "tp-capital-signals" "frontend/apps/tp-capital"
    install_deps "b3-market-data" "frontend/apps/b3-market-data"
    install_deps "documentation-api" "backend/api/documentation-api"
    install_deps "status" "frontend/apps/status"
    echo ""
    
    log_info "2. Frontend Applications"
    hr
    install_deps "dashboard" "frontend/apps/dashboard"
    echo ""
    
    log_info "3. Documentation"
    hr
    install_deps "docs" "docs/docusaurus"
    echo ""
fi

section "Installation Complete!"

log_success "All dependencies installed successfully"
echo ""
log_info "Next steps:"
echo "  1. Start Docker stacks:  bash scripts/docker/start-stacks.sh"
echo "  2. Start services:       bash scripts/services/start-all.sh"
echo "  3. Check status:         bash scripts/services/status.sh"
echo ""
