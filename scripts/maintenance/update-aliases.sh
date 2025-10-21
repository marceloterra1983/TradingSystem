#!/bin/bash
# ==============================================================================
# TradingSystem - Update Shell Aliases
# ==============================================================================
# Updates aliases in shell RC file with new status command
# ==============================================================================

set -euo pipefail

# Colors
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
echo -e "${CYAN}║${NC}  🔄 ${BOLD}${GREEN}TradingSystem${NC}${CYAN} - Atualização de Aliases          ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se existe a seção antiga
if ! grep -q "# TradingSystem" "$SHELL_RC" 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC}  Nenhuma configuração do TradingSystem encontrada"
    echo -e "${BLUE}ℹ${NC}  Execute install-shortcuts.sh primeiro"
    exit 1
fi

# Backup
BACKUP_FILE="${SHELL_RC}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${BLUE}ℹ${NC}  Criando backup: $BACKUP_FILE"
cp "$SHELL_RC" "$BACKUP_FILE"

# Remover seção antiga
echo -e "${YELLOW}→${NC}  Removendo configuração antiga..."
sed -i '/# TradingSystem/,/^$/d' "$SHELL_RC"

# Adicionar nova configuração
echo -e "${YELLOW}→${NC}  Adicionando nova configuração..."

cat >> "$SHELL_RC" << 'EOF'

# ============================================
# TradingSystem - Universal Commands (2025-10-20)
# ============================================
# Comandos universais para gerenciar o TradingSystem
# Pode ser chamado de qualquer diretório

# Startup
alias start='bash /home/marce/projetos/TradingSystem/start-tradingsystem'
alias start-docker='bash /home/marce/projetos/TradingSystem/start-tradingsystem --docker'
alias start-services='bash /home/marce/projetos/TradingSystem/start-tradingsystem --services'
alias start-minimal='bash /home/marce/projetos/TradingSystem/start-tradingsystem --minimal'

# Shutdown
alias stop='bash /home/marce/projetos/TradingSystem/stop-tradingsystem'
alias stop-docker='bash /home/marce/projetos/TradingSystem/stop-tradingsystem --docker'
alias stop-services='bash /home/marce/projetos/TradingSystem/stop-tradingsystem --services'
alias stop-force='bash /home/marce/projetos/TradingSystem/stop-tradingsystem --force'

# Status & Monitoring
alias status='bash /home/marce/projetos/TradingSystem/status-tradingsystem'
alias status-quick='bash /home/marce/projetos/TradingSystem/status-tradingsystem --quick'
alias status-watch='bash /home/marce/projetos/TradingSystem/status-tradingsystem --watch'
alias status-services='bash /home/marce/projetos/TradingSystem/status-tradingsystem --services'
alias status-docker='bash /home/marce/projetos/TradingSystem/status-tradingsystem --docker'

# Health & Logs
alias health='bash /home/marce/projetos/TradingSystem/scripts/maintenance/health-check-all.sh'
alias logs='tail -f /tmp/tradingsystem-logs/*.log'

EOF

echo -e "${GREEN}✓${NC}  Aliases atualizados com sucesso!"
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
echo -e "${BOLD}Status & Monitoring:${NC}"
echo -e "  ${CYAN}status${NC}                Status completo (serviços + containers)"
echo -e "  ${CYAN}status-quick${NC}          Resumo rápido"
echo -e "  ${CYAN}status-watch${NC}          Monitoramento contínuo (refresh 5s)"
echo -e "  ${CYAN}status-services${NC}       Apenas serviços Node.js"
echo -e "  ${CYAN}status-docker${NC}         Apenas containers Docker"
echo ""
echo -e "${BOLD}Health & Logs:${NC}"
echo -e "  ${CYAN}health${NC}                Health check completo"
echo -e "  ${CYAN}logs${NC}                  Ver logs em tempo real"
echo ""

# Recarregar shell
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${YELLOW}⚠  IMPORTANTE:${NC} Execute o comando abaixo para ativar os aliases:"
echo ""
echo -e "  ${CYAN}source $SHELL_RC${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}✓${NC}  Atualização concluída!"
echo ""
