#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Startup Script
# ==============================================================================
# Este script realiza o startup completo do TradingSystem:
#   1. Serviços Docker (infraestrutura, dados, monitoramento)
#   2. Serviços Node.js (APIs, Dashboard, Documentação)
#
# Usage:
#   start-tradingsystem              # Inicia tudo
#   start-tradingsystem --docker     # Apenas containers
#   start-tradingsystem --services   # Apenas serviços Node.js
#   start-tradingsystem --minimal    # Apenas essenciais (Dashboard + Workspace)
#   start-tradingsystem --help       # Exibe ajuda
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
START_DOCKER=true
START_SERVICES=true
MINIMAL_MODE=false
FORCE_KILL=false
SKIP_FRONTEND=false
SKIP_BACKEND=false
SKIP_DOCS=false

# ============================= FUNÇÕES =======================================

show_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  🚀 ${BOLD}${GREEN}TradingSystem${NC}${CYAN} - Universal Startup                    ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_help() {
    echo ""
    echo -e "${BOLD}TradingSystem - Universal Startup Script${NC}"
    echo ""
    echo -e "${BOLD}USAGE:${NC}"
    echo "  $(basename "$0") [OPTIONS]"
    echo ""
    echo -e "${BOLD}OPTIONS:${NC}"
    echo -e "  ${GREEN}--docker${NC}              Inicia apenas containers Docker"
    echo -e "  ${GREEN}--services${NC}            Inicia apenas serviços Node.js locais"
    echo -e "  ${GREEN}--minimal${NC}             Modo mínimo (Dashboard + Workspace + Docusaurus)"
    echo -e "  ${GREEN}--force-kill${NC}          Mata processos em portas ocupadas"
    echo -e "  ${GREEN}--skip-frontend${NC}       Não inicia Dashboard"
    echo -e "  ${GREEN}--skip-backend${NC}        Não inicia APIs backend"
    echo -e "  ${GREEN}--skip-docs${NC}           Não inicia Docusaurus"
    echo -e "  ${GREEN}--help${NC}                Exibe esta ajuda"
    echo ""
    echo -e "${BOLD}EXEMPLOS:${NC}"
    echo "  $(basename "$0")                    # Startup completo"
    echo "  $(basename "$0") --minimal          # Apenas essenciais"
    echo "  $(basename "$0") --docker           # Apenas infraestrutura Docker"
    echo "  $(basename "$0") --services --force-kill # Restart forçado dos serviços"
    echo ""
    echo -e "${BOLD}SERVIÇOS INICIADOS:${NC}"
    echo -e "  ${BLUE}Docker Stacks:${NC}"
    echo "    • Infrastructure (Qdrant, Redis, etc.)"
    echo "    • Data (QuestDB, TimescaleDB, pgAdmin)"
    echo "    • Monitoring (Prometheus, Grafana)"
    echo "    • Documentation API"
    echo "    • LangGraph Development"
    echo ""
    echo -e "  ${BLUE}Node.js Services:${NC}"
    echo "    • Dashboard (React + Vite)          - http://localhost:3103"
    echo "    • Workspace API (Express)           - http://localhost:3200"
    echo "    • TP Capital API (Express)          - http://localhost:3200"
    echo "    • B3 Market Data (Express)          - http://localhost:3302"
    echo "    • Documentation (Docusaurus)        - http://localhost:3004"
    echo "    • Service Launcher (Express)        - http://localhost:3500"
    echo "    • Firecrawl Proxy (Express)         - http://localhost:3600"
    echo "    • WebScraper API (Express)          - http://localhost:3700"
    echo "    • WebScraper UI (React + Vite)      - http://localhost:3800"
    echo ""
    echo -e "${BOLD}PRÉ-REQUISITOS:${NC}"
    echo "  • Docker & Docker Compose"
    echo "  • Node.js >= 18.x"
    echo "  • npm >= 9.x"
    echo ""
    echo -e "${BOLD}LOGS:${NC}"
    echo "  • Serviços Docker: docker logs -f <container_name>"
    echo "  • Serviços Node.js: /tmp/tradingsystem-logs/<service-name>.log"
    echo ""
}

log_info() {
    echo -e "${BLUE}ℹ${NC}  $*"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $*"
}

log_error() {
    echo -e "${RED}✗${NC}  $*"
}

section() {
    echo ""
    echo -e "${BOLD}${MAGENTA}━━━ $* ━━━${NC}"
    echo ""
}

check_prerequisites() {
    section "Verificando Pré-requisitos"

    local missing=()

    # Docker
    if command -v docker &> /dev/null; then
        log_success "Docker instalado: $(docker --version | head -n1)"
    else
        missing+=("docker")
        log_error "Docker não encontrado"
    fi

    # Docker Compose
    if docker compose version &> /dev/null 2>&1; then
        log_success "Docker Compose instalado: $(docker compose version | head -n1)"
    elif command -v docker-compose &> /dev/null; then
        log_success "Docker Compose instalado: $(docker-compose --version)"
    else
        missing+=("docker-compose")
        log_error "Docker Compose não encontrado"
    fi

    # Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        log_success "Node.js instalado: $node_version"
    else
        missing+=("node")
        log_error "Node.js não encontrado"
    fi

    # npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        log_success "npm instalado: v$npm_version"
    else
        missing+=("npm")
        log_error "npm não encontrado"
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo ""
        log_error "Pré-requisitos faltando: ${missing[*]}"
        log_info "Instale os componentes necessários e tente novamente"
        exit 1
    fi

    log_success "Todos os pré-requisitos atendidos!"
}

