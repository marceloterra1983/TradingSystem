#!/bin/bash
set -e

echo "Killing all TP Capital processes..."
pkill -9 -f "tp-capital" 2>/dev/null || true
sleep 2

echo "Starting fresh TP Capital..."
cd /home/marce/Projetos/TradingSystem/apps/tp-capital
mkdir -p logs
NODE_OPTIONS="--no-warnings" node src/server.js > /dev/null 2>&1 &
PID=$!
echo "New PID: $PID"
sleep 5

echo ""
echo "Testing /signals endpoint..."
curl -s "http://localhost:4005/signals?limit=1" | jq '.data[0] | {asset, ts, ingested_at}'
