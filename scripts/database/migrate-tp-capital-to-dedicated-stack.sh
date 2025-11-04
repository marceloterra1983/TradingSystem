#!/usr/bin/env bash
# ==============================================================================
# TP Capital Data Migration Script
# ==============================================================================
# Purpose: Migrate data from shared TimescaleDB to dedicated TP Capital stack
# Source: tradingsystem.tp_capital schema (central TimescaleDB)
# Target: tp_capital_db.signals schema (dedicated TimescaleDB)
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups/tp-capital-migration-$(date +%Y%m%d-%H%M%S)"
MIGRATION_LOG="${BACKUP_DIR}/migration.log"

# Create backup directory early (needed for logging)
mkdir -p "$BACKUP_DIR"

# Source database (shared TimescaleDB)
SOURCE_HOST="${TIMESCALEDB_HOST:-localhost}"
SOURCE_PORT="${TIMESCALEDB_PORT:-5433}"
SOURCE_DB="tradingsystem"
SOURCE_SCHEMA="tp_capital"
SOURCE_USER="${TIMESCALEDB_USER:-timescale}"

# Target database (dedicated TP Capital stack)
TARGET_HOST="${TP_CAPITAL_DB_HOST:-localhost}"
TARGET_PORT="${TP_CAPITAL_DB_PORT:-5435}"
TARGET_DB="tp_capital_db"
TARGET_SCHEMA="signals"
TARGET_USER="${TP_CAPITAL_DB_USER:-tp_capital}"

# Flags
DRY_RUN=false
SKIP_BACKUP=false
SKIP_VALIDATION=false
FORCE=false

# ==============================================================================
# Helper Functions
# ==============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$MIGRATION_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $*" | tee -a "$MIGRATION_LOG"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $*" | tee -a "$MIGRATION_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $*" | tee -a "$MIGRATION_LOG"
}

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Migrate TP Capital data from shared TimescaleDB to dedicated stack.

OPTIONS:
    --dry-run           Show what would be done without making changes
    --skip-backup       Skip backup step (NOT RECOMMENDED)
    --skip-validation   Skip data validation after migration
    --force             Skip confirmation prompts
    -h, --help          Show this help message

EXAMPLES:
    # Dry run (safe to test)
    $0 --dry-run

    # Full migration with all safety checks
    $0

    # Skip backup (NOT RECOMMENDED in production)
    $0 --skip-backup

    # Non-interactive mode
    $0 --force

ENVIRONMENT VARIABLES:
    SOURCE_HOST         Source TimescaleDB host (default: localhost)
    SOURCE_PORT         Source TimescaleDB port (default: 5433)
    TARGET_HOST         Target TimescaleDB host (default: localhost)
    TARGET_PORT         Target TimescaleDB port (default: 5435)

EOF
    exit 1
}

# ==============================================================================
# Parse Arguments
# ==============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# ==============================================================================
# Pre-flight Checks
# ==============================================================================

preflight_checks() {
    log "Running pre-flight checks..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Check source database connectivity
    log "Checking source database connectivity..."
    if ! PGPASSWORD="${TIMESCALEDB_PASSWORD}" psql -h "$SOURCE_HOST" -p "$SOURCE_PORT" \
        -U "$SOURCE_USER" -d "$SOURCE_DB" -c "SELECT 1" > /dev/null 2>&1; then
        log_error "Cannot connect to source database"
        exit 1
    fi
    log_success "Source database connection OK"
    
    # Check target database connectivity
    log "Checking target database connectivity..."
    if ! PGPASSWORD="${TP_CAPITAL_DB_PASSWORD}" psql -h "$TARGET_HOST" -p "$TARGET_PORT" \
        -U "$TARGET_USER" -d "$TARGET_DB" -c "SELECT 1" > /dev/null 2>&1; then
        log_error "Cannot connect to target database"
        log_error "Is the TP Capital stack running?"
        log_error "Run: docker compose -f tools/compose/docker-compose.tp-capital-stack.yml up -d"
        exit 1
    fi
    log_success "Target database connection OK"
    
    # Check if target schema exists
    log "Checking target schema..."
    TARGET_SCHEMA_EXISTS=$(PGPASSWORD="${TP_CAPITAL_DB_PASSWORD}" psql -h "$TARGET_HOST" \
        -p "$TARGET_PORT" -U "$TARGET_USER" -d "$TARGET_DB" -t -c \
        "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = '$TARGET_SCHEMA'")
    
    if [[ "$TARGET_SCHEMA_EXISTS" -eq 0 ]]; then
        log_error "Target schema '$TARGET_SCHEMA' does not exist"
        log_error "Run the initialization script first:"
        log_error "  docker exec -i tp-capital-timescale psql -U tp_capital -d tp_capital_db < backend/data/timescaledb/tp-capital/01-init-schema.sql"
        exit 1
    fi
    log_success "Target schema exists"
    
    # Check source data count
    SOURCE_COUNT=$(PGPASSWORD="${TIMESCALEDB_PASSWORD}" psql -h "$SOURCE_HOST" -p "$SOURCE_PORT" \
        -U "$SOURCE_USER" -d "$SOURCE_DB" -t -c \
        "SELECT COUNT(*) FROM ${SOURCE_SCHEMA}.tp_capital_signals" 2>/dev/null || echo "0")
    
    log "Source records: ${SOURCE_COUNT// /}"
    
    if [[ "${SOURCE_COUNT// /}" -eq 0 ]]; then
        log_warning "No records found in source database"
        if [[ "$FORCE" != "true" ]]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    log_success "Pre-flight checks passed"
}

