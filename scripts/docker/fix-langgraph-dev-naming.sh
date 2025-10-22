#!/bin/bash
# ==============================================================================
# Fix LangGraph Dev Stack Naming Convention Violations
# ==============================================================================
# This script fixes the container naming violations in the LangGraph dev stack:
#   1. Adds project name to compose file
#   2. Updates image references to use img-* pattern
#   3. Rebuilds/retags images
#   4. Recreates containers with correct names
#
# Usage:
#   bash scripts/docker/fix-langgraph-dev-naming.sh [--dry-run]
#
# Options:
#   --dry-run    Show what would be done without making changes
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
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/infrastructure/compose/docker-compose.langgraph-dev.yml"
BUILD_SCRIPT="${REPO_ROOT}/scripts/docker/build-images.sh"
BACKUP_DIR="${REPO_ROOT}/.backups/naming-fix-$(date +%Y%m%d-%H%M%S)"

# Flags
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --help|-h)
            echo "Usage: $(basename "$0") [--dry-run]"
            echo ""
            echo "Fixes container naming convention violations in LangGraph dev stack"
            echo ""
            echo "Options:"
            echo "  --dry-run    Show what would be done without making changes"
            echo "  --help       Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

log_info() {
    echo -e "${BLUE}ℹ${NC}  $*"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $*"
}

log_error() {
    echo -e "${RED}✗${NC}  $*"
}

section() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━ $* ━━━${NC}"
    echo ""
}

