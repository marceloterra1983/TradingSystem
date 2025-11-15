#!/bin/bash
# Restart docs-hub container

set -e

echo "🔄 Parando container docs-hub..."
docker stop docs-hub

echo "🚀 Iniciando container docs-hub..."
docker start docs-hub

echo "⏳ Aguardando 5 segundos..."
sleep 5

echo "📂 Verificando arquivos montados..."
docker exec docs-hub ls -la /usr/share/nginx/html/ | head -20

echo "✅ Container reiniciado!"