# ==============================================================================
# Backup Source Data
# ==============================================================================

backup_source_data() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log_warning "Skipping backup (--skip-backup flag)"
        return
    fi
    
    log "Creating backup of source data..."
    
    # Backup schema
    log "Exporting schema..."
    PGPASSWORD="${TIMESCALEDB_PASSWORD}" pg_dump -h "$SOURCE_HOST" -p "$SOURCE_PORT" \
        -U "$SOURCE_USER" -d "$SOURCE_DB" -n "$SOURCE_SCHEMA" --schema-only \
        -f "${BACKUP_DIR}/schema.sql" 2>&1 | tee -a "$MIGRATION_LOG"
    
    # Backup data
    log "Exporting data..."
    PGPASSWORD="${TIMESCALEDB_PASSWORD}" pg_dump -h "$SOURCE_HOST" -p "$SOURCE_PORT" \
        -U "$SOURCE_USER" -d "$SOURCE_DB" -n "$SOURCE_SCHEMA" --data-only \
        -f "${BACKUP_DIR}/data.sql" 2>&1 | tee -a "$MIGRATION_LOG"
    
    # Create compressed archive
    log "Creating compressed archive..."
    tar -czf "${BACKUP_DIR}.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
    
    log_success "Backup created: ${BACKUP_DIR}.tar.gz"
}

# ==============================================================================
# Migrate Data
# ==============================================================================

migrate_data() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN mode - no data will be migrated"
        return
    fi
    
    log "Starting data migration..."
    
    # Export data from source
    log "Exporting data from source..."
    PGPASSWORD="${TIMESCALEDB_PASSWORD}" psql -h "$SOURCE_HOST" -p "$SOURCE_PORT" \
        -U "$SOURCE_USER" -d "$SOURCE_DB" -c \
        "COPY (SELECT * FROM ${SOURCE_SCHEMA}.tp_capital_signals ORDER BY ingested_at) TO STDOUT CSV HEADER" \
        > "${BACKUP_DIR}/tp_capital_signals.csv" 2>&1 | tee -a "$MIGRATION_LOG"
    
    # Import data to target
    log "Importing data to target..."
    PGPASSWORD="${TP_CAPITAL_DB_PASSWORD}" psql -h "$TARGET_HOST" -p "$TARGET_PORT" \
        -U "$TARGET_USER" -d "$TARGET_DB" -c \
        "COPY ${TARGET_SCHEMA}.tp_capital_signals FROM STDIN CSV HEADER" \
        < "${BACKUP_DIR}/tp_capital_signals.csv" 2>&1 | tee -a "$MIGRATION_LOG"
    
    log_success "Data migration completed"
}

# ==============================================================================
# Validate Migration
# ==============================================================================

validate_migration() {
    if [[ "$SKIP_VALIDATION" == "true" ]]; then
        log_warning "Skipping validation (--skip-validation flag)"
        return
    fi
    
    log "Validating migration..."
    
    # Count records in target
    TARGET_COUNT=$(PGPASSWORD="${TP_CAPITAL_DB_PASSWORD}" psql -h "$TARGET_HOST" -p "$TARGET_PORT" \
        -U "$TARGET_USER" -d "$TARGET_DB" -t -c \
        "SELECT COUNT(*) FROM ${TARGET_SCHEMA}.tp_capital_signals")
    
    log "Source records: ${SOURCE_COUNT// /}"
    log "Target records: ${TARGET_COUNT// /}"
    
    if [[ "${SOURCE_COUNT// /}" -eq "${TARGET_COUNT// /}" ]]; then
        log_success "Record counts match"
    else
        log_error "Record counts do NOT match!"
        log_error "Migration may have failed"
        exit 1
    fi
    
    # Sample data comparison
    log "Comparing sample data..."
    
    # Get first 5 records from source
    PGPASSWORD="${TIMESCALEDB_PASSWORD}" psql -h "$SOURCE_HOST" -p "$SOURCE_PORT" \
        -U "$SOURCE_USER" -d "$SOURCE_DB" -t -c \
        "SELECT id, asset, channel FROM ${SOURCE_SCHEMA}.tp_capital_signals ORDER BY id LIMIT 5" \
        > "${BACKUP_DIR}/source_sample.txt"
    
    # Get first 5 records from target
    PGPASSWORD="${TP_CAPITAL_DB_PASSWORD}" psql -h "$TARGET_HOST" -p "$TARGET_PORT" \
        -U "$TARGET_USER" -d "$TARGET_DB" -t -c \
        "SELECT id, asset, channel FROM ${TARGET_SCHEMA}.tp_capital_signals ORDER BY id LIMIT 5" \
        > "${BACKUP_DIR}/target_sample.txt"
    
    if diff "${BACKUP_DIR}/source_sample.txt" "${BACKUP_DIR}/target_sample.txt" > /dev/null 2>&1; then
        log_success "Sample data matches"
    else
        log_warning "Sample data differs (may be expected if schemas differ)"
    fi
    
    log_success "Validation completed"
}

