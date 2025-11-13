#!/bin/bash
# Diagnóstico completo da porta 9080
# Part of: Dev Container Setup - Port Conflict Resolution

set -e

echo "🔍 Diagnóstico Completo da Porta 9080"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Verificar processos no host
echo -e "${BLUE}1. Processos no host (netstat):${NC}"
netstat -tuln 2>/dev/null | grep 9080 || echo "  Nenhum processo encontrado"
echo ""

# 2. Verificar processos detalhados (ss)
echo -e "${BLUE}2. Processos detalhados (ss - requer sudo):${NC}"
echo "  Comando: sudo ss -tulpn | grep 9080"
echo "  Execute manualmente se necessário"
echo ""

# 3. Verificar containers Docker
echo -e "${BLUE}3. Containers Docker com porta 9080:${NC}"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep 9080 || echo "  Nenhum container encontrado"
echo ""

# 4. Verificar port bindings de todos os containers
echo -e "${BLUE}4. Containers com PortBindings configurados para 9080:${NC}"
docker inspect $(docker ps -aq) 2>/dev/null | jq -r '.[] | select(.HostConfig.PortBindings != null) | select(.HostConfig.PortBindings | to_entries[] | .key | contains("9080")) | "  Container: \(.Name) | Status: \(.State.Status)"' || echo "  Nenhum encontrado"
echo ""

# 5. Verificar docker-proxy
echo -e "${BLUE}5. Processos docker-proxy para porta 9080:${NC}"
ps aux | grep '[d]ocker-proxy.*9080' || echo "  Nenhum docker-proxy encontrado"
echo ""

# 6. Verificar redes Docker
echo -e "${BLUE}6. Redes Docker do TradingSystem:${NC}"
docker network ls | grep tradingsystem
echo ""

# 7. Verificar se há containers órfãos
echo -e "${BLUE}7. Containers órfãos/stopped:${NC}"
docker ps -a --filter "status=created" --filter "status=exited" | grep -i gateway || echo "  Nenhum container gateway órfão"
echo ""

# 8. Solução sugerida
echo -e "${YELLOW}📋 Soluções Possíveis:${NC}"
echo ""
echo -e "${YELLOW}Opção 1: Reiniciar Docker daemon (dentro do dev container)${NC}"
echo "  sudo service docker restart"
echo ""
echo -e "${YELLOW}Opção 2: Usar porta alternativa temporariamente${NC}"
echo "  Editar tools/compose/docker-compose.0-gateway-stack.yml"
echo "  Mudar 9080:9080 para 9082:9080"
echo ""
echo -e "${YELLOW}Opção 3: Limpar completamente o Docker${NC}"
echo "  docker system prune -a --volumes"
echo "  (CUIDADO: Remove TODOS os containers, images e volumes não usados)"
echo ""
echo -e "${YELLOW}Opção 4: Verificar port forwarding do VS Code${NC}"
echo "  O VS Code pode estar fazendo forward da porta 9080"
echo "  Verificar em: Ports tab no VS Code"
echo ""

echo -e "${GREEN}✅ Diagnóstico completo!${NC}"
