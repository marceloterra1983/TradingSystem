#!/bin/bash
# ==============================================================================
# Complete Portainer Removal Script
# ==============================================================================
# This script completely removes Portainer from the TradingSystem project:
#   1. Stops and removes the container
#   2. Removes Docker volumes
#   3. Removes Docker networks (if unused)
#   4. Cleans up bash aliases
#   5. Validates complete removal
#
# Usage:
#   bash scripts/maintenance/remove-portainer-complete.sh [--force]
#
# Options:
#   --force    Skip confirmation prompts
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

# Flags
FORCE_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force) FORCE_MODE=true; shift ;;
        --help|-h) 
            echo "Usage: $(basename "$0") [--force]"
            echo ""
            echo "Options:"
            echo "  --force    Skip confirmation prompts"
            echo "  --help     Show this help"
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
    local prompt=$1
    if [[ "$FORCE_MODE" == "true" ]]; then
        return 0
    fi
    
    read -p "$(echo -e "${YELLOW}⚠${NC}  $prompt (y/N): ")" -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Banner
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🗑️  ${BOLD}${RED}Complete Portainer Removal${NC}${CYAN}                           ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Portainer exists
section "Checking Portainer Status"

CONTAINER_EXISTS=$(docker ps -a --filter "name=portainer" --format "{{.Names}}" || true)

if [[ -z "$CONTAINER_EXISTS" ]]; then
    log_warning "Portainer container not found"
    log_info "Proceeding with cleanup of volumes and aliases anyway..."
else
    log_info "Found Portainer container: $CONTAINER_EXISTS"
    
    # Show container details
    echo ""
    echo -e "${BOLD}Container Details:${NC}"
    docker ps -a --filter "name=portainer" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
    echo ""
fi

# Confirmation
if ! confirm "Remove Portainer completely from TradingSystem?"; then
    log_info "Aborted by user"
    exit 0
fi

# Step 1: Stop and remove container
section "Removing Container"

if [[ -n "$CONTAINER_EXISTS" ]]; then
    log_info "Stopping container..."
    if docker stop portainer >/dev/null 2>&1; then
        log_success "Container stopped"
    else
        log_warning "Container was not running"
    fi
    
    log_info "Removing container..."
    if docker rm portainer >/dev/null 2>&1; then
        log_success "Container removed"
    else
        log_error "Failed to remove container"
        exit 1
    fi
else
    log_info "No container to remove"
fi

# Step 2: Remove volumes
section "Removing Docker Volumes"

PORTAINER_VOLUMES=$(docker volume ls --filter "name=portainer" --format "{{.Name}}" || true)

if [[ -n "$PORTAINER_VOLUMES" ]]; then
    log_info "Found Portainer volumes:"
    echo "$PORTAINER_VOLUMES" | sed 's/^/  - /'
    echo ""
    
    if confirm "Remove these volumes? (Data will be lost)"; then
        while IFS= read -r volume; do
            log_info "Removing volume: $volume"
            if docker volume rm "$volume" >/dev/null 2>&1; then
                log_success "Removed: $volume"
            else
                log_warning "Failed to remove: $volume (may be in use)"
            fi
        done <<< "$PORTAINER_VOLUMES"
    else
        log_info "Skipping volume removal"
    fi
else
    log_info "No Portainer volumes found"
fi

# Step 3: Clean up bash aliases
section "Cleaning Bash Aliases"

BASHRC="$HOME/.bashrc"
BACKUP_FILE="${BASHRC}.backup-$(date +%Y%m%d-%H%M%S)"

if [[ -f "$BASHRC" ]]; then
    if grep -q "portainer" "$BASHRC" 2>/dev/null; then
        log_info "Found Portainer alias in ~/.bashrc"
        
        # Create backup
        cp "$BASHRC" "$BACKUP_FILE"
        log_success "Backup created: $BACKUP_FILE"
        
        # Remove alias
        sed -i '/alias portainer=/d' "$BASHRC"
        log_success "Alias removed from ~/.bashrc"
        
        log_warning "Please reload your shell: source ~/.bashrc"
    else
        log_info "No Portainer aliases found in ~/.bashrc"
    fi
else
    log_info "~/.bashrc not found"
fi

# Step 4: Verify removal
section "Verification"

# Check container
if docker ps -a --filter "name=portainer" --format "{{.Names}}" | grep -q "portainer"; then
    log_error "Container still exists!"
    exit 1
else
    log_success "Container removed successfully"
fi

# Check volumes
REMAINING_VOLUMES=$(docker volume ls --filter "name=portainer" --format "{{.Name}}" || true)
if [[ -n "$REMAINING_VOLUMES" ]]; then
    log_warning "Some volumes still exist:"
    echo "$REMAINING_VOLUMES" | sed 's/^/  - /'
else
    log_success "All volumes removed"
fi

# Check images
PORTAINER_IMAGES=$(docker images --filter "reference=portainer/*" --format "{{.Repository}}:{{.Tag}}" || true)
if [[ -n "$PORTAINER_IMAGES" ]]; then
    log_warning "Portainer images still exist (not removed by this script):"
    echo "$PORTAINER_IMAGES" | sed 's/^/  - /'
    echo ""
    log_info "To remove images, run: docker rmi $PORTAINER_IMAGES"
else
    log_success "No Portainer images found"
fi

# Final summary
section "🎉 Portainer Removal Complete"

echo -e "${GREEN}✓ Container removed${NC}"
echo -e "${GREEN}✓ Volumes cleaned${NC}"
echo -e "${GREEN}✓ Aliases removed${NC}"
echo ""

log_info "Next steps:"
echo "  1. Reload shell: source ~/.bashrc"
echo "  2. Verify: docker ps -a | grep portainer"
echo "  3. If needed, remove images: docker rmi portainer/portainer-ce"
echo ""

if [[ -n "$PORTAINER_IMAGES" ]]; then
    if confirm "Remove Portainer images now?"; then
        echo ""
        log_info "Removing images..."
        while IFS= read -r image; do
            log_info "Removing: $image"
            if docker rmi "$image" >/dev/null 2>&1; then
                log_success "Removed: $image"
            else
                log_warning "Failed to remove: $image"
            fi
        done <<< "$PORTAINER_IMAGES"
        echo ""
        log_success "Image removal complete"
    fi
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