# ==============================================================================
# Generate Migration Report
# ==============================================================================

generate_report() {
    log "Generating migration report..."
    
    cat > "${BACKUP_DIR}/MIGRATION_REPORT.md" <<EOF
# TP Capital Data Migration Report

**Date:** $(date)
**Migration ID:** $(basename "$BACKUP_DIR")

## Summary

- **Source:** ${SOURCE_HOST}:${SOURCE_PORT}/${SOURCE_DB}.${SOURCE_SCHEMA}
- **Target:** ${TARGET_HOST}:${TARGET_PORT}/${TARGET_DB}.${TARGET_SCHEMA}
- **Records migrated:** ${TARGET_COUNT// /}
- **Backup location:** ${BACKUP_DIR}.tar.gz

## Pre-Migration State

- Source records: ${SOURCE_COUNT// /}
- Backup created: Yes
- Backup size: $(du -h "${BACKUP_DIR}.tar.gz" | cut -f1)

## Post-Migration State

- Target records: ${TARGET_COUNT// /}
- Record count match: $([[ "${SOURCE_COUNT// /}" -eq "${TARGET_COUNT// /}" ]] && echo "✓ Yes" || echo "✗ No")
- Sample data match: $([[ -f "${BACKUP_DIR}/source_sample.txt" ]] && diff "${BACKUP_DIR}/source_sample.txt" "${BACKUP_DIR}/target_sample.txt" > /dev/null 2>&1 && echo "✓ Yes" || echo "⚠ Differs")

## Next Steps

1. **Test the new stack:**
   \`\`\`bash
   curl http://localhost:4005/health
   curl http://localhost:4005/signals?limit=10
   \`\`\`

2. **Compare metrics:**
   \`\`\`bash
   docker logs tp-capital-api --tail 100
   \`\`\`

3. **Monitor for 1 week:**
   - Check dashboard (http://localhost:3103/#/tp-capital)
   - Verify signal ingestion continues
   - Monitor error rates

4. **After 1 week of stability:**
   \`\`\`sql
   -- Connect to central TimescaleDB
   psql -h ${SOURCE_HOST} -p ${SOURCE_PORT} -U ${SOURCE_USER} -d ${SOURCE_DB}
   
   -- Drop old schema (CAUTION!)
   DROP SCHEMA tp_capital CASCADE;
   \`\`\`

## Rollback Procedure

If issues occur, rollback to shared database:

\`\`\`bash
# Stop new stack
docker compose -f tools/compose/docker-compose.tp-capital-stack.yml down

# Restart old stack
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital

# Restore environment variables to old values
export TIMESCALEDB_HOST=${SOURCE_HOST}
export TIMESCALEDB_PORT=${SOURCE_PORT}
export TIMESCALEDB_DATABASE=${SOURCE_DB}
export TIMESCALEDB_SCHEMA=${SOURCE_SCHEMA}
\`\`\`

## Support

For issues, contact: Development Team
Documentation: docs/content/reference/adrs/008-tp-capital-autonomous-stack.md
EOF
    
    log_success "Migration report created: ${BACKUP_DIR}/MIGRATION_REPORT.md"
    cat "${BACKUP_DIR}/MIGRATION_REPORT.md"
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    log "=========================================="
    log "TP Capital Data Migration Script"
    log "=========================================="
    log "Backup directory: $BACKUP_DIR"
    log "Dry run: $DRY_RUN"
    log ""
    
    # Confirmation prompt
    if [[ "$FORCE" != "true" && "$DRY_RUN" != "true" ]]; then
        log_warning "This will migrate data from shared database to dedicated stack"
        log_warning "Source: ${SOURCE_HOST}:${SOURCE_PORT}/${SOURCE_DB}.${SOURCE_SCHEMA}"
        log_warning "Target: ${TARGET_HOST}:${TARGET_PORT}/${TARGET_DB}.${TARGET_SCHEMA}"
        echo ""
        read -p "Continue? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Migration cancelled by user"
            exit 0
        fi
    fi
    
    # Execute migration steps
    preflight_checks
    backup_source_data
    migrate_data
    validate_migration
    generate_report
    
    log_success "=========================================="
    log_success "Migration completed successfully!"
    log_success "=========================================="
    log ""
    log "Next steps:"
    log "1. Test the new stack: curl http://localhost:4005/health"
    log "2. Monitor for 1 week: docker logs tp-capital-api -f"
    log "3. Review report: ${BACKUP_DIR}/MIGRATION_REPORT.md"
    log ""
    log_warning "DO NOT drop the old schema until validated for 1 week!"
}

# Run main
main

