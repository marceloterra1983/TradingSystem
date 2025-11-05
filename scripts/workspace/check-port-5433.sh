#!/bin/bash
#
# Check what is using port 5433
#

echo "Verificando porta 5433..."
echo ""

echo "1. Usando lsof (requer sudo):"
sudo lsof -i :5433 2>/dev/null || echo "   Nada encontrado com lsof"

echo ""
echo "2. Usando netstat:"
sudo netstat -tlnp 2>/dev/null | grep :5433 || echo "   Nada encontrado com netstat"

echo ""
echo "3. Usando ss:"
sudo ss -tlnp 2>/dev/null | grep :5433 || echo "   Nada encontrado com ss"

echo ""
echo "4. Verificando containers Docker:"
docker ps -a --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" | grep -E "5433|PORTS"

echo ""
echo "5. Verificando containers parados que podem ter reservado a porta:"
docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Ports}}"

echo ""
echo "6. Tentando forçar liberar a porta:"
echo "   Parando containers órfãos..."
docker ps -a -q --filter "status=exited" | xargs -r docker rm -f 2>/dev/null || true

echo ""
echo "7. Removendo networks órfãs:"
docker network prune -f 2>/dev/null || true

echo ""
echo "✅ Verificação completa!"
echo ""
echo "Para liberar a porta, execute:"
echo "  sudo bash scripts/workspace/check-port-5433.sh"

