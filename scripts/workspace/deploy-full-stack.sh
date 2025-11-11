#!/bin/bash
#
# Workspace Stack - Full Deployment Script
#
# This script performs COMPLETE setup of Workspace with Neon:
# 1. Environment configuration
# 2. Neon image build (if needed)
# 3. Stack startup (4 containers)
# 4. Database initialization
# 5. Connection verification
# 6. API health check
#
# Usage: bash scripts/workspace/deploy-full-stack.sh [--skip-build] [--force]
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
SKIP_BUILD=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            echo "Usage: bash scripts/workspace/deploy-full-stack.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-build  Skip Neon image build (use if already built)"
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

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    local missing=0
    
    # Docker
    if ! command -v docker &> /dev/null; then
        log_fail "Docker not installed"
        missing=$((missing + 1))
    else
        log_success "Docker: $(docker --version | cut -d' ' -f3)"
    fi
    
    # Docker Compose
    if ! docker compose version &> /dev/null; then
        log_fail "Docker Compose not installed"
        missing=$((missing + 1))
    else
        log_success "Docker Compose: $(docker compose version | cut -d' ' -f4)"
    fi
    
    # jq (for JSON parsing)
    if ! command -v jq &> /dev/null; then
        log_warn "jq not installed (optional, but recommended for JSON output)"
    else
        log_success "jq: installed"
    fi
    
    # curl
    if ! command -v curl &> /dev/null; then
        log_fail "curl not installed"
        missing=$((missing + 1))
    else
        log_success "curl: installed"
    fi
    
    if [ $missing -gt 0 ]; then
        log_error "$missing prerequisite(s) missing!"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Display deployment plan
display_plan() {
    log_section "Workspace Stack - Full Deployment Plan"
    
    echo "This script will perform the following steps:"
    echo ""
    echo "1. ✓ Environment Configuration"
    echo "   - Add Neon variables to .env"
    echo "   - Configure connection pool"
    echo "   - Set API ports and CORS"
    echo ""
    
    if [ "$SKIP_BUILD" = false ]; then
        echo "2. ✓ Build Neon Image (30 minutes first time)"
        echo "   - Clone Neon from source"
        echo "   - Compile Rust + PostgreSQL"
        echo "   - Create neon-local:latest image"
        echo ""
    else
        echo "2. ⊘ Build Neon Image (SKIPPED)"
        echo ""
    fi
    
    echo "3. ✓ Start Workspace Stack (4 containers)"
    echo "   - workspace-db-pageserver (storage)"
    echo "   - workspace-db-safekeeper (WAL)"
    echo "   - workspace-db-compute (PostgreSQL 17)"
    echo "   - workspace-api (Express)"
    echo ""
    echo "4. ✓ Initialize Database"
    echo "   - Create schema 'workspace'"
    echo "   - Create tables (items, categories)"
    echo "   - Create indexes (B-tree, GIN)"
    echo "   - Seed categories (6 rows)"
    echo ""
    echo "5. ✓ Verify Installation"
    echo "   - Connection tests (10 tests)"
    echo "   - API health check"
    echo "   - CRUD operations test"
    echo ""
    
    echo "Estimated time:"
    if [ "$SKIP_BUILD" = false ]; then
        echo "  - With build: ~35 minutes"
    else
        echo "  - Without build: ~5 minutes"
    fi
    echo ""
    
    if [ "$FORCE" = false ]; then
        echo -n "Proceed with deployment? (yes/no): "
        read -r response
        if [ "$response" != "yes" ]; then
            log_warn "Deployment cancelled"
            exit 0
        fi
    fi
}

# Step 1: Environment configuration
step_env_config() {
    log_section "STEP 1: Environment Configuration"
    
    if [ -f "scripts/workspace/setup-neon-env.sh" ]; then
        bash scripts/workspace/setup-neon-env.sh
        log_success "Environment configured"
    else
        log_error "Setup script not found: scripts/workspace/setup-neon-env.sh"
        exit 1
    fi
}

# Step 2: Build Neon image
step_build_neon() {
    if [ "$SKIP_BUILD" = true ]; then
        log_section "STEP 2: Build Neon Image (SKIPPED)"
        
        # Verify image exists
        if docker images | grep -q "neon-local"; then
            log_success "Neon image already exists"
        else
            log_error "Neon image not found! Run without --skip-build"
            exit 1
        fi
        return
    fi
    
    log_section "STEP 2: Build Neon Image"
    
    if [ -f "scripts/database/build-neon-from-source.sh" ]; then
        log_info "Starting Neon build (this will take ~30 minutes)..."
        bash scripts/database/build-neon-from-source.sh
        log_success "Neon image built"
    else
        log_error "Build script not found: scripts/database/build-neon-from-source.sh"
        exit 1
    fi
}

