#!/bin/bash
# Rebuild Course Crawler CLI with correct database URL

set -e

echo "🔄 Rebuilding Course Crawler CLI..."
echo ""

cd /home/marce/Projetos/TradingSystem/apps/course-crawler

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Limpar build anterior
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Rebuild com TypeScript
echo "🔨 Compiling TypeScript..."
npm run build

echo ""
echo "✅ CLI rebuilt successfully!"
echo ""
echo "📋 Verificações:"

# Verificar se dist foi criado
if [ -d "dist" ]; then
    echo "  ✅ dist/ directory created"
    echo "  📊 Files: $(find dist -type f | wc -l) files"
else
    echo "  ❌ dist/ directory NOT found"
    exit 1
fi

# Verificar se index.js existe
if [ -f "dist/index.js" ]; then
    echo "  ✅ dist/index.js exists"
else
    echo "  ❌ dist/index.js NOT found"
    exit 1
fi

echo ""
echo "🔄 Agora reinicie o worker para aplicar mudanças:"
echo ""
echo "  cd tools/compose"
echo "  docker compose -f docker-compose.4-5-course-crawler-stack.yml restart course-crawler-worker"
echo ""
