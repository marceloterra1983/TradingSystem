#!/usr/bin/env bash

echo "🔍 TP Capital Diagnostic"
echo "========================"
echo ""

echo "📊 Port Check:"
if lsof -ti:3201 >/dev/null 2>&1; then
    PID=$(lsof -ti:3201)
    echo "   ✓ Process running on port 3201 (PID: $PID)"
    echo "   Process: $(ps -p $PID -o comm=)"
else
    echo "   ✗ No process on port 3201"
fi
echo ""

echo "📊 Direct Test:"
echo "   Testing: http://localhost:3201/health"
curl -v http://localhost:3201/health 2>&1 | head -20
echo ""

echo "📋 Last 30 lines of log:"
tail -30 /tmp/tradingsystem-logs/tp-capital.log 2>/dev/null || echo "No logs"
