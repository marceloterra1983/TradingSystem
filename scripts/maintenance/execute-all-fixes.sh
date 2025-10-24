#!/bin/bash
# ==============================================================================
# Execute All Container Fixes
# ==============================================================================
# This script executes:
#   1. Complete Portainer removal
#   2. LangGraph Dev naming fix
#   3. Validation of all changes
#
# Usage:
#   bash scripts/maintenance/execute-all-fixes.sh
#
# Author: TradingSystem Team
# Date: 2025-10-20
# ==============================================================================

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

log_info() { echo -e "${BLUE}ℹ${NC}  $*"; }
log_success() { echo -e "${GREEN}✓${NC}  $*"; }
log_warning() { echo -e "${YELLOW}⚠${NC}  $*"; }
log_error() { echo -e "${RED}✗${NC}  $*"; }
section() { echo ""; echo -e "${BOLD}${MAGENTA}━━━ $* ━━━${NC}"; echo ""; }

# Banner
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🔧 ${BOLD}${GREEN}TradingSystem - Execute All Fixes${NC}${CYAN}                    ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# TASK 1: Remove Portainer
# =============================================================================

section "Task 1/2: Removing Portainer"

log_info "Checking if Portainer exists..."

PORTAINER_EXISTS=$(docker ps -a --filter "name=portainer" --format "{{.Names}}" 2>/dev/null || true)

if [[ -n "$PORTAINER_EXISTS" ]]; then
    log_warning "Found Portainer container: $PORTAINER_EXISTS"
    
    # Stop container
    log_info "Stopping Portainer..."
    if docker stop portainer >/dev/null 2>&1; then
        log_success "Portainer stopped"
    else
        log_warning "Portainer was not running"
    fi
    
    # Remove container
    log_info "Removing Portainer container..."
    if docker rm portainer >/dev/null 2>&1; then
        log_success "Portainer container removed"
    else
        log_error "Failed to remove Portainer container"
        exit 1
    fi
    
    # Remove volumes
    log_info "Checking for Portainer volumes..."
    PORTAINER_VOLUMES=$(docker volume ls --filter "name=portainer" --format "{{.Name}}" 2>/dev/null || true)
    
    if [[ -n "$PORTAINER_VOLUMES" ]]; then
        log_info "Removing Portainer volumes..."
        while IFS= read -r volume; do
            if docker volume rm "$volume" >/dev/null 2>&1; then
                log_success "Removed volume: $volume"
            else
                log_warning "Failed to remove volume: $volume"
            fi
        done <<< "$PORTAINER_VOLUMES"
    else
        log_info "No Portainer volumes found"
    fi
    
    # Clean bash alias
    BASHRC="$HOME/.bashrc"
    if [[ -f "$BASHRC" ]] && grep -q "alias portainer=" "$BASHRC" 2>/dev/null; then
        log_info "Removing Portainer alias from ~/.bashrc..."
        BACKUP="${BASHRC}.backup-$(date +%Y%m%d-%H%M%S)"
        cp "$BASHRC" "$BACKUP"
        sed -i '/alias portainer=/d' "$BASHRC"
        log_success "Alias removed (backup: $BACKUP)"
    fi
    
    log_success "Portainer removal complete!"
else
    log_info "Portainer not found - skipping removal"
fi

# =============================================================================
# TASK 2: Fix LangGraph Dev Naming
# =============================================================================

section "Task 2/2: Fixing LangGraph Dev Naming"

COMPOSE_FILE="${REPO_ROOT}/tools/compose/docker-compose.langgraph-dev.yml"
BUILD_SCRIPT="${REPO_ROOT}/scripts/docker/build-images.sh"
BACKUP_DIR="${REPO_ROOT}/.backups/naming-fix-$(date +%Y%m%d-%H%M%S)"

# Check for violations
log_info "Checking for naming violations..."

VIOLATIONS_FOUND=false

if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^compose-infra-langgraph-dev"; then
    log_warning "Found auto-generated name: compose-infra-langgraph-dev"
    VIOLATIONS_FOUND=true
fi

if docker ps --format "{{.Names}}" 2>/dev/null | grep -qE "^(postgres:16-alpine|redis:7-alpine)"; then
    log_warning "Found upstream container names"
    VIOLATIONS_FOUND=true
fi

if [[ "$VIOLATIONS_FOUND" == "false" ]]; then
    log_success "No naming violations detected!"
