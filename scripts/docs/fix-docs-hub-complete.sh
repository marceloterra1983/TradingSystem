#!/bin/bash
# Fix docs-hub container completely

set -e

echo "🧹 Limpando containers órfãos..."
docker rm -f docs-hub 2>/dev/null || echo "Nenhum container para remover"

echo "🚀 Criando container docs-hub..."
cd /workspace
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d documentation

echo "⏳ Aguardando 5 segundos..."
sleep 5

echo "📊 Status do container..."
docker ps | grep docs-hub || echo "❌ Container não está rodando!"

echo "📂 Verificando arquivos montados..."
docker exec docs-hub ls -la /usr/share/nginx/html/ | head -20

echo "🏥 Testando health endpoint..."
curl -s http://localhost:3400/health | jq '.' 2>/dev/null || echo "Health endpoint indisponível"

echo "📄 Testando Docusaurus..."
curl -s http://localhost:3400/docs/ | grep -o "<title>.*</title>" | head -1 || echo "Docusaurus indisponível"

echo ""
echo "✅ Verificação completa!"
