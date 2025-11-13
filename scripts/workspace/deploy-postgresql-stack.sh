#!/bin/bash
#
# Workspace Stack - Deploy com PostgreSQL Vanilla
#
# SOLUÇÃO ALTERNATIVA ao Neon - Use este script se:
# - Build do Neon falhou (erro de compilação Rust)
# - Memória/disco insuficiente para build do Neon
# - Precisa de deploy rápido (5 minutos vs 35 minutos)
#
# Este script usa PostgreSQL 17 padrão (Alpine) ao invés de Neon.
#
# Diferenças do Neon:
# ✅ Mais simples (1 container vs 3)
# ✅ Mais rápido (startup em 10s vs 60s)
# ✅ Menos recursos (~300MB RAM vs ~1.3GB)
# ❌ Sem database branching
# ❌ Sem scale-to-zero
#
# Usage: bash scripts/workspace/deploy-postgresql-stack.sh [--force]
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Options
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --help)
            echo "Usage: bash scripts/workspace/deploy-postgresql-stack.sh [OPTIONS]"
            echo ""
            echo "Deploy Workspace stack with PostgreSQL 17 (vanilla) instead of Neon."
            echo ""
            echo "Options:"
            echo "  --force       Skip confirmations"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Helper functions
log_section() {
    echo ""
    echo "=============================================="
    echo "$1"
    echo "=============================================="
    echo ""
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
}

# Display deployment plan
display_plan() {
    log_section "Workspace Stack - PostgreSQL Vanilla Deployment"
    
    echo "This script will deploy Workspace with PostgreSQL 17 (standard)."
    echo ""
    echo "✅ ADVANTAGES:"
    echo "  - Fast deployment (~5 minutes vs ~35 minutes)"
    echo "  - No Rust compilation required"
    echo "  - Less RAM usage (~300MB vs ~1.3GB)"
    echo "  - Simpler architecture (1 DB container vs 3)"
    echo "  - Production-ready (PostgreSQL 17 Alpine)"
    echo ""
    echo "⚠️ DIFFERENCES FROM NEON:"
    echo "  - No database branching (Git-like branches)"
    echo "  - No scale-to-zero (always running)"
    echo "  - No separated storage/compute"
    echo ""
    echo "📦 WHAT WILL BE DEPLOYED:"
    echo "  1. PostgreSQL 17 (Alpine)"
    echo "     - Port: 5433 (external)"
    echo "     - Schema: workspace"
    echo "     - Tables: workspace_items, workspace_categories"
    echo "     - Indexes: B-tree + GIN"
    echo ""
    echo "  2. Workspace API"
    echo "     - Port: 3200"
    echo "     - Express + Node.js 20"
    echo "     - PostgreSQLClient (new)"
    echo ""
    echo "⏱️  Estimated time: ~5 minutes"
    echo ""
    
    if [ "$FORCE" = false ]; then
        echo -n "Proceed with PostgreSQL deployment? (yes/no): "
        read -r response
        if [ "$response" != "yes" ]; then
            log_warn "Deployment cancelled"
            exit 0
        fi
    fi
}

# Step 1: Configure environment
step_configure_env() {
    log_section "STEP 1: Configure Environment"
    
    log_info "Updating .env for PostgreSQL strategy..."
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        log_error ".env file not found!"
        exit 1
    fi
    
    # Add or update PostgreSQL variables
    if grep -q "LIBRARY_DB_STRATEGY=" .env; then
        # Update existing
        sed -i 's/LIBRARY_DB_STRATEGY=.*/LIBRARY_DB_STRATEGY=postgresql/' .env
        log_success "Updated LIBRARY_DB_STRATEGY to postgresql"
    else
        # Add new
        echo "LIBRARY_DB_STRATEGY=postgresql" >> .env
        log_success "Added LIBRARY_DB_STRATEGY=postgresql"
    fi
    
    # Add PostgreSQL-specific variables if not present
    if ! grep -q "POSTGRES_HOST=" .env; then
        cat >> .env << 'EOF'

# PostgreSQL Configuration (Workspace)
POSTGRES_HOST=workspace-db
POSTGRES_PORT=5432
POSTGRES_DATABASE=workspace
POSTGRES_USER=postgres
POSTGRES_PASSWORD=workspace_secure_pass
POSTGRES_SCHEMA=workspace
POSTGRES_POOL_MAX=50
POSTGRES_POOL_MIN=2

# Workspace DB Password (for Docker)
WORKSPACE_DB_PASSWORD=workspace_secure_pass
EOF
        log_success "Added PostgreSQL configuration"
    fi
    
    log_success "Environment configured"
}

# Step 2: Start stack
step_start_stack() {
    log_section "STEP 2: Start PostgreSQL Stack"
    
    log_info "Starting containers..."
    
    docker compose -f tools/compose/docker-compose.workspace-postgres.yml up -d
    
    log_success "Containers started"
    
    # Wait for health
    log_info "Waiting for database to be healthy (30s)..."
    sleep 30
    
    # Verify containers
    local db_status=$(docker inspect workspace-db --format='{{.State.Health.Status}}' 2>/dev/null || echo "unhealthy")
    
    if [ "$db_status" = "healthy" ]; then
        log_success "Database is healthy"
    else
        log_fail "Database is not healthy"
        log_info "Checking logs..."
        docker logs workspace-db --tail 50
        exit 1
    fi
}

