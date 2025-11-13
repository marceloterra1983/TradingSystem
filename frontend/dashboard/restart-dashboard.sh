#!/bin/bash

echo "🔄 Restarting Dashboard to pick up environment changes..."

# Find and kill existing dashboard process
DASHBOARD_PID=$(ps aux | grep -E "vite.*9080" | grep -v grep | awk '{print $2}' | head -1)

if [ -n "$DASHBOARD_PID" ]; then
  echo "📍 Found dashboard running (PID: $DASHBOARD_PID)"
  echo "⏹️  Stopping dashboard..."
  kill -15 $DASHBOARD_PID

  # Wait for process to stop
  for i in {1..10}; do
    if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
      echo "✅ Dashboard stopped"
      break
    fi
    sleep 1
  done

  # Force kill if still running
  if kill -0 $DASHBOARD_PID 2>/dev/null; then
    echo "⚠️  Process still running, force killing..."
    kill -9 $DASHBOARD_PID
  fi
else
  echo "ℹ️  Dashboard not running"
fi

# Start dashboard
cd "$(dirname "$0")"
echo "🚀 Starting dashboard on port 9080..."
npm run dev > /tmp/dashboard.log 2>&1 &
NEW_PID=$!

sleep 2

echo "✅ Dashboard started (PID: $NEW_PID)"
echo "📊 Access at: http://localhost:9080/#/rag-services"
echo "📝 Logs: tail -f /tmp/dashboard.log"
