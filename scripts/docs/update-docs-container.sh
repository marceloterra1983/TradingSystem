#!/bin/bash
# Script para atualizar o container docs-hub com o build mais recente do Docusaurus
# Uso: bash scripts/docs/update-docs-container.sh

echo "📚 Atualizando Documentation Hub..."
echo ""

# 1. Verificar se o build existe
if [ ! -d "/workspace/docs/build" ]; then
    echo "❌ Diretório /workspace/docs/build não encontrado!"
    echo "   Execute primeiro: cd /workspace/docs && npm run build"
    exit 1
fi

# 2. Verificar se o container está rodando
if ! docker ps --filter "name=docs-hub" --format "{{.Names}}" | grep -q "docs-hub"; then
    echo "❌ Container docs-hub não está rodando!"
    echo "   Execute primeiro: docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d"
    exit 1
fi

# 3. Copiar build para o container
echo "📦 Copiando arquivos para o container..."
docker cp /workspace/docs/build/. docs-hub:/usr/share/nginx/html/

if [ $? -eq 0 ]; then
    echo "✅ Build copiado com sucesso!"
    echo ""
    echo "🌐 Acesse: http://localhost:9082/docs/"
    echo ""

    # Verificar se está acessível
    sleep 2
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9082/docs/)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Documentation Hub está respondendo (HTTP $HTTP_CODE)"
    else
        echo "⚠️  Documentation Hub retornou HTTP $HTTP_CODE"
        echo "   Verifique os logs: docker logs docs-hub"
    fi
else
    echo "❌ Falha ao copiar arquivos!"
    exit 1
fi
