#!/bin/bash
#
# Workspace Data Migration Script: TimescaleDB → Neon
# 
# This script migrates workspace data from TimescaleDB to Neon PostgreSQL.
# It exports data from TimescaleDB and imports it into Neon, preserving
# all relationships and constraints.
#
# Usage:
#   bash scripts/database/migrate-workspace-to-neon.sh [--dry-run] [--backup]
#
# Options:
#   --dry-run    : Show what would be migrated without actually migrating
#   --backup     : Create backup of TimescaleDB data before migration
#   --force      : Skip confirmation prompts
#
# Requirements:
#   - Both TimescaleDB and Neon containers must be running
#   - psql client installed (or run via docker exec)
#   - Sufficient disk space for backup files
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMESCALE_CONTAINER="data-timescale"
TIMESCALE_USER="timescale"
TIMESCALE_DB="APPS-WORKSPACE"
TIMESCALE_SCHEMA="workspace"

NEON_CONTAINER="neon-compute"
NEON_USER="postgres"
NEON_DB="workspace"
NEON_SCHEMA="workspace"

BACKUP_DIR="/tmp/workspace-migration-$(date +%Y%m%d-%H%M%S)"
DRY_RUN=false
CREATE_BACKUP=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --backup)
      CREATE_BACKUP=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if containers are running
check_containers() {
    log_step "Checking if containers are running..."
    
    if ! docker ps | grep -q "$TIMESCALE_CONTAINER"; then
        log_error "TimescaleDB container '$TIMESCALE_CONTAINER' is not running!"
        exit 1
    fi
    
    if ! docker ps | grep -q "$NEON_CONTAINER"; then
        log_error "Neon container '$NEON_CONTAINER' is not running!"
        log_info "Start Workspace stack with: bash scripts/docker/start-workspace-stack.sh"
        log_info "Or: docker compose -f tools/compose/docker-compose.workspace-stack.yml up -d"
        exit 1
    fi
    
    log_info "✓ All containers are running"
}

# Count records in TimescaleDB
count_timescale_records() {
    log_step "Counting records in TimescaleDB..."
    
    local items_count=$(docker exec "$TIMESCALE_CONTAINER" psql -U "$TIMESCALE_USER" -d "$TIMESCALE_DB" -tAc \
        "SELECT COUNT(*) FROM $TIMESCALE_SCHEMA.workspace_items" 2>/dev/null || echo "0")
    
    local categories_count=$(docker exec "$TIMESCALE_CONTAINER" psql -U "$TIMESCALE_USER" -d "$TIMESCALE_DB" -tAc \
        "SELECT COUNT(*) FROM $TIMESCALE_SCHEMA.workspace_categories" 2>/dev/null || echo "0")
    
    echo ""
    log_info "TimescaleDB Records:"
    echo "  └─ workspace_items: $items_count"
    echo "  └─ workspace_categories: $categories_count"
    echo ""
    
    if [ "$items_count" = "0" ] && [ "$categories_count" = "0" ]; then
        log_warn "No data found in TimescaleDB to migrate"
        return 1
    fi
    
    return 0
}

# Create backup
create_backup() {
    if [ "$CREATE_BACKUP" = false ]; then
        return 0
    fi
    
    log_step "Creating backup of TimescaleDB data..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Export schema
    docker exec "$TIMESCALE_CONTAINER" pg_dump \
        -U "$TIMESCALE_USER" \
        -d "$TIMESCALE_DB" \
        --schema-only \
        --schema="$TIMESCALE_SCHEMA" \
        > "$BACKUP_DIR/schema.sql"
    
    # Export data
    docker exec "$TIMESCALE_CONTAINER" pg_dump \
        -U "$TIMESCALE_USER" \
        -d "$TIMESCALE_DB" \
        --data-only \
        --schema="$TIMESCALE_SCHEMA" \
        --table="$TIMESCALE_SCHEMA.workspace_items" \
        --table="$TIMESCALE_SCHEMA.workspace_categories" \
        > "$BACKUP_DIR/data.sql"
    
    log_info "✓ Backup created at: $BACKUP_DIR"
}

# Export data from TimescaleDB
export_data() {
    log_step "Exporting data from TimescaleDB..."
    
    mkdir -p /tmp
    
    # Export categories first (referenced by items via FK)
    docker exec "$TIMESCALE_CONTAINER" psql -U "$TIMESCALE_USER" -d "$TIMESCALE_DB" <<-EOSQL > /tmp/workspace-export.sql
        SET search_path TO $TIMESCALE_SCHEMA;
        
        -- Export categories
        COPY workspace_categories TO STDOUT WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"');
        
        -- Export items
        COPY workspace_items TO STDOUT WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"');
EOSQL
    
    log_info "✓ Data exported to /tmp/workspace-export.sql"
}

