#!/usr/bin/env bash
#
# Restart Docker service in WSL2
# This script must be run with sudo privileges
#
# Usage:
#   sudo bash scripts/docker/restart-docker.sh
#

set -e

echo "🔄 Parando serviço Docker..."
service docker stop

echo "⏳ Aguardando 3 segundos..."
sleep 3

echo "🚀 Iniciando serviço Docker..."
service docker start

echo "⏳ Aguardando Docker inicializar..."
sleep 5

echo "✅ Verificando status do Docker..."
service docker status

echo ""
echo "✅ Docker reiniciado com sucesso!"
echo ""
echo "Próximos passos:"
echo "1. Reinicie o container do API Gateway:"
echo "   docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d --force-recreate"
echo ""
echo "2. Teste a conectividade:"
echo "   curl http://localhost:9082/"
echo ""
