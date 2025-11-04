#!/bin/bash
# ============================================================================
# Update .env for Neon + Qdrant Cluster + Kong Migration
# ============================================================================
# Purpose: Add new environment variables for migrated infrastructure
# Usage: bash scripts/migration/update-env-for-migration.sh
# Note: Creates backup of .env before modifying
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_BACKUP="$PROJECT_ROOT/.env.backup.$(date +%Y%m%d_%H%M%S)"

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

backup_env() {
    log_info "Creating backup of .env..."
    cp "$ENV_FILE" "$ENV_BACKUP"
    log_success "Backup created: $ENV_BACKUP"
}

add_neon_variables() {
    log_info "Adding Neon variables to .env..."
    
    cat >> "$ENV_FILE" <<'EOF'

# ============================================================
# Neon Self-Hosted Configuration (Added 2025-11-03)
# ============================================================
NEON_DATABASE_URL=postgresql://postgres:neon_password@neon-compute:5432/rag
NEON_POSTGRES_USER=postgres
NEON_POSTGRES_PASSWORD=neon_password
NEON_POSTGRES_DB=rag
NEON_COMPUTE_PORT=5435
NEON_PAGESERVER_PORT=6400
NEON_SAFEKEEPER_PORT=7676
NEON_SAFEKEEPER_HTTP_PORT=7677
EOF
    
    log_success "Neon variables added"
}

add_qdrant_cluster_variables() {
    log_info "Adding Qdrant Cluster variables to .env..."
    
    cat >> "$ENV_FILE" <<'EOF'

# ============================================================
# Qdrant Cluster Configuration (Added 2025-11-03)
# ============================================================
QDRANT_CLUSTER_ENABLED=true
QDRANT_VERSION=v1.7.4
QDRANT_NODE_1_PORT=6333
QDRANT_NODE_1_P2P_PORT=6335
QDRANT_NODE_2_PORT=6334
QDRANT_NODE_2_P2P_PORT=6336
QDRANT_NODE_3_PORT=6337
QDRANT_NODE_3_P2P_PORT=6338
QDRANT_LB_PORT=6333
QDRANT_LOG_LEVEL=INFO

# New Qdrant URL (via load balancer) - UPDATE APPLICATION CODE TO USE THIS
QDRANT_CLUSTER_URL=http://qdrant-lb:80
EOF
    
    log_success "Qdrant Cluster variables added"
}

add_kong_variables() {
    log_info "Adding Kong Gateway variables to .env..."
    
    cat >> "$ENV_FILE" <<'EOF'

# ============================================================
# Kong Gateway Configuration (Added 2025-11-03)
# ============================================================
KONG_VERSION=3.4-alpine
KONG_DB_HOST=kong-db
KONG_DB_PORT=5433
KONG_DB_USER=kong
KONG_DB_PASSWORD=kong_password
KONG_DB_NAME=kong
KONG_PROXY_PORT=8000
KONG_PROXY_SSL_PORT=8443
KONG_ADMIN_PORT=8001
KONG_ADMIN_SSL_PORT=8444
KONG_LOG_LEVEL=info
KONGA_PORT=1337
KONGA_DB_NAME=konga

# Kong Gateway URL (for frontend)
KONG_GATEWAY_URL=http://localhost:8000
EOF
    
    log_success "Kong variables added"
}

comment_old_variables() {
    log_info "Commenting out old TimescaleDB/Qdrant variables..."
    
    # This is safer than deleting - allows rollback
    sed -i.bak \
        -e 's/^TIMESCALEDB_/#OLD_TIMESCALEDB_/' \
        -e 's/^QDRANT_URL=/#OLD_QDRANT_URL=/' \
        "$ENV_FILE"
    
    log_success "Old variables commented out (prefixed with #OLD_)"
}

display_summary() {
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ .env Updated Successfully!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "📋 Changes Made:"
    echo "  - Backup created: $ENV_BACKUP"
    echo "  - Added Neon variables (7 vars)"
    echo "  - Added Qdrant Cluster variables (10 vars)"
    echo "  - Added Kong Gateway variables (12 vars)"
    echo "  - Commented out old TimescaleDB/Qdrant variables"
    echo ""
    echo "🔧 Application Code Updates Needed:"
    echo "  - Backend: Use NEON_DATABASE_URL instead of DATABASE_URL"
    echo "  - Backend: Use QDRANT_CLUSTER_URL instead of QDRANT_URL"
    echo "  - Frontend: Use KONG_GATEWAY_URL for API calls"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "  - Review .env manually to ensure no duplicates"
    echo "  - Update application code BEFORE restarting services"
    echo "  - Keep backup (.env.backup.*) for 1 week"
    echo ""
    echo "📖 Rollback (if needed):"
    echo "  cp $ENV_BACKUP $ENV_FILE"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}🔧 Update .env for Migration${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found at $ENV_FILE"
        exit 1
    fi
    
    backup_env
    add_neon_variables
    add_qdrant_cluster_variables
    add_kong_variables
    comment_old_variables
    display_summary
    
    log_success "Environment configuration updated!"
}

# Run main
main "$@"

