#!/bin/bash
# ============================================================================
# Qdrant Cluster Initialization Script
# ============================================================================
# Purpose: Deploy and verify 3-node Qdrant cluster with NGINX load balancer
# Usage: bash scripts/qdrant/init-cluster.sh
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
COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.qdrant-cluster.yml"

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
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check jq (for JSON parsing)
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed, some checks will be skipped"
    fi
    
    # Check networks
    if ! docker network inspect tradingsystem_backend &> /dev/null; then
        log_info "Creating tradingsystem_backend network..."
        docker network create tradingsystem_backend
    fi
    
    log_success "Prerequisites OK"
}

deploy_cluster() {
    log_info "Deploying Qdrant cluster (3 nodes + load balancer)..."
    
    cd "$PROJECT_ROOT"
    
    # Pull images
    log_info "Pulling Qdrant image..."
    docker compose -f "$COMPOSE_FILE" pull
    
    # Start services
    log_info "Starting Qdrant cluster..."
    docker compose -f "$COMPOSE_FILE" up -d
    
    log_success "Cluster deployment initiated"
}

wait_for_cluster() {
    log_info "Waiting for Qdrant cluster to form..."
    
    local max_wait=180  # 3 minutes
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        local healthy=0
        
        # Check each node
        for node in "qdrant-node-1" "qdrant-node-2" "qdrant-node-3"; do
            if docker exec "$node" curl -sf http://localhost:6333/health &> /dev/null; then
                healthy=$((healthy + 1))
            fi
        done
        
        if [ $healthy -eq 3 ]; then
            log_success "All 3 nodes are healthy"
            return 0
        fi
        
        echo -n "."
        sleep 5
        elapsed=$((elapsed + 5))
    done
    
    echo ""
    log_error "Cluster did not become healthy within ${max_wait}s"
    log_info "Checking service status:"
    docker compose -f "$COMPOSE_FILE" ps
    return 1
}

verify_cluster_formation() {
    log_info "Verifying cluster formation..."
    
    # Check cluster status via Node 1
    local cluster_info
    cluster_info=$(docker exec qdrant-node-1 curl -sf http://localhost:6333/cluster 2>/dev/null || echo "{}")
    
    if [ -z "$cluster_info" ] || [ "$cluster_info" = "{}" ]; then
        log_error "Failed to get cluster information"
        return 1
    fi
    
    # Parse cluster info with jq
    if command -v jq &> /dev/null; then
        local peer_count
        peer_count=$(echo "$cluster_info" | jq '.peers | length' 2>/dev/null || echo "0")
        
        log_info "Cluster peers detected: $peer_count"
        
        if [ "$peer_count" -ge 2 ]; then
            log_success "Cluster formed successfully (3 nodes total)"
            
            # Show cluster details
            echo ""
            echo "Cluster Details:"
            echo "$cluster_info" | jq '{
                peer_count: (.peers | length),
                raft_role: .raft_info.role,
                raft_term: .raft_info.term,
                raft_commit: .raft_info.commit,
                peer_ids: [.peers[].id]
            }'
            echo ""
        else
            log_warning "Cluster may not be fully formed (expected 2 peers, got $peer_count)"
        fi
    else
        log_info "Cluster info (jq not available):"
        echo "$cluster_info"
    fi
}

verify_load_balancer() {
    log_info "Verifying NGINX load balancer..."
    
    # Check NGINX health
    if curl -sf http://localhost:6333/health &> /dev/null; then
        log_success "Load balancer is healthy"
    else
        log_error "Load balancer is not responding"
        return 1
    fi
    
    # Test routing to cluster
    if curl -sf http://localhost:6333/cluster &> /dev/null; then
        log_success "Load balancer routing to Qdrant cluster OK"
    else
        log_error "Load balancer cannot reach Qdrant cluster"
        return 1
    fi
}

display_cluster_info() {
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ Qdrant Cluster Setup Complete!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "📊 Cluster Information:"
    echo "  - Node 1 (Leader):  http://localhost:6333 (via LB) or :6333 (direct)"
    echo "  - Node 2 (Follower): http://localhost:6334 (direct)"
    echo "  - Node 3 (Follower): http://localhost:6337 (direct)"
    echo "  - Load Balancer:    http://localhost:6333 (⭐ use this)"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  - Cluster status: curl http://localhost:6333/cluster | jq"
    echo "  - List collections: curl http://localhost:6333/collections | jq"
    echo "  - Node 1 direct: curl http://localhost:6333/health"
    echo "  - Node 2 direct: curl http://localhost:6334/health"
    echo "  - Node 3 direct: curl http://localhost:6337/health"
    echo "  - Logs: docker compose -f tools/compose/docker-compose.qdrant-cluster.yml logs -f"
    echo "  - Stop: docker compose -f tools/compose/docker-compose.qdrant-cluster.yml down"
    echo ""
    echo "📚 Next Steps:"
    echo "  1. Migrate collections from single instance: python scripts/migration/migrate-qdrant-single-to-cluster.py"
    echo "  2. Update application .env: QDRANT_URL=http://qdrant-lb:80"
    echo "  3. Test failover: docker stop qdrant-node-1 (observe automatic recovery)"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}🚀 Qdrant Cluster Initialization${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    
    check_prerequisites
    deploy_cluster
    
    if ! wait_for_cluster; then
        log_error "Cluster initialization failed"
        log_info "Check logs: docker compose -f $COMPOSE_FILE logs"
        exit 1
    fi
    
    verify_cluster_formation
    verify_load_balancer
    display_cluster_info
    
    log_success "Qdrant cluster is ready to use!"
}

# Run main function
main "$@"


