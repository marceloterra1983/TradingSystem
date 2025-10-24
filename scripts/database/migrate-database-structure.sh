#!/bin/bash

# =====================================================
# Database Structure Migration Script
# =====================================================
# Migrates database structure to new organized format
# Author: TradingSystem Team
# Date: 2025-10-24
# =====================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_SCRIPT="$SCRIPT_DIR/migrate-database-structure.sql"
BACKUP_DIR="$PROJECT_ROOT/backups/database-migration-$(date +%Y%m%d-%H%M%S)"

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    log_info "Loading environment variables from .env"
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$' | xargs)
else
    log_warning ".env file not found, using defaults"
fi

# Database connection settings
DB_HOST="${TIMESCALEDB_HOST:-localhost}"
DB_PORT="${TIMESCALEDB_PORT:-5433}"
DB_USER="${TIMESCALEDB_USER:-timescale}"
DB_PASSWORD="${TIMESCALEDB_PASSWORD:-changeme}"
POSTGRES_DB="postgres"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

echo ""
echo "=========================================="
echo "  Database Structure Migration"
echo "=========================================="
echo ""
echo "This script will migrate:"
echo "  • tradingsystem → APPS-TPCAPITAL (schema: tp-capital)"
echo "  • frontend_apps → APPS-WORKSPACE (schema: workspace)"
echo ""

# Check if databases exist
log_info "Checking current database status..."

SOURCE_DBS=$(docker exec data-timescaledb psql -U "$DB_USER" -d postgres -t -c "SELECT datname FROM pg_database WHERE datname IN ('tradingsystem', 'frontend_apps');" 2>/dev/null | tr -d ' ' | grep -v '^$' || true)

if [ -z "$SOURCE_DBS" ]; then
    log_error "Source databases not found!"
    log_error "Expected: tradingsystem, frontend_apps"
    exit 1
fi

log_success "Source databases found"

# Check if target databases already exist
TARGET_DBS=$(docker exec data-timescaledb psql -U "$DB_USER" -d postgres -t -c "SELECT datname FROM pg_database WHERE datname IN ('APPS-TPCAPITAL', 'APPS-WORKSPACE');" 2>/dev/null | tr -d ' ' | grep -v '^$' || true)

if [ -n "$TARGET_DBS" ]; then
    log_warning "Target databases already exist!"
    echo "Found: $TARGET_DBS"
    read -p "Do you want to DROP them and recreate? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Migration cancelled by user"
        exit 0
    fi
    
    log_info "Dropping existing target databases..."
    docker exec data-timescaledb psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"APPS-TPCAPITAL\";" 2>&1
    docker exec data-timescaledb psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"APPS-WORKSPACE\";" 2>&1
    log_success "Existing databases dropped"
fi

# Create backup directory
log_info "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup existing databases
log_info "Creating backups of existing databases..."

log_info "  Backing up tradingsystem..."
docker exec data-timescaledb pg_dump -U "$DB_USER" -d tradingsystem -F c -f /tmp/tradingsystem_backup.dump 2>&1
docker cp data-timescaledb:/tmp/tradingsystem_backup.dump "$BACKUP_DIR/tradingsystem_backup.dump"
docker exec data-timescaledb rm /tmp/tradingsystem_backup.dump
log_success "  tradingsystem backed up"

log_info "  Backing up frontend_apps..."
docker exec data-timescaledb pg_dump -U "$DB_USER" -d frontend_apps -F c -f /tmp/frontend_apps_backup.dump 2>&1
docker cp data-timescaledb:/tmp/frontend_apps_backup.dump "$BACKUP_DIR/frontend_apps_backup.dump"
docker exec data-timescaledb rm /tmp/frontend_apps_backup.dump
log_success "  frontend_apps backed up"

log_success "Backups created in: $BACKUP_DIR"

# Confirm migration
echo ""
log_warning "⚠️  Ready to start migration"
echo ""
echo "Backups created at: $BACKUP_DIR"
echo ""
read -p "Proceed with migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Migration cancelled by user"
    exit 0
fi

# Run migration
echo ""
log_info "Starting migration process..."
echo ""

