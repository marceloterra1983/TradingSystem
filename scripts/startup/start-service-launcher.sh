#!/bin/bash
# Ensures the Laucher API (frontend/apps/service-launcher) is running.
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
SERVICE_LAUNCHER_PATH="$REPO_ROOT/frontend/apps/service-launcher"

if [ ! -d "$SERVICE_LAUNCHER_PATH" ]; then
    echo "❌ Service launcher directory not found at '$SERVICE_LAUNCHER_PATH'."
    exit 1
fi

# Default port (can be overridden via environment)
SERVICE_LAUNCHER_PORT="${SERVICE_LAUNCHER_PORT:-3500}"
export SERVICE_LAUNCHER_PORT

# Function to check if service is running
is_service_running() {
    lsof -i :"$SERVICE_LAUNCHER_PORT" &> /dev/null || lsof -i :9999 &> /dev/null
}

# Stop existing instance if force restart
if [ "$FORCE_RESTART" = true ] && is_service_running; then
    echo "[Laucher] Stopping existing instance..."
    pkill -f "node.*service-launcher" || true
    sleep 1
fi

if is_service_running; then
    echo "[Laucher] Already running on port ${SERVICE_LAUNCHER_PORT}."
    exit 0
fi

# Install dependencies if needed
if [ ! -d "$SERVICE_LAUNCHER_PATH/node_modules" ]; then
    echo "[Laucher] Installing npm dependencies..."
    cd "$SERVICE_LAUNCHER_PATH"
    npm install > /dev/null
fi

# Start service in background
echo "[Laucher] Starting API in background (npm start)..."
cd "$SERVICE_LAUNCHER_PATH"
nohup npm start > /dev/null 2>&1 &

echo "[Laucher] Startup command dispatched (PID: $!)."
echo "[Laucher] Service running on http://localhost:${SERVICE_LAUNCHER_PORT}"



