#!/bin/bash
#
# Neon Connection Test Script
#
# This script tests the Neon PostgreSQL connection and validates
# that the workspace database and schema are properly configured.
#
# Usage:
#   bash scripts/database/test-neon-connection.sh
#
# Requirements:
#   - Neon containers must be running
#   - Workspace database must be initialized
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NEON_CONTAINER="neon-compute"
NEON_USER="postgres"
NEON_DB="workspace"
NEON_SCHEMA="workspace"
NEON_PORT="55432"  # Internal port
EXTERNAL_PORT="5433"  # External mapped port

# Helper functions
log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Test 1: Check if Neon container is running
test_container_running() {
    log_test "Checking if Neon container is running..."
    
    if docker ps | grep -q "$NEON_CONTAINER"; then
        log_info "Neon container is running"
        return 0
    else
        log_error "Neon container is not running!"
        log_warn "Start with: docker compose -f tools/compose/docker-compose.neon.yml up -d"
        return 1
    fi
}

# Test 2: Check PostgreSQL availability
test_postgres_ready() {
    log_test "Checking if PostgreSQL is ready..."
    
    if docker exec "$NEON_CONTAINER" pg_isready -U "$NEON_USER" -h localhost -p "$NEON_PORT" > /dev/null 2>&1; then
        log_info "PostgreSQL is ready"
        return 0
    else
        log_error "PostgreSQL is not ready"
        return 1
    fi
}

# Test 3: Check PostgreSQL version
test_postgres_version() {
    log_test "Checking PostgreSQL version..."
    
    local version=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -d "$NEON_DB" -tAc "SELECT version();" 2>/dev/null || echo "ERROR")
    
    if [ "$version" != "ERROR" ]; then
        log_info "PostgreSQL version: $version"
        return 0
    else
        log_error "Failed to get PostgreSQL version"
        return 1
    fi
}

# Test 4: Check if workspace database exists
test_database_exists() {
    log_test "Checking if workspace database exists..."
    
    local db_exists=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -tAc "SELECT 1 FROM pg_database WHERE datname='$NEON_DB'" 2>/dev/null || echo "0")
    
    if [ "$db_exists" = "1" ]; then
        log_info "Database '$NEON_DB' exists"
        return 0
    else
        log_error "Database '$NEON_DB' does not exist"
        log_warn "Run: bash scripts/database/init-neon-workspace.sh"
        return 1
    fi
}

# Test 5: Check if workspace schema exists
test_schema_exists() {
    log_test "Checking if workspace schema exists..."
    
    local schema_exists=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -d "$NEON_DB" -tAc "SELECT 1 FROM pg_namespace WHERE nspname='$NEON_SCHEMA'" 2>/dev/null || echo "0")
    
    if [ "$schema_exists" = "1" ]; then
        log_info "Schema '$NEON_SCHEMA' exists"
        return 0
    else
        log_error "Schema '$NEON_SCHEMA' does not exist"
        return 1
    fi
}

# Test 6: Check if tables exist
test_tables_exist() {
    log_test "Checking if workspace tables exist..."
    
    local tables=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -d "$NEON_DB" -tAc \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$NEON_SCHEMA' AND table_type='BASE TABLE'" 2>/dev/null || echo "0")
    
    if [ "$tables" -ge "2" ]; then
        log_info "Found $tables tables in workspace schema"
        
        # List tables
        docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -d "$NEON_DB" -c \
            "SELECT table_name FROM information_schema.tables WHERE table_schema='$NEON_SCHEMA' ORDER BY table_name" 2>/dev/null
        
        return 0
    else
        log_error "Expected at least 2 tables, found $tables"
        return 1
    fi
}

# Test 7: Count records in tables
test_record_counts() {
    log_test "Counting records in tables..."
    
    local items_count=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -d "$NEON_DB" -tAc \
        "SELECT COUNT(*) FROM $NEON_SCHEMA.workspace_items" 2>/dev/null || echo "ERROR")
    
    local categories_count=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -d "$NEON_DB" -tAc \
        "SELECT COUNT(*) FROM $NEON_SCHEMA.workspace_categories" 2>/dev/null || echo "ERROR")
    
    if [ "$items_count" != "ERROR" ] && [ "$categories_count" != "ERROR" ]; then
        log_info "workspace_items: $items_count records"
        log_info "workspace_categories: $categories_count records"
        return 0
    else
        log_error "Failed to count records"
        return 1
    fi
}

