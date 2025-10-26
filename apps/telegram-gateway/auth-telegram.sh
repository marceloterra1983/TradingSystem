#!/bin/bash
# Automated Telegram Gateway Authentication
# Provides login code to the Gateway process

set -euo pipefail

CODE="${1:-67033}"

echo "Starting Telegram Gateway authentication..."
echo "Using code: $CODE"

# Start the Gateway with code input (faster timing to avoid code expiration)
(
  sleep 3  # Wait for connection (reduced from 5)
  echo "$CODE"  # Send code
  sleep 15  # Wait for authentication
) | node src/index.js 2>&1 | tee ../../logs/services/telegram-gateway-auth.log &

PID=$!
echo "Gateway PID: $PID"

# Wait for process to finish or timeout
sleep 20

if ps -p $PID > /dev/null 2>&1; then
    echo "Gateway is still running (authentication may have succeeded)"
    echo "Check logs: tail -f ../../logs/services/telegram-gateway-auth.log"
else
    echo "Gateway process exited"
    echo "Checking logs..."
    tail -50 ../../logs/services/telegram-gateway-auth.log
fi
