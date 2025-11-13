#!/bin/bash

# Fix Traefik middleware @file references that fail in WSL2
# All services using @file middlewares need to be updated to inline or removed

set -e

echo "🔧 Fixing Traefik middleware references..."
echo ""

# Dashboard - already fixed, just restart
echo "1️⃣  Restarting Dashboard (already fixed)..."
cd /workspace/tools/compose
docker compose -f docker-compose.1-dashboard-stack.yml restart dashboard

echo ""
echo "2️⃣  Checking other services with @file middlewares..."

# Find all containers with traefik.http.routers.*.middlewares labels containing @file
docker ps --format '{{.Names}}' | while read container; do
    middlewares=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].Config.Labels | to_entries[] | select(.key | contains("middlewares")) | .value' 2>/dev/null || echo "")

    if echo "$middlewares" | grep -q "@file"; then
        echo "   ⚠️  Found @file middleware in: $container"
        echo "      Middlewares: $middlewares"
    fi
done

echo ""
echo "3️⃣  Testing active routers..."
active_routers=$(curl -s http://localhost:9083/api/http/routers 2>/dev/null | jq -r 'keys[]' 2>/dev/null || echo "")

if [ -z "$active_routers" ]; then
    echo "   ❌ NO ACTIVE ROUTERS FOUND!"
    echo "   All routers are failing due to missing @file middlewares"
else
    echo "   ✅ Active routers:"
    echo "$active_routers" | while read router; do
        echo "      - $router"
    done
fi

echo ""
echo "4️⃣  Testing TP Capital API (should work - uses inline middlewares)..."
response=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: bbf913dad93ae879f1fbbec4490303a2c0d49be1d717342a64173a192f99f1a1" http://localhost:9082/api/tp-capital/health 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
    echo "   ✅ TP Capital API working via Gateway (port 9082)"
else
    echo "   ❌ TP Capital API NOT working via Gateway (HTTP $response)"
fi

echo ""
echo "5️⃣  Testing Workspace API (should work - uses inline middlewares)..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9082/api/workspace/health 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
    echo "   ✅ Workspace API working via Gateway (port 9082)"
else
    echo "   ❌ Workspace API NOT working via Gateway (HTTP $response)"
fi

echo ""
echo "6️⃣  Testing Dashboard (catch-all route)..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9082/ 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
    echo "   ✅ Dashboard working via Gateway (port 9082)"
else
    echo "   ❌ Dashboard NOT working via Gateway (HTTP $response)"
fi

echo ""
echo "="
echo "🎯 Summary:"
echo "   - Services with inline middlewares (TP Capital, Workspace) should work"
echo "   - Services with @file middlewares (Dashboard, Docs, etc.) need to be fixed"
echo "   - Solution: Remove @file middleware references or create inline versions"
echo ""
