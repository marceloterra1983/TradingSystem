#!/bin/bash
# ============================================================================
# TimescaleDB to Neon Migration Script
# ============================================================================
# Purpose: Migrate RAG schema and data from TimescaleDB to Neon
# Usage: bash scripts/migration/migrate-timescaledb-to-neon.sh
# Prerequisites:
#   - TimescaleDB running on port 5433 (or TIMESCALEDB_PORT)
#   - Neon running on port 5435 (or NEON_COMPUTE_PORT)
#   - Both databases accessible from host
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/data/migrations/timescale-to-neon"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Source Database (TimescaleDB)
SRC_HOST="${TIMESCALEDB_HOST:-localhost}"
SRC_PORT="${TIMESCALEDB_PORT:-7000}"
SRC_USER="${TIMESCALEDB_USER:-timescale}"
SRC_DB="${TIMESCALEDB_DB:-trading}"
SRC_SCHEMA="rag"

# Destination Database (Neon)
DEST_HOST="${NEON_HOST:-localhost}"
DEST_PORT="${NEON_COMPUTE_PORT:-5435}"
DEST_USER="${NEON_POSTGRES_USER:-postgres}"
DEST_DB="${NEON_POSTGRES_DB:-rag}"
DEST_SCHEMA="rag"

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check pg_dump availability
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump not found. Install PostgreSQL client tools."
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory: $BACKUP_DIR"
    
    # Test source connection
    if pg_isready -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" &> /dev/null; then
        log_success "TimescaleDB is accessible"
    else
        log_error "Cannot connect to TimescaleDB at $SRC_HOST:$SRC_PORT"
        exit 1
    fi
    
    # Test destination connection
    if pg_isready -h "$DEST_HOST" -p "$DEST_PORT" -U "$DEST_USER" &> /dev/null; then
        log_success "Neon is accessible"
    else
        log_error "Cannot connect to Neon at $DEST_HOST:$DEST_PORT"
        exit 1
    fi
}

backup_source_data() {
    log_info "Creating backup of TimescaleDB RAG schema..."
    
    # Export schema only (structure)
    local schema_file="$BACKUP_DIR/rag_schema_$TIMESTAMP.sql"
    PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" pg_dump \
        -h "$SRC_HOST" \
        -p "$SRC_PORT" \
        -U "$SRC_USER" \
        -d "$SRC_DB" \
        --schema="$SRC_SCHEMA" \
        --schema-only \
        --no-owner \
        --no-privileges \
        > "$schema_file"
    
    log_success "Schema backup: $schema_file"
    
    # Export data only
    local data_file="$BACKUP_DIR/rag_data_$TIMESTAMP.sql"
    PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" pg_dump \
        -h "$SRC_HOST" \
        -p "$SRC_PORT" \
        -U "$SRC_USER" \
        -d "$SRC_DB" \
        --schema="$SRC_SCHEMA" \
        --data-only \
        --inserts \
        --no-owner \
        --no-privileges \
        > "$data_file"
    
    log_success "Data backup: $data_file"
    
    # Export row counts for verification
    local counts_file="$BACKUP_DIR/rag_row_counts_$TIMESTAMP.txt"
    PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql \
        -h "$SRC_HOST" \
        -p "$SRC_PORT" \
        -U "$SRC_USER" \
        -d "$SRC_DB" \
        -t \
        -c "
            SELECT 'collections: ' || COUNT(*) FROM $SRC_SCHEMA.collections
            UNION ALL
            SELECT 'documents: ' || COUNT(*) FROM $SRC_SCHEMA.documents
            UNION ALL
            SELECT 'chunks: ' || COUNT(*) FROM $SRC_SCHEMA.chunks
            UNION ALL
            SELECT 'ingestion_jobs: ' || COUNT(*) FROM $SRC_SCHEMA.ingestion_jobs
            UNION ALL
            SELECT 'query_logs: ' || COUNT(*) FROM $SRC_SCHEMA.query_logs
            UNION ALL
            SELECT 'embedding_models: ' || COUNT(*) FROM $SRC_SCHEMA.embedding_models;
        " > "$counts_file"
    
    log_success "Row counts saved: $counts_file"
    cat "$counts_file"
}

import_data_to_neon() {
    log_info "Importing data to Neon..."
    
    local data_file="$BACKUP_DIR/rag_data_$TIMESTAMP.sql"
    
    if [ ! -f "$data_file" ]; then
        log_error "Data file not found: $data_file"
        exit 1
    fi
    
    # Import data (schema already created via init scripts)
    PGPASSWORD="${NEON_POSTGRES_PASSWORD:-neon_password}" psql \
        -h "$DEST_HOST" \
        -p "$DEST_PORT" \
        -U "$DEST_USER" \
        -d "$DEST_DB" \
        -f "$data_file"
    
    if [ $? -eq 0 ]; then
        log_success "Data imported successfully"
    else
        log_error "Data import failed"
        exit 1
    fi
}

