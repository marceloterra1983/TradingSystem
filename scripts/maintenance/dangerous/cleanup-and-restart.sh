#!/bin/bash
# ==============================================================================
# TradingSystem - Cleanup and Restart Script
# ==============================================================================
# Este script faz uma limpeza completa e reinicia o TradingSystem:
#   1. Para todos os serviços e containers
#   2. Remove containers órfãos
#   3. Limpa logs (opcional)
#   4. Reinicia tudo
#
# Usage:
#   bash scripts/maintenance/cleanup-and-restart.sh [OPTIONS]
#   --skip-logs         Não remove logs
#   --no-restart        Apenas limpa, não reinicia
#   --help              Exibe ajuda
#
# Author: TradingSystem Team
# Last Modified: 2025-10-20
# ==============================================================================

set -euo pipefail

# ============================= CONFIGURAÇÃO ==================================

# Cores
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Flags
CLEAN_LOGS=true
DO_RESTART=true

# ============================= FUNÇÕES =======================================

show_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  🧹 ${BOLD}TradingSystem${NC}${CYAN} - Cleanup & Restart                   ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_help() {
    echo ""
    echo -e "${BOLD}TradingSystem - Cleanup & Restart Script${NC}"
    echo ""
    echo -e "${BOLD}USAGE:${NC}"
    echo "  $(basename "$0") [OPTIONS]"
    echo ""
    echo -e "${BOLD}OPTIONS:${NC}"
    echo -e "  ${GREEN}--skip-logs${NC}           Não remove arquivos de log"
    echo -e "  ${GREEN}--no-restart${NC}          Apenas limpa, não reinicia"
    echo -e "  ${GREEN}--help${NC}                Exibe esta ajuda"
    echo ""
    echo -e "${BOLD}EXEMPLOS:${NC}"
    echo "  $(basename "$0")                    # Limpeza completa + restart"
    echo "  $(basename "$0") --skip-logs        # Limpa sem remover logs"
    echo "  $(basename "$0") --no-restart       # Apenas limpeza"
    echo ""
    echo -e "${BOLD}O QUE É FEITO:${NC}"
    echo "  1. Para todos os serviços Node.js (force kill)"
    echo "  2. Para todos os containers Docker"
    echo "  3. Remove containers órfãos (data-frontend-apps, etc.)"
    echo "  4. Limpa arquivos de log (opcional)"
    echo "  5. Reinicia todos os serviços (opcional)"
    echo ""
    exit 0
}

