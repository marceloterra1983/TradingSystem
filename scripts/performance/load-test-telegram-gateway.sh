#!/bin/bash
# Load Testing Script for Telegram Gateway API
#
# Tests API performance under various load scenarios
# Requires: apache2-utils (ab command)
#
# Usage: bash scripts/performance/load-test-telegram-gateway.sh

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
API_URL="http://localhost:4010"
API_KEY="f7b22c498bd7527a7d114481015326736f0a94a58ec7c4e6e7157d6d2b36bd85"
RESULTS_DIR="$PROJECT_ROOT/performance-results/$(date +%Y%m%d-%H%M%S)"

echo "🚀 Telegram Gateway - Load Testing Suite"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "API URL: $API_URL"
echo "Results: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check if apache bench is installed
if ! command -v ab &> /dev/null; then
  echo "❌ Apache Bench (ab) not installed"
  echo ""
  echo "Install with:"
  echo "  sudo apt install apache2-utils"
  exit 1
fi

echo "✅ Apache Bench installed"
echo ""

# Test 1: Health Endpoint (Baseline)
echo "═══════════════════════════════════════════════════════"
echo "Test 1: Health Endpoint (100 requests, 10 concurrent)"
echo "═══════════════════════════════════════════════════════"
ab -n 100 -c 10 -g "$RESULTS_DIR/health.tsv" \
  "$API_URL/health" \
  | tee "$RESULTS_DIR/health.txt" \
  | grep -E "Requests per second|Time per request|Transfer rate"

echo ""
echo "───────────────────────────────────────────────────────"
echo ""

# Test 2: Messages List (Read-Heavy)
echo "═══════════════════════════════════════════════════════"
echo "Test 2: Messages List (100 requests, 10 concurrent)"
echo "═══════════════════════════════════════════════════════"
ab -n 100 -c 10 -g "$RESULTS_DIR/messages.tsv" \
  "$API_URL/api/messages?limit=50" \
  | tee "$RESULTS_DIR/messages.txt" \
  | grep -E "Requests per second|Time per request|Transfer rate"

echo ""
echo "───────────────────────────────────────────────────────"
echo ""

# Test 3: Channels List (Static Data)
echo "═══════════════════════════════════════════════════════"
echo "Test 3: Channels List (100 requests, 10 concurrent)"
echo "═══════════════════════════════════════════════════════"
ab -n 100 -c 10 -g "$RESULTS_DIR/channels.tsv" \
  "$API_URL/api/channels" \
  | tee "$RESULTS_DIR/channels.txt" \
  | grep -E "Requests per second|Time per request|Transfer rate"

echo ""
echo "───────────────────────────────────────────────────────"
echo ""

# Test 4: Sync Endpoint (Write-Heavy) - Limited to avoid overwhelming Telegram
echo "═══════════════════════════════════════════════════════"
echo "Test 4: Sync Endpoint (10 requests, 1 concurrent)"
echo "═══════════════════════════════════════════════════════"

# Create POST data
cat > "$RESULTS_DIR/sync-body.json" << 'JSON'
{"limit": 10}
JSON

# Note: We use -c 1 to avoid distributed lock contention
ab -n 10 -c 1 \
  -p "$RESULTS_DIR/sync-body.json" \
  -T "application/json" \
  -H "X-API-Key: $API_KEY" \
  -g "$RESULTS_DIR/sync.tsv" \
  "$API_URL/api/telegram-gateway/sync-messages" \
  | tee "$RESULTS_DIR/sync.txt" \
  | grep -E "Requests per second|Time per request"

echo ""
echo "───────────────────────────────────────────────────────"
echo ""

# Test 5: Stress Test (High Concurrency)
echo "═══════════════════════════════════════════════════════"
echo "Test 5: Stress Test (500 requests, 50 concurrent)"
echo "═══════════════════════════════════════════════════════"
ab -n 500 -c 50 -g "$RESULTS_DIR/stress.tsv" \
  "$API_URL/api/messages?limit=10" \
  | tee "$RESULTS_DIR/stress.txt" \
  | grep -E "Requests per second|Time per request|Failed requests|Non-2xx responses"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 LOAD TEST COMPLETE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""
echo "Summary files:"
echo "  • health.txt - Health endpoint performance"
echo "  • messages.txt - Message list performance"
echo "  • channels.txt - Channel list performance"
echo "  • sync.txt - Sync endpoint performance"
echo "  • stress.txt - High concurrency stress test"
echo ""
echo "TSV files (for graphing):"
echo "  • *.tsv - Time-series data for visualization"
echo ""
echo "Next steps:"
echo "  1. Review results in $RESULTS_DIR"
echo "  2. Check for failed requests or slow responses"
echo "  3. Monitor Prometheus metrics during load"
echo "  4. Compare against baseline metrics"
echo ""