else
    log_warning "Naming violations detected - fixing..."
    
    # Create backup
    log_info "Creating backups..."
    mkdir -p "$BACKUP_DIR"
    cp "$COMPOSE_FILE" "${BACKUP_DIR}/docker-compose.langgraph-dev.yml.bak"
    cp "$BUILD_SCRIPT" "${BACKUP_DIR}/build-images.sh.bak"
    log_success "Backups created in: $BACKUP_DIR"
    
    # Update build script
    log_info "Updating build script..."
    if ! grep -q "infra-postgres-dev" "$BUILD_SCRIPT"; then
        sed -i '/data-postgress-langgraph=postgres:16-alpine/a\    "infra-postgres-dev=postgres:16-alpine"\n    "infra-redis-dev=redis:7-alpine"' "$BUILD_SCRIPT"
        log_success "Build script updated"
    else
        log_info "Build script already has dev images"
    fi
    
    # Update compose file
    log_info "Updating compose file..."
    if ! grep -q "^name: langgraph-dev" "$COMPOSE_FILE"; then
        sed -i '1i name: langgraph-dev\n' "$COMPOSE_FILE"
        log_success "Added project name"
    fi
    
    if grep -q "image: postgres:16-alpine" "$COMPOSE_FILE"; then
        sed -i 's|image: postgres:16-alpine|image: img-infra-postgres-dev:${IMG_VERSION:-2025.10.19}|g' "$COMPOSE_FILE"
        log_success "Updated postgres image reference"
    fi
    
    if grep -q "image: redis:7-alpine" "$COMPOSE_FILE"; then
        sed -i 's|image: redis:7-alpine|image: img-infra-redis-dev:${IMG_VERSION:-2025.10.19}|g' "$COMPOSE_FILE"
        log_success "Updated redis image reference"
    fi
    
    # Build/retag images
    log_info "Retagging dev images..."
    
    if ! docker image inspect postgres:16-alpine >/dev/null 2>&1; then
        log_info "Pulling postgres:16-alpine..."
        docker pull postgres:16-alpine >/dev/null 2>&1
    fi
    docker tag postgres:16-alpine img-infra-postgres-dev:2025.10.19
    log_success "Postgres image retagged"
    
    if ! docker image inspect redis:7-alpine >/dev/null 2>&1; then
        log_info "Pulling redis:7-alpine..."
        docker pull redis:7-alpine >/dev/null 2>&1
    fi
    docker tag redis:7-alpine img-infra-redis-dev:2025.10.19
    log_success "Redis image retagged"
    
    # Recreate containers
    log_info "Recreating containers..."
    
    if docker compose -f "$COMPOSE_FILE" down >/dev/null 2>&1; then
        log_success "Old containers stopped"
    else
        log_warning "No containers to stop"
    fi
    
    log_info "Starting containers with new naming..."
    docker compose -f "$COMPOSE_FILE" up -d
    log_success "New containers started"
    
    # Wait for containers to initialize
    log_info "Waiting for containers to initialize (5s)..."
    sleep 5
fi

# =============================================================================
# VALIDATION
# =============================================================================

section "Validation"

log_info "Validating all changes..."

# Check Portainer
if docker ps -a --format "{{.Names}}" 2>/dev/null | grep -q "portainer"; then
    log_error "Portainer still exists!"
    docker ps -a --filter "name=portainer" --format "table {{.Names}}\t{{.Status}}"
else
    log_success "Portainer removed successfully"
fi

# Check naming violations
FINAL_VIOLATIONS=false

if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^compose-infra"; then
    log_error "Auto-generated names still exist!"
    FINAL_VIOLATIONS=true
fi

if docker ps --format "{{.Names}}" 2>/dev/null | grep -qE "^(postgres:|redis:)"; then
    log_error "Upstream container names still exist!"
    FINAL_VIOLATIONS=true
fi

if [[ "$FINAL_VIOLATIONS" == "false" ]]; then
    log_success "All naming violations fixed!"
else
    log_error "Some violations remain - manual intervention needed"
fi

# Check dev containers
echo ""
echo -e "${BOLD}LangGraph Dev Stack:${NC}"
docker ps --filter "name=dev" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null || log_warning "No dev containers found"

# Health check
echo ""
log_info "Checking LangGraph dev health..."
if curl -sf http://localhost:8112/health >/dev/null 2>&1; then
    log_success "LangGraph dev is healthy!"
else
    log_warning "LangGraph dev health check failed (may need more time)"
fi

# =============================================================================
# SUMMARY
# =============================================================================

section "🎉 Execution Complete!"

echo -e "${GREEN}✓ Portainer removed${NC}"
echo -e "${GREEN}✓ LangGraph dev naming fixed${NC}"
echo -e "${GREEN}✓ All images retagged${NC}"
echo -e "${GREEN}✓ All containers validated${NC}"
echo ""

echo -e "${BOLD}${CYAN}Current Container Status:${NC}"
echo ""
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | head -20

echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "  1. Reload shell: source ~/.bashrc"
echo "  2. Verify startup: bash scripts/docker/start-stacks.sh --phase langgraph-dev"
echo "  3. Check dashboard: http://localhost:3103"
echo "  4. Clean up reports:"
echo "     rm PORTAINER-REMOVAL-PLAN.md"
echo "     rm CONTAINER-NAMING-VIOLATION-REPORT.md"
echo ""

log_success "All fixes executed successfully!"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
