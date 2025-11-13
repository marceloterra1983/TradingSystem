#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Smart Startup Script
# ==============================================================================
# Purpose: Intelligent startup with port checking, cleanup, and auto-restart
# Features:
#   - Checks if ports are available
#   - Stops conflicting processes automatically (requires sudo for password)
#   - Removes orphan containers
#   - Starts services in correct order
#   - Validates health checks
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_DIR="${PROJECT_ROOT}/tools/compose"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }
log_step() { echo -e "${CYAN}[STEP $1/$2]${NC} $3"; }

wait_for_healthy() {
    local container_name=$1
    local max_wait=${2:-60}
    local waited=0

    while [ $waited -lt $max_wait ]; do
        if docker ps --filter "name=${container_name}" --filter "health=healthy" --format "{{.Names}}" 2>/dev/null | grep -q "${container_name}"; then
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
        printf "."
    done
    echo ""
    return 1
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

get_port_pids() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null || echo ""
}

kill_port_processes() {
    local port=$1
    local pids=$(get_port_pids $port)

    if [ -n "$pids" ]; then
        log_warning "Porta $port em uso pelos PIDs: $pids"

        # Show process details
        echo ""
        echo "Processos encontrados:"
        for pid in $pids; do
            local cmd=$(ps -p $pid -o user=,pid=,cmd= 2>/dev/null || echo "unknown")
            echo "  $cmd"
        done
        echo ""

        log_info "Solicitando privilégios para matar processos..."
        log_info "(Você precisará digitar sua senha)"
        echo ""

        # Kill processes with sudo
        for pid in $pids; do
            local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            log_info "  Matando PID $pid ($cmd)"
            sudo kill -9 $pid 2>/dev/null || true
        done

        sleep 2

        if check_port $port; then
            log_error "Porta $port ainda está em uso!"
            return 1
        else
            log_success "Porta $port liberada"
            return 0
        fi
    else
        log_success "Porta $port está livre"
        return 0
    fi
}

cleanup_orphan_containers() {
    log_info "Limpando containers órfãos..."

    # Remove containers órfãos do Gateway
    docker compose -f "${COMPOSE_DIR}/docker-compose.0-gateway-stack.yml" down --remove-orphans 2>/dev/null || true

    # Remove containers parados
    local stopped=$(docker ps -a --filter "status=exited" -q 2>/dev/null | wc -l)
    if [ "$stopped" -gt 0 ]; then
        log_info "Removendo $stopped containers parados..."
        docker container prune -f >/dev/null 2>&1 || true
    fi

    # Remove volumes órfãos
    local orphan_volumes=$(docker volume ls -qf dangling=true 2>/dev/null | wc -l)
    if [ "$orphan_volumes" -gt 0 ]; then
        log_info "Removendo $orphan_volumes volumes órfãos..."
        docker volume prune -f >/dev/null 2>&1 || true
    fi

    log_success "Limpeza concluída"
}

check_and_cleanup_ports() {
    local ports_to_check=(9080 9081 9443)
    local need_cleanup=false

    log_info "Verificando disponibilidade de portas..."

    for port in "${ports_to_check[@]}"; do
        if check_port $port; then
            need_cleanup=true
            break
        fi
    done

    if [ "$need_cleanup" = true ]; then
        echo ""
        log_warning "Portas em uso detectadas!"
        echo ""

        for port in "${ports_to_check[@]}"; do
            if check_port $port; then
                if ! kill_port_processes $port; then
                    log_error "Não foi possível liberar porta $port"
                    log_error "Execute manualmente: sudo lsof -ti:$port | xargs sudo kill -9"
                    return 1
                fi
            fi
        done

        echo ""
    else
        log_success "Todas as portas estão livres"
    fi

    return 0
}

cd "${PROJECT_ROOT}"

echo ""
echo "======================================================================"
echo "  🚀 TradingSystem - Smart Startup"
echo "======================================================================"
echo ""

# Step 0: Cleanup
log_step 0 5 "Verificação e Limpeza Inicial..."
echo ""

cleanup_orphan_containers
echo ""

if ! check_and_cleanup_ports; then
    log_error "Não foi possível liberar as portas necessárias"
    exit 1
fi

echo ""

TOTAL_STEPS=5

# Step 1: Gateway
log_step 1 $TOTAL_STEPS "Iniciando API Gateway (Traefik)..."
docker compose -f "${COMPOSE_DIR}/docker-compose.0-gateway-stack.yml" up -d
if wait_for_healthy "api-gateway" 30; then
    log_success "Gateway está saudável (http://localhost:9080)"
else
    log_error "Gateway falhou ao iniciar"
    docker logs api-gateway --tail 20
    exit 1
fi
echo ""

# Step 2: Dashboard
log_step 2 $TOTAL_STEPS "Iniciando Dashboard UI..."
docker compose -f "${COMPOSE_DIR}/docker-compose.1-dashboard-stack.yml" up -d
if wait_for_healthy "dashboard-ui" 60; then
    log_success "Dashboard está saudável (http://localhost:9080/)"
else
    log_warning "Dashboard pode precisar de mais tempo"
fi
echo ""

# Step 3: Documentation
log_step 3 $TOTAL_STEPS "Iniciando Documentation Stack..."
docker compose -f "${COMPOSE_DIR}/docker-compose.2-docs-stack.yml" up -d
if wait_for_healthy "docs-hub" 60 && wait_for_healthy "documentation-api" 30; then
    log_success "Documentação está saudável (http://localhost:9080/docs/)"
else
    log_warning "Documentação pode precisar de mais tempo"
fi
echo ""

# Step 4: Workspace
log_step 4 $TOTAL_STEPS "Iniciando Workspace API..."
docker compose -f "${COMPOSE_DIR}/docker-compose.4-3-workspace-stack.yml" up -d
if wait_for_healthy "workspace-api" 30; then
    log_success "Workspace está saudável (http://localhost:9080/api/workspace/)"
else
    log_warning "Workspace pode precisar de mais tempo"
fi
echo ""

# Step 5: n8n (Optional)
log_step 5 $TOTAL_STEPS "Iniciando n8n Automation Stack..."
if [ -f "${COMPOSE_DIR}/docker-compose-5-1-n8n-stack.yml" ]; then
    docker compose -f "${COMPOSE_DIR}/docker-compose-5-1-n8n-stack.yml" up -d
    sleep 5
    if wait_for_healthy "n8n-postgres" 30 && wait_for_healthy "n8n-redis" 30; then
        if wait_for_healthy "n8n-app" 60 && wait_for_healthy "n8n-proxy" 30; then
            log_success "n8n está saudável (http://localhost:9080/n8n/)"
        else
            log_warning "n8n pode precisar de mais tempo"
        fi
    else
        log_warning "n8n dependencies podem precisar de mais tempo"
    fi
else
    log_warning "n8n stack não encontrado, pulando"
fi
echo ""

# Summary
echo ""
echo "======================================================================"
echo "  ✨ System Startup Complete!"
echo "======================================================================"
echo ""
echo "📍 Access URLs:"
echo "   • Main Dashboard:    http://localhost:9080/"
echo "   • Gateway Dashboard: http://localhost:9081/"
echo "   • Documentation:     http://localhost:9080/docs/"
echo "   • Workspace API:     http://localhost:9080/api/workspace/"
echo "   • n8n Automation:    http://localhost:9080/n8n/"
echo ""
echo "🔍 Check Status:"
echo "   docker ps --filter 'label=com.tradingsystem.tier'"
echo ""
echo "📋 View Logs:"
echo "   docker logs -f <container-name>"
echo ""
echo "======================================================================"
echo ""
