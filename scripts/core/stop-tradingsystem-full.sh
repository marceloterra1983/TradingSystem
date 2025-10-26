#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Stop Script
# ==============================================================================
# Este script realiza o shutdown completo do TradingSystem:
#   1. Serviços Node.js (APIs, Dashboard, Documentação)
#   2. Serviços Docker (infraestrutura, dados, monitoramento)
#
# Usage:
#   stop-tradingsystem                  # Para tudo
#   stop-tradingsystem --services       # Apenas serviços Node.js
#   stop-tradingsystem --docker         # Apenas containers
#   stop-tradingsystem --force          # Force kill tudo
#   stop-tradingsystem --clean-logs     # Para e limpa logs
#   stop-tradingsystem --help           # Exibe ajuda
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
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# Diretórios (symlink-safe resolution)
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Flags
STOP_SERVICES=true
STOP_DOCKER=true
FORCE_KILL=false
CLEAN_LOGS=false
SERVICES_ONLY=false
DOCKER_ONLY=false

# ============================= FUNÇÕES =======================================

show_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  🛑 ${BOLD}${RED}TradingSystem${NC}${CYAN} - Universal Shutdown                  ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_help() {
    echo ""
    echo -e "${BOLD}TradingSystem - Universal Stop Script${NC}"
    echo ""
    echo -e "${BOLD}USAGE:${NC}"
    echo "  $(basename "$0") [OPTIONS]"
    echo ""
    echo -e "${BOLD}OPTIONS:${NC}"
    echo -e "  ${GREEN}--services${NC}            Para apenas serviços Node.js locais"
    echo -e "  ${GREEN}--docker${NC}              Para apenas containers Docker"
    echo -e "  ${GREEN}--force${NC}               Force kill (SIGKILL) sem shutdown gracioso"
    echo -e "  ${GREEN}--clean-logs${NC}          Remove arquivos de log após parar"
    echo -e "  ${GREEN}--help${NC}                Exibe esta ajuda"
    echo ""
    echo -e "${BOLD}EXEMPLOS:${NC}"
    echo "  $(basename "$0")                    # Para tudo (gracefully)"
    echo "  $(basename "$0") --services         # Para apenas Node.js"
    echo "  $(basename "$0") --docker           # Para apenas containers"
    echo "  $(basename "$0") --force            # Force kill tudo"
    echo "  $(basename "$0") --clean-logs       # Para e limpa logs"
    echo ""
    echo -e "${BOLD}SERVIÇOS PARADOS:${NC}"
    echo -e "  ${BLUE}Node.js Services:${NC}"
    echo "    • Dashboard (Port 3103)"
    echo "    • Workspace API (Port 3200)"
    echo "    • TP Capital API (Port 3200)"
    echo "    • B3 Market Data (Port 3302)"
    echo "    • Documentation (Port 3205)"
    echo "    • Documentation API (Port 3400)"
    echo "    • Service Launcher (Port 3500)"
    echo "    • Firecrawl Proxy (Port 3600)"
    echo ""
    echo -e "  ${BLUE}Docker Stacks:${NC}"
    echo "    • Infrastructure (Qdrant, Redis, etc.)"
    echo "    • Data (QuestDB, TimescaleDB, pgAdmin)"
    echo "    • Monitoring (Prometheus, Grafana)"
    echo "    • Documentation API"
    echo "    • LangGraph Development"
    echo "    • Firecrawl"
    echo ""
    echo -e "${BOLD}PROCESSO:${NC}"
    echo "  1. Para serviços Node.js (SIGTERM → SIGKILL após timeout)"
    echo "  2. Para containers Docker (mantém volumes)"
    echo "  3. Verifica portas órfãs e limpa"
    echo "  4. Opcionalmente remove logs"
    echo ""
    echo -e "${BOLD}NOTAS:${NC}"
    echo "  • Volumes Docker são preservados (dados não são perdidos)"
    echo "  • Para remover volumes: docker volume prune"
    echo "  • Para iniciar novamente: start-tradingsystem"
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

# Stop Node.js Services
stop_nodejs_services() {
    section "Parando Serviços Node.js"

    local stop_args=()

    if [[ "$FORCE_KILL" == "true" ]]; then
        stop_args+=(--force)
        log_info "Modo: Force Kill (SIGKILL)"
    else
        log_info "Modo: Graceful Shutdown (SIGTERM com timeout)"
    fi

    if [[ "$CLEAN_LOGS" == "true" ]]; then
        stop_args+=(--clean-logs)
        log_info "Logs serão removidos após parar"
    fi

    echo ""

    local stop_script="$REPO_ROOT/scripts/services/stop-all.sh"

    if [[ ! -f "$stop_script" ]]; then
        log_error "Script não encontrado: $stop_script"
        return 1
    fi

    if bash "$stop_script" "${stop_args[@]}"; then
        log_success "Serviços Node.js parados com sucesso"
        return 0
    else
        log_error "Falha ao parar alguns serviços Node.js"
        return 1
    fi
}

# Stop Docker Containers
stop_docker_containers() {
    section "Parando Containers Docker"

    local stop_script="$REPO_ROOT/scripts/docker/stop-stacks.sh"

    if [[ ! -f "$stop_script" ]]; then
        log_error "Script não encontrado: $stop_script"
        return 1
    fi

    log_info "Parando todos os stacks Docker..."
    echo ""

    if bash "$stop_script"; then
        log_success "Containers Docker parados com sucesso"
        return 0
    else
        log_error "Falha ao parar alguns containers Docker"
        return 1
    fi
}

# Verify shutdown
verify_shutdown() {
    section "Verificando Shutdown"

    # Check Node.js processes
    local node_processes
    node_processes=$(pgrep -f "node.*vite|node.*express|node.*docusaurus" | wc -l || echo "0")

    if [[ "$node_processes" -gt 0 ]]; then
        log_warning "Ainda existem $node_processes processo(s) Node.js em execução"
        log_info "Execute com --force para matar todos os processos"
    else
        log_success "Nenhum processo Node.js em execução"
    fi

    # Check Docker containers
    local docker_containers
    docker_containers=$(docker ps -q | wc -l || echo "0")

    if [[ "$docker_containers" -gt 0 ]]; then
        log_warning "Ainda existem $docker_containers container(s) em execução"
        echo ""
        docker ps --format "table {{.Names}}\t{{.Status}}" | head -10
    else
        log_success "Nenhum container Docker em execução"
    fi

    # Check specific ports
    local ports=(3103 3205 3200 3302 3400 3500 3600 3700)
    local ports_in_use=()

    for port in "${ports[@]}"; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            ports_in_use+=("$port")
        fi
    done

    if [[ ${#ports_in_use[@]} -gt 0 ]]; then
        log_warning "Portas ainda em uso: ${ports_in_use[*]}"
        log_info "Execute com --force para liberar as portas"
    else
        log_success "Todas as portas conhecidas estão livres"
    fi
}

# Show summary
show_summary() {
    section "Resumo do Shutdown"

    echo -e "${BOLD}Status:${NC}"

    if [[ "$STOP_SERVICES" == "true" ]]; then
        echo -e "  ${GREEN}✓${NC} Serviços Node.js: Parados"
    fi

    if [[ "$STOP_DOCKER" == "true" ]]; then
        echo -e "  ${GREEN}✓${NC} Containers Docker: Parados"
    fi

    if [[ "$CLEAN_LOGS" == "true" ]]; then
        echo -e "  ${GREEN}✓${NC} Logs: Removidos"
    fi

    echo ""
    echo -e "${BOLD}Próximos passos:${NC}"
    echo -e "  ${CYAN}start${NC}                   - Iniciar tudo novamente"
    echo -e "  ${CYAN}status${NC}                  - Verificar status dos serviços"
    echo -e "  ${CYAN}docker ps${NC}               - Ver containers ainda em execução"
    echo ""

    if [[ "$FORCE_KILL" == "false" ]]; then
        echo -e "${YELLOW}💡 Dica:${NC} Se algo ainda estiver rodando, use: ${CYAN}stop --force${NC}"
        echo ""
    fi
}

# ============================= PARSE ARGS ====================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --services)
            SERVICES_ONLY=true
            STOP_DOCKER=false
            shift
            ;;
        --docker)
            DOCKER_ONLY=true
            STOP_SERVICES=false
            shift
            ;;
        --force)
            FORCE_KILL=true
            shift
            ;;
        --clean-logs)
            CLEAN_LOGS=true
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
    log_info "Modo Force Kill: $FORCE_KILL"
    log_info "Limpar Logs: $CLEAN_LOGS"
    echo ""

    local exit_code=0

    # Stop Node.js services
    if [[ "$STOP_SERVICES" == "true" ]]; then
        if ! stop_nodejs_services; then
            exit_code=1
        fi
    else
        log_info "Pulando serviços Node.js (--docker mode)"
    fi

    # Stop Docker containers
    if [[ "$STOP_DOCKER" == "true" ]]; then
        if ! stop_docker_containers; then
            exit_code=1
        fi
    else
        log_info "Pulando containers Docker (--services mode)"
    fi

    # Verify shutdown
    verify_shutdown

    # Show summary
    show_summary

    if [[ $exit_code -eq 0 ]]; then
        log_success "Shutdown concluído com sucesso!"
    else
        log_warning "Shutdown concluído com avisos (código: $exit_code)"
    fi

    exit $exit_code
}

# Execute main
main


