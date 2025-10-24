#!/bin/bash
# ==============================================================================
# Cleanup Aggressive - TradingSystem
# ==============================================================================
# Limpeza agressiva de scripts one-time, documentação redundante e scripts
# obsoletos. Remove 45 scripts adicionais focando em:
#   - Scripts de fix já executados
#   - Documentação redundante
#   - Scripts Python one-time
#   - Validações redundantes
#
# Ver análise completa: scripts/ANALISE-LIMPEZA-AGRESSIVA.md
#
# Usage:
#   bash scripts/maintenance/cleanup-aggressive.sh [--dry-run] [--backup] [--phase N]
#
# Options:
#   --dry-run     Mostra o que seria removido sem executar
#   --backup      Cria backup antes de remover
#   --phase N     Executa apenas fase específica (1-6)
#   --help        Mostra esta ajuda
#
# Phases:
#   1 - Fix One-Time Scripts (13)
#   2 - Documentação Redundante (8)
#   3 - Python One-Time Scripts (6)
#   4 - Shell One-Time Scripts (5)
#   5 - Validações Redundantes (4)
#   6 - Scripts Pequenos/Outros (9)
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
BACKUP_DIR="$REPO_ROOT/.backups/scripts-aggressive-$(date +%Y%m%d-%H%M%S)"

# Flags
DRY_RUN=false
CREATE_BACKUP=false
PHASE="all"

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --backup) CREATE_BACKUP=true; shift ;;
        --phase) PHASE="$2"; shift 2 ;;
        --help)
            head -n 30 "$0" | grep "^#" | sed 's/^# \?//'
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
log_phase() { echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"; echo -e "${CYAN}║${NC}  $1"; echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"; echo ""; }

# Banner
echo ""
log_phase "🔥 ${BOLD}Limpeza Agressiva de Scripts${NC}"

if [ "$DRY_RUN" = true ]; then
    log_warning "Modo DRY-RUN ativado - nenhum arquivo será removido"
    echo ""
fi

# Arrays de scripts por fase
declare -a PHASE1_FIX=(
    "scripts/maintenance/fix-all-apis.sh"
    "scripts/maintenance/fix-all-startup-warnings.sh"
    "scripts/maintenance/fix-env-line-endings.sh"
    "scripts/maintenance/fix-node-permissions.sh"
    "scripts/docker/fix-network-warnings.sh"
    "scripts/docker/fix-registry-health.sh"
    "scripts/docker/fix-langgraph-dev-naming.sh"
    "scripts/docker/upgrade-pgadmin.sh"
    "scripts/buildkit/fix-buildkit-simple.sh"
    "scripts/buildkit/test-buildkit-fixed.sh"
    "scripts/maintenance/rewrite-history.sh"
    "scripts/maintenance/uninstall-docker-wsl.sh"
    "scripts/maintenance/update-aliases.sh"
)

declare -a PHASE2_DOCS=(
    "scripts/docs/IMPLEMENTATION-SUMMARY.md"
    "scripts/docs/LINK-RESOLUTION-FIX.md"
    "scripts/docs/SPACE-FREED-CALCULATION-FIX.md"
    "scripts/docs/QUICK-START.md"
    "scripts/docs/README-V2.md"
    "scripts/COPY-TERMINAL-GUIDE.md"
    "scripts/QUICK-REFERENCE-COPY.md"
    "scripts/maintenance/CLEANUP-RESTART-README.md"
)

declare -a PHASE3_PYTHON=(
    "scripts/docs/fix-all-yaml-colons.py"
    "scripts/docs/fix-yaml-titles.py"
    "scripts/docs/remove-log-frontmatter.py"
    "scripts/docs/analyze-invalid-types.py"
    "scripts/docs/generate-audit-report.py"
    "scripts/docs/test-link-resolution.py"
)

