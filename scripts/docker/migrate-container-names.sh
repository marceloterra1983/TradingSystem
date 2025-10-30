#!/usr/bin/env bash
# ==============================================================================
# Container Naming Migration Script
# ==============================================================================
# Description: Migrates containers to new naming convention
# Usage: ./migrate-container-names.sh [--stack STACK] [--dry-run]
# ==============================================================================

set -euo pipefail

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Options
DRY_RUN=false
SPECIFIC_STACK=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --stack)
      SPECIFIC_STACK="$2"
      shift 2
      ;;
    --help)
      cat <<'EOF'
Container Naming Migration Script

Usage: ./migrate-container-names.sh [OPTIONS]

Options:
  --dry-run           Show what would be done without executing
  --stack STACK       Migrate only specific stack (apps, data, docs, tools, monitor, rag)
  --help              Show this help message

Examples:
  ./migrate-container-names.sh --dry-run
  ./migrate-container-names.sh --stack apps
  ./migrate-container-names.sh --stack data --dry-run

EOF
      exit 0
      ;;
    *)
      echo -e "${RED}[ERROR]${NC} Unknown option: $1"
      exit 1
      ;;
  esac
done

# Logging functions
log() {
  echo -e "${BLUE}[MIGRATE]${NC} $1"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Migration mapping
declare -A MIGRATION_MAP=(
  # APPS
  ["apps-tp-capital"]="apps-tpcapital"
  # apps-workspace stays the same

  # DATA
  ["data-timescaledb"]="data-timescale"
  ["data-timescaledb-backup"]="data-timescale-backup"
  ["data-timescaledb-adminer"]="data-timescale-admin"
  ["data-timescaledb-pgweb"]="data-timescale-pgweb"
  ["data-timescaledb-pgadmin"]="data-timescale-pgadmin"
  ["data-timescaledb-exporter"]="data-timescale-exporter"
  ["data-postgress-langgraph"]="data-postgres-langgraph"

  # DOCS
  ["documentation"]="docs-hub"
  # docs-api stays the same

  # TOOLS
  ["firecrawl-proxy"]="tools-firecrawl-proxy"
  ["firecrawl-api"]="tools-firecrawl-api"
  ["firecrawl-playwright"]="tools-firecrawl-playwright"
  ["firecrawl-postgres"]="tools-firecrawl-postgres"
  ["firecrawl-redis"]="tools-firecrawl-redis"

  # MONITOR
  ["mon-prometheus"]="monitor-prometheus"
  ["mon-grafana"]="monitor-grafana"
  ["mon-alertmanager"]="monitor-alertmanager"
  ["mon-alert-router"]="monitor-alert-router"

  # RAG
  ["ollama"]="rag-ollama"
  ["tools-llamaindex-ingestion"]="rag-llamaindex-ingest"
  ["tools-llamaindex-query"]="rag-llamaindex-query"
)

# Get stack from container name
get_stack() {
  local container_name="$1"
  local new_name="${MIGRATION_MAP[$container_name]:-$container_name}"

  if [[ "$new_name" =~ ^apps- ]]; then
    echo "apps"
  elif [[ "$new_name" =~ ^data- ]]; then
    echo "data"
  elif [[ "$new_name" =~ ^docs- ]]; then
    echo "docs"
  elif [[ "$new_name" =~ ^tools- ]]; then
    echo "tools"
  elif [[ "$new_name" =~ ^monitor- ]]; then
    echo "monitor"
  elif [[ "$new_name" =~ ^rag- ]]; then
    echo "rag"
  else
    echo "unknown"
  fi
}

# Check if container exists
container_exists() {
  docker ps -a --format '{{.Names}}' | grep -q "^$1$"
}

# Rename container
rename_container() {
  local old_name="$1"
  local new_name="$2"

  if ! container_exists "$old_name"; then
    warn "Container $old_name does not exist, skipping"
    return 1
  fi

  if container_exists "$new_name"; then
    warn "Container $new_name already exists, skipping"
    return 1
  fi

  log "Renaming: $old_name → $new_name"

  if [[ "$DRY_RUN" == true ]]; then
    echo "  [DRY-RUN] Would execute: docker rename $old_name $new_name"
    return 0
  fi

  if docker rename "$old_name" "$new_name"; then
    success "Renamed: $old_name → $new_name"
    return 0
  else
    error "Failed to rename: $old_name"
    return 1
  fi
}

# Main migration logic
main() {
  log "Starting container migration..."

  if [[ "$DRY_RUN" == true ]]; then
    warn "DRY-RUN MODE: No changes will be made"
  fi

  if [[ -n "$SPECIFIC_STACK" ]]; then
    log "Migrating only stack: $SPECIFIC_STACK"
  fi

  local total=0
  local renamed=0
  local skipped=0
  local failed=0

  # Iterate through migration map
  for old_name in "${!MIGRATION_MAP[@]}"; do
    new_name="${MIGRATION_MAP[$old_name]}"
    stack=$(get_stack "$old_name")

    # Skip if filtering by stack
    if [[ -n "$SPECIFIC_STACK" && "$stack" != "$SPECIFIC_STACK" ]]; then
      continue
    fi

    total=$((total + 1))

    if rename_container "$old_name" "$new_name"; then
      renamed=$((renamed + 1))
    else
      skipped=$((skipped + 1))
    fi
  done

  echo ""
  log "Migration Summary:"
  echo "  Total containers: $total"
  echo "  Renamed: $renamed"
  echo "  Skipped: $skipped"
  echo "  Failed: $failed"

  if [[ "$DRY_RUN" == true ]]; then
    echo ""
    warn "This was a DRY-RUN. Run without --dry-run to apply changes."
  fi
}

# Execute
main
