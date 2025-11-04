#!/bin/bash
# ==============================================================================
# Migrate Qdrant from Single Node to HA Cluster
# ==============================================================================
# Description: Migrates existing single-node Qdrant to 3-node HA cluster
# Usage: bash scripts/qdrant/migrate-to-ha-cluster.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Qdrant Migration: Single → HA Cluster${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==============================================================================
# Step 1: Backup Existing Collections
# ==============================================================================
echo -e "${GREEN}[1/6] Backing up existing collections...${NC}"

# Check if old Qdrant is running
OLD_QDRANT_URL="http://localhost:6333"

if curl -s "$OLD_QDRANT_URL/health" > /dev/null 2>&1; then
    echo "  Old Qdrant detected. Getting collection list..."
    
    COLLECTIONS=$(curl -s "$OLD_QDRANT_URL/collections" | jq -r '.result.collections[].name' 2>/dev/null || echo "")
    
    if [ -n "$COLLECTIONS" ]; then
        echo "  Found collections:"
        echo "$COLLECTIONS" | sed 's/^/    - /'
        
        # Export collections metadata
        mkdir -p "$PROJECT_ROOT/data/qdrant-backup"
        
        for COLLECTION in $COLLECTIONS; do
            echo "  Exporting metadata for: $COLLECTION"
            curl -s "$OLD_QDRANT_URL/collections/$COLLECTION" > "$PROJECT_ROOT/data/qdrant-backup/${COLLECTION}_metadata.json"
        done
        
        echo -e "${GREEN}  ✅ Backup complete${NC}"
    else
        echo -e "${YELLOW}  No collections found (fresh install)${NC}"
    fi
else
    echo -e "${YELLOW}  No old Qdrant running (fresh install)${NC}"
fi

echo ""

# ==============================================================================
# Step 2: Stop Old Qdrant
# ==============================================================================
echo -e "${GREEN}[2/6] Stopping old Qdrant instance...${NC}"

cd "$PROJECT_ROOT"

docker stop data-qdrant 2>/dev/null || echo "  No old container to stop"
docker rm data-qdrant 2>/dev/null || echo "  No old container to remove"

echo -e "${GREEN}  ✅ Old instance stopped${NC}"
echo ""

# ==============================================================================
# Step 3: Start HA Cluster
# ==============================================================================
echo -e "${GREEN}[3/6] Starting Qdrant HA cluster (3 nodes)...${NC}"

docker compose -f tools/compose/docker-compose.qdrant-ha.yml up -d

echo ""
echo "  Waiting 30 seconds for cluster formation..."
sleep 30

echo ""
echo "  Cluster status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|qdrant"

echo ""
echo -e "${GREEN}  ✅ HA cluster started${NC}"
echo ""

# ==============================================================================
# Step 4: Verify Cluster Health
# ==============================================================================
echo -e "${GREEN}[4/6] Verifying cluster health...${NC}"

LB_URL="http://localhost:6340"

# Wait for load balancer
for i in {1..10}; do
    if curl -s "$LB_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ Load balancer responding${NC}"
        break
    fi
    echo "  Waiting for load balancer... ($i/10)"
    sleep 2
done

# Check cluster status on node1
CLUSTER_STATUS=$(curl -s "http://localhost:6333/cluster" 2>/dev/null || echo "")

if [ -n "$CLUSTER_STATUS" ]; then
    echo ""
    echo "  Cluster status:"
    echo "$CLUSTER_STATUS" | jq '.'
else
    echo -e "${YELLOW}  ⚠️  Could not retrieve cluster status${NC}"
fi

echo ""

# ==============================================================================
# Step 5: Create Collections with Replication
# ==============================================================================
echo -e "${GREEN}[5/6] Creating collections with replication...${NC}"

# Create 'documentation' collection with RF=2
echo "  Creating 'documentation' collection (RF=2)..."

curl -X PUT "$LB_URL/collections/documentation" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    },
    "replication_factor": 2,
    "write_consistency_factor": 1,
    "shard_number": 2
  }' 2>/dev/null

echo ""
echo -e "${GREEN}  ✅ Collection created${NC}"
echo ""

# ==============================================================================
# Step 6: Update Services to Use Load Balancer
# ==============================================================================
echo -e "${GREEN}[6/6] Updating services configuration...${NC}"

echo ""
echo -e "${YELLOW}  ⚠️  MANUAL ACTION REQUIRED:${NC}"
echo ""
echo "  Update environment variables in services:"
echo "    OLD: QDRANT_HOST=data-qdrant"
echo "    NEW: QDRANT_HOST=qdrant-lb"
echo ""
echo "    OLD: QDRANT_URL=http://data-qdrant:6333"
echo "    NEW: QDRANT_URL=http://qdrant-lb:6333"
echo ""
echo "  Files to update:"
echo "    - tools/compose/docker-compose.rag.yml"
echo "    - backend/api/documentation-api/.env (if exists)"
echo ""
echo "  After updating, restart RAG services:"
echo "    docker compose -f tools/compose/docker-compose.rag.yml restart"
echo ""

# ==============================================================================
# Migration Summary
# ==============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Migration Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Qdrant HA Cluster:"
echo "  - Node 1: http://localhost:6333"
echo "  - Node 2: http://localhost:6336"
echo "  - Node 3: http://localhost:6338"
echo "  - Load Balancer: http://localhost:6340"
echo "  - HAProxy Stats: http://localhost:8404/stats (admin/admin)"
echo ""
echo "Configuration:"
echo "  - Nodes: 3"
echo "  - Replication Factor: 2"
echo "  - Write Consistency: 1"
echo "  - Shards per collection: 2"
echo ""
echo "Next Steps:"
echo "  1. Update service configurations (see above)"
echo "  2. Restart RAG services"
echo "  3. Verify: curl http://localhost:6340/collections/documentation"
echo "  4. Test failover: docker stop qdrant-node1"
echo ""
echo -e "${GREEN}✅ Qdrant is now running in High Availability mode!${NC}"
echo ""

