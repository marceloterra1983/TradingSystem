#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Complete System Startup Script
# ==============================================================================
# Purpose: Intelligent startup of ALL project stacks with dependency management
# Features:
#   - Port checking and automatic cleanup (with sudo)
#   - Orphan container/volume removal
#   - Dependency-aware stack ordering
#   - Health check validation for each stack
#   - Comprehensive error handling
#   - Final system status report
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
        if docker ps --filter "name=${container_name}" --filter "health=healthy" --format "{{.Names}}" 2>/dev/null | grep -q "^${container_name}$"; then
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
    log_info "Limpando containers órfãos e recursos não utilizados..."

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
    local ports_to_check=(9080 9081)
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

start_stack() {
    local stack_file=$1
    local stack_name=$2
    local main_containers=$3
    local wait_time=${4:-60}

    if [ ! -f "$stack_file" ]; then
        log_warning "Stack $stack_name não encontrado, pulando"
        return 0
    fi

    log_info "Iniciando $stack_name..."
    docker compose -f "$stack_file" up -d --force-recreate

    if [ -n "$main_containers" ]; then
        sleep 5
        local all_healthy=true
        IFS=',' read -ra CONTAINERS <<< "$main_containers"
        for container in "${CONTAINERS[@]}"; do
            if ! wait_for_healthy "$container" "$wait_time"; then
                log_warning "$container pode precisar de mais tempo"
                all_healthy=false
            fi
        done
        if [ "$all_healthy" = true ]; then
            log_success "$stack_name está saudável"
        fi
    else
        sleep 5
        log_success "$stack_name iniciado"
    fi
}

cd "${PROJECT_ROOT}"

echo ""
echo "======================================================================"
echo "  🚀 TradingSystem - Complete System Startup"
echo "======================================================================"
echo ""

TOTAL_STEPS=12

# Step 0: Cleanup
log_step 0 $TOTAL_STEPS "Verificação e Limpeza Inicial..."
echo ""
cleanup_orphan_containers
echo ""
if ! check_and_cleanup_ports; then
    log_error "Não foi possível liberar as portas necessárias"
    exit 1
fi
echo ""

# Step 1: Gateway (Traefik) - MUST BE FIRST
log_step 1 $TOTAL_STEPS "Iniciando API Gateway (Traefik)..."
start_stack "${COMPOSE_DIR}/docker-compose.0-gateway-stack.yml" "Gateway Stack" "api-gateway" 30
echo ""

# Step 2: Dashboard UI
log_step 2 $TOTAL_STEPS "Iniciando Dashboard UI..."
start_stack "${COMPOSE_DIR}/docker-compose.1-dashboard-stack.yml" "Dashboard Stack" "dashboard-ui" 60
echo ""

# Step 3: Documentation Hub
log_step 3 $TOTAL_STEPS "Iniciando Documentation Stack..."
start_stack "${COMPOSE_DIR}/docker-compose.2-docs-stack.yml" "Documentation Stack" "docs-hub,documentation-api" 60
echo ""

# Step 4: Database Stack (Infrastructure)
log_step 4 $TOTAL_STEPS "Iniciando Database Stack..."
start_stack "${COMPOSE_DIR}/docker-compose.5-0-database-stack.yml" "Database Stack" "" 30
echo ""

# Step 5: Workspace API
log_step 5 $TOTAL_STEPS "Iniciando Workspace Stack..."
start_stack "${COMPOSE_DIR}/docker-compose.4-3-workspace-stack.yml" "Workspace Stack" "workspace-db,workspace-redis,workspace-api" 60
echo ""

# Step 6: TP Capital Stack
log_step 6 $TOTAL_STEPS "Iniciando TP Capital Stack..."
start_stack "${COMPOSE_DIR}/docker-compose.4-1-tp-capital-stack.yml" "TP Capital Stack" "" 30
echo ""

# Step 7: n8n Automation Stack
log_step 7 $TOTAL_STEPS "Iniciando n8n Automation Stack..."
start_stack "${COMPOSE_DIR}/docker-compose-5-1-n8n-stack.yml" "n8n Stack" "n8n-postgres,n8n-redis,n8n-app,n8n-proxy" 90
echo ""

# Step 8: RAG Stack (LlamaIndex + Qdrant)
log_step 8 $TOTAL_STEPS "Iniciando RAG Stack..."
start_stack "${COMPOSE_DIR}/docker-compose.4-4-rag-stack.yml" "RAG Stack" "" 30
echo ""

# Step 9: Telegram Stack
log_step 9 $TOTAL_STEPS "Iniciando Telegram Stack..."
start_stack "${COMPOSE_DIR}/docker-compose.4-2-telegram-stack.yml" "Telegram Stack" "" 30
echo ""

# Step 10: Monitoring Stack
log_step 10 $TOTAL_STEPS "Iniciando Monitoring Stack..."
start_stack "${COMPOSE_DIR}/docker-compose.6-1-monitoring-stack.yml" "Monitoring Stack" "" 30
echo ""

# Step 11: Firecrawl Stack
log_step 11 $TOTAL_STEPS "Iniciando Firecrawl Stack..."
start_stack "${COMPOSE_DIR}/docker-compose.5-7-firecrawl-stack.yml" "Firecrawl Stack" "" 30
echo ""

# Step 12: Course Crawler Stack
log_step 12 $TOTAL_STEPS "Iniciando Course Crawler Stack..."
start_stack "${COMPOSE_DIR}/docker-compose.4-5-course-crawler-stack.yml" "Course Crawler Stack" "" 30
echo ""

# Final Status Report
echo ""
echo "======================================================================"
echo "  ✨ System Startup Complete!"
echo "======================================================================"
echo ""

# Count containers
total=$(docker ps --filter 'label=com.tradingsystem' --format "{{.Names}}" 2>/dev/null | wc -l)
healthy=$(docker ps --filter 'label=com.tradingsystem' --filter 'health=healthy' --format "{{.Names}}" 2>/dev/null | wc -l)
unhealthy=$(docker ps --filter 'label=com.tradingsystem' --filter 'health=unhealthy' --format "{{.Names}}" 2>/dev/null | wc -l)
starting=$(docker ps --filter 'label=com.tradingsystem' | grep "starting" | wc -l)

echo "📊 Container Status:"
echo "   • Total:     $total containers"
echo "   • Healthy:   $healthy containers"
if [ $starting -gt 0 ]; then
    echo "   • Starting:  $starting containers"
fi
if [ $unhealthy -gt 0 ]; then
    echo "   • Unhealthy: $unhealthy containers"
fi
echo ""

echo "📍 Access URLs:"
echo "   • Main Dashboard:    http://localhost:9080/"
echo "   • Gateway Dashboard: http://localhost:9081/"
echo "   • Documentation:     http://localhost:9080/docs/"
echo "   • Workspace API:     http://localhost:9080/api/workspace/"
echo "   • TP Capital API:    http://localhost:9080/api/tp-capital/"
echo "   • n8n Automation:    http://localhost:9080/n8n/"
echo ""

echo "🔍 Quick Commands:"
echo "   • Check Status:  docker ps --filter 'label=com.tradingsystem'"
echo "   • View Logs:     docker logs -f <container-name>"
echo "   • Stop All:      bash scripts/docker/stop-all-stacks.sh"
echo ""

if [ $unhealthy -gt 0 ]; then
    log_warning "Alguns containers estão unhealthy. Listando:"
    docker ps --filter 'label=com.tradingsystem' --filter 'health=unhealthy' --format "   • {{.Names}} - {{.Status}}"
    echo ""
fi

echo "======================================================================"
echo ""
