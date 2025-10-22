#!/bin/bash
# ==============================================================================
# TradingSystem - Install Shortcuts
# ==============================================================================
# Este script instala os aliases do TradingSystem no seu shell
# Pode ser executado múltiplas vezes de forma segura (idempotente)
# ==============================================================================

set -euo pipefail

# Cores
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

PROJECT_ROOT="/home/marce/projetos/TradingSystem"
SHELL_RC=""

# Detectar shell
if [ -n "${BASH_VERSION:-}" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -n "${ZSH_VERSION:-}" ]; then
    SHELL_RC="$HOME/.zshrc"
else
    echo "Shell não suportado. Use bash ou zsh."
    exit 1
fi

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🚀 ${BOLD}${GREEN}TradingSystem${NC}${CYAN} - Instalação de Shortcuts          ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se já existe
if grep -q "# TradingSystem - Universal Startup (2025-10-20)" "$SHELL_RC" 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC}  Shortcuts já instalados em: $SHELL_RC"
    echo -e "${BLUE}ℹ${NC}  Para reinstalar, remova a seção manualmente e execute novamente"
    echo ""
    echo -e "${GREEN}✓${NC}  Comandos disponíveis:"
    echo ""
    echo -e "${BOLD}Startup:${NC}"
    echo -e "    ${CYAN}start${NC}              - Startup completo (Docker + Node.js)"
    echo -e "    ${CYAN}start-docker${NC}       - Apenas containers Docker"
    echo -e "    ${CYAN}start-services${NC}     - Apenas serviços Node.js"
    echo -e "    ${CYAN}start-minimal${NC}      - Modo mínimo (essenciais)"
    echo ""
    echo -e "${BOLD}Shutdown:${NC}"
    echo -e "    ${CYAN}stop${NC}               - Parar tudo (gracefully)"
    echo -e "    ${CYAN}stop-docker${NC}        - Parar apenas containers Docker"
    echo -e "    ${CYAN}stop-services${NC}      - Parar apenas serviços Node.js"
    echo -e "    ${CYAN}stop-force${NC}         - Force kill tudo (SIGKILL)"
    echo ""
    echo -e "${BOLD}Monitoramento:${NC}"
    echo -e "    ${CYAN}status${NC}             - Ver status dos serviços"
    echo -e "    ${CYAN}health${NC}             - Health check completo"
    echo -e "    ${CYAN}logs${NC}               - Ver logs em tempo real"
    echo ""
    echo -e "${YELLOW}💡 Dica:${NC} Execute '${CYAN}source $SHELL_RC${NC}' para recarregar o shell"
    exit 0
fi

# Backup
BACKUP_FILE="${SHELL_RC}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${BLUE}ℹ${NC}  Criando backup: $BACKUP_FILE"
cp "$SHELL_RC" "$BACKUP_FILE"

# Adicionar aliases
echo -e "${BLUE}ℹ${NC}  Adicionando shortcuts ao: $SHELL_RC"

cat >> "$SHELL_RC" << 'EOF'

# ============================================
# TradingSystem - Universal Startup (2025-10-20)
# ============================================
# Comando universal para startup completo do TradingSystem
# Pode ser chamado de qualquer diretório

alias start='bash /home/marce/projetos/TradingSystem/start-tradingsystem'
alias start-docker='bash /home/marce/projetos/TradingSystem/start-tradingsystem --docker'
alias start-services='bash /home/marce/projetos/TradingSystem/start-tradingsystem --services'
alias start-minimal='bash /home/marce/projetos/TradingSystem/start-tradingsystem --minimal'
alias stop='bash /home/marce/projetos/TradingSystem/stop-tradingsystem'
alias stop-docker='bash /home/marce/projetos/TradingSystem/stop-tradingsystem --docker'
alias stop-services='bash /home/marce/projetos/TradingSystem/stop-tradingsystem --services'
alias stop-force='bash /home/marce/projetos/TradingSystem/stop-tradingsystem --force'
alias status='bash /home/marce/projetos/TradingSystem/scripts/services/status.sh'
alias health='bash /home/marce/projetos/TradingSystem/scripts/maintenance/health-check-all.sh'
alias logs='tail -f /tmp/tradingsystem-logs/*.log'

EOF

echo -e "${GREEN}✓${NC}  Shortcuts instalados com sucesso!"
echo ""

# Listar comandos
echo -e "${BOLD}${GREEN}Comandos Disponíveis:${NC}"
echo ""
echo -e "${BOLD}Startup:${NC}"
echo -e "  ${CYAN}start${NC}                 Startup completo (Docker + Node.js)"
echo -e "  ${CYAN}start-docker${NC}          Apenas containers Docker"
echo -e "  ${CYAN}start-services${NC}        Apenas serviços Node.js"
echo -e "  ${CYAN}start-minimal${NC}         Modo mínimo (essenciais)"
echo ""
echo -e "${BOLD}Shutdown:${NC}"
echo -e "  ${CYAN}stop${NC}                  Parar tudo (gracefully)"
echo -e "  ${CYAN}stop-docker${NC}           Parar apenas containers Docker"
echo -e "  ${CYAN}stop-services${NC}         Parar apenas serviços Node.js"
echo -e "  ${CYAN}stop-force${NC}            Force kill tudo (SIGKILL)"
echo ""
echo -e "${BOLD}Monitoramento:${NC}"
echo -e "  ${CYAN}status${NC}                Ver status dos serviços"
echo -e "  ${CYAN}health${NC}                Health check completo"
echo -e "  ${CYAN}logs${NC}                  Ver logs em tempo real"
echo ""

# Recarregar shell
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${YELLOW}⚠  IMPORTANTE:${NC} Execute o comando abaixo para ativar os shortcuts:"
echo ""
echo -e "  ${CYAN}source $SHELL_RC${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Testar
echo -e "${BLUE}ℹ${NC}  Teste executando: ${CYAN}start --help${NC} ou ${CYAN}stop --help${NC} (após recarregar o shell)"
echo ""

echo -e "${GREEN}✓${NC}  Instalação concluída!"
echo ""