declare -a PHASE4_SHELL_DOCS=(
    "scripts/docs/test-cleanup-space-calculation.sh"
    "scripts/docs/generate-restoration-report.sh"
    "scripts/docs/cleanup-docusaurus-artifacts.sh"
    "scripts/docs/install-and-build-docusaurus.sh"
    "scripts/docs/audit-documentation.sh"
)

declare -a PHASE5_VALIDATION=(
    "scripts/docs/validate-dev-server.sh"
    "scripts/docs/validate-diagrams.sh"
    "scripts/docs/validate-theme-components.sh"
    "scripts/docs/validate-integrations.sh"
)

declare -a PHASE6_SMALL=(
    "scripts/terminal/install-terminal-keeper.sh"
    "scripts/terminal/install-terminal-buttons.sh"
    "scripts/terminal/install-shortcuts.sh"
    "scripts/services/tag-image.sh"
    "scripts/services/pull-images.sh"
    "scripts/docker/prune-old-images.sh"
    "scripts/docker/validate-compose-names.sh"
    "scripts/docker/migrate-docs-to-docker.sh"
    "scripts/maintenance/create-root-symlinks.sh"
)

# Função para processar uma fase
process_phase() {
    local phase_num=$1
    local phase_name=$2
    shift 2
    local files=("$@")
    
    log_header "Fase $phase_num: $phase_name (${#files[@]} arquivos)"
    echo ""
    
    local removed=0
    local missing=0
    
    for file in "${files[@]}"; do
        file_path="$REPO_ROOT/$file"
        
        if [ -f "$file_path" ]; then
            if [ "$DRY_RUN" = true ]; then
                log_warning "[DRY-RUN] Seria removido: $file"
            else
                rm "$file_path"
                log_success "Removido: $file"
                removed=$((removed + 1))
            fi
        else
            missing=$((missing + 1))
            log_info "Não encontrado: $file"
        fi
    done
    
    echo ""
    if [ "$DRY_RUN" = false ]; then
        log_info "Fase $phase_num: $removed removidos, $missing já ausentes"
    else
        log_info "Fase $phase_num: $((${#files[@]} - missing)) seriam removidos"
    fi
    echo ""
}

# Criar backup se solicitado
if [ "$CREATE_BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
    log_header "Criando backup..."
    mkdir -p "$BACKUP_DIR"
    
    all_files=("${PHASE1_FIX[@]}" "${PHASE2_DOCS[@]}" "${PHASE3_PYTHON[@]}" "${PHASE4_SHELL_DOCS[@]}" "${PHASE5_VALIDATION[@]}" "${PHASE6_SMALL[@]}")
    
    for file in "${all_files[@]}"; do
        file_path="$REPO_ROOT/$file"
        if [ -f "$file_path" ]; then
            backup_path="$BACKUP_DIR/$file"
            mkdir -p "$(dirname "$backup_path")"
            cp "$file_path" "$backup_path"
        fi
    done
    
    log_success "Backup criado em: $BACKUP_DIR"
    echo ""
fi

# Executar fases
total_removed=0
total_missing=0

case $PHASE in
    "all")
        process_phase 1 "Scripts de Fix One-Time" "${PHASE1_FIX[@]}"
        process_phase 2 "Documentação Redundante" "${PHASE2_DOCS[@]}"
        process_phase 3 "Scripts Python One-Time" "${PHASE3_PYTHON[@]}"
        process_phase 4 "Scripts Shell One-Time de Docs" "${PHASE4_SHELL_DOCS[@]}"
        process_phase 5 "Validações Redundantes" "${PHASE5_VALIDATION[@]}"
        process_phase 6 "Scripts Pequenos e Outros" "${PHASE6_SMALL[@]}"
        ;;
    "1")
        process_phase 1 "Scripts de Fix One-Time" "${PHASE1_FIX[@]}"
        ;;
    "2")
        process_phase 2 "Documentação Redundante" "${PHASE2_DOCS[@]}"
        ;;
    "3")
        process_phase 3 "Scripts Python One-Time" "${PHASE3_PYTHON[@]}"
        ;;
    "4")
        process_phase 4 "Scripts Shell One-Time de Docs" "${PHASE4_SHELL_DOCS[@]}"
        ;;
    "5")
        process_phase 5 "Validações Redundantes" "${PHASE5_VALIDATION[@]}"
        ;;
    "6")
        process_phase 6 "Scripts Pequenos e Outros" "${PHASE6_SMALL[@]}"
        ;;
    *)
        log_error "Fase inválida: $PHASE (use 1-6 ou 'all')"
        exit 1
        ;;
