#!/bin/bash
# ============================================================
# Test Kong Gateway Routes for RAG Services
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[TEST]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

KONG_URL="${KONG_GATEWAY_URL:-http://localhost:8000}"
KONG_ADMIN="${KONG_ADMIN_URL:-http://localhost:8001}"

# Test Kong Gateway health
test_kong_health() {
    log_info "Testing Kong Gateway health..."
    
    if curl -sf "$KONG_ADMIN/status" > /dev/null; then
        log_success "Kong Admin API is accessible"
    else
        log_error "Kong Admin API not responding"
        return 1
    fi
}

# Test route configuration
test_route_config() {
    log_info "Verifying RAG routes configuration..."
    
    local routes
    routes=$(curl -s "$KONG_ADMIN/routes" | jq -r '.data[] | select(.name | startswith("rag-")) | .name')
    
    local expected_routes=("rag-search" "rag-query" "rag-status" "rag-collections")
    local found=0
    
    for route in "${expected_routes[@]}"; do
        if echo "$routes" | grep -q "$route"; then
            log_success "Route configured: $route"
            found=$((found + 1))
        else
            log_error "Route missing: $route"
        fi
    done
    
    if [ $found -eq ${#expected_routes[@]} ]; then
        return 0
    else
        return 1
    fi
}

# Test actual routes
test_routes() {
    log_info "Testing RAG routes via Kong..."
    
    # Test 1: Health endpoint
    if curl -sf "$KONG_URL/api/v1/rag/status/health" > /dev/null; then
        log_success "GET /api/v1/rag/status/health → 200 OK"
    else
        log_error "Health endpoint failed"
        return 1
    fi
    
    # Test 2: Search endpoint (may require service to be running)
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$KONG_URL/api/v1/rag/search?query=test&limit=1")
    
    if [ "$status" = "200" ] || [ "$status" = "503" ]; then
        log_success "GET /api/v1/rag/search → HTTP $status (route configured)"
    else
        log_error "Search endpoint returned unexpected status: $status"
    fi
    
    # Test 3: CORS headers
    local cors_header
    cors_header=$(curl -s -I "$KONG_URL/api/v1/rag/search?query=test" | grep -i "access-control-allow-origin" || echo "")
    
    if [ -n "$cors_header" ]; then
        log_success "CORS headers present"
    else
        log_error "CORS headers missing"
    fi
}

# Test plugins
test_plugins() {
    log_info "Verifying plugins..."
    
    local plugins
    plugins=$(curl -s "$KONG_ADMIN/plugins" | jq -r '.data[] | .name')
    
    local expected_plugins=("cors" "rate-limiting" "correlation-id" "prometheus")
    
    for plugin in "${expected_plugins[@]}"; do
        if echo "$plugins" | grep -q "$plugin"; then
            log_success "Plugin enabled: $plugin"
        else
            log_error "Plugin missing: $plugin"
        fi
    done
}

# Main test execution
main() {
    echo ""
    log_info "Kong Gateway - RAG Routes Test Suite"
    echo "======================================"
    echo ""
    
    local failures=0
    
    test_kong_health || failures=$((failures + 1))
    test_route_config || failures=$((failures + 1))
    test_routes || failures=$((failures + 1))
    test_plugins || failures=$((failures + 1))
    
    echo ""
    if [ $failures -eq 0 ]; then
        log_success "All Kong tests passed!"
        exit 0
    else
        log_error "$failures test(s) failed"
        exit 1
    fi
}

main "$@"

