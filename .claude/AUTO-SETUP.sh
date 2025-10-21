#!/bin/bash
#
# Claude Code - Auto Setup (Aliases e Configuração)
#
# Este script configura automaticamente os aliases do Claude Code
# no seu shell (~/.bashrc ou ~/.zshrc)
#

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║       🚀  Claude Code - Auto Setup (Aliases & Config)  🚀    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Detectar shell
SHELL_RC=""
if [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
elif [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
else
    echo -e "${YELLOW}⚠️  Shell não detectado (bash/zsh). Configure manualmente.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Shell detectado: $SHELL_NAME${NC}"
echo -e "${BLUE}📝 Arquivo de configuração: $SHELL_RC${NC}"
echo

# Verificar se já está configurado
if grep -q "claude/aliases.sh" "$SHELL_RC" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Aliases já estão configurados em $SHELL_RC${NC}"
    read -p "Deseja reconfigurar? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${GREEN}✅ Configuração mantida.${NC}"
        exit 0
    fi
fi

# Adicionar source ao arquivo de configuração
echo -e "${BLUE}📝 Adicionando aliases ao $SHELL_RC...${NC}"

cat >> "$SHELL_RC" << 'EOF'

# ===================================================================
# Claude Code - TradingSystem Aliases
# Adicionado automaticamente em $(date)
# ===================================================================
if [ -f /home/marce/projetos/TradingSystem/.claude/aliases.sh ]; then
    source /home/marce/projetos/TradingSystem/.claude/aliases.sh
fi
# ===================================================================

EOF

echo -e "${GREEN}✅ Aliases adicionados com sucesso!${NC}"
echo

# Recarregar configuração
echo -e "${BLUE}🔄 Recarregando configuração do shell...${NC}"
source "$SHELL_RC"

echo -e "${GREEN}"
cat << 'EOF'
✅ SETUP COMPLETO!

Aliases disponíveis:
  • claude-dev       - Modo desenvolvimento (full permissions)
  • claude-safe      - Modo seguro (com confirmações)
  • claude-run       - Executar comando rápido
  • claude-mcp       - Listar MCP servers
  • claude-config    - Ver configuração
  • claude-debug     - Modo debug
  • claude-cmd       - Executar custom command
  • claude-at        - Claude em outro diretório

Próximos passos:
  1. Fechar e reabrir o terminal (ou executar: source ~/.bashrc)
  2. Testar: claude-dev
  3. Ler: .claude/PERMISSIONS-GUIDE.md

EOF
echo -e "${NC}"







