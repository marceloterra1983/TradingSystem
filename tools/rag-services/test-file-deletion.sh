#!/bin/bash
#
# Test Script: File Deletion and Automatic Orphan Cleanup
#
# This script validates that the File Watcher correctly removes chunks
# from Qdrant when a file is deleted from the filesystem.
#
# Usage: bash test-file-deletion.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCS_DIR="/home/marce/Projetos/TradingSystem/docs/content"
TEST_FILE="$DOCS_DIR/test-orphan-cleanup.mdx"
COLLECTION="documentation"
API_URL="http://localhost:3403"
CONTAINER="rag-collections-service"

echo "=========================================="
echo "🧪 Test: File Deletion & Orphan Cleanup"
echo "=========================================="
echo ""

# Step 1: Create test file
echo -e "${YELLOW}Step 1: Creating test file...${NC}"
cat > "$TEST_FILE" <<EOF
---
title: Test Orphan Cleanup
tags: [test]
---

# Test File for Orphan Cleanup

This file will be deleted to test automatic chunk removal.

## Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## More Content

Ut enim ad minim veniam, quis nostrud exercitation ullamco.
Laboris nisi ut aliquip ex ea commodo consequat.
EOF

echo -e "${GREEN}✓ Test file created: $TEST_FILE${NC}"
echo ""

# Step 2: Wait for auto-ingestion
echo -e "${YELLOW}Step 2: Waiting for auto-ingestion (15 seconds)...${NC}"
echo "The File Watcher has a 5s debounce + ingestion time"
sleep 15

# Step 3: Check if file was indexed
echo -e "${YELLOW}Step 3: Checking if file was indexed...${NC}"
RESPONSE=$(curl -s "$API_URL/api/v1/rag/status?collection=$COLLECTION")
INDEXED_FILES=$(echo "$RESPONSE" | jq -r '.documentation.indexedFiles // []' | grep -c "test-orphan-cleanup.mdx" || echo "0")

if [ "$INDEXED_FILES" -gt 0 ]; then
  echo -e "${GREEN}✓ File was indexed successfully${NC}"
  INITIAL_CHUNKS=$(echo "$RESPONSE" | jq -r '.documentation.totalChunks // 0')
  echo "  Total chunks in collection: $INITIAL_CHUNKS"
else
  echo -e "${RED}✗ File was NOT indexed (may need more time or auto-update is disabled)${NC}"
  echo "  Continuing test anyway..."
fi
echo ""

# Step 4: Get initial orphan count
INITIAL_ORPHANS=$(echo "$RESPONSE" | jq -r '.documentation.orphanChunks // 0')
echo "Initial orphan count: $INITIAL_ORPHANS"
echo ""

# Step 5: Delete the file
echo -e "${YELLOW}Step 4: Deleting test file...${NC}"
rm "$TEST_FILE"
echo -e "${GREEN}✓ File deleted: $TEST_FILE${NC}"
echo ""

# Step 6: Wait for File Watcher to detect deletion
echo -e "${YELLOW}Step 5: Waiting for File Watcher to process deletion (10 seconds)...${NC}"
sleep 10

# Step 7: Check container logs
echo -e "${YELLOW}Step 6: Checking File Watcher logs...${NC}"
echo "Looking for deletion event in last 20 lines of logs..."
echo ""
docker logs "$CONTAINER" --tail 20 | grep -A 3 -B 1 "File deleted\|Chunks removed" || echo "  (no deletion logs found yet)"
echo ""

# Step 8: Verify chunks were removed
echo -e "${YELLOW}Step 7: Verifying chunks were removed...${NC}"
RESPONSE_AFTER=$(curl -s "$API_URL/api/v1/rag/status?collection=$COLLECTION")
FINAL_ORPHANS=$(echo "$RESPONSE_AFTER" | jq -r '.documentation.orphanChunks // 0')
FINAL_CHUNKS=$(echo "$RESPONSE_AFTER" | jq -r '.documentation.totalChunks // 0')

echo "Final orphan count: $FINAL_ORPHANS"
echo "Final total chunks: $FINAL_CHUNKS"
echo ""

# Step 9: Evaluate results
echo "=========================================="
echo "📊 Test Results"
echo "=========================================="
echo ""

if [ "$INDEXED_FILES" -gt 0 ]; then
  CHUNKS_REMOVED=$((INITIAL_CHUNKS - FINAL_CHUNKS))
  echo "Chunks removed: $CHUNKS_REMOVED"
  echo ""
  
  if [ "$CHUNKS_REMOVED" -gt 0 ]; then
    echo -e "${GREEN}✅ SUCCESS: Chunks were automatically removed!${NC}"
    echo ""
    echo "Summary:"
    echo "  - Test file created and indexed ✓"
    echo "  - File deleted from filesystem ✓"
    echo "  - File Watcher detected deletion ✓"
    echo "  - Chunks removed from Qdrant ✓"
    echo "  - Chunks removed: $CHUNKS_REMOVED"
    exit 0
  else
    echo -e "${RED}❌ FAILURE: Chunks were NOT removed${NC}"
    echo ""
    echo "Possible causes:"
    echo "  1. File Watcher auto-deletion not implemented"
    echo "  2. Path normalization mismatch"
    echo "  3. Collection name mismatch"
    echo ""
    echo "Next steps:"
    echo "  1. Check logs: docker logs $CONTAINER"
    echo "  2. Manually clean orphans: curl -X POST $API_URL/api/v1/rag/clean-orphans"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  INCONCLUSIVE: File was not indexed${NC}"
  echo ""
  echo "The file may not have been indexed yet."
  echo "Orphan count: $FINAL_ORPHANS (expected: $INITIAL_ORPHANS + new orphans if file was indexed)"
  echo ""
  echo "To complete the test:"
  echo "  1. Verify auto-update is enabled for collection '$COLLECTION'"
  echo "  2. Check File Watcher status: docker logs $CONTAINER | grep 'File Watcher'"
  echo "  3. Wait longer and re-run test"
  exit 2
fi
