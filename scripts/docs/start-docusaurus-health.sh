#!/bin/bash
# Start Docusaurus with health dashboard

set -e

PROJECT_ROOT="/home/marce/projetos/TradingSystem"
DOCUSAURUS_DIR="$PROJECT_ROOT/docs/docusaurus"

cd "$DOCUSAURUS_DIR"

echo "============================================"
echo "Starting Docusaurus with Health Dashboard"
echo "============================================"
echo ""

# Kill existing processes on port 3004
echo "🔧 Freeing port 3004..."
lsof -ti:3004 | xargs kill -9 2>/dev/null || true
sleep 1

# Clear cache
echo "🧹 Clearing cache..."
rm -rf .docusaurus
npm run clear 2>/dev/null || true

# Start Docusaurus
echo ""
echo "🚀 Starting Docusaurus on port 3004..."
echo ""
echo "Once started, access:"
echo "   📊 Health Dashboard: http://localhost:3004/health"
echo "   🏠 Home: http://localhost:3004/"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run start -- --port 3004 --host 0.0.0.0
