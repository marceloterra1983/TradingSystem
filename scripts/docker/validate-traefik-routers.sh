#!/bin/bash

# Validate Traefik routers after middleware fixes
# Shows which routers are active and which services are accessible

set -e

echo "🔍 Validating Traefik Configuration"
echo "=================================="
echo ""

# Check if Traefik is running
if ! docker ps | grep -q "api-gateway"; then
    echo "❌ Traefik gateway not running!"
    exit 1
fi

echo "✅ Traefik gateway is running"
echo ""

# Get WSL2 IP
WSL_IP=$(ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1)
echo "📍 WSL2 IP: $WSL_IP"
echo ""

# Test Traefik API
echo "🔧 Testing Traefik API access..."
if docker exec api-gateway curl -sf http://localhost:8080/api/overview >/dev/null 2>&1; then
    echo "   ✅ Traefik API accessible"
else
    echo "   ❌ Traefik API not accessible"
fi
echo ""

# Get all routers
echo "📊 Active Routers:"
docker exec api-gateway curl -s http://localhost:8080/api/http/routers 2>/dev/null | \
    jq -r 'to_entries[] | select(.value.status == "enabled") | "   ✅ \(.key) - \(.value.rule)"' 2>/dev/null || \
    echo "   ⚠️  Could not retrieve router list"
echo ""

# Test key services
echo "🧪 Testing Service Endpoints (via WSL2 IP):"
echo ""

# Dashboard
echo "1️⃣  Dashboard UI (http://$WSL_IP:9082/)"
response=$(curl -s -o /dev/null -w "%{http_code}" http://$WSL_IP:9082/ 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✅ Status: $response OK"
else
    echo "   ❌ Status: $response FAIL"
fi
echo ""

# Documentation Hub
echo "2️⃣  Documentation Hub (http://$WSL_IP:9082/docs/)"
response=$(curl -s -o /dev/null -w "%{http_code}" http://$WSL_IP:9082/docs/ 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✅ Status: $response OK"
else
    echo "   ❌ Status: $response FAIL"
fi
echo ""

# Documentation API
echo "3️⃣  Documentation API (http://$WSL_IP:9082/api/docs/health)"
response=$(curl -s -o /dev/null -w "%{http_code}" http://$WSL_IP:9082/api/docs/health 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✅ Status: $response OK"
else
    echo "   ❌ Status: $response FAIL"
fi
echo ""

# Workspace API
echo "4️⃣  Workspace API (http://$WSL_IP:9082/api/workspace/health)"
response=$(curl -s -o /dev/null -w "%{http_code}" http://$WSL_IP:9082/api/workspace/health 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✅ Status: $response OK"
else
    echo "   ❌ Status: $response FAIL"
fi
echo ""

# TP Capital API
echo "5️⃣  TP Capital API (http://$WSL_IP:9082/api/tp-capital/health)"
response=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: bbf913dad93ae879f1fbbec4490303a2c0d49be1d717342a64173a192f99f1a1" http://$WSL_IP:9082/api/tp-capital/health 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✅ Status: $response OK"
else
    echo "   ❌ Status: $response FAIL"
fi
echo ""

# Summary
echo "=================================="
echo "🎯 Summary:"
echo "   - Access dashboard: http://$WSL_IP:9082/"
echo "   - Access docs: http://$WSL_IP:9082/docs/"
echo "   - Traefik dashboard: http://$WSL_IP:9083/dashboard/"
echo ""
echo "   For Windows host access, run:"
echo "   PowerShell script: /workspace/scripts/setup/setup-wsl-port-forwarding.ps1"
echo "=================================="
