#!/bin/bash
#
# Fix Database UI Proxy Connectivity
#
# This script resolves HTTP 502 errors on Database UI proxies by restarting them.
# When Database UI containers restart, nginx proxies cache old IP addresses.
# Restarting the proxies forces them to re-resolve DNS and get current IPs.
#
# Usage: bash scripts/docker/fix-database-ui-proxies.sh
#

set -e

echo "=========================================="
echo "Database UI Proxy Connectivity Fix"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

echo "Step 1: Checking proxy container status..."
echo ""

# Get current status
PGADMIN_PROXY_STATUS=$(docker inspect dbui-pgadmin-proxy --format='{{.State.Status}}' 2>/dev/null || echo "not found")
ADMINER_PROXY_STATUS=$(docker inspect dbui-adminer-proxy --format='{{.State.Status}}' 2>/dev/null || echo "not found")
PGWEB_PROXY_STATUS=$(docker inspect dbui-pgweb-proxy --format='{{.State.Status}}' 2>/dev/null || echo "not found")

echo "  pgAdmin Proxy: $PGADMIN_PROXY_STATUS"
echo "  Adminer Proxy: $ADMINER_PROXY_STATUS"
echo "  pgWeb Proxy: $PGWEB_PROXY_STATUS"
echo ""

# Check if any proxies are missing
if [[ "$PGADMIN_PROXY_STATUS" == "not found" ]] || [[ "$ADMINER_PROXY_STATUS" == "not found" ]] || [[ "$PGWEB_PROXY_STATUS" == "not found" ]]; then
    echo -e "${RED}Error: One or more proxy containers not found${NC}"
    echo "Please ensure all Database UI proxy containers are created first."
    exit 1
fi

echo "Step 2: Restarting proxy containers..."
echo ""

# Restart all proxy containers
docker restart dbui-pgadmin-proxy dbui-adminer-proxy dbui-pgweb-proxy

echo -e "${GREEN}✓ Proxy containers restarted${NC}"
echo ""

echo "Step 3: Waiting for containers to be ready (5 seconds)..."
sleep 5
echo ""

echo "Step 4: Validating connectivity via Gateway..."
echo ""

# Test each Database UI via Gateway
PGADMIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:9080/db-ui/pgadmin 2>&1)
ADMINER_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:9080/db-ui/adminer 2>&1)
PGWEB_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:9080/db-ui/pgweb 2>&1)

echo "  pgAdmin (/db-ui/pgadmin): HTTP $PGADMIN_STATUS"
echo "  Adminer (/db-ui/adminer): HTTP $ADMINER_STATUS"
echo "  pgWeb (/db-ui/pgweb): HTTP $PGWEB_STATUS"
echo ""

# Check results
SUCCESS=true

# pgAdmin should return 302 (redirect to login) or 200
if [[ "$PGADMIN_STATUS" != "302" ]] && [[ "$PGADMIN_STATUS" != "200" ]]; then
    echo -e "${RED}✗ pgAdmin proxy failed (HTTP $PGADMIN_STATUS)${NC}"
    SUCCESS=false
else
    echo -e "${GREEN}✓ pgAdmin proxy working${NC}"
fi

# Adminer should return 200
if [[ "$ADMINER_STATUS" != "200" ]]; then
    echo -e "${RED}✗ Adminer proxy failed (HTTP $ADMINER_STATUS)${NC}"
    SUCCESS=false
else
    echo -e "${GREEN}✓ Adminer proxy working${NC}"
fi

# pgWeb should return 200
if [[ "$PGWEB_STATUS" != "200" ]]; then
    echo -e "${RED}✗ pgWeb proxy failed (HTTP $PGWEB_STATUS)${NC}"
    SUCCESS=false
else
    echo -e "${GREEN}✓ pgWeb proxy working${NC}"
fi

echo ""
echo "=========================================="

if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}SUCCESS: All Database UI proxies are working!${NC}"
    echo ""
    echo "You can now access Database UIs via:"
    echo "  - pgAdmin: http://localhost:9080/db-ui/pgadmin"
    echo "  - Adminer: http://localhost:9080/db-ui/adminer"
    echo "  - pgWeb: http://localhost:9080/db-ui/pgweb"
    exit 0
else
    echo -e "${RED}FAILURE: Some Database UI proxies are not working${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Check if Database UI containers are running:"
    echo "     docker ps --filter name=dbui-"
    echo ""
    echo "  2. Check proxy logs for errors:"
    echo "     docker logs dbui-pgadmin-proxy --tail 20"
    echo "     docker logs dbui-adminer-proxy --tail 20"
    echo "     docker logs dbui-pgweb-proxy --tail 20"
    echo ""
    echo "  3. Check Traefik Dashboard for routing issues:"
    echo "     http://localhost:9081/dashboard/"
    echo ""
    exit 1
fi