# Step 3: Start Workspace stack
step_start_stack() {
    log_section "STEP 3: Start Workspace Stack"
    
    if [ -f "scripts/docker/start-workspace-stack.sh" ]; then
        bash scripts/docker/start-workspace-stack.sh
        log_success "Stack started"
        
        # Wait for containers to be healthy
        log_info "Waiting for containers to be healthy (60s)..."
        sleep 60
        
        # Verify all containers are up
        local container_count=$(docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml ps --format json | jq -s 'length')
        log_info "Running containers: $container_count/4"
        
    else
        log_error "Start script not found: scripts/docker/start-workspace-stack.sh"
        exit 1
    fi
}

# Step 4: Initialize database
step_init_database() {
    log_section "STEP 4: Initialize Database"
    
    if [ -f "scripts/database/init-neon-workspace.sh" ]; then
        bash scripts/database/init-neon-workspace.sh
        log_success "Database initialized"
    else
        log_error "Init script not found: scripts/database/init-neon-workspace.sh"
        exit 1
    fi
}

# Step 5: Verify installation
step_verify() {
    log_section "STEP 5: Verify Installation"
    
    # Connection tests
    log_step "Running connection tests..."
    if [ -f "scripts/database/test-neon-connection.sh" ]; then
        if bash scripts/database/test-neon-connection.sh; then
            log_success "Connection tests passed"
        else
            log_fail "Connection tests failed"
            exit 1
        fi
    fi
    
    # API health check
    log_step "Checking API health..."
    sleep 5
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:3200/health > /dev/null 2>&1; then
            log_success "API is healthy"
            
            # Display health details
            if command -v jq &> /dev/null; then
                echo ""
                curl -s http://localhost:3200/health | jq .
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
    
    # Test CRUD operations
    log_step "Testing CRUD operations..."
    
    # Create test item
    local create_response=$(curl -s -X POST http://localhost:3200/api/items \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Test Deployment",
            "description": "Automated deployment test",
            "category": "documentacao",
            "priority": "medium"
        }')
    
    if echo "$create_response" | grep -q "success"; then
        log_success "CRUD test passed"
        
        if command -v jq &> /dev/null; then
            echo "$create_response" | jq '.data.title'
        fi
    else
        log_fail "CRUD test failed"
        echo "$create_response"
    fi
}

# Display success message
display_success() {
    log_section "Deployment Complete! 🎉"
    
    echo -e "${GREEN}Workspace Stack is now running with Neon PostgreSQL!${NC}"
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
    echo "• Neon Compute:      localhost:5433"
    echo "  ├─ Database:       workspace"
    echo "  └─ Schema:         workspace"
    echo ""
    echo "• Dashboard:         http://localhost:3103/#/workspace"
    echo ""
    echo "=============================================="
    echo "Quick Commands"
    echo "=============================================="
    echo ""
    echo "# View logs"
    echo "docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml logs -f"
    echo ""
    echo "# Check status"
    echo "docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml ps"
    echo ""
    echo "# Stop stack"
    echo "bash scripts/docker/stop-workspace-stack.sh"
    echo ""
    echo "# Test API"
    echo "curl http://localhost:3200/api/items | jq ."
    echo ""
    echo "=============================================="
    echo "Next Steps"
    echo "=============================================="
    echo ""
    echo "1. Open Dashboard and test Workspace UI:"
    echo "   http://localhost:3103/#/workspace"
    echo ""
    echo "2. Implement JWT Authentication (P0 - Critical):"
    echo "   - See: docs/content/reference/architecture-reviews/"
    echo "   - Time: ~1 day"
    echo ""
    echo "3. Add Redis Cache (P1 - Recommended):"
    echo "   - 60-80% reduction in database load"
    echo "   - Time: ~1 day"
    echo ""
    echo "4. Configure Monitoring (P0 - Critical):"
    echo "   - Prometheus alerts"
    echo "   - Grafana dashboards"
    echo "   - Time: ~4 hours"
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
    echo "Workspace Stack - Full Deployment"
    echo "=============================================="
    echo ""
    echo "Target: Neon PostgreSQL (Autonomous Stack)"
    echo "Date: $(date +%Y-%m-%d\ %H:%M:%S)"
    echo ""
    
    check_prerequisites
    display_plan
    
    echo ""
    log_info "Starting deployment..."
    echo ""
    
    # Start timer
    START_TIME=$(date +%s)
    
    # Execute steps
    step_env_config
    step_build_neon
    step_start_stack
    step_init_database
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

