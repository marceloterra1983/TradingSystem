#!/bin/bash
# Script para verificar o status dos MCPs instalados no Cursor
# Autor: TradingSystem
# Data: $(date +%Y-%m-%d)

set -e

echo "🔍 Verificando Status dos MCPs do Cursor..."
echo "=============================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verifica se o arquivo de configuração existe
MCP_CONFIG="$HOME/.cursor/mcp.json"
if [ ! -f "$MCP_CONFIG" ]; then
    echo -e "${RED}❌ Arquivo de configuração não encontrado: $MCP_CONFIG${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Arquivo de configuração encontrado${NC}"
echo ""

# Verifica JSON válido
if ! jq empty "$MCP_CONFIG" 2>/dev/null; then
    echo -e "${RED}❌ Arquivo JSON inválido!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ JSON válido${NC}"
echo ""

# Lista MCPs configurados
echo -e "${BLUE}📋 MCPs Configurados:${NC}"
echo "--------------------"

MCP_SERVERS=$(jq -r '.mcpServers | keys[]' "$MCP_CONFIG")

for server in $MCP_SERVERS; do
    echo -e "${GREEN}  ✓${NC} $server"
    
    # Verifica se tem variáveis de ambiente não configuradas
    env_vars=$(jq -r ".mcpServers.\"$server\".env // {} | to_entries[] | select(.value == \"\") | .key" "$MCP_CONFIG")
    
    if [ -n "$env_vars" ]; then
        echo -e "    ${YELLOW}⚠️  Variáveis não configuradas:${NC}"
        for var in $env_vars; do
            echo -e "       - ${YELLOW}$var${NC}"
        done
    fi
done

echo ""
echo "=============================================="
echo -e "${BLUE}📊 Resumo:${NC}"

total=$(echo "$MCP_SERVERS" | wc -l)
echo "  Total de MCPs: $total"

# Conta quantos MCPs precisam de configuração
needs_config=$(jq -r '.mcpServers | to_entries[] | select(.value.env != null) | select(.value.env | to_entries[] | select(.value == "") | length > 0) | .key' "$MCP_CONFIG" | wc -l)

if [ "$needs_config" -gt 0 ]; then
    echo -e "  ${YELLOW}⚠️  Precisam de configuração: $needs_config${NC}"
else
    echo -e "  ${GREEN}✅ Todos configurados!${NC}"
fi

echo ""

# Verifica dependências
echo -e "${BLUE}🔧 Verificando Dependências:${NC}"
echo "--------------------"

# Node.js
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo -e "${GREEN}✅ Node.js:${NC} $node_version"
else
    echo -e "${RED}❌ Node.js não instalado${NC}"
fi

# NPM
if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    echo -e "${GREEN}✅ NPM:${NC} $npm_version"
else
    echo -e "${RED}❌ NPM não instalado${NC}"
fi

# NPX
if command -v npx &> /dev/null; then
    echo -e "${GREEN}✅ NPX:${NC} disponível"
else
    echo -e "${RED}❌ NPX não disponível${NC}"
fi

# Docker
if command -v docker &> /dev/null; then
    docker_version=$(docker --version | cut -d' ' -f3 | tr -d ',')
    echo -e "${GREEN}✅ Docker:${NC} $docker_version"
    
    # Verifica se o TimescaleDB está rodando
    if docker ps --format '{{.Names}}' | grep -q "data-timescaledb"; then
        echo -e "${GREEN}✅ TimescaleDB:${NC} rodando"
    else
        echo -e "${YELLOW}⚠️  TimescaleDB:${NC} não está rodando"
        echo "    Para iniciar: cd tools/compose && docker compose -f docker-compose.database.yml up -d timescaledb"
    fi
else
    echo -e "${RED}❌ Docker não instalado${NC}"
fi

# JQ
if command -v jq &> /dev/null; then
    jq_version=$(jq --version)
    echo -e "${GREEN}✅ jq:${NC} $jq_version"
else
    echo -e "${RED}❌ jq não instalado${NC}"
fi

echo ""
echo "=============================================="
echo -e "${BLUE}📖 Próximos Passos:${NC}"
echo ""

if [ "$needs_config" -gt 0 ]; then
    echo "1. Configure as variáveis de ambiente pendentes"
    echo "   Veja: MCP-SETUP-INSTRUCTIONS.md"
    echo ""
fi

echo "2. Reinicie o Cursor completamente (Ctrl+Q e reabra)"
echo "3. Teste os MCPs fazendo perguntas ao Cursor"
echo ""
echo "Para mais informações, veja: MCP-SETUP-INSTRUCTIONS.md"
echo ""

