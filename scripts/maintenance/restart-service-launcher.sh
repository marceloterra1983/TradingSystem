#!/usr/bin/env bash

# ============================================================================
# Restart Service Launcher
# ============================================================================
# Safely restarts the Service Launcher to apply code changes
#
# Usage:
#   bash scripts/maintenance/restart-service-launcher.sh
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} Restarting Service Launcher..."
echo ""

# Find the Service Launcher process
SERVICE_LAUNCHER_PID=$(ps aux | grep -E "apps/status|service-launcher" | grep -v grep | grep node | awk '{print $2}' | head -n 1)

if [ -n "$SERVICE_LAUNCHER_PID" ]; then
  echo -e "${YELLOW}[INFO]${NC} Found Service Launcher running on PID: $SERVICE_LAUNCHER_PID"
  echo -e "${YELLOW}[INFO]${NC} Stopping Service Launcher..."
  kill "$SERVICE_LAUNCHER_PID"
  
  # Wait for process to stop
  sleep 2
  
  # Check if still running
  if ps -p "$SERVICE_LAUNCHER_PID" > /dev/null 2>&1; then
    echo -e "${RED}[WARNING]${NC} Process still running, forcing kill..."
    kill -9 "$SERVICE_LAUNCHER_PID"
    sleep 1
  fi
  
  echo -e "${GREEN}[SUCCESS]${NC} Service Launcher stopped"
else
  echo -e "${YELLOW}[INFO]${NC} Service Launcher not currently running"
fi

echo ""
echo -e "${BLUE}[INFO]${NC} Starting Service Launcher..."
echo ""

# Change to Service Launcher directory
cd "$(dirname "$0")/../apps/status"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}[INFO]${NC} Installing dependencies..."
  npm install
  echo ""
fi

# Start Service Launcher in background
echo -e "${BLUE}[INFO]${NC} Starting Service Launcher on port 3500..."
nohup npm run dev > /tmp/service-launcher.log 2>&1 &
NEW_PID=$!

echo -e "${GREEN}[SUCCESS]${NC} Service Launcher started with PID: $NEW_PID"
echo ""

# Wait for service to be ready
echo -e "${BLUE}[INFO]${NC} Waiting for service to be ready..."
for i in {1..10}; do
  if curl -sf http://localhost:3500/health > /dev/null 2>&1; then
    echo -e "${GREEN}[SUCCESS]${NC} Service Launcher is ready!"
    echo ""
    
    # Test the /api/ports endpoint
    echo -e "${BLUE}[INFO]${NC} Testing /api/ports endpoint..."
    if curl -sf http://localhost:3500/api/ports > /dev/null 2>&1; then
      echo -e "${GREEN}[SUCCESS]${NC} /api/ports endpoint is working!"
      echo ""
      echo -e "${GREEN}✓${NC} Service Launcher restarted successfully"
      echo -e "${BLUE}[INFO]${NC} Logs: tail -f /tmp/service-launcher.log"
      echo -e "${BLUE}[INFO]${NC} Dashboard: http://localhost:3103/#/ports"
      exit 0
    else
      echo -e "${RED}[ERROR]${NC} /api/ports endpoint not found"
      echo -e "${YELLOW}[INFO]${NC} Check logs: tail -f /tmp/service-launcher.log"
      exit 1
    fi
  fi
  
  echo -n "."
  sleep 1
done

echo ""
echo -e "${RED}[ERROR]${NC} Service Launcher failed to start"
echo -e "${YELLOW}[INFO]${NC} Check logs: tail -f /tmp/service-launcher.log"
exit 1
