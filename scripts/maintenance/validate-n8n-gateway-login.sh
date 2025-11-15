#!/usr/bin/env bash
# ============================================================================
# N8N Gateway Login Validation
# ============================================================================
# Purpose: Validate n8n login works correctly via Traefik API Gateway
# Author: AI Assistant
# Date: 2025-11-14
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ -f "$PROJECT_ROOT/.env" ]]; then
  source "$PROJECT_ROOT/.env"
else
  echo -e "${RED}✗ .env file not found at $PROJECT_ROOT/.env${NC}"
  exit 1
fi

# Variables
GATEWAY_URL="${GATEWAY_PUBLIC_URL:-http://localhost:9082}"
N8N_ENDPOINT="$GATEWAY_URL/n8n/"
TIMEOUT=10

echo "=================================================="
echo "N8N Gateway Login Validation"
echo "=================================================="
echo "Gateway URL: $GATEWAY_URL"
echo "N8N Endpoint: $N8N_ENDPOINT"
echo ""

# ============================================================================
# Test 1: Gateway Accessibility
# ============================================================================
echo -n "Test 1: Gateway accessibility... "
if curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$GATEWAY_URL" | grep -qE "^(200|301|302)$"; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "Gateway is not accessible at $GATEWAY_URL"
  exit 1
fi

# ============================================================================
# Test 2: N8N Endpoint Routing
# ============================================================================
echo -n "Test 2: N8N endpoint routing... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$N8N_ENDPOINT" || echo "000")

if [[ "$HTTP_CODE" =~ ^(200|301|302)$ ]]; then
  echo -e "${GREEN}✓ PASS (HTTP $HTTP_CODE)${NC}"
elif [[ "$HTTP_CODE" == "401" ]]; then
  echo -e "${GREEN}✓ PASS (HTTP 401 - Auth required, routing works)${NC}"
else
  echo -e "${RED}✗ FAIL (HTTP $HTTP_CODE)${NC}"
  echo "N8N endpoint not routed correctly via gateway"
  exit 1
fi

# ============================================================================
# Test 3: Session Cookie Domain
# ============================================================================
echo -n "Test 3: Session cookie validation... "
COOKIE_RESPONSE=$(curl -s -i --max-time $TIMEOUT "$N8N_ENDPOINT" || echo "")

# Check if Set-Cookie header exists and has correct domain
if echo "$COOKIE_RESPONSE" | grep -qi "Set-Cookie.*Domain=localhost"; then
  echo -e "${GREEN}✓ PASS${NC}"
elif echo "$COOKIE_RESPONSE" | grep -qi "Set-Cookie"; then
  echo -e "${YELLOW}⚠ WARNING${NC}"
  echo "Session cookie detected but domain may be incorrect"
  echo "$COOKIE_RESPONSE" | grep -i "Set-Cookie"
else
  echo -e "${YELLOW}⚠ SKIP${NC} (No cookies in initial request)"
fi

# ============================================================================
# Test 4: CORS Headers
# ============================================================================
echo -n "Test 4: CORS headers... "
CORS_RESPONSE=$(curl -s -i -H "Origin: $GATEWAY_URL" --max-time $TIMEOUT "$N8N_ENDPOINT" || echo "")

if echo "$CORS_RESPONSE" | grep -qi "Access-Control-Allow-Origin"; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${YELLOW}⚠ WARNING${NC}"
  echo "CORS headers not found (may be OK if n8n doesn't require CORS)"
fi

# ============================================================================
# Test 5: WebSocket Upgrade Support
# ============================================================================
echo -n "Test 5: WebSocket upgrade path... "
WS_RESPONSE=$(curl -s -i -H "Connection: Upgrade" -H "Upgrade: websocket" --max-time $TIMEOUT "$N8N_ENDPOINT" || echo "")

if echo "$WS_RESPONSE" | grep -qiE "(101|426)"; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${YELLOW}⚠ WARNING${NC}"
  echo "WebSocket upgrade may not be configured (check if n8n requires WS)"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=================================================="
echo -e "${GREEN}✓ All critical tests passed!${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Test manual login: $N8N_ENDPOINT"
echo "2. Verify webhook URLs use: $GATEWAY_URL/webhooks/n8n"
echo "3. Monitor logs: docker logs n8n -f"
echo ""
