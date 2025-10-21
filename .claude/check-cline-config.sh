#!/bin/bash
#
# Check Cline Configuration
#
# Verifica se a configuração do Cline está correta para permissões completas
#

set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         🔍  Cline Configuration Checker  🔍                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

PROJECT_ROOT="/home/marce/projetos/TradingSystem"
ERRORS=0
WARNINGS=0

# Função para verificar arquivo
check_file() {
    local file=$1
    local name=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $name encontrado${NC}"
        echo "   📁 $file"
        echo "   📏 $(du -h "$file" | cut -f1)"
        return 0
    else
        echo -e "${RED}❌ $name NÃO encontrado${NC}"
        echo "   📁 $file"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Função para verificar configuração
check_config() {
    local file=$1
    local pattern=$2
    local name=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✅ $name configurado${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $name NÃO encontrado${NC}"
        WARNINGS=$((WARNINGS + 1))
        return 1
    fi
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 ARQUIVOS DE CONFIGURAÇÃO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Verificar .clinerules
check_file "$PROJECT_ROOT/.clinerules" ".clinerules"
echo

# Verificar .vscode/settings.json
check_file "$PROJECT_ROOT/.vscode/settings.json" ".vscode/settings.json"
echo

# Verificar CLINE-SETUP.md
check_file "$PROJECT_ROOT/.claude/CLINE-SETUP.md" "CLINE-SETUP.md"
echo

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚙️  CONFIGURAÇÕES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "$PROJECT_ROOT/.vscode/settings.json" ]; then
    # Verificar auto-approve
    check_config "$PROJECT_ROOT/.vscode/settings.json" '"cline.autoApprove".*true' "Auto-approve"
    
    # Verificar MCP servers
    check_config "$PROJECT_ROOT/.vscode/settings.json" '"cline.mcpServers"' "MCP Servers"
    
    # Verificar custom instructions
    check_config "$PROJECT_ROOT/.vscode/settings.json" '"cline.experimental.customInstructions"' "Custom Instructions"
else
    echo -e "${RED}❌ settings.json não encontrado - não foi possível verificar${NC}"
fi
echo

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔌 MCP SERVERS (Global)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CLINE_MCP_SETTINGS="$HOME/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"

if [ -f "$CLINE_MCP_SETTINGS" ]; then
    echo -e "${GREEN}✅ MCP settings global encontrado${NC}"
    echo "   📁 $CLINE_MCP_SETTINGS"
    
    # Contar servers
    SERVER_COUNT=$(grep -c '"command"' "$CLINE_MCP_SETTINGS" 2>/dev/null || echo "0")
    echo "   🔌 Servers configurados: $SERVER_COUNT"
    
    # Listar servers
    echo -e "\n   ${BLUE}Servers disponíveis:${NC}"
    grep -o '"[^"]*":' "$CLINE_MCP_SETTINGS" | grep -v '"command":\|"args":' | sed 's/://' | sed 's/"//g' | while read server; do
        echo "   • $server"
    done
else
    echo -e "${YELLOW}⚠️  MCP settings global não encontrado${NC}"
    echo "   📁 $CLINE_MCP_SETTINGS"
    WARNINGS=$((WARNINGS + 1))
fi
echo

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 RESUMO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Configuração completa! Tudo OK.${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Configuração parcial (${WARNINGS} avisos)${NC}"
else
    echo -e "${RED}❌ Configuração incompleta (${ERRORS} erros, ${WARNINGS} avisos)${NC}"
fi
echo

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📖 PRÓXIMOS PASSOS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $ERRORS -gt 0 ] || [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Configure as permissões manualmente no Cursor:${NC}"
    echo
    echo "1. Abrir Cursor"
    echo "2. Abrir painel do Cline (ícone na barra lateral)"
    echo "3. Clicar no ícone de engrenagem ⚙️"
    echo "4. Habilitar:"
    echo "   ☑️ Auto-approve read operations"
    echo "   ☑️ Auto-approve write operations"
    echo "   ☑️ Auto-approve command execution"
    echo "5. Salvar e recarregar Cursor"
    echo
    echo "📖 Guia completo: .claude/CLINE-SETUP.md"
else
    echo -e "${GREEN}Arquivos de configuração estão prontos!${NC}"
    echo
    echo "⏳ Ainda é necessário configurar manualmente no Cursor:"
    echo "   1. Abrir settings do Cline"
    echo "   2. Habilitar auto-approve"
    echo "   3. Verificar MCP servers"
    echo
    echo "📖 Ver guia: .claude/CLINE-SETUP.md"
fi

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

exit $ERRORS







