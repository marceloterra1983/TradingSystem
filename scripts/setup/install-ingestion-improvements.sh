#!/bin/bash
#
# Install Dependencies for Ingestion Improvements
# This script installs better-sqlite3 and other required packages for the enhanced ingestion system
#

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
RAG_SERVICES_DIR="$PROJECT_ROOT/tools/rag-services"

echo "📦 Installing dependencies for ingestion improvements..."
echo ""

# Navigate to rag-services
cd "$RAG_SERVICES_DIR"

# Install better-sqlite3
echo "📥 Installing better-sqlite3..."
npm install --save better-sqlite3
npm install --save-dev @types/better-sqlite3

# Install uuid for job IDs
echo "📥 Installing uuid..."
npm install --save uuid
npm install --save-dev @types/uuid

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "📋 Installed packages:"
npm list better-sqlite3 uuid | grep -E "(better-sqlite3|uuid)"
echo ""
echo "🔧 Next steps:"
echo "   1. Database schema created at src/db/schema.sql"
echo "   2. Implement logsDatabase.ts wrapper"
echo "   3. Implement ingestionLogger.ts service"
echo "   4. Implement ingestionOrchestrator.ts"
echo "   5. Add SSE endpoints for real-time progress"
echo ""