# Import data to Neon
import_data() {
    if [ "$DRY_RUN" = true ]; then
        log_warn "DRY RUN: Skipping data import"
        return 0
    fi
    
    log_step "Importing data to Neon..."
    
    # Clear existing data (if any)
    docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DB" <<-EOSQL
        TRUNCATE TABLE $NEON_SCHEMA.workspace_items CASCADE;
        TRUNCATE TABLE $NEON_SCHEMA.workspace_categories CASCADE;
EOSQL
    
    # Import categories first
    log_info "Importing categories..."
    docker exec "$TIMESCALE_CONTAINER" psql -U "$TIMESCALE_USER" -d "$TIMESCALE_DB" -tAc \
        "COPY (SELECT * FROM $TIMESCALE_SCHEMA.workspace_categories) TO STDOUT WITH (FORMAT csv, HEADER false)" | \
    docker exec -i "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DB" -c \
        "COPY $NEON_SCHEMA.workspace_categories FROM STDIN WITH (FORMAT csv)"
    
    # Import items
    log_info "Importing items..."
    docker exec "$TIMESCALE_CONTAINER" psql -U "$TIMESCALE_USER" -d "$TIMESCALE_DB" -tAc \
        "COPY (SELECT * FROM $TIMESCALE_SCHEMA.workspace_items) TO STDOUT WITH (FORMAT csv, HEADER false)" | \
    docker exec -i "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DB" -c \
        "COPY $NEON_SCHEMA.workspace_items FROM STDIN WITH (FORMAT csv)"
    
    # Reset sequences
    docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DB" <<-EOSQL
        SELECT setval('$NEON_SCHEMA.workspace_items_id_seq', 
            (SELECT COALESCE(MAX(id), 1) FROM $NEON_SCHEMA.workspace_items));
EOSQL
    
    log_info "✓ Data imported successfully"
}

# Verify migration
verify_migration() {
    log_step "Verifying migration..."
    
    local neon_items_count=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DB" -tAc \
        "SELECT COUNT(*) FROM $NEON_SCHEMA.workspace_items" 2>/dev/null || echo "0")
    
    local neon_categories_count=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DB" -tAc \
        "SELECT COUNT(*) FROM $NEON_SCHEMA.workspace_categories" 2>/dev/null || echo "0")
    
    local timescale_items_count=$(docker exec "$TIMESCALE_CONTAINER" psql -U "$TIMESCALE_USER" -d "$TIMESCALE_DB" -tAc \
        "SELECT COUNT(*) FROM $TIMESCALE_SCHEMA.workspace_items" 2>/dev/null || echo "0")
    
    local timescale_categories_count=$(docker exec "$TIMESCALE_CONTAINER" psql -U "$TIMESCALE_USER" -d "$TIMESCALE_DB" -tAc \
        "SELECT COUNT(*) FROM $TIMESCALE_SCHEMA.workspace_categories" 2>/dev/null || echo "0")
    
    echo ""
    log_info "Migration Verification:"
    echo "  TimescaleDB → Neon"
    echo "  ├─ workspace_items: $timescale_items_count → $neon_items_count"
    echo "  └─ workspace_categories: $timescale_categories_count → $neon_categories_count"
    echo ""
    
    if [ "$neon_items_count" != "$timescale_items_count" ] || [ "$neon_categories_count" != "$timescale_categories_count" ]; then
        log_error "Record counts don't match! Migration may be incomplete."
        return 1
    fi
    
    log_info "✓ Verification successful - all records migrated"
    return 0
}

# Display summary
display_summary() {
    echo ""
    log_info "=========================================="
    log_info "Migration Complete!"
    log_info "=========================================="
    echo ""
    echo "Next Steps:"
    echo "  1. Update environment variable: LIBRARY_DB_STRATEGY=neon"
    echo "  2. Restart workspace service:"
    echo "     docker compose -f tools/compose/docker-compose.apps.yml restart workspace"
    echo "  3. Test the application thoroughly"
    echo "  4. Keep TimescaleDB running as fallback for 2 weeks"
    echo ""
    
    if [ "$CREATE_BACKUP" = true ]; then
        echo "Backup Location: $BACKUP_DIR"
        echo ""
    fi
    
    log_info "=========================================="
}

# Main execution
main() {
    log_info "Workspace Migration: TimescaleDB → Neon"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        log_warn "DRY RUN MODE - No changes will be made"
        echo ""
    fi
    
    check_containers
    
    if ! count_timescale_records; then
        log_warn "No data to migrate. Exiting."
        exit 0
    fi
    
    # Confirmation
    if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
        echo -n "Proceed with migration? (yes/no): "
        read -r response
        if [ "$response" != "yes" ]; then
            log_warn "Migration cancelled by user"
            exit 0
        fi
    fi
    
    create_backup
    import_data
    verify_migration
    display_summary
    
    log_info "✓ Migration complete!"
}

# Run main function
main "$@"

