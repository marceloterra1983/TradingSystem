#!/usr/bin/env bash
# ============================================================================
# Dashboard Docker Management Script
# ============================================================================
# Script para gerenciar o dashboard via Docker Compose
# Uso: bash scripts/dashboard/dashboard-docker.sh [down|build|up|restart]
# ============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

COMPOSE_FILE="tools/compose/docker-compose.dashboard.yml"
PROJECT_NAME="1-dashboard-stack"
SERVICE_NAME="dashboard"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Dashboard Docker Management${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    print_error "Docker não está instalado ou não está no PATH"
    exit 1
fi

# Detect docker compose command
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif docker-compose version &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    print_error "docker compose ou docker-compose não encontrado"
    exit 1
fi

# Parse command
COMMAND="${1:-help}"

case "$COMMAND" in
    down)
        print_header
        print_info "Parando e removendo container do dashboard..."
        
        # Stop and remove container
        $COMPOSE_CMD -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down --remove-orphans || true
        
        # Also kill any process on port 3103 (dev mode)
        if lsof -ti:3103 > /dev/null 2>&1; then
            print_warning "Processo encontrado na porta 3103 (dev mode), encerrando..."
            lsof -ti:3103 | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
        
        print_success "Dashboard parado e removido"
        echo ""
        ;;
    
    build)
        print_header
        print_info "Construindo imagem do dashboard..."
        
        # Build image
        $COMPOSE_CMD -p "$PROJECT_NAME" -f "$COMPOSE_FILE" build --no-cache "$SERVICE_NAME"
        
        print_success "Imagem do dashboard construída"
        echo ""
        ;;
    
    up)
        print_header
        print_info "Iniciando dashboard..."
        
        # Check if port is in use
        if lsof -ti:3103 > /dev/null 2>&1; then
            print_warning "Porta 3103 já está em uso"
            print_info "Use 'down' primeiro para parar processos existentes"
            exit 1
        fi
        
        # Start container
        $COMPOSE_CMD -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"
        
        # Wait for health check
        print_info "Aguardando dashboard inicializar (15 segundos)..."
        sleep 15
        
        # Check if running
        if curl -s http://localhost:3103 > /dev/null 2>&1; then
            print_success "Dashboard está respondendo!"
        else
            print_warning "Dashboard pode ainda estar inicializando"
            print_info "Verifique os logs: docker logs dashboard-ui"
        fi
        
        echo ""
        print_info "Dashboard disponível em: http://localhost:3103"
        print_info "Ver logs: docker logs -f dashboard-ui"
        echo ""
        ;;
    
    restart)
        print_header
        print_info "Reiniciando dashboard (down + build + up)..."
        echo ""
        
        # Down
        print_info "[1/3] Parando dashboard..."
        $COMPOSE_CMD -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down --remove-orphans || true
        if lsof -ti:3103 > /dev/null 2>&1; then
            lsof -ti:3103 | xargs kill -9 2>/dev/null || true
        fi
        sleep 2
        print_success "Dashboard parado"
        echo ""
        
        # Build
        print_info "[2/3] Construindo imagem..."
        $COMPOSE_CMD -p "$PROJECT_NAME" -f "$COMPOSE_FILE" build --no-cache "$SERVICE_NAME"
        print_success "Imagem construída"
        echo ""
        
        # Up
        print_info "[3/3] Iniciando dashboard..."
        $COMPOSE_CMD -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"
        sleep 15
        
        if curl -s http://localhost:3103 > /dev/null 2>&1; then
            print_success "Dashboard reiniciado e respondendo!"
        else
            print_warning "Dashboard pode ainda estar inicializando"
        fi
        
        echo ""
        print_info "Dashboard disponível em: http://localhost:3103"
        echo ""
        ;;
    
    status)
        print_header
        print_info "Status do dashboard:"
        echo ""
        
        # Check container
        if docker ps --format '{{.Names}}' | grep -q "^${SERVICE_NAME}-ui$"; then
            print_success "Container rodando"
            docker ps --filter "name=${SERVICE_NAME}-ui" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        else
            print_warning "Container não está rodando"
        fi
        
        echo ""
        
        # Check port
        if lsof -ti:3103 > /dev/null 2>&1; then
            print_info "Porta 3103 está em uso"
            lsof -ti:3103 | xargs ps -p 2>/dev/null | head -2 || true
        else
            print_info "Porta 3103 está livre"
        fi
        
        echo ""
        
        # Check HTTP response
        if curl -s http://localhost:3103 > /dev/null 2>&1; then
            print_success "Dashboard respondendo em http://localhost:3103"
        else
            print_warning "Dashboard não está respondendo"
        fi
        
        echo ""
        ;;
    
    logs)
        print_info "Logs do dashboard (Ctrl+C para sair):"
        echo ""
        docker logs -f "${SERVICE_NAME}-ui" 2>/dev/null || print_error "Container não encontrado"
        ;;
    
    help|--help|-h)
        print_header
        echo "Uso: bash scripts/dashboard/dashboard-docker.sh [comando]"
        echo ""
        echo "Comandos disponíveis:"
        echo ""
        echo "  ${GREEN}down${NC}      - Para e remove o container do dashboard"
        echo "  ${GREEN}build${NC}     - Constrói a imagem do dashboard"
        echo "  ${GREEN}up${NC}        - Inicia o dashboard em modo detached"
        echo "  ${GREEN}restart${NC}   - Executa down + build + up (reinício completo)"
        echo "  ${GREEN}status${NC}    - Mostra o status atual do dashboard"
        echo "  ${GREEN}logs${NC}      - Mostra os logs do dashboard (follow mode)"
        echo "  ${GREEN}help${NC}      - Mostra esta mensagem de ajuda"
        echo ""
        echo "Exemplos:"
        echo ""
        echo "  # Parar dashboard"
        echo "  bash scripts/dashboard/dashboard-docker.sh down"
        echo ""
        echo "  # Construir imagem"
        echo "  bash scripts/dashboard/dashboard-docker.sh build"
        echo ""
        echo "  # Iniciar dashboard"
        echo "  bash scripts/dashboard/dashboard-docker.sh up"
        echo ""
        echo "  # Reiniciar completo (down + build + up)"
        echo "  bash scripts/dashboard/dashboard-docker.sh restart"
        echo ""
        echo "  # Ver status"
        echo "  bash scripts/dashboard/dashboard-docker.sh status"
        echo ""
        echo "  # Ver logs"
        echo "  bash scripts/dashboard/dashboard-docker.sh logs"
        echo ""
        ;;
    
    *)
        print_error "Comando desconhecido: $COMMAND"
        echo ""
        echo "Use 'help' para ver comandos disponíveis:"
        echo "  bash scripts/dashboard/dashboard-docker.sh help"
        exit 1
        ;;
esac

