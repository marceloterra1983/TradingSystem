#!/bin/bash
# ============================================================================
# Neon Self-Hosted Setup Script
# ============================================================================
# Purpose: Automate Neon stack deployment (compute, pageserver, safekeeper)
# Usage: bash scripts/neon/setup-neon-local.sh
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.neon.yml"
ENV_FILE="$PROJECT_ROOT/.env"

# Functions
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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_success "Docker is installed"
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed or too old. Please upgrade."
        exit 1
    fi
    log_success "Docker Compose is installed"
    
    # Check .env file
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found at $ENV_FILE"
        exit 1
    fi
    log_success ".env file found"
    
    # Check network exists
    if ! docker network inspect tradingsystem_backend &> /dev/null; then
        log_warning "Network tradingsystem_backend not found, creating..."
        docker network create tradingsystem_backend
        log_success "Network created"
    else
        log_success "Network tradingsystem_backend exists"
    fi
}

create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p "$PROJECT_ROOT/tools/neon"
mkdir -p "$PROJECT_ROOT/backend/data/neon/init"
mkdir -p "$PROJECT_ROOT/backend/data/neon/runtime/compute"
mkdir -p "$PROJECT_ROOT/backend/data/neon/runtime/pageserver"
mkdir -p "$PROJECT_ROOT/backend/data/neon/runtime/safekeeper"
    
    log_success "Directories created"
}

deploy_neon_stack() {
    log_info "Deploying Neon stack..."
    
    cd "$PROJECT_ROOT"
    
    # Pull images
    log_info "Pulling Neon images..."
    docker compose -f "$COMPOSE_FILE" pull
    
    # Start services
    log_info "Starting Neon services..."
    docker compose -f "$COMPOSE_FILE" up -d
    
    log_success "Neon stack deployed"
}

wait_for_services() {
    log_info "Waiting for Neon services to be healthy..."
    
    local max_wait=120  # 2 minutes
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        if docker compose -f "$COMPOSE_FILE" ps | grep -q "healthy"; then
            local healthy_count=$(docker compose -f "$COMPOSE_FILE" ps | grep -c "healthy" || echo "0")
            
            if [ "$healthy_count" -eq 3 ]; then
                log_success "All Neon services are healthy"
                return 0
            fi
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    
    echo ""
    log_error "Services did not become healthy within ${max_wait}s"
    log_info "Checking service status:"
    docker compose -f "$COMPOSE_FILE" ps
    return 1
}

verify_connectivity() {
    log_info "Verifying Neon connectivity..."
    
    # Test PostgreSQL connection
    local neon_port="${NEON_COMPUTE_PORT:-5435}"
    local neon_user="${NEON_POSTGRES_USER:-postgres}"
    local neon_db="${NEON_POSTGRES_DB:-rag}"
    
    if docker exec neon-compute pg_isready -U "$neon_user" -d "$neon_db" &> /dev/null; then
        log_success "Neon Compute is accepting connections"
    else
        log_error "Neon Compute is not responding"
        return 1
    fi
    
    # Test Pageserver HTTP endpoint
    if curl -sf http://localhost:6400/v1/status &> /dev/null; then
        log_success "Neon Pageserver is responsive"
    else
        log_warning "Neon Pageserver HTTP endpoint not responding (may be normal)"
    fi
    
    # Test Safekeeper HTTP endpoint
    if curl -sf http://localhost:7677/v1/status &> /dev/null; then
        log_success "Neon Safekeeper is responsive"
    else
        log_warning "Neon Safekeeper HTTP endpoint not responding (may be normal)"
    fi
}

install_extensions() {
    log_info "Installing PostgreSQL extensions..."
    
    docker exec neon-compute psql -U postgres -d rag <<EOF
-- Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Try TimescaleDB (may not be available)
DO \$\$
BEGIN
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
    RAISE NOTICE 'TimescaleDB installed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'TimescaleDB not available, will use native partitioning';
END
\$\$;

-- Verify installations
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'vector', 'timescaledb', 'pg_stat_statements');
EOF
    
    if [ $? -eq 0 ]; then
        log_success "Extensions installed"
    else
        log_error "Failed to install extensions"
        return 1
    fi
}

display_info() {
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ Neon Self-Hosted Setup Complete!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "📊 Connection Information:"
    echo "  - Compute:    postgresql://postgres:password@localhost:5435/rag"
    echo "  - Pageserver: http://localhost:6400/v1/status"
    echo "  - Safekeeper: http://localhost:7677/v1/status"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  - Connect:    docker exec -it neon-compute psql -U postgres -d rag"
    echo "  - Logs:       docker compose -f tools/compose/docker-compose.neon.yml logs -f"
    echo "  - Status:     docker compose -f tools/compose/docker-compose.neon.yml ps"
    echo "  - Stop:       docker compose -f tools/compose/docker-compose.neon.yml down"
    echo ""
    echo "📚 Next Steps:"
    echo "  1. Create RAG schema: psql -U postgres -d rag -f backend/data/neon/init/02-create-rag-schema.sql"
    echo "  2. Migrate data from TimescaleDB: bash scripts/migration/migrate-timescaledb-to-neon.sh"
    echo "  3. Update application .env: NEON_DATABASE_URL=postgresql://postgres:password@localhost:5435/rag"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}🚀 Neon Self-Hosted Setup${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    
    check_prerequisites
    create_directories
    deploy_neon_stack
    
    if ! wait_for_services; then
        log_error "Setup failed - services not healthy"
        log_info "Check logs: docker compose -f $COMPOSE_FILE logs"
        exit 1
    fi
    
    verify_connectivity
    install_extensions
    display_info
    
    log_success "Setup complete! Neon is ready to use."
}

# Run main function
main "$@"

