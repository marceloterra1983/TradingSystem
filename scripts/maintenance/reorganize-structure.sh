#!/bin/bash
# ==============================================================================
# Reorganize Scripts Structure - TradingSystem
# ==============================================================================
# Consolidates 18 directories into 7 logical groups for better organization
#
# Current: 18 directories (many with only 2-4 scripts)
# Target:  7 directories (each with 8-20 scripts)
#
# See: scripts/PROPOSTA-REORGANIZACAO.md
#
# Usage:
#   bash scripts/maintenance/reorganize-structure.sh [--dry-run] [--backup]
#
# Author: TradingSystem Team
# Date: 2025-10-23
# ==============================================================================

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$REPO_ROOT/.backups/scripts-reorganize-$(date +%Y%m%d-%H%M%S)"

# Flags
DRY_RUN=false
CREATE_BACKUP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --backup) CREATE_BACKUP=true; shift ;;
        --help)
            head -n 20 "$0" | grep "^#" | sed 's/^# \?//'
            exit 0
            ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
done

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_header() { echo -e "${CYAN}${BOLD}═══ $1 ═══${NC}"; echo ""; }
log_phase() { echo ""; echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"; echo -e "${CYAN}║${NC}  $1"; echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"; echo ""; }

# Banner
log_phase "📁 ${BOLD}Reorganização de Estrutura - 18 → 7 Pastas${NC}"

if [ "$DRY_RUN" = true ]; then
    log_warning "Modo DRY-RUN ativado - nenhuma alteração será feita"
    echo ""
fi

cd "$REPO_ROOT/scripts"

