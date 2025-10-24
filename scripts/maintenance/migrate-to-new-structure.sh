#!/bin/bash
# Migration script for new shell script structure
# Creates compatibility symlinks and updates references
#
# Usage: bash scripts/migrate-to-new-structure.sh [--dry-run]
#
# Author: TradingSystem Team
# Last Modified: 2025-10-15

set -euo pipefail

# Load common
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/lib/common.sh" ]]; then
    # shellcheck source=scripts/lib/common.sh
    source "$SCRIPT_DIR/lib/common.sh"
else
    log_info() { echo "[INFO] $*"; }
    log_success() { echo "[SUCCESS] $*"; }
    log_warning() { echo "[WARNING] $*"; }
    log_error() { echo "[ERROR] $*"; }
fi

PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

section() {
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "  $1"
    echo "════════════════════════════════════════════════════════"
    echo ""
}

section "TradingSystem - Script Structure Migration"

if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "DRY RUN MODE - No changes will be made"
    echo ""
fi

# Compatibility symlinks (old path -> new path)
declare -A SYMLINKS=(
    ["start-all-services.sh"]="scripts/services/start-all.sh"
    ["check-services.sh"]="scripts/services/status.sh"
    ["install-dependencies.sh"]="scripts/setup/install-dependencies.sh"
    ["check-docker-permissions.sh"]="scripts/docker/verify-docker.sh"
)

section "Creating Compatibility Symlinks"

for old_path in "${!SYMLINKS[@]}"; do
    new_path="${SYMLINKS[$old_path]}"
    
    log_info "Linking: $old_path -> $new_path"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        # Remove old file if exists
        if [[ -f "$PROJECT_ROOT/$old_path" ]] && [[ ! -L "$PROJECT_ROOT/$old_path" ]]; then
            log_warning "  Backing up old file: ${old_path}.bak"
            mv "$PROJECT_ROOT/$old_path" "$PROJECT_ROOT/${old_path}.bak"
        fi
        
        # Create symlink
        ln -sf "$new_path" "$PROJECT_ROOT/$old_path"
        log_success "  Created symlink"
    fi
done

section "Cleaning Up Duplicate Scripts"

# Scripts to remove (duplicates/obsolete)
REMOVE_SCRIPTS=(
    "scripts/start-all-services.sh"
    "scripts/stop-all-services.sh"
    "scripts/start-services.sh"
)

for script in "${REMOVE_SCRIPTS[@]}"; do
    if [[ -f "$PROJECT_ROOT/$script" ]] && [[ ! -L "$PROJECT_ROOT/$script" ]]; then
        log_info "Removing duplicate: $script"
        
        if [[ "$DRY_RUN" == "false" ]]; then
            mv "$PROJECT_ROOT/$script" "$PROJECT_ROOT/${script}.bak"
            log_success "  Moved to ${script}.bak"
        fi
    fi
done

section "Removing Unused Scripts"

# Firecrawl scripts (if not used)
if [[ -d "$PROJECT_ROOT/tools/firecrawl" ]]; then
    log_warning "Firecrawl scripts found in tools/firecrawl"
    log_warning "These will NOT be removed automatically"
    log_warning "If not needed, manually remove: rm -rf tools/firecrawl"
fi

section "Summary"

log_success "Migration completed successfully!"
echo ""
echo "📋 Changes Made:"
echo "  ✅ Created ${#SYMLINKS[@]} compatibility symlink(s)"
echo "  ✅ Backed up ${#REMOVE_SCRIPTS[@]} duplicate script(s)"
echo ""
echo "📂 New Structure:"
echo "  scripts/lib/        - Shared libraries"
echo "  scripts/services/   - Service management"
echo "  scripts/docker/     - Docker orchestration"
echo "  scripts/setup/      - Installation scripts"
echo "  scripts/backup/     - Backup utilities"
echo "  scripts/utils/      - Miscellaneous tools"
echo ""
echo "📚 Documentation:"
echo "  docs/context/ops/scripts/README.md"
echo ""
echo "🔍 Validation:"
echo "  bash scripts/validate.sh"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    echo "ℹ️  This was a DRY RUN. Run without --dry-run to apply changes."
fi

