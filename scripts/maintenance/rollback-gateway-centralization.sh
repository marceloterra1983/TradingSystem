#!/usr/bin/env bash
# ============================================================================
# Gateway Centralization Rollback Script
# ============================================================================
# Purpose: Automated rollback of GATEWAY_PUBLIC_URL centralization changes
# Author: AI Assistant
# Date: 2025-11-14
# Usage: bash scripts/maintenance/rollback-gateway-centralization.sh
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/gateway-centralization"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ============================================================================
# Logging Functions
# ============================================================================
log_info() {
  echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# ============================================================================
# Validation Functions
# ============================================================================
validate_preconditions() {
  log_info "Validating preconditions..."

  # Check if running from project root
  if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
    log_error ".env file not found at $PROJECT_ROOT/.env"
    exit 1
  fi

  # Check if docker is running
  if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running"
    exit 1
  fi

  # Check if backup directory exists
  if [[ ! -d "$BACKUP_DIR" ]]; then
    log_warning "No backup directory found at $BACKUP_DIR"
    log_info "Creating backup of current state before rollback..."
    mkdir -p "$BACKUP_DIR"
  fi

  log_success "Preconditions validated"
}

# ============================================================================
# Backup Current State
# ============================================================================
backup_current_state() {
  log_info "Backing up current state..."

  local CURRENT_BACKUP="$BACKUP_DIR/pre-rollback-$TIMESTAMP"
  mkdir -p "$CURRENT_BACKUP"

  # Backup .env
  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    cp "$PROJECT_ROOT/.env" "$CURRENT_BACKUP/.env"
    log_success "Backed up .env"
  fi

  # Backup compose files
  cp "$PROJECT_ROOT/tools/compose/docker-compose-5-1-n8n-stack.yml" \
     "$CURRENT_BACKUP/docker-compose-5-1-n8n-stack.yml"
  cp "$PROJECT_ROOT/tools/compose/docker-compose.1-dashboard-stack.yml" \
     "$CURRENT_BACKUP/docker-compose.1-dashboard-stack.yml"
  log_success "Backed up compose files"

  # Backup config files
  if [[ -f "$PROJECT_ROOT/config/.env.defaults" ]]; then
    cp "$PROJECT_ROOT/config/.env.defaults" "$CURRENT_BACKUP/.env.defaults"
    log_success "Backed up .env.defaults"
  fi

  log_success "Current state backed up to: $CURRENT_BACKUP"
}

# ============================================================================
# Rollback Environment Variables
# ============================================================================
rollback_env_variables() {
  log_info "Rolling back environment variables..."

  # Find most recent backup before implementation
  local LAST_GOOD_BACKUP=$(find "$BACKUP_DIR" -name ".env" -type f | \
    grep -v "pre-rollback" | sort -r | head -1)

  if [[ -n "$LAST_GOOD_BACKUP" ]]; then
    log_info "Found backup: $LAST_GOOD_BACKUP"
    read -p "Restore this backup? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      cp "$LAST_GOOD_BACKUP" "$PROJECT_ROOT/.env"
      log_success "Environment variables restored from backup"
    else
      log_info "Skipping .env restore"
    fi
  else
    log_warning "No backup found - manual .env editing required"
    log_info "Remove or comment out the following lines from .env:"
    echo ""
    echo "  GATEWAY_PUBLIC_URL=http://localhost:9082"
    echo ""
    read -p "Press Enter after manual edit..."
  fi
}

# ============================================================================
# Rollback Git Changes
# ============================================================================
rollback_git_changes() {
  log_info "Rolling back git changes..."

  cd "$PROJECT_ROOT"

  # Show changed files
  echo ""
  log_info "Files changed since last commit:"
  git diff --name-only HEAD

  echo ""
  read -p "Revert all changes? (y/N): " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Stash current changes as safety backup
    git stash save "Rollback safety backup - $TIMESTAMP"
    log_success "Changes stashed as safety backup"

    # Reset to HEAD
    git reset --hard HEAD
    log_success "Git changes reverted to HEAD"

    # Offer to revert specific commits
    echo ""
    log_info "Recent commits:"
    git log --oneline -5

    echo ""
    read -p "Revert specific commit? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
      read -p "Enter commit hash to revert: " COMMIT_HASH
      git revert "$COMMIT_HASH" --no-edit
      log_success "Commit $COMMIT_HASH reverted"
    fi
  else
    log_info "Skipping git rollback"
  fi
}

# ============================================================================
# Restart Services
# ============================================================================
restart_services() {
  log_info "Restarting affected services..."

  cd "$PROJECT_ROOT"

  # Stop services
  log_info "Stopping n8n stack..."
  docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml down || true

  log_info "Stopping dashboard stack..."
  docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml down || true

  # Wait for clean shutdown
  sleep 3

  # Start services
  log_info "Starting n8n stack..."
  docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml up -d

  log_info "Starting dashboard stack..."
  docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d

  # Wait for startup
  sleep 5

  log_success "Services restarted"
}

# ============================================================================
# Verify Rollback
# ============================================================================
verify_rollback() {
  log_info "Verifying rollback..."

  # Test gateway
  if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:9082/" | grep -qE "^(200|301|302)$"; then
    log_success "Gateway is accessible"
  else
    log_error "Gateway is not accessible"
  fi

  # Test n8n
  if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:9082/n8n/" | grep -qE "^(200|301|302|401)$"; then
    log_success "N8N endpoint is accessible"
  else
    log_warning "N8N endpoint may not be accessible yet (still starting?)"
  fi

  # Check container health
  log_info "Container health status:"
  docker ps --filter "name=n8n" --format "table {{.Names}}\t{{.Status}}"
  docker ps --filter "name=dashboard" --format "table {{.Names}}\t{{.Status}}"

  echo ""
  log_info "Please verify manually:"
  echo "  1. Open http://localhost:9082/n8n/"
  echo "  2. Test login"
  echo "  3. Check webhook URLs in workflows"
  echo "  4. Monitor logs: docker logs n8n -f"
}

# ============================================================================
# Main Execution
# ============================================================================
main() {
  echo "============================================================"
  echo "  Gateway Centralization Rollback"
  echo "============================================================"
  echo ""
  echo -e "${YELLOW}WARNING: This will rollback gateway centralization changes${NC}"
  echo ""
  read -p "Continue with rollback? (y/N): " -n 1 -r
  echo
  echo ""

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Rollback cancelled"
    exit 0
  fi

  # Execute rollback steps
  validate_preconditions
  backup_current_state
  rollback_env_variables
  rollback_git_changes
  restart_services
  verify_rollback

  echo ""
  echo "============================================================"
  log_success "Rollback completed!"
  echo "============================================================"
  echo ""
  echo "Next steps:"
  echo "  1. Verify n8n login: http://localhost:9082/n8n/"
  echo "  2. Check webhook URLs in workflows"
  echo "  3. Monitor logs: docker logs n8n -f --tail 50"
  echo "  4. Run health check: bash scripts/maintenance/health-check-all.sh"
  echo ""
  log_info "Backup location: $BACKUP_DIR/pre-rollback-$TIMESTAMP"
  echo ""
}

# Execute main function
main "$@"
