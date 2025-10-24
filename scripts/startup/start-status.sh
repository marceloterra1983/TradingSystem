#!/bin/bash
# Ensures the Status API (frontend/apps/status) is running.
# - Installs dependencies on first run.
# - Starts the API in background if it is not already listening on port 3500 (legacy support for 9999).
# - Optional --force-restart flag stops any existing instance before starting a new one.

set -e

FORCE_RESTART=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force-restart|-f)
            FORCE_RESTART=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--force-restart]"
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRASTRUCTURE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$INFRASTRUCTURE_DIR")"
STATUS_PATH="$REPO_ROOT/frontend/apps/status"

if [ ! -d "$STATUS_PATH" ]; then
    echo "❌ Status directory not found at '$STATUS_PATH'."
    exit 1
fi

# Default port (can be overridden via environment)
STATUS_PORT="${STATUS_PORT:-3500}"
export STATUS_PORT

# Function to check if service is running
is_service_running() {
    lsof -i :"$STATUS_PORT" &> /dev/null || lsof -i :9999 &> /dev/null
}

# Stop existing instance if force restart
if [ "$FORCE_RESTART" = true ] && is_service_running; then
    echo "[Status] Stopping existing instance..."
    pkill -f "node.*status" || true
    sleep 1
fi

if is_service_running; then
    echo "[Status] Already running on port ${STATUS_PORT}."
    exit 0
fi

# Install dependencies if needed
if [ ! -d "$STATUS_PATH/node_modules" ]; then
    echo "[Status] Installing npm dependencies..."
    cd "$STATUS_PATH"
    npm install > /dev/null
fi

# Start service in background
echo "[Status] Starting API in background (npm start)..."
cd "$STATUS_PATH"
nohup npm start > /dev/null 2>&1 &

echo "[Status] Startup command dispatched (PID: $!)."
echo "[Status] Service running on http://localhost:${STATUS_PORT}"



