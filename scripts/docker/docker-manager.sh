#!/bin/bash

# TradingSystem Docker Manager
# ============================
# Script para gerenciar os containers Docker do TradingSystem
# organizados por grupos (database, documentation, firecrawl, etc.)
#
# Uso: ./docker-manager.sh [comando] [grupo]
# Comandos: start, stop, restart, status, logs, clean
# Grupos: all, database, documentation, firecrawl, infrastructure, monitoring, individual
#
# Exemplos:
#   ./docker-manager.sh start all
#   ./docker-manager.sh stop database
#   ./docker-manager.sh status monitoring
#   ./docker-manager.sh logs firecrawl
#   ./docker-manager.sh clean all
#
# Last Updated: 2025-10-23
# ============================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório base
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_DIR="$PROJECT_ROOT/infrastructure/compose"
CONFIG_DIR="$PROJECT_ROOT/config"

# Função para exibir ajuda
show_help() {
    echo -e "${BLUE}TradingSystem Docker Manager${NC}"
    echo "================================"
    echo ""
    echo "Uso: $0 [comando] [grupo]"
    echo ""
    echo "Comandos:"
    echo "  start     - Inicia os containers do grupo"
    echo "  stop      - Para os containers do grupo"
    echo "  restart   - Reinicia os containers do grupo"
    echo "  status    - Mostra o status dos containers do grupo"
    echo "  logs      - Mostra os logs dos containers do grupo"
    echo "  clean     - Remove containers parados e volumes não utilizados"
    echo "  help      - Mostra esta ajuda"
    echo ""
    echo "Grupos:"
    echo "  all           - Todos os grupos"
    echo "  database      - Banco de dados (TimescaleDB, PostgreSQL, etc.)"
    echo "  documentation - Documentação (DocsAPI, DocsViewer)"
    echo "  firecrawl     - Firecrawl (API, PostgreSQL, Redis, Playwright)"
    echo "  infrastructure- Infraestrutura (LangGraph, LlamaIndex, Agno)"
    echo "  monitoring    - Monitoramento (Prometheus, Grafana, AlertManager)"
    echo "  individual    - Serviços individuais (Ollama, Registry)"
    echo ""
    echo "Exemplos:"
    echo "  $0 start all"
    echo "  $0 stop database"
    echo "  $0 status monitoring"
    echo "  $0 logs firecrawl"
    echo "  $0 clean all"
}

# Função para executar comando em um grupo
run_group_command() {
    local command=$1
    local group=$2
    local compose_file=""
    
    case $group in
        "database")
            compose_file="docker-compose.database.yml"
            ;;
        "documentation")
            compose_file="docker-compose.documentation.yml"
            ;;
        "firecrawl")
            compose_file="docker-compose.firecrawl.yml"
            ;;
        "infrastructure")
            compose_file="docker-compose.infrastructure.yml"
            ;;
        "monitoring")
            compose_file="docker-compose.monitoring.yml"
            ;;
        "individual")
            compose_file="docker-compose.individual.yml"
            ;;
        *)
            echo -e "${RED}Erro: Grupo '$group' não reconhecido${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${BLUE}Executando '$command' no grupo '$group'...${NC}"
    cd "$COMPOSE_DIR"
    
    case $command in
        "start")
            docker compose -f "$compose_file" up -d
            ;;
        "stop")
            docker compose -f "$compose_file" down
            ;;
        "restart")
            docker compose -f "$compose_file" restart
            ;;
        "status")
            docker compose -f "$compose_file" ps
            ;;
        "logs")
            docker compose -f "$compose_file" logs -f
            ;;
        "clean")
            docker compose -f "$compose_file" down -v --remove-orphans
            ;;
        *)
            echo -e "${RED}Erro: Comando '$command' não reconhecido${NC}"
            exit 1
            ;;
    esac
}

# Função para executar comando em todos os grupos
run_all_groups() {
    local command=$1
    local groups=("database" "documentation" "firecrawl" "infrastructure" "monitoring" "individual")
    
    for group in "${groups[@]}"; do
        echo -e "${YELLOW}=== Grupo: $group ===${NC}"
        run_group_command "$command" "$group"
        echo ""
    done
}

# Função para mostrar status de todos os containers
show_all_status() {
    echo -e "${BLUE}Status de todos os containers do TradingSystem:${NC}"
    echo "=============================================="
    docker ps --filter "name=data-*" --filter "name=docs-*" --filter "name=firecrawl-*" --filter "name=infra-*" --filter "name=mon-*" --filter "name=ollama" --filter "name=individual-*" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
}

# Função para limpeza geral
clean_all() {
    echo -e "${YELLOW}Limpando containers parados e volumes não utilizados...${NC}"
    docker system prune -f
    docker volume prune -f
    echo -e "${GREEN}Limpeza concluída!${NC}"
}

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Erro: Docker não está rodando ou não está acessível${NC}"
    exit 1
fi

# Verificar argumentos
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

command=$1
group=${2:-"all"}

# Verificar comando
case $command in
    "start"|"stop"|"restart"|"status"|"logs"|"clean")
        ;;
    "help"|"-h"|"--help")
        show_help
        exit 0
        ;;
    *)
        echo -e "${RED}Erro: Comando '$command' não reconhecido${NC}"
        show_help
        exit 1
        ;;
esac

# Executar comando
if [ "$group" = "all" ]; then
    if [ "$command" = "status" ]; then
        show_all_status
    elif [ "$command" = "clean" ]; then
        clean_all
    else
        run_all_groups "$command"
    fi
else
    run_group_command "$command" "$group"
fi

echo -e "${GREEN}Operação concluída!${NC}"



