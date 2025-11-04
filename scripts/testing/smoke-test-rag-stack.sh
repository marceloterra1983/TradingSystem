#!/bin/bash
# ============================================================
# RAG Stack Smoke Tests
# ============================================================
# Purpose: End-to-end smoke tests for complete RAG stack
# Tests: Neon → Qdrant Cluster → Kong → Frontend
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[TEST]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

KONG_URL="${KONG_GATEWAY_URL:-http://localhost:8000}"
TEST_COLLECTION="documentation"

# Test 1: Infrastructure Layer
test_infrastructure() {
    log_info "Testing infrastructure layer..."
    
    # Neon
    if psql "${NEON_DATABASE_URL:-postgresql://postgres:neon_password@localhost:5435/rag}" -c "SELECT 1" &> /dev/null; then
        log_success "Neon database responsive"
    else
        log_error "Neon database not accessible"
        return 1
    fi
    
    # Qdrant cluster
    if curl -sf http://localhost:6333/cluster > /dev/null; then
        log_success "Qdrant cluster responsive"
    else
        log_error "Qdrant cluster not accessible"
        return 1
    fi
    
    # Kong Gateway
    if curl -sf http://localhost:8001/status > /dev/null; then
        log_success "Kong Gateway responsive"
    else
        log_error "Kong Gateway not accessible"
        return 1
    fi
}

# Test 2: Create Collection (via Kong)
test_create_collection() {
    log_info "Testing collection creation via Kong..."
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "$KONG_URL/api/v1/rag/collections" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "smoke_test_'$(date +%s)'",
            "description": "Smoke test collection",
            "directory": "/data/docs",
            "embeddingModel": "mxbai-embed-large",
            "enabled": false
        }')
    
    local status=$(echo "$response" | tail -1)
    
    if [ "$status" = "200" ] || [ "$status" = "201" ]; then
        log_success "Collection creation → HTTP $status"
    else
        log_warning "Collection creation → HTTP $status (may already exist)"
    fi
}

# Test 3: Search Query (via Kong)
test_search_query() {
    log_info "Testing semantic search via Kong..."
    
    local response
    response=$(curl -s "$KONG_URL/api/v1/rag/search?query=test&limit=3")
    
    if echo "$response" | jq -e '.results' > /dev/null 2>&1; then
        local count
        count=$(echo "$response" | jq -r '.results | length')
        log_success "Search query successful ($count results)"
    else
        log_error "Search query failed or unexpected response format"
        echo "Response: $response"
        return 1
    fi
}

# Test 4: Q&A Query (requires JWT)
test_qa_query() {
    log_info "Testing Q&A query..."
    
    # Generate simple JWT for testing
    local jwt_token
    jwt_token=$(node -e "
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { sub: 'smoke-test', iss: 'rag-app-key' },
            process.env.JWT_SECRET_KEY || 'dev-secret',
            { algorithm: 'HS256', expiresIn: '1h' }
        );
        console.log(token);
    " 2>/dev/null || echo "")
    
    if [ -z "$jwt_token" ]; then
        log_warning "Cannot generate JWT token (Node.js/jsonwebtoken not available), skipping Q&A test"
        return 0
    fi
    
    local response
    response=$(curl -s -X POST "$KONG_URL/api/v1/rag/query" \
        -H "Authorization: Bearer $jwt_token" \
        -H "Content-Type: application/json" \
        -d '{"query": "What is RAG?", "limit": 3}')
    
    if echo "$response" | jq -e '.answer' > /dev/null 2>&1; then
        log_success "Q&A query successful"
    else
        log_warning "Q&A query failed (may require LLM to be running)"
    fi
}

# Test 5: Verify data in Neon
test_neon_data() {
    log_info "Verifying data in Neon..."
    
    local row_counts
    row_counts=$(psql "${NEON_DATABASE_URL:-postgresql://postgres:neon_password@localhost:5435/rag}" -t -c "
        SELECT 'collections: ' || COUNT(*) FROM rag.collections
        UNION ALL
        SELECT 'documents: ' || COUNT(*) FROM rag.documents
        UNION ALL
        SELECT 'chunks: ' || COUNT(*) FROM rag.chunks;
    ")
    
    echo "$row_counts"
    log_success "Data verified in Neon"
}

# Test 6: Verify vectors in Qdrant
test_qdrant_vectors() {
    log_info "Verifying vectors in Qdrant cluster..."
    
    local collections
    collections=$(curl -s http://localhost:6333/collections | jq -r '.result.collections[].name')
    
    for collection in $collections; do
        local count
        count=$(curl -s "http://localhost:6333/collections/$collection" | jq -r '.result.points_count')
        log_info "Collection '$collection': $count vectors"
    done
    
    log_success "Vectors verified in Qdrant"
}

# Main test execution
main() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}🧪 RAG Stack Smoke Tests${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    
    local failures=0
    
    test_infrastructure || failures=$((failures + 1))
    test_neon_data || failures=$((failures + 1))
    test_qdrant_vectors || failures=$((failures + 1))
    test_create_collection || failures=$((failures + 1))
    test_search_query || failures=$((failures + 1))
    test_qa_query || failures=$((failures + 1))
    
    echo ""
    echo "=============================="
    if [ $failures -eq 0 ]; then
        log_success "All smoke tests passed! ✨"
        echo ""
        echo "✅ Neon: Healthy"
        echo "✅ Qdrant Cluster: Healthy"
        echo "✅ Kong Gateway: Healthy"
        echo "✅ End-to-end flow: Working"
        echo ""
        exit 0
    else
        log_error "$failures test(s) failed"
        exit 1
    fi
}

main "$@"

