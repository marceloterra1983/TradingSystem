#!/bin/bash
# Enable port 3404 for Docusaurus direct access

set -e

echo "🔄 Parando stack de documentação..."
docker compose -f /workspace/tools/compose/docker-compose.2-docs-stack.yml down

echo "🚀 Iniciando com porta 3404 habilitada..."
docker compose -f /workspace/tools/compose/docker-compose.2-docs-stack.yml up -d documentation

echo "⏳ Aguardando 5 segundos..."
sleep 5

echo "✅ Verificando acesso..."
curl -s http://localhost:3404/docs/ | grep -o "<title>.*</title>" | head -1

echo ""
echo "📄 Docusaurus disponível em: http://localhost:3404/docs/"
