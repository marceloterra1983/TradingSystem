#!/bin/bash
# Troubleshooting script for Health Dashboard

set -e

PROJECT_ROOT="/home/marce/projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "============================================"
echo "Health Dashboard Troubleshooting"
echo "============================================"
echo ""

# Step 1: Check if port 3004 is in use
echo "📋 Step 1: Checking port 3004..."
PORT_CHECK=$(lsof -ti:3004 2>/dev/null || echo "")
if [ -n "$PORT_CHECK" ]; then
    echo "⚠️  Port 3004 is in use by process: $PORT_CHECK"
    echo "   Killing process..."
    kill -9 $PORT_CHECK 2>/dev/null || true
    sleep 2
    echo "✅ Port 3004 freed"
else
    echo "✅ Port 3004 is available"
fi
echo ""

# Step 2: Check Documentation API
echo "📋 Step 2: Checking Documentation API (port 3400)..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3400/health 2>/dev/null || echo "000")
if [ "$API_RESPONSE" = "200" ]; then
    echo "✅ Documentation API is running"
    echo "   Health endpoint: http://localhost:3400/health"
else
    echo "⚠️  Documentation API not responding (HTTP $API_RESPONSE)"
    echo "   Starting Documentation API..."
    docker compose -f tools/compose/docker-compose.docs.yml up -d documentation-api
    sleep 5
    
    # Check again
    API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3400/health 2>/dev/null || echo "000")
    if [ "$API_RESPONSE" = "200" ]; then
        echo "✅ Documentation API started successfully"
    else
        echo "❌ Documentation API failed to start"
        echo "   Check logs: docker logs docs-documentation-api"
    fi
fi
echo ""

# Step 3: Check Docusaurus files
echo "📋 Step 3: Checking Docusaurus files..."
cd "$PROJECT_ROOT/docs/docusaurus"

if [ ! -f "src/pages/health/index.tsx" ]; then
    echo "❌ Health page not found: src/pages/health/index.tsx"
    exit 1
else
    echo "✅ Health page exists: src/pages/health/index.tsx"
fi

if [ ! -f "src/components/HealthMetricsCard/index.tsx" ]; then
    echo "❌ HealthMetricsCard component not found"
    exit 1
else
    echo "✅ HealthMetricsCard component exists"
fi
echo ""

# Step 4: Check node_modules
echo "📋 Step 4: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found, installing dependencies..."
    npm install
else
    echo "✅ node_modules exists"
fi
echo ""

# Step 5: Clear cache
echo "📋 Step 5: Clearing Docusaurus cache..."
rm -rf .docusaurus 2>/dev/null || true
npm run clear 2>/dev/null || true
echo "✅ Cache cleared"
echo ""

# Step 6: TypeScript check
echo "📋 Step 6: Running TypeScript check..."
npm run typecheck 2>&1 | head -20
TS_EXIT_CODE=${PIPESTATUS[0]}
if [ $TS_EXIT_CODE -eq 0 ]; then
    echo "✅ TypeScript check passed"
else
    echo "⚠️  TypeScript errors found (but may not be critical)"
fi
echo ""

# Summary
echo "============================================"
echo "Summary"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Start Docusaurus:"
echo "   cd $PROJECT_ROOT/docs/docusaurus"
echo "   npm run start -- --port 3004"
echo ""
echo "2. Wait for: [SUCCESS] Docusaurus website is running..."
echo ""
echo "3. Open browser: http://localhost:3004/health"
echo ""
echo "4. If page still doesn't load, check browser console (F12)"
echo ""
