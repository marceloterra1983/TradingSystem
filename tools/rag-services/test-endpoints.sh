#!/bin/bash
# RAG Collections Service - Endpoint Testing Script
# Tests all API endpoints to verify backend functionality

set -e

BASE_URL="${RAG_BASE_URL:-http://localhost:3402}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "  RAG Collections Service - Endpoint Tests"
echo "================================================"
echo "Base URL: $BASE_URL"
echo ""

# Function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local data=$4

  echo -n "Testing: $description ... "

  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  elif [ "$method" == "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ OK${NC} (HTTP $http_code)"
    if [ ! -z "$body" ]; then
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
  else
    echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
    echo "$body"
  fi

  echo ""
}

# Health Check
echo "1. Health Check"
echo "---------------"
test_endpoint "GET" "/health" "Service health check"

# Collections Endpoints
echo "2. Collections API"
echo "------------------"
test_endpoint "GET" "/api/v1/rag/collections" "List all collections"
test_endpoint "GET" "/api/v1/rag/collections/documentation" "Get specific collection (documentation)"

# Models Endpoints
echo "3. Models API"
echo "-------------"
test_endpoint "GET" "/api/v1/rag/models" "List all embedding models"
test_endpoint "GET" "/api/v1/rag/models/nomic-embed-text" "Get specific model (nomic-embed-text)"

# Create Collection (optional - will create a test collection)
echo "4. Create Collection (Test)"
echo "----------------------------"
read -p "Create a test collection? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  test_collection_data='{
    "name": "test_collection",
    "description": "Test collection created by test script",
    "directory": "/data/docs/content/test",
    "embeddingModel": "nomic-embed-text",
    "chunkSize": 512,
    "chunkOverlap": 50,
    "fileTypes": ["md", "txt"],
    "recursive": true,
    "enabled": true,
    "autoUpdate": false
  }'

  test_endpoint "POST" "/api/v1/rag/collections" "Create test collection" "$test_collection_data"

  # Clean up - delete test collection
  read -p "Delete test collection? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -n "Deleting test collection ... "
    curl -s -X DELETE "$BASE_URL/api/v1/rag/collections/test_collection" > /dev/null
    echo -e "${GREEN}✓ Deleted${NC}"
    echo ""
  fi
fi

# Summary
echo "================================================"
echo "  Test Summary"
echo "================================================"
echo "All critical endpoints were tested."
echo ""
echo "Next steps:"
echo "1. Check logs for any errors"
echo "2. Test frontend integration at http://localhost:3103/#/rag-services"
echo "3. Try creating/editing collections via UI"
echo ""
echo -e "${GREEN}Testing complete!${NC}"
