#!/bin/bash

###############################################################################
# Multi-Collection Ingestion Script
#
# Creates and ingests documentation into multiple Qdrant collections,
# each using a different embedding model.
#
# Usage:
#   bash scripts/rag/ingest-multi-collections.sh [collection1,collection2,...]
#
# Examples:
#   bash scripts/rag/ingest-multi-collections.sh
#   bash scripts/rag/ingest-multi-collections.sh documentation,documentation_mxbai
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INGESTION_SERVICE_URL="${LLAMAINDEX_INGESTION_URL:-http://localhost:8201}"
QDRANT_URL="${QDRANT_URL:-http://localhost:6333}"
DOCS_DIR="/data/docs"

# Default collections to ingest
DEFAULT_COLLECTIONS=(
  "documentation:nomic-embed-text:768"
  "documentation_mxbai:mxbai-embed-large:384"
  "documentation_gemma:embeddinggemma:768"
)

# Collection mapping: collection_name:embedding_model:dimensions
COLLECTION_MAP=()

# Parse command line arguments
if [ $# -gt 0 ]; then
  IFS=',' read -ra COLLECTIONS <<< "$1"
  for col in "${COLLECTIONS[@]}"; do
    case "$col" in
      documentation)
        COLLECTION_MAP+=("documentation:nomic-embed-text:768")
        ;;
      documentation_mxbai)
        COLLECTION_MAP+=("documentation_mxbai:mxbai-embed-large:384")
        ;;
      documentation_gemma)
        COLLECTION_MAP+=("documentation_gemma:embeddinggemma:768")
        ;;
      *)
        echo -e "${YELLOW}⚠️  Unknown collection: $col${NC}"
        ;;
    esac
  done
else
  COLLECTION_MAP=("${DEFAULT_COLLECTIONS[@]}")
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Multi-Collection Ingestion${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "📦 ${GREEN}Collections to ingest:${NC}"
for entry in "${COLLECTION_MAP[@]}"; do
  IFS=':' read -r collection model dimensions <<< "$entry"
  echo -e "   • ${YELLOW}$collection${NC} (${model}, ${dimensions}d)"
done
echo ""

# Function to check if collection exists
check_collection() {
  local collection="$1"
  response=$(curl -s -w "\n%{http_code}" "${QDRANT_URL}/collections/${collection}")
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    return 0 # exists
  else
    return 1 # does not exist
  fi
}

# Function to create collection
create_collection() {
  local collection="$1"
  local dimensions="$2"
  
  echo -e "${BLUE}   Creating collection '${collection}' with ${dimensions} dimensions...${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X PUT "${QDRANT_URL}/collections/${collection}" \
    -H "Content-Type: application/json" \
    -d "{
      \"vectors\": {
        \"size\": ${dimensions},
        \"distance\": \"Cosine\"
      }
    }")
  
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}   ✅ Collection created successfully${NC}"
    return 0
  else
    echo -e "${RED}   ❌ Failed to create collection (HTTP $http_code)${NC}"
    echo "$response" | head -n-1
    return 1
  fi
}

# Function to ingest documents
ingest_documents() {
  local collection="$1"
  local model="$2"
  
  echo -e "${BLUE}   Ingesting documents using '${model}'...${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST "${INGESTION_SERVICE_URL}/ingest/directory" \
    -H "Content-Type: application/json" \
    -d "{
      \"directory_path\": \"${DOCS_DIR}\",
      \"collection_name\": \"${collection}\",
      \"embedding_model\": \"${model}\"
    }")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "202" ]; then
    echo -e "${GREEN}   ✅ Ingestion started successfully${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    return 0
  else
    echo -e "${RED}   ❌ Failed to start ingestion (HTTP $http_code)${NC}"
    echo "$body"
    return 1
  fi
}

# Function to get collection count
get_collection_count() {
  local collection="$1"
  
  response=$(curl -s -X POST "${QDRANT_URL}/collections/${collection}/points/count" \
    -H "Content-Type: application/json" \
    -d '{"exact": true}')
  
  count=$(echo "$response" | jq -r '.result.count // 0' 2>/dev/null || echo "0")
  echo "$count"
}

# Main processing loop
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Processing Collections${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0
RESULTS=()

for entry in "${COLLECTION_MAP[@]}"; do
  IFS=':' read -r collection model dimensions <<< "$entry"
  
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}📚 Processing: ${collection}${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  # Check if collection exists
  if check_collection "$collection"; then
    echo -e "${GREEN}   ✓ Collection already exists${NC}"
    count=$(get_collection_count "$collection")
    echo -e "   Current count: ${BLUE}${count}${NC} documents"
    echo ""
    echo -e "${YELLOW}   Skipping (already exists). To force re-ingest, delete the collection first.${NC}"
    RESULTS+=("${collection}:skipped:${count}")
  else
    echo -e "${YELLOW}   Collection does not exist${NC}"
    echo ""
    
    # Create collection
    if create_collection "$collection" "$dimensions"; then
      echo ""
      
      # Ingest documents
      if ingest_documents "$collection" "$model"; then
        echo ""
        echo -e "${GREEN}   ✅ Collection '${collection}' processed successfully${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        RESULTS+=("${collection}:success:pending")
      else
        echo ""
        echo -e "${RED}   ❌ Ingestion failed for '${collection}'${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        RESULTS+=("${collection}:failed:0")
      fi
    else
      echo ""
      echo -e "${RED}   ❌ Creation failed for '${collection}'${NC}"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      RESULTS+=("${collection}:failed:0")
    fi
  fi
  
  echo ""
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "📊 Results:"
echo -e "   • ${GREEN}Success: ${SUCCESS_COUNT}${NC}"
echo -e "   • ${RED}Failed: ${FAIL_COUNT}${NC}"
echo -e "   • ${YELLOW}Skipped: $((${#COLLECTION_MAP[@]} - SUCCESS_COUNT - FAIL_COUNT))${NC}"
echo ""

echo -e "📋 Collection Status:"
for result in "${RESULTS[@]}"; do
  IFS=':' read -r collection status count <<< "$result"
  case "$status" in
    success)
      echo -e "   • ${GREEN}✓${NC} ${collection} - ${status} (indexing...)"
      ;;
    skipped)
      echo -e "   • ${YELLOW}○${NC} ${collection} - ${status} (${count} docs)"
      ;;
    failed)
      echo -e "   • ${RED}✗${NC} ${collection} - ${status}"
      ;;
  esac
done
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "1. Monitor ingestion progress:"
echo -e "   ${YELLOW}docker logs rag-llamaindex-ingest -f${NC}"
echo ""
echo -e "2. Check collection status:"
echo -e "   ${YELLOW}curl http://localhost:3401/api/v1/rag/collections | jq '.'${NC}"
echo ""
echo -e "3. Verify document counts:"
for entry in "${COLLECTION_MAP[@]}"; do
  IFS=':' read -r collection _ _ <<< "$entry"
  echo -e "   ${YELLOW}curl -X POST http://localhost:6333/collections/${collection}/points/count -d '{\"exact\": true}' | jq '.'${NC}"
done
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
fi

exit 0
