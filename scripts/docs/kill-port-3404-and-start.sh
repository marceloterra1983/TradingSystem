#!/bin/bash
# Kill process using port 3404 and start docs-hub

set -e

echo "🔍 Procurando processo na porta 3404..."
PORT_PID=$(lsof -i :3404 -t 2>/dev/null || echo "")

if [ -n "$PORT_PID" ]; then
    echo "❌ Matando processo $PORT_PID na porta 3404..."
    sudo kill -9 $PORT_PID
    sleep 2
else
    echo "✅ Porta 3404 está livre"
fi

echo "🚀 Iniciando docs-hub..."
cd /workspace
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d documentation

echo "⏳ Aguardando 5 segundos..."
sleep 5

echo "✅ Verificando container..."
docker ps | grep docs-hub

echo "📄 Testando acesso..."
curl -s http://localhost:3404/health | jq '.' || echo "Health check failed"

echo ""
echo "✅ Docusaurus disponível em: http://localhost:3404/docs/"
