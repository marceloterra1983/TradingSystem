#!/bin/bash
#
# Validate Claude Code Configuration
# Usage: bash .claude/validate-config.sh
#

set -e

echo "🔍 Validando configuração do Claude Code..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
CURRENT_DIR=$(pwd -P)

if [ "$CURRENT_DIR" != "$PROJECT_ROOT" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    echo "   Diretório atual: $CURRENT_DIR"
    echo "   Diretório esperado: $PROJECT_ROOT"
    exit 1
fi

echo -e "${GREEN}✅ Diretório correto${NC}"
echo ""

# Check .claude-plugin
if [ -f ".claude-plugin" ]; then
    echo -e "${GREEN}✅ .claude-plugin existe${NC}"
    
    # Validate JSON
    if command -v jq &> /dev/null; then
        if jq empty .claude-plugin 2>/dev/null; then
            echo -e "${GREEN}   └─ JSON válido${NC}"
        else
            echo -e "${RED}   └─ JSON inválido!${NC}"
            exit 1
        fi
    fi
else
    echo -e "${RED}❌ .claude-plugin não encontrado${NC}"
    echo "   Execute: touch .claude-plugin"
    exit 1
fi
echo ""

# Check .claude/ directory
if [ -d ".claude" ]; then
    echo -e "${GREEN}✅ Diretório .claude/ existe${NC}"
else
    echo -e "${RED}❌ Diretório .claude/ não encontrado${NC}"
    exit 1
fi

# Check MCP configuration
if [ -f ".claude/mcp-servers.json" ]; then
    echo -e "${GREEN}✅ .claude/mcp-servers.json existe${NC}"
    
    # Validate JSON
    if command -v jq &> /dev/null; then
        if jq empty .claude/mcp-servers.json 2>/dev/null; then
            echo -e "${GREEN}   └─ JSON válido${NC}"
            
            # Count servers
            SERVER_COUNT=$(jq '.mcpServers | length' .claude/mcp-servers.json)
            echo -e "${GREEN}   └─ $SERVER_COUNT servidores MCP configurados${NC}"
            
            # List servers
            SERVERS=$(jq -r '.mcpServers | keys[]' .claude/mcp-servers.json)
            for server in $SERVERS; do
                echo "      • $server"
            done
        else
            echo -e "${RED}   └─ JSON inválido!${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  .claude/mcp-servers.json não encontrado${NC}"
fi
echo ""

# Check environment variables
echo "🔐 Verificando variáveis de ambiente..."

# Load .env if exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ .env carregado${NC}"
else
    echo -e "${YELLOW}⚠️  .env não encontrado${NC}"
fi

# Check required env vars
check_env_var() {
    local var_name=$1
    if [ -z "${!var_name}" ]; then
        echo -e "${RED}   ❌ $var_name não definida${NC}"
        return 1
    else
        echo -e "${GREEN}   ✅ $var_name definida${NC}"
        return 0
    fi
}

check_env_var "GITHUB_PERSONAL_ACCESS_TOKEN" || true
check_env_var "MCP_POSTGRES_URL" || true
check_env_var "SENTRY_AUTH_TOKEN" || true

echo ""

# Check Claude Code installation
echo "🖥️  Verificando instalação do Claude Code..."

if command -v claude &> /dev/null; then
    echo -e "${GREEN}✅ Claude Code CLI instalado${NC}"
    
    # Get version (if available)
    CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "versão desconhecida")
    echo "   └─ Versão: $CLAUDE_VERSION"
else
    echo -e "${RED}❌ Claude Code CLI não encontrado${NC}"
    echo "   Instale com: npm install -g @anthropic-ai/claude-code"
fi

echo ""

# Check ~/.claude.json
echo "📋 Verificando configuração global..."

if [ -f "$HOME/.claude.json" ]; then
    echo -e "${GREEN}✅ ~/.claude.json existe${NC}"
    
    # Check if project is registered
    if command -v jq &> /dev/null; then
        if jq -e ".projects[\"$PROJECT_ROOT\"]" ~/.claude.json > /dev/null 2>&1; then
            echo -e "${GREEN}   └─ Projeto registrado na configuração global${NC}"
        else
            echo -e "${YELLOW}   └─ Projeto NÃO registrado (será registrado no primeiro uso)${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  ~/.claude.json não encontrado (será criado no primeiro uso)${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✨ Validação concluída!${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "💡 Próximos passos:"
echo "   1. cd /home/marce/Projetos/TradingSystem"
echo "   2. claude"
echo "   3. Dentro do Claude, execute: /mcp list"
echo ""

