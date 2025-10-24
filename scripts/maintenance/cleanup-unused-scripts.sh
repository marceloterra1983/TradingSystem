#!/bin/bash
# ==============================================================================
# Cleanup Unused Scripts - TradingSystem
# ==============================================================================
# Remove scripts duplicados, obsoletos ou redundantes identificados na análise
# de 23/10/2025. Ver: scripts/ANALISE-SCRIPTS-2025-10-23.md
#
# Usage:
#   bash scripts/maintenance/cleanup-unused-scripts.sh [--dry-run] [--backup]
#
# Options:
#   --dry-run     Mostra o que seria removido sem executar
#   --backup      Cria backup antes de remover
#   --help        Mostra esta ajuda
#
# Author: TradingSystem Team
# Date: 2025-10-23
# ==============================================================================

set -euo pipefail

# Cores
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$REPO_ROOT/.backups/scripts-cleanup-$(date +%Y%m%d-%H%M%S)"

# Flags
DRY_RUN=false
CREATE_BACKUP=false

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --backup) CREATE_BACKUP=true; shift ;;
        --help)
            head -n 20 "$0" | grep "^#" | sed 's/^# \?//'
            exit 0
            ;;
        *) echo -e "${RED}Opção desconhecida: $1${NC}"; exit 1 ;;
    esac
done

# Funções de log
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_header() { echo -e "${CYAN}${BOLD}$1${NC}"; }

# Banner
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🧹 ${BOLD}Cleanup Unused Scripts${NC}                                ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warning "Modo DRY-RUN ativado - nenhum arquivo será removido"
    echo ""
fi

# Arrays de scripts para remover
declare -a SCRIPTS_TO_REMOVE=(
    # BuildKit - 6 scripts
    "scripts/buildkit/test-buildkit.sh"
    "scripts/buildkit/test-buildkit-sudo.sh"
    "scripts/buildkit/fix-buildkit.sh"
    "scripts/buildkit/setup-buildkit-cache.sh"
    "scripts/buildkit/buildkit-wrapper.sh"
    "scripts/buildkit/configure-buildkit.sh"
    
    # Docker - 3 scripts
    "scripts/docker/cleanup-orphan-containers.sh"
    "scripts/docker/migrate-docs-to-docker-v1.sh"
    "scripts/docker/test-docs-api.sh"
    
    # Docs - 7 scripts
    "scripts/docs/run-all-health-tests.sh"
    "scripts/docs/test-health-api.sh"
    "scripts/docs/start-docusaurus-health.sh"
    "scripts/docs/validate-links.sh"
    "scripts/docs/check-links.py"
    "scripts/docs/validate-frontmatter-staged.sh"
    "scripts/docs/add-missing-frontmatter.py"
    
    # Maintenance - 4 scripts
    "scripts/maintenance/cleanup-restart.sh"
    "scripts/maintenance/migrate-to-new-structure.sh"
    "scripts/maintenance/remove-portainer-complete.sh"
    "scripts/maintenance/execute-all-fixes.sh"
    
    # Terminal - 2 scripts
    "scripts/terminal/copy-terminal.sh"
    "scripts/terminal/install-terminal-extensions.sh"
    
    # Validation - 2 scripts
    "scripts/validation/phase6-validation.sh"
    "scripts/validation/final-verification.sh"
    
    # Startup - 3 scripts
    "scripts/startup/start-status.ps1"
    "scripts/startup/start-status.sh"
    "scripts/startup/START-HEALTH-DASHBOARD.sh"
    
    # Outros - 5 scripts
    "scripts/diagnostics/test-api-endpoints.sh"
    "scripts/refactor/rename-docs-services.sh"
    "scripts/env/validate-env-structure.sh"
    "scripts/git/configure-identity.sh"
    "scripts/services/restart-dashboard.sh"
)

# Criar backup se solicitado
if [ "$CREATE_BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
    log_header "Criando backup..."
    mkdir -p "$BACKUP_DIR"
    
    for script in "${SCRIPTS_TO_REMOVE[@]}"; do
        script_path="$REPO_ROOT/$script"
        if [ -f "$script_path" ]; then
            backup_path="$BACKUP_DIR/$script"
            mkdir -p "$(dirname "$backup_path")"
            cp "$script_path" "$backup_path"
        fi
    done
    
    log_success "Backup criado em: $BACKUP_DIR"
    echo ""
fi

# Verificar e remover scripts
log_header "Analisando scripts para remoção..."
echo ""

total_scripts=0
existing_scripts=0
removed_scripts=0
missing_scripts=0

for script in "${SCRIPTS_TO_REMOVE[@]}"; do
    script_path="$REPO_ROOT/$script"
    total_scripts=$((total_scripts + 1))
    
    if [ -f "$script_path" ]; then
        existing_scripts=$((existing_scripts + 1))
        
        if [ "$DRY_RUN" = true ]; then
            log_warning "[DRY-RUN] Seria removido: $script"
        else
            rm "$script_path"
            log_success "Removido: $script"
            removed_scripts=$((removed_scripts + 1))
        fi
    else
        missing_scripts=$((missing_scripts + 1))
        log_info "Não encontrado (já removido?): $script"
    fi
done

# Limpar diretórios vazios
echo ""
log_header "Limpando diretórios vazios..."
echo ""

if [ "$DRY_RUN" = false ]; then
    find "$REPO_ROOT/scripts" -type d -empty -delete 2>/dev/null && \
        log_success "Diretórios vazios removidos" || \
        log_info "Nenhum diretório vazio encontrado"
fi

# Sumário
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  📊 ${BOLD}Sumário${NC}                                                 ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total de scripts analisados:     ${BOLD}$total_scripts${NC}"
echo -e "  Scripts existentes:               ${BLUE}$existing_scripts${NC}"
echo -e "  Scripts já removidos:             ${YELLOW}$missing_scripts${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "  Scripts que seriam removidos:     ${YELLOW}$existing_scripts${NC}"
else
    echo -e "  Scripts removidos agora:          ${GREEN}$removed_scripts${NC}"
fi

echo ""

if [ "$CREATE_BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
    echo -e "  📦 Backup salvo em:"
    echo -e "     ${CYAN}$BACKUP_DIR${NC}"
    echo ""
fi

# Próximos passos
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Para executar a remoção, execute:${NC}"
    echo -e "  ${CYAN}bash $0${NC}"
    echo ""
    echo -e "${YELLOW}Para criar backup antes de remover:${NC}"
    echo -e "  ${CYAN}bash $0 --backup${NC}"
elif [ "$removed_scripts" -gt 0 ]; then
    echo -e "${GREEN}✅ Limpeza concluída com sucesso!${NC}"
    echo ""
    echo -e "${YELLOW}Próximos passos recomendados:${NC}"
    echo -e "  1. Verificar que nenhum script restante referencia os removidos:"
    echo -e "     ${CYAN}grep -r \"test-buildkit.sh\" scripts/${NC}"
    echo ""
    echo -e "  2. Atualizar INDEX.md e README.md se necessário"
    echo ""
    echo -e "  3. Executar validação geral:"
    echo -e "     ${CYAN}bash scripts/validation/validate.sh${NC}"
    echo ""
    echo -e "  4. Commit das mudanças:"
    echo -e "     ${CYAN}git add scripts/${NC}"
    echo -e "     ${CYAN}git commit -m \"chore: remove unused and duplicate scripts (35 total)\"${NC}"
else
    log_info "Todos os scripts já foram removidos previamente"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Script Concluído${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""



