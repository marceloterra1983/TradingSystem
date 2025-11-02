#!/bin/bash
#
# Test MCP Loading in Claude Code
# Usage: bash .claude/test-mcp-loading.sh
#

set -e

echo "🧪 Testando carregamento de MCPs..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check directory
PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
CURRENT_DIR=$(pwd -P)

if [ "$CURRENT_DIR" != "$PROJECT_ROOT" ]; then
    echo -e "${RED}❌ Execute na raiz do projeto: $PROJECT_ROOT${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Diretório: $CURRENT_DIR${NC}"
echo ""

# Step 1: Validate configuration
echo -e "${BLUE}[1/3] Validando configuração...${NC}"
if bash .claude/validate-config.sh > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Configuração válida${NC}"
else
    echo -e "${RED}❌ Erro na configuração${NC}"
    echo "   Execute: bash .claude/validate-config.sh"
    exit 1
fi
echo ""

# Step 2: Check Claude Code installation
echo -e "${BLUE}[2/3] Verificando Claude Code CLI...${NC}"
if command -v claude &> /dev/null; then
    CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Claude Code instalado: $CLAUDE_VERSION${NC}"
else
    echo -e "${RED}❌ Claude Code CLI não encontrado${NC}"
    echo "   Instale: npm install -g @anthropic-ai/claude-code"
    exit 1
fi
echo ""

# Step 3: Test MCP server availability
echo -e "${BLUE}[3/3] Verificando MCPs configurados...${NC}"

if command -v jq &> /dev/null; then
    SERVERS=$(jq -r '.mcpServers | keys[]' .claude/mcp-servers.json 2>/dev/null)
    
    if [ -z "$SERVERS" ]; then
        echo -e "${RED}❌ Nenhum MCP configurado${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ MCPs encontrados:${NC}"
    for server in $SERVERS; do
        echo "   • $server"
    done
else
    echo -e "${YELLOW}⚠️  jq não instalado, pulando verificação detalhada${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✨ Tudo pronto para usar o Claude Code!${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}💡 Para testar os MCPs:${NC}"
echo ""
echo "   1. Execute o Claude:"
echo -e "      ${YELLOW}claude${NC}"
echo ""
echo "   2. Dentro do Claude, liste os MCPs:"
echo -e "      ${YELLOW}/mcp list${NC}"
echo ""
echo "   3. Teste um MCP (exemplo: filesystem):"
echo -e "      ${YELLOW}list files in the current directory${NC}"
echo ""
echo -e "${BLUE}📚 Documentação:${NC}"
echo "   • Configuração: .claude/README.md"
echo "   • Troubleshooting: .claude/TROUBLESHOOTING.md"
echo "   • Validação: bash .claude/validate-config.sh"
echo ""

