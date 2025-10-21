#!/bin/bash
# Master script - Execute all health dashboard tests

set -e

PROJECT_ROOT="/home/marce/projetos/TradingSystem"
cd "$PROJECT_ROOT"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Health Dashboard - Complete Diagnostic & Setup          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Make scripts executable
echo "📝 Making scripts executable..."
chmod +x scripts/docs/troubleshoot-health-dashboard.sh
chmod +x scripts/docs/test-health-api.sh
chmod +x scripts/docs/start-docusaurus-health.sh
echo "✅ Done"
echo ""

# Run troubleshooting
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   STEP 1: System Diagnostics                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
bash scripts/docs/troubleshoot-health-dashboard.sh
echo ""

# Test API
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   STEP 2: API Endpoint Tests                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
bash scripts/docs/test-health-api.sh
echo ""

# Final instructions
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   STEP 3: Start Docusaurus                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 Ready to start Docusaurus!"
echo ""
echo "Run this command to start:"
echo "   bash scripts/docs/start-docusaurus-health.sh"
echo ""
echo "Or run manually:"
echo "   cd docs/docusaurus"
echo "   npm run start -- --port 3004"
echo ""
echo "Then access: http://localhost:3004/health"
echo ""
