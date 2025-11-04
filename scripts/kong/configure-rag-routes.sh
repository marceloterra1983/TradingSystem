#!/bin/bash
# ============================================================================
# Kong Gateway - Configure RAG Routes
# ============================================================================
# Purpose: Configure Kong services, routes, and plugins for RAG endpoints
# Usage: bash scripts/kong/configure-rag-routes.sh
# Note: Requires Kong Admin API to be accessible at http://localhost:8001
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"
RAG_SERVICE_URL="${RAG_SERVICE_URL:-http://rag-service:3000}"
COLLECTIONS_SERVICE_URL="${COLLECTIONS_SERVICE_URL:-http://rag-collections-service:3402}"

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_kong_health() {
    log_info "Checking Kong Gateway health..."
    
    if curl -sf "$KONG_ADMIN_URL/status" > /dev/null; then
        log_success "Kong Admin API is accessible"
    else
        log_error "Kong Admin API is not accessible at $KONG_ADMIN_URL"
        exit 1
    fi
}

create_rag_service() {
    log_info "Creating RAG Documentation API service..."
    
    curl -i -X POST "$KONG_ADMIN_URL/services" \
        --data name=rag-documentation-api \
        --data url="$RAG_SERVICE_URL" \
        --data connect_timeout=10000 \
        --data write_timeout=30000 \
        --data read_timeout=30000 \
        --data retries=3 \
        --data tags[]=rag \
        --data tags[]=documentation
    
    log_success "Service created: rag-documentation-api"
}

create_collections_service() {
    log_info "Creating RAG Collections service..."
    
    curl -i -X POST "$KONG_ADMIN_URL/services" \
        --data name=rag-collections-service \
        --data url="$COLLECTIONS_SERVICE_URL" \
        --data connect_timeout=10000 \
        --data write_timeout=60000 \
        --data read_timeout=60000 \
        --data retries=3 \
        --data tags[]=rag \
        --data tags[]=collections
    
    log_success "Service created: rag-collections-service"
}

create_routes() {
    log_info "Creating routes for RAG services..."
    
    # Route 1: /api/v1/rag/search (GET)
    curl -i -X POST "$KONG_ADMIN_URL/services/rag-documentation-api/routes" \
        --data name=rag-search \
        --data 'paths[]=/api/v1/rag/search' \
        --data 'methods[]=GET' \
        --data strip_path=false \
        --data preserve_host=false \
        --data tags[]=rag \
        --data tags[]=search
    
    # Route 2: /api/v1/rag/query (POST)
    curl -i -X POST "$KONG_ADMIN_URL/services/rag-documentation-api/routes" \
        --data name=rag-query \
        --data 'paths[]=/api/v1/rag/query' \
        --data 'methods[]=POST' \
        --data strip_path=false \
        --data tags[]=rag \
        --data tags[]=query
    
    # Route 3: /api/v1/rag/status/* (GET)
    curl -i -X POST "$KONG_ADMIN_URL/services/rag-documentation-api/routes" \
        --data name=rag-status \
        --data 'paths[]=/api/v1/rag/status' \
        --data 'methods[]=GET' \
        --data strip_path=false \
        --data tags[]=rag \
        --data tags[]=status
    
    # Route 4: /api/v1/rag/collections (GET, POST)
    curl -i -X POST "$KONG_ADMIN_URL/services/rag-collections-service/routes" \
        --data name=rag-collections \
        --data 'paths[]=/api/v1/rag/collections' \
        --data 'methods[]=GET' \
        --data 'methods[]=POST' \
        --data strip_path=false \
        --data tags[]=rag \
        --data tags[]=collections
    
    log_success "Routes created successfully"
}

