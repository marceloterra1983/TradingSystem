#!/bin/bash
# ============================================================
# Test Qdrant Cluster Health and Configuration
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

# Test individual nodes
test_node() {
    local port=$1
    local name=$2
    
    log_info "Testing $name on port $port..."
    
    if curl -sf "http://localhost:$port/health" > /dev/null; then
        log_success "$name is healthy"
        return 0
    else
        log_error "$name is not responding"
        return 1
    fi
}

# Test cluster formation
test_cluster() {
    log_info "Testing cluster formation..."
    
    local cluster_info
    cluster_info=$(curl -s http://localhost:6333/cluster)
    
    local peer_count
    peer_count=$(echo "$cluster_info" | jq -r '.peers | length')
    
    if [ "$peer_count" -ge 2 ]; then
        log_success "Cluster formed with $((peer_count + 1)) nodes"
        
        local role
        role=$(echo "$cluster_info" | jq -r '.raft_info.role')
        log_info "Current node role: $role"
        
        return 0
    else
        log_error "Cluster not properly formed (expected 2 peers, got $peer_count)"
        return 1
    fi
}

# Test load balancer
test_load_balancer() {
    log_info "Testing NGINX load balancer..."
    
    if curl -sf "http://localhost:6333/health" > /dev/null; then
        log_success "Load balancer is routing traffic"
    else
        log_error "Load balancer not responding"
        return 1
    fi
    
    # Test distribution
    log_info "Testing load distribution (10 requests)..."
    for i in {1..10}; do
        curl -s "http://localhost:6333/collections" > /dev/null
    done
    log_success "Load distribution test complete (check NGINX logs for routing)"
}

# Main test execution
main() {
    echo ""
    log_info "Qdrant Cluster Health Check"
    echo "=============================="
    echo ""
    
    local failures=0
    
    # Test each node
    test_node 6333 "Node 1 (Leader)" || failures=$((failures + 1))
    test_node 6334 "Node 2 (Follower)" || failures=$((failures + 1))
    test_node 6337 "Node 3 (Follower)" || failures=$((failures + 1))
    
    # Test cluster
    test_cluster || failures=$((failures + 1))
    
    # Test load balancer
    test_load_balancer || failures=$((failures + 1))
    
    echo ""
    if [ $failures -eq 0 ]; then
        log_success "All Qdrant cluster tests passed!"
        exit 0
    else
        log_error "$failures test(s) failed"
        exit 1
    fi
}

main "$@"

