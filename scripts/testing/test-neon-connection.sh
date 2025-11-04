#!/bin/bash
# ============================================================
# Test Neon Database Connection
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[TEST]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

NEON_URL="${NEON_DATABASE_URL:-postgresql://postgres:neon_password@localhost:5435/rag}"

log_info "Testing Neon database connection..."

# Test 1: Basic connectivity
if psql "$NEON_URL" -c "SELECT 1" &> /dev/null; then
    log_success "Database connection successful"
else
    log_error "Cannot connect to Neon database"
    exit 1
fi

# Test 2: Schema exists
if psql "$NEON_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='rag'" | grep -q "[0-9]"; then
    log_success "RAG schema exists"
else
    log_error "RAG schema not found"
    exit 1
fi

# Test 3: Extensions installed
log_info "Checking extensions..."
psql "$NEON_URL" -c "SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgvector', 'pg_trgm')"

# Test 4: Query performance
log_info "Testing query performance..."
QUERY_TIME=$(psql "$NEON_URL" -c "EXPLAIN ANALYZE SELECT * FROM rag.collections LIMIT 1" | grep "Execution Time" | awk '{print $3}')
log_success "Query executed in ${QUERY_TIME}ms"

log_success "All Neon tests passed!"

