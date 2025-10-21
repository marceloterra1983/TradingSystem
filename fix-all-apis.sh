#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Complete API Fix - All Services"
echo "===================================="
echo ""

# Step 1: Add missing environment variables
echo "📝 Step 1: Adding missing environment variables to .env..."

# Check if variables exist, if not add them
if ! grep -q "WORKSPACE_PORT" .env 2>/dev/null; then
    echo "" >> .env
    echo "# ============================================================================" >> .env
    echo "# Workspace API Configuration" >> .env
    echo "# ============================================================================" >> .env
    echo "WORKSPACE_PORT=3200" >> .env
    echo "WORKSPACE_DATABASE_HOST=localhost" >> .env
    echo "WORKSPACE_DATABASE_PORT=5444" >> .env
    echo "WORKSPACE_DATABASE_NAME=frontend_apps" >> .env
    echo "WORKSPACE_DATABASE_USER=app_workspace" >> .env
    echo "WORKSPACE_DATABASE_PASSWORD=app_workspace_dev_password" >> .env
    echo "WORKSPACE_DATABASE_SCHEMA=workspace" >> .env
    echo "LIBRARY_DB_STRATEGY=timescaledb" >> .env
    echo "   ✅ Workspace API variables added"
else
    echo "   ✅ Workspace API variables already exist"
fi

if ! grep -q "TP_CAPITAL_PORT" .env 2>/dev/null; then
    echo "" >> .env
    echo "# ============================================================================" >> .env
    echo "# TP Capital API Configuration" >> .env
    echo "# ============================================================================" >> .env
    echo "TP_CAPITAL_PORT=3201" >> .env
    echo "TP_CAPITAL_LOG_LEVEL=info" >> .env
    echo "   ✅ TP Capital API variables added"
else
    echo "   ✅ TP Capital API variables already exist"
fi

echo ""

# Step 2: Setup Workspace database
echo "🗄️  Step 2: Setting up Workspace API database..."
bash scripts/setup/setup-workspace-database.sh
echo ""

# Step 3: Stop conflicting services
echo "🛑 Step 3: Stopping services on ports 3200 and 3201..."

for port in 3200 3201; do
    if lsof -ti:$port >/dev/null 2>&1; then
        PID=$(lsof -ti:$port)
        echo "   🔫 Killing process on port $port (PID: $PID)"
        kill -9 "$PID" 2>/dev/null || true
        sleep 1
    fi
done

rm -f /tmp/tradingsystem-pids/workspace-api.pid
rm -f /tmp/tradingsystem-pids/tp-capital.pid
echo "   ✅ Services stopped"
echo ""

# Step 4: Start Workspace API on port 3200
echo "🚀 Step 4: Starting Workspace API on port 3200..."
cd /home/marce/projetos/TradingSystem/backend/api/workspace

# Load environment
set -a
source ../../../.env
set +a

# Ensure using TimescaleDB
export LIBRARY_DB_STRATEGY=timescaledb
export WORKSPACE_PORT=3200

npm run dev > /tmp/tradingsystem-logs/workspace-api.log 2>&1 &
WORKSPACE_PID=$!
echo "$WORKSPACE_PID" > /tmp/tradingsystem-pids/workspace-api.pid
echo "   🔄 Started with PID: $WORKSPACE_PID"
sleep 3

if curl -s http://localhost:3200/health | grep -q "healthy"; then
    echo "   ✅ Workspace API is healthy on port 3200"
else
    echo "   ⚠️  Workspace API may have issues, check logs"
fi
echo ""

# Step 5: Start TP Capital API on port 3201
echo "🚀 Step 5: Starting TP Capital API on port 3201..."
cd /home/marce/projetos/TradingSystem/frontend/apps/tp-capital

# Load environment
set -a
source ../../../.env
set +a

export PORT=3201

npm run dev > /tmp/tradingsystem-logs/tp-capital.log 2>&1 &
TP_CAPITAL_PID=$!
echo "$TP_CAPITAL_PID" > /tmp/tradingsystem-pids/tp-capital.pid
echo "   🔄 Started with PID: $TP_CAPITAL_PID"
sleep 3

if curl -s http://localhost:3201/health | grep -q "ok"; then
    echo "   ✅ TP Capital API is healthy on port 3201"
else
    echo "   ⚠️  TP Capital API may have issues, check logs"
fi
echo ""

# Step 6: Update Vite proxy configuration
echo "🔧 Step 6: Updating Dashboard proxy configuration..."
cat > /tmp/vite-proxy-fix.txt << 'EOFPROXY'
The Vite proxy needs to be updated to route to the correct ports:

In frontend/apps/dashboard/vite.config.ts:

Line ~85: Change TP Capital target from 3200 to 3201
  const tpCapitalProxy = resolveProxy(
    env.VITE_TP_CAPITAL_PROXY_TARGET || env.VITE_TP_CAPITAL_API_URL,
-   'http://localhost:3200',
+   'http://localhost:3201',
  );

Line ~80: Ensure Library/Workspace is on 3200 (should be correct)
  const libraryProxy = resolveProxy(
    env.VITE_WORKSPACE_PROXY_TARGET || env.VITE_WORKSPACE_API_URL,
-   'http://localhost:3102',
+   'http://localhost:3200',
    '/api',
  );
EOFPROXY

echo "   📋 Manual update required - see: /tmp/vite-proxy-fix.txt"
echo ""

# Step 7: Restart Dashboard
echo "🔄 Step 7: Restarting Dashboard to pick up changes..."
bash scripts/services/restart-dashboard.sh
echo ""

# Step 8: Test all endpoints
echo "🧪 Step 8: Testing all endpoints..."
bash scripts/diagnostics/test-api-endpoints.sh
echo ""

echo "✅ API Fix Complete!"
echo "===================="
echo ""
echo "📊 Service Status:"
echo "   Workspace API:  http://localhost:3200 (PID: $WORKSPACE_PID)"
echo "   TP Capital API: http://localhost:3201 (PID: $TP_CAPITAL_PID)"
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "   1. Update frontend/apps/dashboard/vite.config.ts"
echo "   2. Change TP Capital proxy target from 3200 to 3201"
echo "   3. See details in: /tmp/vite-proxy-fix.txt"
echo "   4. Then restart Dashboard again"
echo ""
