#!/bin/bash
# ==============================================================================
# Backup Qdrant HA Cluster
# ==============================================================================
# Description: Creates full snapshot backup of Qdrant cluster
# Usage: bash scripts/qdrant/backup-cluster.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="/home/marce/Projetos/TradingSystem/data/backups/qdrant"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/qdrant_backup_$TIMESTAMP"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Qdrant Cluster Backup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==============================================================================
# Step 1: Create Backup Directory
# ==============================================================================
echo -e "${GREEN}[1/5] Creating backup directory...${NC}"

mkdir -p "$BACKUP_PATH"

echo -e "${GREEN}  ✅ Backup directory: $BACKUP_PATH${NC}"
echo ""

# ==============================================================================
# Step 2: Create Collection Snapshots
# ==============================================================================
echo -e "${GREEN}[2/5] Creating collection snapshots...${NC}"

# Get all collections
COLLECTIONS=$(curl -s http://localhost:6333/collections | jq -r '.result.collections[].name' 2>/dev/null || echo "")

if [ -z "$COLLECTIONS" ]; then
    echo -e "${YELLOW}  No collections found to backup${NC}"
else
    echo "  Found collections:"
    echo "$COLLECTIONS" | sed 's/^/    - /'
    echo ""
    
    for COLLECTION in $COLLECTIONS; do
        echo "  Creating snapshot for: $COLLECTION"
        
        # Create snapshot via API
        SNAPSHOT=$(curl -s -X POST "http://localhost:6333/collections/$COLLECTION/snapshots" | jq -r '.result.name' 2>/dev/null)
        
        if [ -n "$SNAPSHOT" ] && [ "$SNAPSHOT" != "null" ]; then
            # Download snapshot
            curl -s "http://localhost:6333/collections/$COLLECTION/snapshots/$SNAPSHOT" \
              -o "$BACKUP_PATH/${COLLECTION}_${SNAPSHOT}.snapshot"
            
            echo -e "${GREEN}    ✅ Snapshot created: ${COLLECTION}_${SNAPSHOT}.snapshot${NC}"
            
            # Delete snapshot from server (cleanup)
            curl -s -X DELETE "http://localhost:6333/collections/$COLLECTION/snapshots/$SNAPSHOT" > /dev/null
        else
            echo -e "${YELLOW}    ⚠️  Failed to create snapshot for $COLLECTION${NC}"
        fi
    done
fi

echo ""

# ==============================================================================
# Step 3: Export Cluster Metadata
# ==============================================================================
echo -e "${GREEN}[3/5] Exporting cluster metadata...${NC}"

# Cluster status
curl -s http://localhost:6333/cluster > "$BACKUP_PATH/cluster_status.json"

# Collections metadata
for COLLECTION in $COLLECTIONS; do
    curl -s "http://localhost:6333/collections/$COLLECTION" > "$BACKUP_PATH/${COLLECTION}_metadata.json"
done

echo -e "${GREEN}  ✅ Metadata exported${NC}"
echo ""

# ==============================================================================
# Step 4: Backup Docker Volumes (Optional)
# ==============================================================================
echo -e "${GREEN}[4/5] Backing up Docker volumes...${NC}"

# Backup node1 volume (contains all data due to RF=2)
echo "  Backing up qdrant-node1 volume..."

docker run --rm \
  -v qdrant-ha_qdrant_node1_data:/data \
  -v "$BACKUP_PATH":/backup \
  alpine \
  tar czf /backup/qdrant_node1_volume.tar.gz -C /data . 2>/dev/null || {
    echo -e "${YELLOW}    ⚠️  Volume backup failed (may not exist)${NC}"
  }

if [ -f "$BACKUP_PATH/qdrant_node1_volume.tar.gz" ]; then
    SIZE=$(du -h "$BACKUP_PATH/qdrant_node1_volume.tar.gz" | cut -f1)
    echo -e "${GREEN}    ✅ Volume backed up ($SIZE)${NC}"
fi

echo ""

# ==============================================================================
# Step 5: Create Backup Manifest
# ==============================================================================
echo -e "${GREEN}[5/5] Creating backup manifest...${NC}"

cat > "$BACKUP_PATH/MANIFEST.txt" <<EOF
Qdrant Cluster Backup
=====================

Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Backup Location: $BACKUP_PATH

Collections Backed Up:
$(echo "$COLLECTIONS" | sed 's/^/  - /')

Files:
$(ls -lh "$BACKUP_PATH" | tail -n +2 | awk '{print "  - " $9 " (" $5 ")"}')

Cluster Status:
$(curl -s http://localhost:6333/cluster | jq '.result | {peers: (.peers | length), leader: .raft_info.leader}')

Restore Instructions:
  1. Stop Qdrant cluster: docker compose -f tools/compose/docker-compose.qdrant-ha.yml down
  2. Extract volume: tar xzf qdrant_node1_volume.tar.gz -C /path/to/volume
  3. Restart cluster: docker compose -f tools/compose/docker-compose.qdrant-ha.yml up -d
  4. Or restore via API: POST /collections/{collection}/snapshots/upload

EOF

echo -e "${GREEN}  ✅ Manifest created${NC}"
echo ""

# ==============================================================================
# Backup Summary
# ==============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Backup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Backup Location: $BACKUP_PATH"
echo ""
echo "Files created:"
ls -lh "$BACKUP_PATH" | tail -n +2 | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

TOTAL_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo "Total Size: $TOTAL_SIZE"
echo ""
echo "To restore:"
echo "  1. See MANIFEST.txt in backup directory"
echo "  2. Use snapshot upload API for collections"
echo "  3. Or restore Docker volume from tar.gz"
echo ""
echo -e "${GREEN}✅ Qdrant cluster backup complete!${NC}"
echo ""