esac

# Limpar diretórios vazios
if [ "$DRY_RUN" = false ]; then
    echo ""
    log_header "Limpando diretórios vazios..."
    find "$REPO_ROOT/scripts" -type d -empty -delete 2>/dev/null && \
        log_success "Diretórios vazios removidos" || \
        log_info "Nenhum diretório vazio encontrado"
fi

# Contagem total
all_files=("${PHASE1_FIX[@]}" "${PHASE2_DOCS[@]}" "${PHASE3_PYTHON[@]}" "${PHASE4_SHELL_DOCS[@]}" "${PHASE5_VALIDATION[@]}" "${PHASE6_SMALL[@]}")
total_files=${#all_files[@]}
existing_files=0

for file in "${all_files[@]}"; do
    [ -f "$REPO_ROOT/$file" ] && existing_files=$((existing_files + 1))
done

# Sumário
echo ""
log_phase "📊 ${BOLD}Sumário${NC}"
echo ""
echo -e "  Total de arquivos analisados:     ${BOLD}$total_files${NC}"
echo -e "  Arquivos existentes:               ${BLUE}$existing_files${NC}"
echo -e "  Arquivos já removidos:             ${YELLOW}$((total_files - existing_files))${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "  Arquivos que seriam removidos:     ${YELLOW}$existing_files${NC}"
else
    echo -e "  Arquivos removidos agora:          ${GREEN}$existing_files${NC}"
fi

echo ""

if [ "$CREATE_BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
    echo -e "  📦 Backup salvo em:"
    echo -e "     ${CYAN}$BACKUP_DIR${NC}"
    echo ""
fi

# Contagem atual de scripts
current_scripts=$(find "$REPO_ROOT/scripts" -type f \( -name "*.sh" -o -name "*.ps1" \) | wc -l)
echo -e "  📁 Scripts restantes (.sh/.ps1):   ${GREEN}$current_scripts${NC}"
echo ""

# Próximos passos
if [ "$DRY_RUN" = true ]; then
    log_header "Para executar a remoção:"
    echo ""
    echo -e "  ${YELLOW}Limpeza completa:${NC}"
    echo -e "    ${CYAN}bash $0 --backup${NC}"
    echo ""
    echo -e "  ${YELLOW}Por fases (conservador):${NC}"
    echo -e "    ${CYAN}bash $0 --backup --phase 1${NC}"
    echo -e "    ${CYAN}bash $0 --backup --phase 2${NC}"
    echo -e "    ${CYAN}# ... etc${NC}"
elif [ $existing_files -gt 0 ]; then
    log_success "Limpeza agressiva concluída com sucesso!"
    echo ""
    log_header "Próximos passos recomendados:"
    echo ""
    echo -e "  1. Verificar documentação afetada"
    echo -e "  2. Atualizar INDEX.md e README.md"
    echo -e "  3. Executar validação:"
    echo -e "     ${CYAN}bash scripts/validation/validate.sh${NC}"
    echo ""
    echo -e "  4. Commit das mudanças:"
    echo -e "     ${CYAN}git add scripts/${NC}"
    echo -e "     ${CYAN}git commit -m \"chore: aggressive cleanup - remove 45 one-time and redundant scripts/docs\"${NC}"
else
    log_info "Todos os arquivos já foram removidos previamente"
fi

echo ""
log_header "Análise Completa: scripts/ANALISE-LIMPEZA-AGRESSIVA.md"
echo ""
log_phase "✓ ${GREEN}Script Concluído${NC}"



