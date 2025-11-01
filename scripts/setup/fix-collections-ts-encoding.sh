#!/usr/bin/env bash
#
# Fix collections.ts encoding issues
# Removes problematic UTF-8 characters and rebuilds container
#

set -e

echo "🔧 Fixing collections.ts encoding issues..."

cd /home/marce/Projetos/TradingSystem/tools/rag-services/src/routes

# Create backup
cp collections.ts collections.ts.backup-$(date +%s)

# Fix line 425 - remove backticks and use single quotes
sed -i '425s/.*await cacheService.delete(`stats:${name}`);/    await cacheService.delete("stats:" + name);/' collections.ts

echo "✅ Fixed line 425"

# Verify TypeScript compiles
cd /home/marce/Projetos/TradingSystem/tools/rag-services
if npx tsc --noEmit 2>&1 | grep -q "error"; then
  echo "❌ Still has TypeScript errors"
  npx tsc --noEmit 2>&1 | head -10
  exit 1
fi

echo "✅ TypeScript compilation successful!"

# Rebuild container
cd /home/marce/Projetos/TradingSystem
echo "🐳 Rebuilding container..."
docker compose -f tools/compose/docker-compose.rag.yml build rag-collections-service --no-cache

echo "🚀 Restarting container..."
docker compose -f tools/compose/docker-compose.rag.yml up -d rag-collections-service

echo "✅ Done! Container updated with improved logs."
echo ""
echo "Test it now:"
echo "  1. Go to dashboard"
echo "  2. Click 'Ingestão' button"
echo "  3. Check logs table for detailed messages"