# Copy SQL script to container
docker cp "$SQL_SCRIPT" data-timescaledb:/tmp/migrate.sql

# Execute migration
log_info "Executing migration SQL script..."
if docker exec data-timescaledb psql -U "$DB_USER" -d postgres -f /tmp/migrate.sql 2>&1 | tee "$BACKUP_DIR/migration.log"; then
    log_success "Migration SQL executed successfully"
else
    log_error "Migration failed! Check logs at: $BACKUP_DIR/migration.log"
    log_info "Backups are available at: $BACKUP_DIR"
    exit 1
fi

# Clean up
docker exec data-timescaledb rm /tmp/migrate.sql

# Verify migration
echo ""
log_info "Verifying migration..."

log_info "Checking APPS-TPCAPITAL..."
TPCAPITAL_COUNT=$(docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-TPCAPITAL" -t -c "SELECT COUNT(*) FROM \"tp-capital\".tp_capital_signals;" 2>/dev/null | tr -d ' ')
log_success "  tp_capital_signals: $TPCAPITAL_COUNT records"

log_info "Checking APPS-WORKSPACE..."
WORKSPACE_COUNT=$(docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-WORKSPACE" -t -c "SELECT COUNT(*) FROM workspace.workspace_items;" 2>/dev/null | tr -d ' ')
log_success "  workspace_items: $WORKSPACE_COUNT records"

echo ""
echo "=========================================="
log_success "Migration completed successfully!"
echo "=========================================="
echo ""
echo "📊 Summary:"
echo "  • APPS-TPCAPITAL created with $TPCAPITAL_COUNT signals"
echo "  • APPS-WORKSPACE created with $WORKSPACE_COUNT items"
echo "  • Backups saved to: $BACKUP_DIR"
echo ""
echo "🔧 Next steps:"
echo "  1. Update application configurations (see migration guide)"
echo "  2. Test both TP-CAPITAL and WORKSPACE applications"
echo "  3. Once verified, you can drop old databases:"
echo "     docker exec data-timescaledb psql -U $DB_USER -d postgres -c 'DROP DATABASE tradingsystem;'"
echo "     docker exec data-timescaledb psql -U $DB_USER -d postgres -c 'DROP DATABASE frontend_apps;'"
echo ""

# Create rollback script
ROLLBACK_SCRIPT="$BACKUP_DIR/rollback.sh"
cat > "$ROLLBACK_SCRIPT" << 'EOF'
#!/bin/bash
# Rollback script for database migration

set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_USER="${TIMESCALEDB_USER:-timescale}"

echo "⚠️  This will restore the old database structure"
echo "   Backups from: $BACKUP_DIR"
echo ""
read -p "Proceed with rollback? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

echo "Dropping new databases..."
docker exec data-timescaledb psql -U "$DB_USER" -d postgres -c 'DROP DATABASE IF EXISTS "APPS-TPCAPITAL";'
docker exec data-timescaledb psql -U "$DB_USER" -d postgres -c 'DROP DATABASE IF EXISTS "APPS-WORKSPACE";'

echo "Restoring tradingsystem..."
docker cp "$BACKUP_DIR/tradingsystem_backup.dump" data-timescaledb:/tmp/
docker exec data-timescaledb createdb -U "$DB_USER" tradingsystem
docker exec data-timescaledb pg_restore -U "$DB_USER" -d tradingsystem /tmp/tradingsystem_backup.dump
docker exec data-timescaledb rm /tmp/tradingsystem_backup.dump

echo "Restoring frontend_apps..."
docker cp "$BACKUP_DIR/frontend_apps_backup.dump" data-timescaledb:/tmp/
docker exec data-timescaledb createdb -U "$DB_USER" frontend_apps
docker exec data-timescaledb pg_restore -U "$DB_USER" -d frontend_apps /tmp/frontend_apps_backup.dump
docker exec data-timescaledb rm /tmp/frontend_apps_backup.dump

echo "✅ Rollback completed"
EOF

chmod +x "$ROLLBACK_SCRIPT"
log_info "Rollback script created: $ROLLBACK_SCRIPT"

echo ""
log_success "All done! 🎉"
echo ""

