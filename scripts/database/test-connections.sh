#!/bin/bash

# =====================================================
# Database Connection Test Script
# =====================================================
# Tests connections to the new database structure
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

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Database connection settings
DB_HOST="${TIMESCALEDB_HOST:-localhost}"
DB_PORT="${TIMESCALEDB_PORT:-5433}"
DB_USER="${TIMESCALEDB_USER:-timescale}"
DB_PASSWORD="${TIMESCALEDB_PASSWORD:-changeme}"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

echo ""
echo "=========================================="
echo "  Database Connection Test"
echo "=========================================="
echo ""

ERRORS=0

# Test 1: Check if container is running
log_info "1. Checking if TimescaleDB container is running..."
if docker ps | grep -q data-timescaledb; then
    log_success "Container is running"
else
    log_error "Container is not running"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: Check if databases exist
log_info "2. Checking if databases exist..."

if docker exec data-timescaledb psql -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='APPS-TPCAPITAL'" 2>/dev/null | grep -q 1; then
    log_success "APPS-TPCAPITAL exists"
else
    log_error "APPS-TPCAPITAL does not exist"
    ERRORS=$((ERRORS + 1))
fi

if docker exec data-timescaledb psql -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='APPS-WORKSPACE'" 2>/dev/null | grep -q 1; then
    log_success "APPS-WORKSPACE exists"
else
    log_error "APPS-WORKSPACE does not exist"
    ERRORS=$((ERRORS + 1))
fi

# Test 3: Check APPS-TPCAPITAL schema
log_info "3. Checking APPS-TPCAPITAL schema..."

if docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-TPCAPITAL" -tAc "SELECT 1 FROM information_schema.schemata WHERE schema_name='tp-capital'" 2>/dev/null | grep -q 1; then
    log_success "Schema 'tp-capital' exists"
else
    log_error "Schema 'tp-capital' does not exist"
    ERRORS=$((ERRORS + 1))
fi

# Test 4: Check APPS-TPCAPITAL tables
log_info "4. Checking APPS-TPCAPITAL tables..."

TABLES=("tp_capital_signals" "telegram_bots" "telegram_channels")
for table in "${TABLES[@]}"; do
    if docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-TPCAPITAL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='tp-capital' AND table_name='$table'" 2>/dev/null | grep -q 1; then
        COUNT=$(docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-TPCAPITAL" -tAc "SELECT COUNT(*) FROM \"tp-capital\".$table" 2>/dev/null)
        log_success "Table 'tp-capital.$table' exists ($COUNT records)"
    else
        log_error "Table 'tp-capital.$table' does not exist"
        ERRORS=$((ERRORS + 1))
    fi
done

# Test 5: Check APPS-WORKSPACE schema
log_info "5. Checking APPS-WORKSPACE schema..."

if docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-WORKSPACE" -tAc "SELECT 1 FROM information_schema.schemata WHERE schema_name='workspace'" 2>/dev/null | grep -q 1; then
    log_success "Schema 'workspace' exists"
else
    log_error "Schema 'workspace' does not exist"
    ERRORS=$((ERRORS + 1))
fi

# Test 6: Check APPS-WORKSPACE tables
log_info "6. Checking APPS-WORKSPACE tables..."

WORKSPACE_TABLES=("workspace_items" "workspace_audit_log" "schema_version")
for table in "${WORKSPACE_TABLES[@]}"; do
    if docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-WORKSPACE" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='workspace' AND table_name='$table'" 2>/dev/null | grep -q 1; then
        COUNT=$(docker exec data-timescaledb psql -U "$DB_USER" -d "APPS-WORKSPACE" -tAc "SELECT COUNT(*) FROM workspace.$table" 2>/dev/null)
        log_success "Table 'workspace.$table' exists ($COUNT records)"
    else
        log_error "Table 'workspace.$table' does not exist"
        ERRORS=$((ERRORS + 1))
    fi
done

# Test 7: Test TP-CAPITAL API (if running)
log_info "7. Testing TP-CAPITAL API..."

if curl -s -o /dev/null -w "%{http_code}" http://localhost:4005/health 2>/dev/null | grep -q "200"; then
    log_success "TP-CAPITAL API is responding"
    
    SIGNALS_RESPONSE=$(curl -s http://localhost:4005/signals 2>/dev/null)
    if echo "$SIGNALS_RESPONSE" | jq -e '.data' >/dev/null 2>&1; then
        SIGNAL_COUNT=$(echo "$SIGNALS_RESPONSE" | jq '.data | length')
        log_success "TP-CAPITAL API returning data ($SIGNAL_COUNT signals)"
    else
        log_warning "TP-CAPITAL API responded but data format unexpected"
    fi
else
    log_warning "TP-CAPITAL API is not running or not responding (this is OK if not started yet)"
fi

# Test 8: Test WORKSPACE API (if running)
log_info "8. Testing WORKSPACE API..."

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/health 2>/dev/null | grep -q "200"; then
    log_success "WORKSPACE API is responding"
    
    ITEMS_RESPONSE=$(curl -s http://localhost:3200/api/library 2>/dev/null)
    if echo "$ITEMS_RESPONSE" | jq -e '.data' >/dev/null 2>&1; then
        ITEM_COUNT=$(echo "$ITEMS_RESPONSE" | jq '.data | length')
        log_success "WORKSPACE API returning data ($ITEM_COUNT items)"
    else
        log_warning "WORKSPACE API responded but data format unexpected"
    fi
else
    log_warning "WORKSPACE API is not running or not responding (this is OK if not started yet)"
fi

# Test 9: Check old databases (should not exist after cleanup)
log_info "9. Checking for old databases..."

if docker exec data-timescaledb psql -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tradingsystem'" 2>/dev/null | grep -q 1; then
    log_warning "Old database 'tradingsystem' still exists (consider removing after validation)"
else
    log_success "Old database 'tradingsystem' has been removed"
fi

if docker exec data-timescaledb psql -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='frontend_apps'" 2>/dev/null | grep -q 1; then
    log_warning "Old database 'frontend_apps' still exists (consider removing after validation)"
else
    log_success "Old database 'frontend_apps' has been removed"
fi

# Summary
echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    log_success "All tests passed! ✨"
    echo ""
    echo "Database structure is ready to use."
    echo ""
    echo "Next steps:"
    echo "  1. Start TP-CAPITAL: cd apps/tp-capital && npm run dev"
    echo "  2. Start WORKSPACE: cd backend/api/workspace && npm run dev"
    echo "  3. Test both APIs"
    echo "  4. Remove old databases if still present"
else
    log_error "Found $ERRORS error(s)"
    echo ""
    echo "Please review the errors above and:"
    echo "  1. Check if migration was executed successfully"
    echo "  2. Verify database credentials"
    echo "  3. Check application configurations"
    echo "  4. Consult migration logs"
    exit 1
fi
echo "=========================================="
echo ""