start_docker_stacks() {
    section "Iniciando Docker Stacks"

    local docker_script="$REPO_ROOT/scripts/docker/start-stacks.sh"

    if [ ! -f "$docker_script" ]; then
        log_error "Script não encontrado: $docker_script"
        return 1
    fi

    log_info "Executando: $docker_script"

    if [ "$MINIMAL_MODE" = true ]; then
        log_info "Modo mínimo: iniciando apenas stack essencial (docs)"
        bash "$docker_script" --phase docs
    else
        bash "$docker_script"
    fi

    log_success "Docker stacks iniciados!"
}

start_node_services() {
    section "Iniciando Serviços Node.js"

    local services_script="$REPO_ROOT/scripts/services/start-all.sh"

    if [ ! -f "$services_script" ]; then
        log_error "Script não encontrado: $services_script"
        return 1
    fi

    local args=()

    if [ "$SKIP_FRONTEND" = true ]; then
        args+=("--skip-frontend")
    fi

    if [ "$SKIP_BACKEND" = true ]; then
        args+=("--skip-backend")
    fi

    if [ "$SKIP_DOCS" = true ]; then
        args+=("--skip-docs")
    fi

    if [ "$FORCE_KILL" = true ]; then
        args+=("--force-kill-ports")
    fi

    log_info "Executando: $services_script ${args[*]}"

    bash "$services_script" "${args[@]}"

    log_success "Serviços Node.js iniciados!"
}

show_summary() {
    section "🎉 Startup Completo!"

    echo -e "${BOLD}${GREEN}TradingSystem está pronto para uso!${NC}"
    echo ""

    echo -e "${BOLD}${CYAN}🌐 Principais URLs de Acesso:${NC}"
    echo ""

    echo -e "${BOLD}Interface Principal:${NC}"
    echo -e "  ${GREEN}•${NC} Dashboard:              ${CYAN}http://localhost:3103${NC}"
    echo -e "  ${GREEN}•${NC} Documentação:           ${CYAN}http://localhost:3004${NC}"
    echo ""

    echo -e "${BOLD}APIs Backend:${NC}"
    echo -e "  ${GREEN}•${NC} Workspace API:          ${CYAN}http://localhost:3200${NC}"
    echo -e "  ${GREEN}•${NC} B3 Market Data:         ${CYAN}http://localhost:3302${NC}"
    echo -e "  ${GREEN}•${NC} Documentation API:      ${CYAN}http://localhost:3400${NC}"
    echo -e "  ${GREEN}•${NC} Service Launcher:       ${CYAN}http://localhost:3500${NC}"
    echo -e "  ${GREEN}•${NC} Firecrawl Proxy:        ${CYAN}http://localhost:3600${NC}"
    echo -e "  ${GREEN}•${NC} WebScraper API:         ${CYAN}http://localhost:3700${NC}"
    echo ""

    echo -e "${BOLD}Infraestrutura:${NC}"
    echo -e "  ${GREEN}•${NC} QuestDB UI:             ${CYAN}http://localhost:9009${NC}"
    echo -e "  ${GREEN}•${NC} pgAdmin (TimescaleDB):  ${CYAN}http://localhost:5050${NC}"
    echo -e "  ${GREEN}•${NC} Prometheus:             ${CYAN}http://localhost:9090${NC}"
    echo -e "  ${GREEN}•${NC} Grafana:                ${CYAN}http://localhost:3000${NC}"
    echo -e "  ${GREEN}•${NC} Qdrant:                 ${CYAN}http://localhost:6333${NC}"
    echo ""

    echo -e "${BOLD}${YELLOW}📝 Comandos Úteis:${NC}"
    echo -e "  ${GREEN}•${NC} Ver status:             ${YELLOW}bash scripts/services/status.sh${NC}"
    echo -e "  ${GREEN}•${NC} Parar serviços:         ${YELLOW}bash scripts/services/stop-all.sh${NC}"
    echo -e "  ${GREEN}•${NC} Parar Docker:           ${YELLOW}bash scripts/docker/stop-stacks.sh${NC}"
    echo -e "  ${GREEN}•${NC} Health check:           ${YELLOW}bash scripts/maintenance/health-check-all.sh${NC}"
    echo -e "  ${GREEN}•${NC} Ver logs:               ${YELLOW}tail -f /tmp/tradingsystem-logs/<service>.log${NC}"
    echo ""

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# ============================= MAIN ==========================================

main() {
    # Parse argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docker)
                START_DOCKER=true
                START_SERVICES=false
                shift
                ;;
            --services)
                START_DOCKER=false
                START_SERVICES=true
                shift
                ;;
            --minimal)
                MINIMAL_MODE=true
                SKIP_BACKEND=true
                shift
                ;;
            --force-kill)
                FORCE_KILL=true
                shift
                ;;
            --skip-frontend)
                SKIP_FRONTEND=true
                shift
                ;;
            --skip-backend)
                SKIP_BACKEND=true
                shift
                ;;
            --skip-docs)
                SKIP_DOCS=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Opção desconhecida: $1"
                echo ""
                show_help
                exit 1
                ;;
        esac
    done

    # Banner
    show_banner

    # Verificar pré-requisitos
    check_prerequisites

    # Executar startup
    local start_time=$(date +%s)

    if [ "$START_DOCKER" = true ]; then
        start_docker_stacks || {
            log_error "Falha ao iniciar Docker stacks"
            exit 1
        }
    fi

    if [ "$START_SERVICES" = true ]; then
        start_node_services || {
            log_error "Falha ao iniciar serviços Node.js"
            exit 1
        }
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Resumo
    show_summary

    log_success "Tempo total de startup: ${duration}s"
    echo ""
}

# Executar
main "$@"

