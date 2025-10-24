#!/usr/bin/env bash
set -euo pipefail

echo "🔧 WebScraper API - Complete Fix"
echo "=================================="
echo ""

# Step 1: Create directories
echo "📁 Step 1: Creating required directories..."
mkdir -p /tmp/tradingsystem-pids
mkdir -p /tmp/tradingsystem-logs
echo "   ✅ Directories created"
echo ""

# Step 2: Kill any process on port 3700
echo "🔫 Step 2: Freeing port 3700..."
if lsof -ti:3700 >/dev/null 2>&1; then
    PID=$(lsof -ti:3700)
    PROCESS=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")
    echo "   ⚠️  Found process on port 3700: $PROCESS (PID: $PID)"
    echo "   🔫 Killing process..."
    kill -9 "$PID" 2>/dev/null || true
    sleep 2
    
    if lsof -ti:3700 >/dev/null 2>&1; then
        echo "   ❌ Failed to kill process on port 3700"
        echo "   Please manually run: kill -9 $(lsof -ti:3700)"
        exit 1
    fi
    echo "   ✅ Port 3700 freed"
else
    echo "   ✅ Port 3700 is already free"
fi
echo ""

# Step 3: Clean up old PID file
echo "🧹 Step 3: Cleaning old PID file..."
rm -f /tmp/tradingsystem-pids/webscraper-api.pid
echo "   ✅ Cleanup complete"
echo ""

# Step 4: Verify database is running
echo "🗄️  Step 4: Checking database..."
if ! docker ps | grep -q "data-frontend-apps"; then
    echo "   ❌ Database container 'data-frontend-apps' is not running!"
    echo "   Please start it with: docker compose -f tools/compose/docker-compose.frontend-apps.yml up -d"
    exit 1
fi
echo "   ✅ Database container is running"
echo ""

# Step 5: Verify database schema exists
echo "🔍 Step 5: Verifying webscraper schema..."
SCHEMA_EXISTS=$(docker exec data-frontend-apps psql -U frontend_admin -d frontend_apps -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name='webscraper');" 2>/dev/null || echo "f")

if [ "$SCHEMA_EXISTS" != "t" ]; then
    echo "   ⚠️  Schema 'webscraper' not found. Running setup..."
    cd /home/marce/projetos/TradingSystem/backend/api/webscraper-api
    bash scripts/quick-setup.sh
    if [ $? -ne 0 ]; then
        echo "   ❌ Database setup failed"
        exit 1
    fi
    echo "   ✅ Database setup complete"
else
    echo "   ✅ Schema 'webscraper' exists"
fi
echo ""

# Step 6: Fix .env line endings if needed
echo "🔧 Step 6: Checking .env line endings..."
ENV_FILE="/home/marce/projetos/TradingSystem/.env"
if [ -f "$ENV_FILE" ] && file "$ENV_FILE" | grep -q "CRLF"; then
    echo "   ⚠️  Detected Windows line endings (CRLF) in .env"
    echo "   🔄 Converting to Unix (LF)..."
    sed -i 's/\r$//' "$ENV_FILE"
    echo "   ✅ Line endings fixed"
else
    echo "   ✅ Line endings OK"
fi
echo ""

# Step 7: Start the service
echo "🚀 Step 7: Starting WebScraper API..."
cd /home/marce/projetos/TradingSystem/backend/api/webscraper-api

# Load environment variables
if [ -f ../../../.env ]; then
    set -a
    source ../../../.env
    set +a
fi

# Start service
npm run dev > /tmp/tradingsystem-logs/webscraper-api.log 2>&1 &
SERVICE_PID=$!
echo "$SERVICE_PID" > /tmp/tradingsystem-pids/webscraper-api.pid
echo "   🔄 Service started with PID: $SERVICE_PID"
echo ""

# Step 8: Wait for port to be ready
echo "⏳ Step 8: Waiting for port 3700 to be ready..."
MAX_WAIT=30
WAITED=0
SUCCESS=false

while [ $WAITED -lt $MAX_WAIT ]; do
    # Check if process is still alive
    if ! ps -p "$SERVICE_PID" >/dev/null 2>&1; then
        echo "   ❌ Service crashed during startup!"
        echo ""
        echo "📋 Last 30 lines of log:"
        echo "========================"
        tail -n 30 /tmp/tradingsystem-logs/webscraper-api.log 2>/dev/null || echo "No logs available"
        exit 1
    fi
    
    # Check if port is listening
    if lsof -ti:3700 >/dev/null 2>&1; then
        SUCCESS=true
        break
    fi
    
    sleep 1
    WAITED=$((WAITED + 1))
    
    # Show progress dots
    if [ $((WAITED % 3)) -eq 0 ]; then
        echo -n "."
    fi
done
echo ""

if [ "$SUCCESS" = true ]; then
    echo ""
    echo "✅ SUCCESS! WebScraper API is running"
    echo "===================================="
    echo ""
    echo "📊 Service Details:"
    echo "   URL:  http://localhost:3700"
    echo "   PID:  $SERVICE_PID"
    echo "   Logs: /tmp/tradingsystem-logs/webscraper-api.log"
    echo ""
    echo "🔍 Quick Tests:"
    echo "   curl http://localhost:3700/health"
    echo "   curl http://localhost:3700"
    echo ""
    echo "📈 Check all services:"
    echo "   status-quick"
    echo ""
else
    echo "   ❌ Timeout waiting for port 3700 (waited ${WAITED}s)"
    echo ""
    echo "📋 Last 30 lines of log:"
    echo "========================"
    tail -n 30 /tmp/tradingsystem-logs/webscraper-api.log 2>/dev/null || echo "No logs available"
    exit 1
fi
