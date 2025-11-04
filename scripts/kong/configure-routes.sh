#!/bin/bash
# ==============================================================================
# Configure Kong Routes for RAG Services
# ==============================================================================
# Description: Adds services and routes via Kong Admin API
# Usage: bash scripts/kong/configure-routes.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ADMIN_API="http://localhost:8001"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Configuring Kong Routes${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==============================================================================
# Step 1: Create RAG Service
# ==============================================================================
echo -e "${GREEN}[1/5] Creating RAG Service...${NC}"

curl -i -X POST "$ADMIN_API/services/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rag-service",
    "url": "http://rag-service:3000",
    "connect_timeout": 60000,
    "write_timeout": 60000,
    "read_timeout": 60000,
    "retries": 3
  }' 2>/dev/null | grep -E "(HTTP|id|name)" | head -5

echo -e "${GREEN}  ✅ RAG Service created${NC}"
echo ""

# ==============================================================================
# Step 2: Create Route for /api/v1/rag/*
# ==============================================================================
echo -e "${GREEN}[2/5] Creating route for /api/v1/rag/*...${NC}"

curl -i -X POST "$ADMIN_API/services/rag-service/routes" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rag-api-v1",
    "paths": ["/api/v1/rag"],
    "strip_path": false,
    "preserve_host": false,
    "protocols": ["http", "https"]
  }' 2>/dev/null | grep -E "(HTTP|id|name)" | head -5

echo -e "${GREEN}  ✅ Route created${NC}"
echo ""

# ==============================================================================
# Step 3: Enable Rate Limiting Plugin
# ==============================================================================
echo -e "${GREEN}[3/5] Enabling rate limiting (100 req/min)...${NC}"

curl -i -X POST "$ADMIN_API/routes/rag-api-v1/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rate-limiting",
    "config": {
      "minute": 100,
      "policy": "local",
      "fault_tolerant": true
    }
  }' 2>/dev/null | grep -E "(HTTP|id|name)" | head -5

echo -e "${GREEN}  ✅ Rate limiting enabled${NC}"
echo ""

# ==============================================================================
# Step 4: Enable CORS Plugin
# ==============================================================================
echo -e "${GREEN}[4/5] Enabling CORS...${NC}"

curl -i -X POST "$ADMIN_API/routes/rag-api-v1/plugins" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cors",
    "config": {
      "origins": ["http://localhost:3103", "http://localhost:3000"],
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "headers": ["Accept", "Authorization", "Content-Type", "X-Service-Token"],
      "credentials": true,
      "max_age": 3600
    }
  }' 2>/dev/null | grep -E "(HTTP|id|name)" | head -5

echo -e "${GREEN}  ✅ CORS enabled${NC}"
echo ""

# ==============================================================================
# Step 5: Test Routes
# ==============================================================================
echo -e "${GREEN}[5/5] Testing routes...${NC}"

echo ""
echo "  Testing: http://localhost:8000/api/v1/rag/status/health"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/rag/status/health)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}    ✅ Route working! (HTTP 200)${NC}"
elif [ "$HTTP_CODE" == "503" ]; then
    echo -e "${YELLOW}    ⚠️  Service unavailable (HTTP 503)${NC}"
    echo "    Check if rag-service container is running"
elif [ "$HTTP_CODE" == "401" ]; then
    echo -e "${YELLOW}    ⚠️  Unauthorized (HTTP 401)${NC}"
    echo "    JWT authentication required"
else
    echo -e "${YELLOW}    Status: HTTP $HTTP_CODE${NC}"
fi

echo ""

# ==============================================================================
# Configuration Summary
# ==============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Kong Routes Configured!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Services:"
echo "  - rag-service → http://rag-service:3000"
echo ""
echo "Routes:"
echo "  - /api/v1/rag/* → rag-service"
echo ""
echo "Plugins:"
echo "  - Rate Limiting: 100 req/min"
echo "  - CORS: Enabled for localhost:3103"
echo ""
echo "Test Commands:"
echo "  curl http://localhost:8000/api/v1/rag/status/health"
echo "  curl http://localhost:8001/services | jq '.data[].name'"
echo "  curl http://localhost:8001/routes | jq '.data[].name'"
echo ""
echo -e "${GREEN}✅ Kong is ready to proxy requests!${NC}"
echo ""