# Create backup
if [ "$CREATE_BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
    log_header "Criando Backup"
    cp -r "$REPO_ROOT/scripts" "$BACKUP_DIR"
    log_success "Backup criado em: $BACKUP_DIR"
fi

# Function to move file with logging
move_file() {
    local src="$1"
    local dest="$2"
    local rename="${3:-}"
    
    if [ ! -f "$src" ]; then
        return
    fi
    
    local dest_file="$dest"
    if [ -n "$rename" ]; then
        dest_file="$dest/$rename"
    else
        dest_file="$dest/$(basename "$src")"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[DRY-RUN] Moveria: $src → $dest_file"
    else
        mkdir -p "$(dirname "$dest_file")"
        mv "$src" "$dest_file"
        log_success "Movido: $(basename "$src") → $dest_file"
    fi
}

# ==============================================================================
# PHASE 1: Create new directory structure
# ==============================================================================
log_header "Fase 1: Criar Nova Estrutura"

if [ "$DRY_RUN" = false ]; then
    mkdir -p core
    log_success "Criado: scripts/core/"
fi

# ==============================================================================
# PHASE 2: Move startup + shutdown + services → core/
# ==============================================================================
log_header "Fase 2: Consolidar Scripts de Controle → core/"

if [ -d "startup" ]; then
    for file in startup/*.sh startup/*.ps1; do
        [ -f "$file" ] && move_file "$file" "core"
    done
fi

if [ -d "shutdown" ]; then
    for file in shutdown/*.sh; do
        [ -f "$file" ] && move_file "$file" "core"
    done
fi

if [ -d "services" ]; then
    for file in services/*.sh; do
        [ -f "$file" ] && move_file "$file" "core"
    done
fi

# ==============================================================================
# PHASE 3: Move buildkit → docker/ with prefix
# ==============================================================================
log_header "Fase 3: Consolidar BuildKit → docker/"

if [ -d "buildkit" ]; then
    for file in buildkit/*.sh; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            # Add buildkit- prefix if not present
            if [[ ! "$filename" =~ ^buildkit- ]]; then
                move_file "$file" "docker" "buildkit-$filename"
            else
                move_file "$file" "docker"
            fi
        fi
    done
fi

# ==============================================================================
# PHASE 4: Move firecrawl + langgraph → database/ with prefixes
# ==============================================================================
log_header "Fase 4: Consolidar Firecrawl & LangGraph → database/"

if [ -d "firecrawl" ]; then
    for file in firecrawl/*.sh; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            if [[ ! "$filename" =~ ^firecrawl- ]]; then
                move_file "$file" "database" "firecrawl-$filename"
            else
                move_file "$file" "database"
            fi
        fi
    done
fi

if [ -d "langgraph" ]; then
    for file in langgraph/*.sh; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            if [[ ! "$filename" =~ ^langgraph- ]]; then
                move_file "$file" "database" "langgraph-$filename"
            else
                move_file "$file" "database"
            fi
        fi
    done
fi

# ==============================================================================
# PHASE 5: Move terminal + utils + validation + healthcheck → maintenance/
# ==============================================================================
log_header "Fase 5: Consolidar Utils & Tools → maintenance/"

# Terminal scripts
if [ -d "terminal" ]; then
    for file in terminal/*.sh; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            # Add terminal- prefix to install/copy scripts
            if [[ "$filename" =~ ^(install|copy) ]] && [[ ! "$filename" =~ ^terminal- ]]; then
                move_file "$file" "maintenance" "terminal-$filename"
            else
                move_file "$file" "maintenance"
            fi
        fi
    done
fi

# Utils scripts
if [ -d "utils" ]; then
    for file in utils/*.sh; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            if [[ ! "$filename" =~ ^util- ]]; then
                move_file "$file" "maintenance" "util-$filename"
            else
                move_file "$file" "maintenance"
            fi
        fi
    done
fi

# Validation scripts
if [ -d "validation" ]; then
    for file in validation/*.sh validation/*.py; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            if [[ ! "$filename" =~ ^validate- ]] && [[ ! "$filename" =~ ^verify- ]]; then
                ext="${filename##*.}"
                base="${filename%.*}"
                move_file "$file" "maintenance" "validate-$base.$ext"
            else
                move_file "$file" "maintenance"
            fi
        fi
    done
fi

# Healthcheck scripts
if [ -d "healthcheck" ]; then
    for file in healthcheck/*.sh; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            # hc-* already has good prefix, just move
            move_file "$file" "maintenance"
        fi
    done
fi

# ==============================================================================
# PHASE 6: Move README files
# ==============================================================================
log_header "Fase 6: Organizar Documentação"

# Move specific READMEs to their consolidated directories
if [ "$DRY_RUN" = false ]; then
    [ -f "startup/README.md" ] && mv startup/README.md core/ 2>/dev/null || true
    [ -f "shutdown/README.md" ] && mv shutdown/README.md core/ 2>/dev/null || true
    [ -f "buildkit/README.md" ] && mv buildkit/README.md docker/ 2>/dev/null || true
    [ -f "terminal/README.md" ] && mv terminal/README.md maintenance/ 2>/dev/null || true
    [ -f "healthcheck/README.md" ] && mv healthcheck/README.md maintenance/ 2>/dev/null || true
    [ -f "firecrawl/README.md" ] && mv firecrawl/README.md database/ 2>/dev/null || true
fi

# ==============================================================================
# PHASE 7: Clean up empty directories
# ==============================================================================
log_header "Fase 7: Limpar Diretórios Vazios"

if [ "$DRY_RUN" = false ]; then
    # Remove empty dirs (multiple passes to handle nested)
    for i in {1..3}; do
        find . -maxdepth 2 -type d -empty -delete 2>/dev/null || true
    done
    log_success "Diretórios vazios removidos"
else
    log_warning "[DRY-RUN] Removeria diretórios vazios"
fi

# ==============================================================================
# SUMMARY
# ==============================================================================
log_phase "📊 ${BOLD}Sumário da Reorganização${NC}"

# Count directories before/after
if [ "$DRY_RUN" = false ]; then
    dir_count=$(find . -maxdepth 1 -type d | wc -l)
    dir_count=$((dir_count - 1)) # exclude .
    
    echo -e "  ${BOLD}Estrutura Nova:${NC}"
    echo ""
    for dir in */; do
        if [ -d "$dir" ]; then
            count=$(find "$dir" -maxdepth 1 -type f \( -name "*.sh" -o -name "*.ps1" -o -name "*.py" \) | wc -l)
            echo -e "    📂 $(basename "$dir"): ${GREEN}$count${NC} scripts"
        fi
    done
    echo ""
    echo -e "  Total de pastas: ${GREEN}$dir_count${NC}"
else
    echo -e "  ${YELLOW}Execute sem --dry-run para ver estrutura final${NC}"
fi

echo ""

if [ "$CREATE_BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
    echo -e "  📦 Backup disponível em:"
    echo -e "     ${CYAN}$BACKUP_DIR${NC}"
    echo ""
fi

# Next steps
if [ "$DRY_RUN" = true ]; then
    log_header "Para Executar:"
    echo ""
    echo -e "  ${CYAN}bash $0 --backup${NC}"
    echo ""
elif [ "$DRY_RUN" = false ]; then
    log_success "Reorganização concluída!"
    echo ""
    log_header "Próximos Passos:"
    echo ""
    echo -e "  1. Verificar estrutura: ${CYAN}ls -la scripts/*/${NC}"
    echo -e "  2. Atualizar INDEX.md e README.md"
    echo -e "  3. Testar scripts principais"
    echo -e "  4. Commit:"
    echo -e "     ${CYAN}git add scripts/${NC}"
    echo -e "     ${CYAN}git commit -m \"refactor: reorganize scripts from 18 to 7 directories\"${NC}"
fi

echo ""
log_phase "✓ ${GREEN}Script Concluído${NC}"