# Step 3: Verify installation
step_verify() {
    log_section "STEP 3: Verify Installation"
    
    # Wait for API
    log_info "Waiting for API to start (15s)..."
    sleep 15
    
    # Test API health
    log_step "Testing API health..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:3200/health > /dev/null 2>&1; then
            log_success "API is healthy"
            
            # Display health details
            if command -v jq &> /dev/null; then
                echo ""
                curl -s http://localhost:3200/health | jq .
                echo ""
            fi
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                log_fail "API health check failed after $max_attempts attempts"
                log_info "Check logs: docker logs workspace-api"
                exit 1
            fi
            log_info "Waiting for API... (attempt $attempt/$max_attempts)"
            sleep 5
            attempt=$((attempt + 1))
        fi
    done
    
    # Test CRUD
    log_step "Testing CRUD operations..."
    
    local create_response=$(curl -s -X POST http://localhost:3200/api/items \
        -H "Content-Type: application/json" \
        -d '{
            "title": "PostgreSQL Deployment Test",
            "description": "Deployed with PostgreSQL 17",
            "category": "documentacao",
            "priority": "high"
        }')
    
    if echo "$create_response" | grep -q "success"; then
        log_success "CRUD test passed"
        
        if command -v jq &> /dev/null; then
            echo "$create_response" | jq '.data | {id, title, category}'
        fi
    else
        log_fail "CRUD test failed"
        echo "$create_response"
    fi
    
    # Database verification
    log_step "Verifying database..."
    
    local item_count=$(docker exec workspace-db psql -U postgres -d workspace -tAc "SELECT COUNT(*) FROM workspace.workspace_items;")
    local cat_count=$(docker exec workspace-db psql -U postgres -d workspace -tAc "SELECT COUNT(*) FROM workspace.workspace_categories;")
    
    log_info "Items: $item_count"
    log_info "Categories: $cat_count"
    
    if [ "$cat_count" -eq 6 ]; then
        log_success "Categories seeded correctly"
    else
        log_warn "Expected 6 categories, found $cat_count"
    fi
}

# Display success message
display_success() {
    log_section "Deployment Complete! 🎉"
    
    echo -e "${GREEN}Workspace Stack is running with PostgreSQL 17!${NC}"
    echo ""
    echo "=============================================="
    echo "Service URLs"
    echo "=============================================="
    echo ""
    echo "• Workspace API:     http://localhost:3200"
    echo "  ├─ Health:         http://localhost:3200/health"
    echo "  ├─ Items API:      http://localhost:3200/api/items"
    echo "  └─ Metrics:        http://localhost:3200/metrics"
    echo ""
    echo "• PostgreSQL DB:     localhost:5433"
    echo "  ├─ Database:       workspace"
    echo "  ├─ Schema:         workspace"
    echo "  └─ User:           postgres"
    echo ""
    echo "• Dashboard:         http://localhost:9080/#/workspace"
    echo ""
    echo "=============================================="
    echo "Quick Commands"
    echo "=============================================="
    echo ""
    echo "# View logs"
    echo "docker compose -f tools/compose/docker-compose.workspace-postgres.yml logs -f"
    echo ""
    echo "# Check status"
    echo "docker compose -f tools/compose/docker-compose.workspace-postgres.yml ps"
    echo ""
    echo "# Stop stack"
    echo "docker compose -f tools/compose/docker-compose.workspace-postgres.yml down"
    echo ""
    echo "# Connect to database"
    echo "docker exec -it workspace-db psql -U postgres -d workspace"
    echo ""
    echo "# Test API"
    echo "curl http://localhost:3200/api/items | jq ."
    echo ""
    echo "=============================================="
    echo "Architecture"
    echo "=============================================="
    echo ""
    echo "Database Strategy: postgresql (vanilla)"
    echo "Containers: 2 (vs 4 with Neon)"
    echo "RAM Usage: ~500MB (vs ~1.5GB with Neon)"
    echo "Startup Time: ~30s (vs ~60s with Neon)"
    echo ""
    echo "=============================================="
    echo ""
    echo -e "${GREEN}✓ All systems operational!${NC}"
    echo ""
}

# Main execution
main() {
    echo ""
    echo "=============================================="
    echo "Workspace Stack - PostgreSQL 17 Deployment"
    echo "=============================================="
    echo ""
    echo "Alternative to Neon (faster, simpler)"
    echo "Date: $(date +%Y-%m-%d\ %H:%M:%S)"
    echo ""
    
    display_plan
    
    echo ""
    log_info "Starting deployment..."
    echo ""
    
    # Start timer
    START_TIME=$(date +%s)
    
    # Execute steps
    step_configure_env
    step_start_stack
    step_verify
    
    # End timer
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    echo ""
    log_info "Deployment completed in ${MINUTES}m ${SECONDS}s"
    
    display_success
}

# Error handling
trap 'log_error "Deployment failed! Check logs above for details."; exit 1' ERR

# Run main
main "$@"