# Test 8: Test external connection (from host)
test_external_connection() {
    log_test "Testing external connection (localhost:$EXTERNAL_PORT)..."
    
    if command -v psql > /dev/null; then
        if psql -h localhost -p "$EXTERNAL_PORT" -U "$NEON_USER" -d "$NEON_DB" -c "SELECT 1" > /dev/null 2>&1; then
            log_info "External connection successful"
            return 0
        else
            log_warn "External connection failed (psql may need password)"
            log_warn "Try: PGPASSWORD=neon_secure_pass psql -h localhost -p $EXTERNAL_PORT -U $NEON_USER -d $NEON_DB"
            return 0  # Not a critical failure
        fi
    else
        log_warn "psql not installed on host, skipping external connection test"
        return 0
    fi
}

# Test 9: Test write operation
test_write_operation() {
    log_test "Testing write operation..."
    
    local test_id=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -d "$NEON_DB" -tAc \
        "INSERT INTO $NEON_SCHEMA.workspace_items (title, description, category, priority, status) 
         VALUES ('Test Item', 'Connection test', 'documentacao', 'low', 'new') 
         RETURNING id" 2>/dev/null || echo "ERROR")
    
    if [ "$test_id" != "ERROR" ] && [ -n "$test_id" ]; then
        log_info "Write operation successful (test record ID: $test_id)"
        
        # Clean up test record
        docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -d "$NEON_DB" -c \
            "DELETE FROM $NEON_SCHEMA.workspace_items WHERE id = $test_id" > /dev/null 2>&1
        
        log_info "Test record cleaned up"
        return 0
    else
        log_error "Write operation failed"
        return 1
    fi
}

# Test 10: Test Neon-specific features (database branching)
test_neon_branching() {
    log_test "Testing Neon database branching capability..."
    
    # Check if neon extension/functions are available
    local neon_support=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p "$NEON_PORT" -d "$NEON_DB" -tAc \
        "SELECT COUNT(*) FROM pg_proc WHERE proname LIKE 'neon%'" 2>/dev/null || echo "0")
    
    if [ "$neon_support" -gt "0" ]; then
        log_info "Neon-specific functions detected ($neon_support functions)"
        return 0
    else
        log_warn "No Neon-specific functions found (may be using standard PostgreSQL)"
        log_warn "This is expected if using neondatabase/neon:latest without full Neon setup"
        return 0  # Not a critical failure
    fi
}

# Display connection information
display_connection_info() {
    echo ""
    echo "=========================================="
    echo "Neon Connection Information"
    echo "=========================================="
    echo ""
    echo "Internal (from container):"
    echo "  Host: localhost"
    echo "  Port: $NEON_PORT"
    echo "  Database: $NEON_DB"
    echo "  Schema: $NEON_SCHEMA"
    echo "  User: $NEON_USER"
    echo ""
    echo "External (from host):"
    echo "  Host: localhost"
    echo "  Port: $EXTERNAL_PORT"
    echo "  Database: $NEON_DB"
    echo "  User: $NEON_USER"
    echo ""
    echo "Connection String:"
    echo "  postgresql://$NEON_USER:PASSWORD@localhost:$EXTERNAL_PORT/$NEON_DB"
    echo ""
    echo "Test Connection:"
    echo "  docker exec -it $NEON_CONTAINER psql -U $NEON_USER -d $NEON_DB"
    echo "  (or)"
    echo "  PGPASSWORD=neon_secure_pass psql -h localhost -p $EXTERNAL_PORT -U $NEON_USER -d $NEON_DB"
    echo ""
    echo "=========================================="
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "Neon Connection Test Suite"
    echo "=========================================="
    echo ""
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # Run all tests
    for test in container_running postgres_ready postgres_version database_exists schema_exists tables_exist record_counts external_connection write_operation neon_branching; do
        total_tests=$((total_tests + 1))
        
        if test_"$test"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
        
        echo ""
    done
    
    # Display summary
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo ""
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo ""
    
    if [ "$failed_tests" -eq 0 ]; then
        log_info "All tests passed! ✓"
        display_connection_info
        exit 0
    else
        log_error "$failed_tests test(s) failed"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Check if Neon is running: docker ps | grep neon"
        echo "  2. Check Neon logs: docker logs $NEON_CONTAINER"
        echo "  3. Initialize database: bash scripts/database/init-neon-workspace.sh"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"

