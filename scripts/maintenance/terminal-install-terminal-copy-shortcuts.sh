#!/bin/bash

# =============================================================================
# Instalador de Atalhos para Copy Terminal Output
# =============================================================================
# Este script configura:
# 1. Alias 'copyout' no shell (~/.bashrc ou ~/.zshrc)
# 2. Keybindings no Cursor (keybindings.json)
# 3. Settings otimizados para terminal (settings.json)
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Instalador de Atalhos - Copy Terminal Output${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Detectar projeto root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="$PROJECT_ROOT/scripts/copy-terminal-output.sh"

# Verificar se o script existe
if [ ! -f "$SCRIPT_PATH" ]; then
    echo -e "${RED}❌ Erro: Script não encontrado em $SCRIPT_PATH${NC}"
    exit 1
fi

# Tornar script executável
chmod +x "$SCRIPT_PATH"
echo -e "${GREEN}✓ Script tornado executável${NC}"

# =============================================================================
# 1. CONFIGURAR SHELL (Bash/Zsh)
# =============================================================================

echo ""
echo -e "${CYAN}[1/3] Configurando aliases no shell...${NC}"

# Detectar shell
SHELL_RC=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
else
    echo -e "${YELLOW}⚠ Shell não detectado, usando ~/.bashrc${NC}"
    SHELL_RC="$HOME/.bashrc"
fi

# Criar backup do arquivo de configuração
if [ -f "$SHELL_RC" ]; then
    cp "$SHELL_RC" "${SHELL_RC}.backup-$(date +%Y%m%d-%H%M%S)"
    echo -e "${GREEN}✓ Backup criado: ${SHELL_RC}.backup-*${NC}"
fi

# Adicionar aliases se não existirem
if ! grep -q "copy-terminal-output.sh" "$SHELL_RC" 2>/dev/null; then
    cat >> "$SHELL_RC" << 'EOF'

# =============================================================================
# Copy Terminal Output - Atalhos rápidos
# =============================================================================
alias copyout='bash /home/marce/projetos/TradingSystem/scripts/copy-terminal-output.sh'
alias copycmd='bash /home/marce/projetos/TradingSystem/scripts/copy-terminal-output.sh --cmd'
alias copylog='bash /home/marce/projetos/TradingSystem/scripts/copy-terminal-output.sh --out'

# Função para copiar último comando + output
cop() {
    local lines="${1:-50}"
    bash /home/marce/projetos/TradingSystem/scripts/copy-terminal-output.sh "$lines"
}

# Função para executar comando e copiar resultado
coprun() {
    if [ $# -eq 0 ]; then
        echo "Uso: coprun <comando>"
        return 1
    fi
    
    local output=$("$@" 2>&1)
    local exit_code=$?
    
    echo "$output"
    
    local full_output="$ $*\n\n$output\n\nExit code: $exit_code"
    echo -n "$full_output" | clip.exe 2>/dev/null || echo -n "$full_output" | xclip -selection clipboard 2>/dev/null
    
    echo ""
    echo "✓ Comando + resultado copiados para clipboard!"
    
    return $exit_code
}
EOF

    echo -e "${GREEN}✓ Aliases adicionados ao $SHELL_RC${NC}"
else
    echo -e "${YELLOW}⚠ Aliases já existem no $SHELL_RC${NC}"
fi

# =============================================================================
# 2. CONFIGURAR CURSOR KEYBINDINGS
# =============================================================================

echo ""
echo -e "${CYAN}[2/3] Configurando keybindings no Cursor...${NC}"

CURSOR_CONFIG="$HOME/.config/Cursor/User"
KEYBINDINGS_FILE="$CURSOR_CONFIG/keybindings.json"

# Criar diretório se não existir
mkdir -p "$CURSOR_CONFIG"

# Keybindings a serem adicionados
KEYBINDINGS='[
  {
    "key": "ctrl+shift+alt+c",
    "command": "workbench.action.terminal.runRecentCommand",
    "args": "copyout",
    "when": "terminalFocus"
  },
  {
    "key": "ctrl+alt+c",
    "command": "workbench.action.terminal.runRecentCommand",
    "args": "copycmd",
    "when": "terminalFocus"
  },
  {
    "key": "ctrl+alt+o",
    "command": "workbench.action.terminal.runRecentCommand",
    "args": "copylog",
    "when": "terminalFocus"
  },
  {
    "key": "ctrl+shift+c",
    "command": "workbench.action.terminal.copySelection",
    "when": "terminalFocus && terminalHasBeenCreated && terminalTextSelected"
  }
]'

if [ -f "$KEYBINDINGS_FILE" ]; then
    # Arquivo existe, fazer merge
    echo -e "${YELLOW}⚠ keybindings.json já existe, você precisará adicionar manualmente:${NC}"
    echo ""
    echo "$KEYBINDINGS"
    echo ""
else
    # Criar novo arquivo
    echo "$KEYBINDINGS" > "$KEYBINDINGS_FILE"
    echo -e "${GREEN}✓ Keybindings criados em $KEYBINDINGS_FILE${NC}"
fi

# =============================================================================
# 3. CONFIGURAR CURSOR SETTINGS
# =============================================================================

echo ""
echo -e "${CYAN}[3/3] Configurando settings no Cursor...${NC}"

SETTINGS_FILE="$CURSOR_CONFIG/settings.json"

# Settings recomendados
SETTINGS='{
  "terminal.integrated.copyOnSelection": false,
  "terminal.integrated.rightClickBehavior": "default",
  "terminal.integrated.commandsToSkipShell": [],
  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.shellIntegration.showWelcome": false,
  "terminal.integrated.tabs.enabled": true,
  "terminal.integrated.tabs.showActions": "always",
  "terminal.integrated.fontSize": 14,
  "terminal.integrated.cursorBlinking": true
}'

if [ -f "$SETTINGS_FILE" ]; then
    echo -e "${YELLOW}⚠ settings.json já existe, você precisará adicionar manualmente:${NC}"
    echo ""
    echo "$SETTINGS"
    echo ""
else
    echo "$SETTINGS" > "$SETTINGS_FILE"
    echo -e "${GREEN}✓ Settings criados em $SETTINGS_FILE${NC}"
fi

# =============================================================================
# FINALIZAÇÃO
# =============================================================================

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Instalação concluída!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo ""
echo -e "1. ${CYAN}Recarregar shell:${NC}"
echo -e "   ${GREEN}source $SHELL_RC${NC}"
echo ""
echo -e "2. ${CYAN}Reiniciar Cursor${NC} (para aplicar keybindings)"
echo ""
echo -e "3. ${CYAN}Testar comandos:${NC}"
echo -e "   ${GREEN}copyout${NC}           - Copia comando + saída"
echo -e "   ${GREEN}copycmd${NC}           - Copia apenas comando"
echo -e "   ${GREEN}copylog${NC}           - Copia apenas saída"
echo -e "   ${GREEN}cop 100${NC}           - Copia comando + 100 linhas"
echo -e "   ${GREEN}coprun ls -la${NC}     - Executa e copia resultado"
echo ""
echo -e "4. ${CYAN}Atalhos de teclado (no terminal do Cursor):${NC}"
echo -e "   ${GREEN}Ctrl+Shift+Alt+C${NC}  - Executar 'copyout'"
echo -e "   ${GREEN}Ctrl+Alt+C${NC}        - Executar 'copycmd'"
echo -e "   ${GREEN}Ctrl+Alt+O${NC}        - Executar 'copylog'"
echo ""
echo -e "${YELLOW}Ajuda:${NC}"
echo -e "   ${GREEN}copyout --help${NC}"
echo ""