confirm() {
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would ask: $1"
        return 0
    fi
    
    read -p "$(echo -e "${YELLOW}⚠${NC}  $1 (y/N): ")" -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

run_command() {
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would run: $*"
        return 0
    else
        "$@"
    fi
}

# Banner
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🔧 ${BOLD}LangGraph Dev Naming Fix${NC}${CYAN}                             ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "DRY RUN MODE - No changes will be made"
fi

# Check current state
section "Current State Analysis"

VIOLATIONS_FOUND=false

if docker ps --format "{{.Names}}" | grep -q "^compose-infra-langgraph-dev"; then
    log_error "Found container with auto-generated name: compose-infra-langgraph-dev"
    VIOLATIONS_FOUND=true
fi

if docker ps --format "{{.Names}}" | grep -qE "^(postgres:16-alpine|redis:7-alpine)"; then
    log_error "Found containers with upstream names (postgres:16-alpine, redis:7-alpine)"
    VIOLATIONS_FOUND=true
fi

if docker ps --format "{{.Image}}" | grep -qE "^(postgres:16-alpine|redis:7-alpine)"; then
    log_error "Found containers using upstream images directly"
    VIOLATIONS_FOUND=true
fi

if [[ "$VIOLATIONS_FOUND" == "false" ]]; then
    log_success "No naming violations detected!"
    log_info "All LangGraph dev containers follow naming convention"
    exit 0
fi

echo ""
log_warning "Naming violations detected in LangGraph dev stack"
echo ""
echo -e "${BOLD}Current containers:${NC}"
docker ps --filter "name=dev" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""

if ! confirm "Fix naming violations?"; then
    log_info "Aborted by user"
    exit 0
fi

# Create backup
section "Creating Backups"

run_command mkdir -p "$BACKUP_DIR"
run_command cp "$COMPOSE_FILE" "${BACKUP_DIR}/docker-compose.langgraph-dev.yml.bak"
run_command cp "$BUILD_SCRIPT" "${BACKUP_DIR}/build-images.sh.bak"

log_success "Backups created in: $BACKUP_DIR"

# Step 1: Update build script
section "Updating Build Script"

log_info "Adding dev image retags to build-images.sh..."

if [[ "$DRY_RUN" == "false" ]]; then
    # Add after line with data-postgress-langgraph
    sed -i '/data-postgress-langgraph=postgres:16-alpine/a\    "infra-postgres-dev=postgres:16-alpine"\n    "infra-redis-dev=redis:7-alpine"' "$BUILD_SCRIPT"
    log_success "Build script updated"
else
    log_warning "[DRY RUN] Would update build-images.sh"
fi

# Step 2: Update compose file
section "Updating Compose File"

log_info "Adding project name to compose file..."

if [[ "$DRY_RUN" == "false" ]]; then
    # Add 'name: langgraph-dev' at the beginning
    sed -i '1i name: langgraph-dev\n' "$COMPOSE_FILE"
    
    # Update image references
    sed -i 's|image: postgres:16-alpine|image: img-infra-postgres-dev:${IMG_VERSION:-2025.10.19}|g' "$COMPOSE_FILE"
    sed -i 's|image: redis:7-alpine|image: img-infra-redis-dev:${IMG_VERSION:-2025.10.19}|g' "$COMPOSE_FILE"
    
    log_success "Compose file updated"
else
    log_warning "[DRY RUN] Would update docker-compose.langgraph-dev.yml"
fi

# Step 3: Rebuild images
section "Building Images"

log_info "Building/retagging dev images..."

if [[ "$DRY_RUN" == "false" ]]; then
    (
        cd "$REPO_ROOT"
        
        # Retag postgres
        log_info "Retagging postgres:16-alpine -> img-infra-postgres-dev:2025.10.19"
        docker pull postgres:16-alpine >/dev/null
        docker tag postgres:16-alpine img-infra-postgres-dev:2025.10.19
        
        # Retag redis
        log_info "Retagging redis:7-alpine -> img-infra-redis-dev:2025.10.19"
        docker pull redis:7-alpine >/dev/null
        docker tag redis:7-alpine img-infra-redis-dev:2025.10.19
        
        log_success "Dev images built/retagged"
    )
else
    log_warning "[DRY RUN] Would build/retag images"
fi

# Step 4: Recreate containers
section "Recreating Containers"

log_info "Stopping old containers..."

if [[ "$DRY_RUN" == "false" ]]; then
    docker compose -f "$COMPOSE_FILE" down
    log_success "Old containers stopped and removed"
else
    log_warning "[DRY RUN] Would run: docker compose down"
fi

log_info "Starting containers with new naming..."

if [[ "$DRY_RUN" == "false" ]]; then
    docker compose -f "$COMPOSE_FILE" up -d
    log_success "New containers started"
else
    log_warning "[DRY RUN] Would run: docker compose up -d"
fi

# Verification
section "Verification"

if [[ "$DRY_RUN" == "false" ]]; then
    echo ""
    echo -e "${BOLD}New container state:${NC}"
    docker ps --filter "name=dev" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    echo ""
    
    # Check for violations
    VIOLATIONS_REMAINING=false
    
    if docker ps --format "{{.Names}}" | grep -q "^compose-infra"; then
        log_error "Still found auto-generated names!"
        VIOLATIONS_REMAINING=true
    fi
    
    if docker ps --format "{{.Names}}" | grep -qE "^(postgres:|redis:)"; then
        log_error "Still found upstream container names!"
        VIOLATIONS_REMAINING=true
    fi
    
    if docker ps --format "{{.Image}}" | grep -qE "^(postgres:16-alpine|redis:7-alpine)$"; then
        log_error "Still found upstream image names!"
        VIOLATIONS_REMAINING=true
    fi
    
    if [[ "$VIOLATIONS_REMAINING" == "true" ]]; then
        log_error "Violations still exist after fix!"
        log_info "Check logs and try manual fix"
        log_info "Restore from backup: $BACKUP_DIR"
        exit 1
    fi
    
    # Positive checks
    if docker ps --format "{{.Names}}" | grep -q "^infra-langgraph-dev$"; then
        log_success "Container 'infra-langgraph-dev' running"
    else
        log_error "Container 'infra-langgraph-dev' not found!"
    fi
    
    if docker ps --format "{{.Names}}" | grep -q "^infra-postgres-dev$"; then
        log_success "Container 'infra-postgres-dev' running"
    else
        log_error "Container 'infra-postgres-dev' not found!"
    fi
    
    if docker ps --format "{{.Names}}" | grep -q "^infra-redis-dev$"; then
        log_success "Container 'infra-redis-dev' running"
    else
        log_error "Container 'infra-redis-dev' not found!"
    fi
    
    # Health check
    log_info "Checking LangGraph dev health..."
    sleep 5
    
    if curl -sf http://localhost:8112/health >/dev/null 2>&1; then
        log_success "LangGraph dev is healthy!"
    else
        log_warning "LangGraph dev health check failed (may need time to start)"
    fi
else
    log_warning "[DRY RUN] Would verify new container state"
fi

# Summary
section "🎉 Fix Complete!"

if [[ "$DRY_RUN" == "false" ]]; then
    echo -e "${GREEN}✓ Build script updated${NC}"
    echo -e "${GREEN}✓ Compose file updated${NC}"
    echo -e "${GREEN}✓ Images retagged${NC}"
    echo -e "${GREEN}✓ Containers recreated${NC}"
    echo -e "${GREEN}✓ Naming violations fixed${NC}"
    echo ""
    
    log_info "Next steps:"
    echo "  1. Verify services: docker ps | grep infra-dev"
    echo "  2. Test LangGraph: curl http://localhost:8112/health"
    echo "  3. Check startup: bash scripts/docker/start-stacks.sh --phase langgraph-dev"
    echo "  4. Delete backup: rm -rf $BACKUP_DIR"
    echo ""
    
    log_success "LangGraph dev stack now follows naming convention!"
else
    log_warning "DRY RUN complete - no changes made"
    log_info "Run without --dry-run to apply fixes"
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