configure_plugins() {
    log_info "Configuring plugins..."
    
    # Plugin 1: JWT Authentication (on rag-query route only)
    log_info "Adding JWT plugin to rag-query route..."
    curl -i -X POST "$KONG_ADMIN_URL/routes/rag-query/plugins" \
        --data name=jwt \
        --data config.secret_is_base64=false \
        --data config.key_claim_name=iss \
        --data config.claims_to_verify[]=exp
    
    # Plugin 2: Rate Limiting (per route - stricter for query)
    log_info "Adding rate limiting to rag-query..."
    curl -i -X POST "$KONG_ADMIN_URL/routes/rag-query/plugins" \
        --data name=rate-limiting \
        --data config.minute=50 \
        --data config.hour=1000 \
        --data config.policy=local \
        --data config.fault_tolerant=true
    
    # Plugin 3: Request Transformer (add headers)
    log_info "Adding request transformer to all RAG routes..."
    curl -i -X POST "$KONG_ADMIN_URL/services/rag-documentation-api/plugins" \
        --data name=request-transformer \
        --data 'config.add.headers[]=X-Service-Token:${INTER_SERVICE_SECRET}' \
        --data 'config.add.headers[]=X-Kong-Request-ID:$(request_id)'
    
    # Plugin 4: Response Transformer (add cache headers)
    log_info "Adding response transformer..."
    curl -i -X POST "$KONG_ADMIN_URL/services/rag-documentation-api/plugins" \
        --data name=response-transformer \
        --data 'config.add.headers[]=X-Cache-Status:miss' \
        --data 'config.add.headers[]=X-Served-By:kong-gateway'
    
    # Plugin 5: Logging (file-log for audit)
    log_info "Adding file logging..."
    curl -i -X POST "$KONG_ADMIN_URL/plugins" \
        --data name=file-log \
        --data 'config.path=/var/log/kong/rag-access.log' \
        --data 'config.reopen=true'
    
    log_success "Plugins configured"
}

verify_configuration() {
    log_info "Verifying Kong configuration..."
    
    # List services
    echo ""
    echo "Services:"
    curl -s "$KONG_ADMIN_URL/services" | jq -r '.data[] | "\(.name) → \(.url)"'
    
    # List routes
    echo ""
    echo "Routes:"
    curl -s "$KONG_ADMIN_URL/routes" | jq -r '.data[] | "\(.name): \(.methods | join(",")) \(.paths | join(","))"'
    
    # List plugins
    echo ""
    echo "Plugins:"
    curl -s "$KONG_ADMIN_URL/plugins" | jq -r '.data[] | "\(.name) on \(.service.name // .route.name // "global")"'
    
    echo ""
    log_success "Configuration verified"
}

test_routes() {
    log_info "Testing RAG routes via Kong..."
    
    # Test 1: Health endpoint
    log_info "Testing health endpoint..."
    if curl -sf "http://localhost:8000/api/v1/rag/status/health" > /dev/null; then
        log_success "Health endpoint OK"
    else
        log_warning "Health endpoint not responding (service may not be running)"
    fi
    
    # Test 2: Search endpoint (should return 401 without JWT for query, or work for search)
    log_info "Testing search endpoint..."
    local response
    response=$(curl -s -w "\n%{http_code}" "http://localhost:8000/api/v1/rag/search?query=test&limit=1")
    local status=$(echo "$response" | tail -1)
    
    if [ "$status" = "200" ] || [ "$status" = "401" ]; then
        log_success "Search endpoint reachable (HTTP $status)"
    else
        log_warning "Search endpoint returned HTTP $status"
    fi
}

display_info() {
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ Kong Gateway Configured for RAG!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "📊 Kong Endpoints:"
    echo "  - Proxy (HTTP):    http://localhost:8000"
    echo "  - Proxy (HTTPS):   https://localhost:8443"
    echo "  - Admin API:       http://localhost:8001"
    echo "  - Konga UI:        http://localhost:1337"
    echo ""
    echo "🔐 RAG Routes (via Kong):"
    echo "  - GET  /api/v1/rag/search"
    echo "  - POST /api/v1/rag/query"
    echo "  - GET  /api/v1/rag/collections"
    echo "  - POST /api/v1/rag/collections"
    echo "  - GET  /api/v1/rag/status/health"
    echo ""
    echo "🔧 Management:"
    echo "  - View services:  curl http://localhost:8001/services | jq"
    echo "  - View routes:    curl http://localhost:8001/routes | jq"
    echo "  - View plugins:   curl http://localhost:8001/plugins | jq"
    echo "  - Konga UI:       http://localhost:1337 (visual management)"
    echo ""
    echo "📚 Next Steps:"
    echo "  1. Update frontend .env: VITE_KONG_GATEWAY_URL=http://localhost:8000"
    echo "  2. Update backend services to accept X-Service-Token from Kong"
    echo "  3. Test end-to-end: Dashboard → Kong → RAG → Qdrant"
    echo ""
}

# ============================================================
# MAIN EXECUTION
# ============================================================

main() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}🚀 Kong Gateway - RAG Configuration${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    
    check_kong_health
    create_rag_service
    create_collections_service
    create_routes
    configure_plugins
    verify_configuration
    test_routes
    display_info
    
    log_success "Kong configuration complete!"
}

# Run main function
main "$@"