log_step() {
    echo -e "${BLUE}▶${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

section() {
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Step 1: Stop all services
stop_all_services() {
    section "Passo 1/5: Parando Todos os Serviços"
    
    log_step "Executando: stop --force"
    
    if command -v stop &>/dev/null; then
        stop --force || {
            log_warning "Comando 'stop' falhou ou não está instalado"
            log_info "Tentando parar manualmente..."
            
            # Fallback: stop manual
            if [[ -f "$REPO_ROOT/scripts/shutdown/stop-tradingsystem-full.sh" ]]; then
                bash "$REPO_ROOT/scripts/shutdown/stop-tradingsystem-full.sh" --force
            else
                log_error "Script de parada não encontrado"
                return 1
            fi
        }
    else
        log_info "Comando 'stop' não instalado, usando script direto"
        if [[ -f "$REPO_ROOT/scripts/shutdown/stop-tradingsystem-full.sh" ]]; then
            bash "$REPO_ROOT/scripts/shutdown/stop-tradingsystem-full.sh" --force
        else
            log_error "Script de parada não encontrado"
            return 1
        fi
    fi
    
    log_success "Serviços parados"
    sleep 2
}

# Step 2: Remove orphan containers
remove_orphan_containers() {
    section "Passo 2/5: Removendo Containers e Imagens Órfãos"
    
    # First, remove ALL stopped containers (not just TradingSystem ones)
    log_step "Removendo TODOS os containers parados..."
    local all_stopped
    all_stopped=$(docker ps -aq -f status=exited | wc -l)
    
    if [[ "$all_stopped" -gt 0 ]]; then
        log_info "  Encontrados $all_stopped container(s) parado(s)"
        docker rm $(docker ps -aq -f status=exited) 2>/dev/null || true
        log_success "  Containers parados removidos"
    else
        log_info "  Nenhum container parado encontrado"
    fi
    
    # Specific orphans we know about (may still be running)
    local known_orphans=("data-frontend-apps" "infra-langgraph-dev" "infra-postgres-dev" "infra-redis-dev")
    local removed_count=0
    
    for container in "${known_orphans[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            log_step "Removendo container órfão conhecido: $container"
            if docker rm -f "$container" &>/dev/null; then
                log_success "  Removido: $container"
                removed_count=$((removed_count + 1))
            else
                log_warning "  Falha ao remover: $container"
            fi
        fi
    done
    
    # General container cleanup
    log_step "Limpando containers restantes..."
    docker container prune -f &>/dev/null || true
    
    # Clean orphan images
    log_step "Removendo imagens órfãs (<none>)..."
    local orphan_images
    orphan_images=$(docker images -f "dangling=true" -q | wc -l)
    
    if [[ "$orphan_images" -gt 0 ]]; then
        log_info "  Encontradas $orphan_images imagem(ns) órfã(s)"
        docker image prune -f &>/dev/null || true
        log_success "  Imagens órfãs removidas"
    else
        log_info "  Nenhuma imagem órfã encontrada"
    fi
    
    if [[ "$removed_count" -gt 0 ]]; then
        log_success "Removidos $removed_count container(s) órfão(s) conhecidos"
    fi
    
    # Show remaining containers
    local remaining
    remaining=$(docker ps -q | wc -l)
    if [[ "$remaining" -gt 0 ]]; then
        log_warning "Ainda existem $remaining container(s) em execução"
        docker ps --format "table {{.Names}}\t{{.Status}}" | head -10
    else
        log_success "Nenhum container em execução"
    fi
}

# Step 3: Clean logs
clean_logs() {
    section "Passo 3/5: Limpando Logs"
    
    if [[ "$CLEAN_LOGS" == "false" ]]; then
        log_info "Limpeza de logs pulada (--skip-logs)"
        return 0
    fi
    
    local log_dir="/tmp/tradingsystem-logs"
    
    if [[ -d "$log_dir" ]]; then
        log_step "Removendo logs de: $log_dir"
        
        local log_count
        log_count=$(find "$log_dir" -type f \( -name "*.log" -o -name "*.log.old*" \) | wc -l)
        
        if [[ "$log_count" -gt 0 ]]; then
            find "$log_dir" -type f \( -name "*.log" -o -name "*.log.old*" \) -delete
            log_success "Removidos $log_count arquivo(s) de log"
        else
            log_info "Nenhum arquivo de log para remover"
        fi
    else
        log_info "Diretório de logs não existe: $log_dir"
    fi
}

# Step 4: Verify cleanup
verify_cleanup() {
    section "Passo 4/5: Verificando Limpeza"
    
    local all_clean=true
    
    # Check Node.js processes
    local node_procs
    node_procs=$(pgrep -f "node.*vite|node.*express|node.*docusaurus" | wc -l || echo "0")
    
    if [[ "$node_procs" -gt 0 ]]; then
        log_warning "Ainda existem $node_procs processo(s) Node.js em execução"
        all_clean=false
    else
        log_success "Nenhum processo Node.js em execução"
    fi
    
    # Check Docker containers
    local docker_containers
    docker_containers=$(docker ps -q | wc -l || echo "0")
    
    if [[ "$docker_containers" -gt 0 ]]; then
        log_warning "Ainda existem $docker_containers container(s) em execução"
        all_clean=false
    else
        log_success "Nenhum container Docker em execução"
    fi
    
    # Check ports
    local ports_in_use=0
    
    for port in "${ports[@]}"; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            ((ports_in_use++))
        fi
    done
    
    if [[ "$ports_in_use" -gt 0 ]]; then
        log_warning "$ports_in_use porta(s) ainda em uso"
        all_clean=false
    else
        log_success "Todas as portas conhecidas estão livres"
    fi
    
    if [[ "$all_clean" == "true" ]]; then
        log_success "Sistema completamente limpo!"
    else
        log_warning "Alguns recursos ainda estão em uso"
        log_info "Você pode executar novamente com --force ou limpar manualmente"
    fi
}

# Step 5: Restart
restart_system() {
    section "Passo 5/5: Reiniciando Sistema"
    
    if [[ "$DO_RESTART" == "false" ]]; then
        log_info "Restart pulado (--no-restart)"
        return 0
    fi
    
    log_step "Aguardando 3 segundos antes de reiniciar..."
    sleep 3
    
    log_step "Executando: start"
    echo ""
    
    if command -v start &>/dev/null; then
        start
    else
        log_info "Comando 'start' não instalado, usando script direto"
        if [[ -f "$REPO_ROOT/scripts/startup/start-tradingsystem-full.sh" ]]; then
            bash "$REPO_ROOT/scripts/startup/start-tradingsystem-full.sh"
        else
            log_error "Script de startup não encontrado"
            return 1
        fi
    fi
}

# Show summary
show_summary() {
    section "Resumo"
    
    echo -e "${BOLD}Ações realizadas:${NC}"
    echo -e "  ${GREEN}✓${NC} Serviços parados (force kill)"
    echo -e "  ${GREEN}✓${NC} Containers órfãos removidos"
    
    if [[ "$CLEAN_LOGS" == "true" ]]; then
        echo -e "  ${GREEN}✓${NC} Logs removidos"
    else
        echo -e "  ${YELLOW}⊘${NC} Logs preservados"
    fi
    
    if [[ "$DO_RESTART" == "true" ]]; then
        echo -e "  ${GREEN}✓${NC} Sistema reiniciado"
    else
        echo -e "  ${YELLOW}⊘${NC} Sistema não reiniciado"
    fi
    
    echo ""
    echo -e "${BOLD}Próximos passos:${NC}"
    
    if [[ "$DO_RESTART" == "false" ]]; then
        echo -e "  ${CYAN}start${NC}                   - Iniciar todos os serviços"
    fi
    
    echo -e "  ${CYAN}status${NC}                  - Verificar status dos serviços"
    echo -e "  ${CYAN}docker ps${NC}               - Ver containers em execução"
    echo ""
}

# ============================= PARSE ARGS ====================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-logs)
            CLEAN_LOGS=false
            shift
            ;;
        --no-restart)
            DO_RESTART=false
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            echo -e "${RED}Opção desconhecida: $1${NC}"
            show_help
            ;;
    esac
done

# ============================= MAIN ==========================================

main() {
    show_banner
    
    # Show configuration
    log_info "Diretório do projeto: $REPO_ROOT"
    log_info "Limpar logs: $CLEAN_LOGS"
    log_info "Reiniciar após limpeza: $DO_RESTART"
    echo ""
    
    local start_time
    start_time=$(date +%s)
    
    # Execute steps
    stop_all_services
    remove_orphan_containers
    clean_logs
    verify_cleanup
    
    if [[ "$DO_RESTART" == "true" ]]; then
        restart_system
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    show_summary
    
    log_success "Cleanup concluído em ${duration}s!"
    echo ""
}

# Execute main
main