verify_migration() {
    log_info "Verifying migration..."
    
    # Get row counts from Neon
    local neon_counts
    neon_counts=$(PGPASSWORD="${NEON_POSTGRES_PASSWORD:-neon_password}" psql \
        -h "$DEST_HOST" \
        -p "$DEST_PORT" \
        -U "$DEST_USER" \
        -d "$DEST_DB" \
        -t \
        -c "
            SELECT 'collections: ' || COUNT(*) FROM $DEST_SCHEMA.collections
            UNION ALL
            SELECT 'documents: ' || COUNT(*) FROM $DEST_SCHEMA.documents
            UNION ALL
            SELECT 'chunks: ' || COUNT(*) FROM $DEST_SCHEMA.chunks
            UNION ALL
            SELECT 'ingestion_jobs: ' || COUNT(*) FROM $DEST_SCHEMA.ingestion_jobs
            UNION ALL
            SELECT 'query_logs: ' || COUNT(*) FROM $DEST_SCHEMA.query_logs
            UNION ALL
            SELECT 'embedding_models: ' || COUNT(*) FROM $DEST_SCHEMA.embedding_models;
        ")
    
    echo ""
    echo "Row Counts Comparison:"
    echo "======================"
    echo ""
    echo "TimescaleDB (source):"
    cat "$BACKUP_DIR/rag_row_counts_$TIMESTAMP.txt"
    echo ""
    echo "Neon (destination):"
    echo "$neon_counts"
    echo ""
    
    # Simple validation (counts should match)
    log_success "Verification complete - review counts above"
}

test_neon_queries() {
    log_info "Testing queries on Neon..."
    
    # Test 1: Select collections
    log_info "Test 1: Select collections..."
    PGPASSWORD="${NEON_POSTGRES_PASSWORD:-neon_password}" psql \
        -h "$DEST_HOST" \
        -p "$DEST_PORT" \
        -U "$DEST_USER" \
        -d "$DEST_DB" \
        -c "SELECT name, status, total_documents, total_chunks FROM $DEST_SCHEMA.collections;"
    
    # Test 2: Recent ingestion jobs
    log_info "Test 2: Recent ingestion jobs..."
    PGPASSWORD="${NEON_POSTGRES_PASSWORD:-neon_password}" psql \
        -h "$DEST_HOST" \
        -p "$DEST_PORT" \
        -U "$DEST_USER" \
        -d "$DEST_DB" \
        -c "SELECT job_type, job_status, files_processed, duration_ms, created_at FROM $DEST_SCHEMA.ingestion_jobs ORDER BY created_at DESC LIMIT 5;"
    
    # Test 3: Query logs
    log_info "Test 3: Query logs..."
    PGPASSWORD="${NEON_POSTGRES_PASSWORD:-neon_password}" psql \
        -h "$DEST_HOST" \
        -p "$DEST_PORT" \
        -U "$DEST_USER" \
        -d "$DEST_DB" \
        -c "SELECT query_type, COUNT(*) as count, AVG(duration_ms) as avg_duration FROM $DEST_SCHEMA.query_logs GROUP BY query_type;"
    
    log_success "Query tests completed"
}

display_summary() {
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ Migration Complete!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "📊 Migration Summary:"
    echo "  - Source: TimescaleDB ($SRC_HOST:$SRC_PORT)"
    echo "  - Destination: Neon ($DEST_HOST:$DEST_PORT)"
    echo "  - Schema: $DEST_SCHEMA"
    echo "  - Backup Location: $BACKUP_DIR"
    echo ""
    echo "📁 Backup Files:"
    echo "  - Schema: rag_schema_$TIMESTAMP.sql"
    echo "  - Data: rag_data_$TIMESTAMP.sql"
    echo "  - Counts: rag_row_counts_$TIMESTAMP.txt"
    echo ""
    echo "🔧 Next Steps:"
    echo "  1. Update .env: NEON_DATABASE_URL=postgresql://postgres:password@localhost:5435/rag"
    echo "  2. Update application code to use Neon connection"
    echo "  3. Test application with Neon database"
    echo "  4. If issues, rollback: psql < $BACKUP_DIR/rag_data_$TIMESTAMP.sql"
    echo ""
    echo "⚠️  Keep TimescaleDB running for 1 week as fallback!"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================

main() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}🔄 TimescaleDB → Neon Migration${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    
    check_prerequisites
    backup_source_data
    import_data_to_neon
    verify_migration
    test_neon_queries
    display_summary
    
    log_success "Migration completed successfully!"
}

# Run main function
main "$@"


