#!/bin/bash
# Rebuild Docusaurus cleanly

set -e

echo "🧹 Limpando arquivos antigos..."
cd /workspace/docs

# Remove node_modules e cache de forma segura
find node_modules -type d -exec chmod 755 {} \; 2>/dev/null || true
find node_modules -type f -exec chmod 644 {} \; 2>/dev/null || true
rm -rf node_modules .docusaurus build 2>/dev/null || true

echo "📦 Instalando dependências..."
npm install

echo "🏗️  Building Docusaurus..."
npm run build

echo "✅ Build concluído! Arquivos em: /workspace/docs/build"
ls -lh /workspace/docs/build/ | head -20
