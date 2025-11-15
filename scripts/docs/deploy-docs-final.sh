#!/bin/bash
# Deploy Docusaurus - Solução Final para WSL2

set -e

echo "=========================================="
echo "🚀 Deploy Final do Docusaurus"
echo "=========================================="
echo ""

cd /workspace

echo "1️⃣  Parando container..."
docker stop docs-hub 2>/dev/null || echo "Container já está parado"

echo "2️⃣  Copiando build do Docusaurus..."
docker cp docs/build/. docs-hub:/usr/share/nginx/html/

echo "3️⃣  Iniciando container..."
docker start docs-hub

echo "4️⃣  Aguardando 5 segundos..."
sleep 5

echo "5️⃣  Verificando arquivos montados..."
docker exec docs-hub ls -la /usr/share/nginx/html/ | head -20

echo ""
echo "6️⃣  Testando acesso via Traefik Gateway..."
curl -s http://localhost:9082/docs/ | grep -o "<title>.*</title>" | head -1 || echo "❌ Falha no teste"

echo ""
echo "=========================================="
echo "✅ Deploy Completo!"
echo "=========================================="
echo ""
echo "📄 Docusaurus disponível em:"
echo "   - http://localhost:9082/docs/"
echo "   - http://localhost:9082/docs/next/"
echo ""
