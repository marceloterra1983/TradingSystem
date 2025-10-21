#!/usr/bin/env bash
set -euo pipefail

echo "🔄 Dashboard - Restart"
echo "======================"
echo ""

# Step 1: Stop existing dashboard process
echo "🛑 Step 1: Stopping existing Dashboard..."
PID_FILE="/tmp/tradingsystem-pids/dashboard.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "   🔫 Killing process PID: $PID"
        kill -9 "$PID" 2>/dev/null || true
        sleep 2
    fi
    rm -f "$PID_FILE"
    echo "   ✅ Stopped"
else
    echo "   ⚠️  No PID file found, checking port 3103..."
fi

# Kill any process on port 3103
if lsof -ti:3103 >/dev/null 2>&1; then
    PORT_PID=$(lsof -ti:3103)
    echo "   🔫 Killing process on port 3103 (PID: $PORT_PID)"
    kill -9 "$PORT_PID" 2>/dev/null || true
    sleep 2
    echo "   ✅ Port 3103 freed"
else
    echo "   ✅ Port 3103 is free"
fi

echo ""

# Step 2: Ensure directories exist
echo "📁 Step 2: Ensuring directories exist..."
mkdir -p /tmp/tradingsystem-pids
mkdir -p /tmp/tradingsystem-logs
echo "   ✅ Directories ready"
echo ""

# Step 3: Start Dashboard
echo "🚀 Step 3: Starting Dashboard..."
cd /home/marce/projetos/TradingSystem/frontend/apps/dashboard

# Load environment from root
if [ -f ../../../.env ]; then
    set -a
    source ../../../.env
    set +a
fi

# Start in background
npm run dev > /tmp/tradingsystem-logs/dashboard.log 2>&1 &
SERVICE_PID=$!
echo "$SERVICE_PID" > /tmp/tradingsystem-pids/dashboard.pid
echo "   🔄 Service started with PID: $SERVICE_PID"
echo ""

# Step 4: Wait for port
echo "⏳ Step 4: Waiting for port 3103..."
MAX_WAIT=30
WAITED=0
SUCCESS=false

while [ $WAITED -lt $MAX_WAIT ]; do
    # Check if process is alive
    if ! ps -p "$SERVICE_PID" >/dev/null 2>&1; then
        echo "   ❌ Dashboard crashed during startup!"
        echo ""
        echo "📋 Last 30 lines of log:"
        tail -n 30 /tmp/tradingsystem-logs/dashboard.log 2>/dev/null || echo "No logs"
        exit 1
    fi
    
    # Check if port is listening
    if lsof -ti:3103 >/dev/null 2>&1; then
        SUCCESS=true
        break
    fi
    
    sleep 1
    WAITED=$((WAITED + 1))
    
    if [ $((WAITED % 3)) -eq 0 ]; then
        echo -n "."
    fi
done
echo ""

if [ "$SUCCESS" = true ]; then
    echo ""
    echo "✅ SUCCESS! Dashboard is running"
    echo "================================"
    echo ""
    echo "📊 Details:"
    echo "   URL:  http://localhost:3103"
    echo "   PID:  $SERVICE_PID"
    echo "   Logs: /tmp/tradingsystem-logs/dashboard.log"
    echo ""
    echo "🔍 Proxied APIs:"
    echo "   /api/library      → localhost:3200 (Workspace API)"
    echo "   /api/tp-capital   → localhost:3201 (TP Capital API)"
    echo "   /api/b3           → localhost:3302"
    echo "   /api/docs         → localhost:3400"
    echo "   /api/launcher     → localhost:3500"
    echo "   /api/firecrawl    → localhost:3600"
    echo "   /api/webscraper   → localhost:3700"
    echo ""
    echo "🌐 Open in browser:"
    echo "   http://localhost:3103"
    echo ""
else
    echo "   ❌ Timeout waiting for port 3103"
    echo ""
    echo "📋 Last 30 lines of log:"
    tail -n 30 /tmp/tradingsystem-logs/dashboard.log 2>/dev/null || echo "No logs"
    exit 1
fi
