#!/bin/bash
# TP Capital Gateway Polling Lag Monitor
# Checks polling lag and alerts if above threshold

set -euo pipefail

# Configuration
HEALTH_ENDPOINT="${TP_CAPITAL_URL:-http://localhost:4005}/health"
LAG_THRESHOLD_WARN=3    # Warning at 3 seconds
LAG_THRESHOLD_CRIT=5    # Critical at 5 seconds
CHECK_INTERVAL=10       # Check every 10 seconds

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to check health
check_health() {
    curl -s "$HEALTH_ENDPOINT" | jq -r '.'
}

# Function to get polling lag
get_polling_lag() {
    curl -s "$HEALTH_ENDPOINT" | jq -r '.pollingWorker.lagSeconds // -1'
}

# Function to get worker status
get_worker_status() {
    curl -s "$HEALTH_ENDPOINT" | jq -r '.pollingWorker.running // false'
}

# Function to get messages waiting
get_messages_waiting() {
    curl -s "$HEALTH_ENDPOINT" | jq -r '.messagesWaiting // -1'
}

# Main monitoring loop
echo "🔍 TP Capital Gateway Polling Monitor"
echo "Health Endpoint: $HEALTH_ENDPOINT"
echo "Thresholds: WARN=${LAG_THRESHOLD_WARN}s, CRIT=${LAG_THRESHOLD_CRIT}s"
echo "========================================="
echo ""

while true; do
    # Get current timestamp
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    # Check if service is responding
    if ! HEALTH=$(check_health 2>/dev/null); then
        echo -e "${TIMESTAMP} ${RED}[ERROR]${NC} Service not responding at $HEALTH_ENDPOINT"
        sleep "$CHECK_INTERVAL"
        continue
    fi

    # Get metrics
    LAG=$(get_polling_lag)
    RUNNING=$(get_worker_status)
    WAITING=$(get_messages_waiting)

    # Check if worker is running
    if [ "$RUNNING" != "true" ]; then
        echo -e "${TIMESTAMP} ${RED}[CRITICAL]${NC} Polling worker NOT RUNNING!"
        sleep "$CHECK_INTERVAL"
        continue
    fi

    # Check lag and alert
    if (( $(echo "$LAG >= $LAG_THRESHOLD_CRIT" | bc -l) )); then
        echo -e "${TIMESTAMP} ${RED}[CRITICAL]${NC} Lag: ${LAG}s | Waiting: ${WAITING} messages"
    elif (( $(echo "$LAG >= $LAG_THRESHOLD_WARN" | bc -l) )); then
        echo -e "${TIMESTAMP} ${YELLOW}[WARNING]${NC} Lag: ${LAG}s | Waiting: ${WAITING} messages"
    else
        echo -e "${TIMESTAMP} ${GREEN}[OK]${NC} Lag: ${LAG}s | Waiting: ${WAITING} messages"
    fi

    sleep "$CHECK_INTERVAL"
done
