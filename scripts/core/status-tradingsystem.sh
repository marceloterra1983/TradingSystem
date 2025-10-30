#!/usr/bin/env bash
# ==============================================================================
# TradingSystem - Universal Status Check
# ==============================================================================
# Shows comprehensive status of ALL system components:
#   - Docker containers (all stacks)
#   - Node.js services (all APIs and frontends)
#   - Health checks
#   - Resource usage
#
# Usage:
#   status-tradingsystem                # Full status
#   status-tradingsystem --quick        # Quick overview
#   status-tradingsystem --services     # Only services
#   status-tradingsystem --docker       # Only containers
#   status-tradingsystem --json         # JSON output
#   status-tradingsystem --watch        # Continuous monitoring
#
# Author: TradingSystem Team
# Last Modified: 2025-10-20
# ==============================================================================

set -euo pipefail

# ============================= CONFIGURAÇÃO ==================================

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly NC='\033[0m'

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
CHECK_SERVICES=true
CHECK_DOCKER=true
JSON_OUTPUT=false
WATCH_MODE=false
QUICK_MODE=false

# ============================= FUNÇÕES =======================================

show_banner() {
    if [ "$JSON_OUTPUT" = false ] && [ "$QUICK_MODE" = false ]; then
        echo ""
        echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║  📊 ${BOLD}TradingSystem${NC}${CYAN} - System Status                        ${CYAN}║${NC}"
        echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
    fi
}

show_help() {
    cat << EOF
${BOLD}TradingSystem - Universal Status Check${NC}

${BOLD}USAGE:${NC}
    $(basename "$0") [OPTIONS]

${BOLD}OPTIONS:${NC}
    --quick         Quick overview (summary only)
    --services      Check only Node.js services
    --docker        Check only Docker containers
    --json          Output in JSON format
    --watch         Continuous monitoring (refresh every 5s)
    --help          Show this help

${BOLD}EXAMPLES:${NC}
    $(basename "$0")                    # Full status check
    $(basename "$0") --quick            # Quick summary
    $(basename "$0") --services         # Only services
    $(basename "$0") --docker           # Only containers
    $(basename "$0") --watch            # Live monitoring
    $(basename "$0") --json | jq        # JSON output

${BOLD}EXIT CODES:${NC}
    0    All systems operational
    1    Some issues detected
    2    Critical failures

EOF
}

# Check if service is running (via PID file or port)
check_service() {
    local name="$1"
    local port="$2"
    local pid_file="/tmp/tradingsystem-pids/${name}.pid"
    
    # Check PID file
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            # Process exists, check port
            if lsof -i ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo "running|$pid|$port"
                return 0
            else
                echo "zombie|$pid|$port"
                return 1
            fi
        else
            echo "stopped|-|$port"
            return 1
        fi
    fi
    
    # Check port directly
    if lsof -i ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -i ":$port" -sTCP:LISTEN -t | head -1)
        echo "running|$pid|$port"
        return 0
    fi
    
    echo "stopped|-|$port"
    return 1
}

# Check Docker container status
check_container() {
    local name="$1"
    
    if docker ps --filter "name=^${name}$" --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "none")
        local status=$(docker ps --filter "name=^${name}$" --format "{{.Status}}")
        echo "running|$health|$status"
        return 0
    elif docker ps -a --filter "name=^${name}$" --format "{{.Status}}" 2>/dev/null | grep -q "."; then
        local status=$(docker ps -a --filter "name=^${name}$" --format "{{.Status}}")
        echo "stopped|-|$status"
        return 1
    else
        echo "missing|-|-"
        return 1
    fi
}

# Format status indicator
status_indicator() {
    local status="$1"
    case "$status" in
        running) echo -e "${GREEN}●${NC} Running" ;;
        stopped) echo -e "${RED}●${NC} Stopped" ;;
        zombie)  echo -e "${YELLOW}●${NC} Zombie " ;;
        missing) echo -e "${RED}●${NC} Missing" ;;
        healthy) echo -e "${GREEN}✓${NC} Healthy" ;;
        unhealthy) echo -e "${RED}✗${NC} Unhealthy" ;;
        starting) echo -e "${YELLOW}⟳${NC} Starting" ;;
        *)       echo -e "${DIM}○${NC} Unknown" ;;
    esac
}

# Check Node.js services
check_services() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}━━━ Node.js Services ━━━${NC}"
        echo ""
    fi
    
    local services=(
        "workspace-api:3200"
        "documentation-api:3401"
        "service-launcher:3500"
        "firecrawl-proxy:3600"
        "frontend-dashboard:3103"
        "docusaurus:3400"
    )
    
    local running=0
    local total=${#services[@]}
    
    if [ "$JSON_OUTPUT" = false ]; then
        printf "%-25s %-15s %-10s %-10s\n" "Service" "Status" "PID" "Port"
        printf "%-25s %-15s %-10s %-10s\n" "-------" "------" "---" "----"
    fi
    
    for service_def in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service_def"
        IFS='|' read -r status pid actual_port <<< "$(check_service "$name" "$port")"
        
        if [ "$status" = "running" ]; then
            ((running++))
        fi
        
        if [ "$JSON_OUTPUT" = false ]; then
            printf "%-25s %-15b %-10s %-10s\n" \
                "$name" \
                "$(status_indicator "$status")" \
                "$pid" \
                "$actual_port"
        fi
    done
    
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        if [ $running -eq $total ]; then
            echo -e "${GREEN}✓${NC} All services running ($running/$total)"
        else
            echo -e "${YELLOW}!${NC} Some services down ($running/$total running)"
        fi
        echo ""
    fi
    
    return $((total - running))
}

# Check Docker containers
check_docker() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}━━━ Docker Containers ━━━${NC}"
        echo ""
    fi
    
    local containers=(
        "data-frontend-apps"
        "data-timescaledb"
        "data-questdb"
        "data-qdrant"
        "data-postgress-langgraph"
        "docs-api"
        "mon-prometheus"
        "mon-grafana"
        "firecrawl-api"
        "infra-langgraph"
        "infra-langgraph-dev"
    )
    
    local running=0
    local total=${#containers[@]}
    
    if [ "$JSON_OUTPUT" = false ]; then
        printf "%-30s %-15s %-15s\n" "Container" "Status" "Health"
        printf "%-30s %-15s %-15s\n" "---------" "------" "------"
    fi
    
    for container in "${containers[@]}"; do
        IFS='|' read -r status health info <<< "$(check_container "$container")"
        
        if [ "$status" = "running" ]; then
            ((running++))
        fi
        
        if [ "$JSON_OUTPUT" = false ]; then
            local health_display="${DIM}N/A${NC}"
            if [ "$health" != "-" ] && [ "$health" != "none" ]; then
                health_display="$(status_indicator "$health")"
            fi
            
            printf "%-30s %-15b %-15b\n" \
                "$container" \
                "$(status_indicator "$status")" \
                "$health_display"
        fi
    done
    
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        if [ $running -eq $total ]; then
            echo -e "${GREEN}✓${NC} All containers running ($running/$total)"
        else
            echo -e "${YELLOW}!${NC} Some containers down ($running/$total running)"
        fi
        echo ""
    fi
    
    return $((total - running))
}

# Show system resources
show_resources() {
    if [ "$QUICK_MODE" = true ]; then
        return
    fi
    
    echo -e "${BLUE}━━━ System Resources ━━━${NC}"
    echo ""
    
    # CPU
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    echo -e "CPU Usage:     ${CYAN}${cpu_usage}%${NC}"
    
    # Memory
    local mem_info=$(free -h | awk '/^Mem:/ {print $3 "/" $2 " (" int($3/$2 * 100) "%)"}')
    echo -e "Memory:        ${CYAN}${mem_info}${NC}"
    
    # Disk
    local disk_info=$(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')
    echo -e "Disk (root):   ${CYAN}${disk_info}${NC}"
    
    # Docker
    if command -v docker >/dev/null 2>&1; then
        local docker_count=$(docker ps -q | wc -l)
        local docker_total=$(docker ps -aq | wc -l)
        echo -e "Docker:        ${CYAN}${docker_count}/${docker_total} containers running${NC}"
    fi
    
    echo ""
}

# Show quick summary
show_summary() {
    echo -e "${BLUE}━━━ Quick Summary ━━━${NC}"
    echo ""
    
    local services_up=$(ps aux | grep -E "(node|npm)" | grep -v grep | wc -l)
    local containers_up=$(docker ps -q 2>/dev/null | wc -l || echo 0)
    
    echo -e "Services:      ${CYAN}$services_up${NC} processes"
    echo -e "Containers:    ${CYAN}$containers_up${NC} running"
    echo ""
    
    # Key URLs
    echo -e "${BOLD}Key URLs:${NC}"
    echo -e "  Dashboard:       ${CYAN}http://localhost:3103${NC}"
    echo -e "  Documentation:   ${CYAN}http://localhost:3400${NC}"
    echo -e "  Prometheus:      ${CYAN}http://localhost:9090${NC}"
    echo -e "  Grafana:         ${CYAN}http://localhost:3000${NC}"
    echo ""
}

# Main status check
main() {
    cd "$REPO_ROOT"
    
    if [ "$WATCH_MODE" = true ]; then
        while true; do
            clear
            show_banner
            
            local issues=0
            
            if [ "$CHECK_SERVICES" = true ]; then
                check_services || issues=$((issues + $?))
            fi
            
            if [ "$CHECK_DOCKER" = true ]; then
                check_docker || issues=$((issues + $?))
            fi
            
            show_resources
            show_summary
            
            echo -e "${DIM}Refreshing in 5 seconds... (Ctrl+C to exit)${NC}"
            sleep 5
        done
    else
        show_banner
        
        local issues=0
        
        if [ "$QUICK_MODE" = true ]; then
            show_summary
            show_resources
        else
            if [ "$CHECK_SERVICES" = true ]; then
                check_services || issues=$((issues + $?))
            fi
            
            if [ "$CHECK_DOCKER" = true ]; then
                check_docker || issues=$((issues + $?))
            fi
            
            show_resources
        fi
        
        # Final status
        if [ "$JSON_OUTPUT" = false ]; then
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            if [ $issues -eq 0 ]; then
                echo -e "${GREEN}✓ All systems operational${NC}"
            elif [ $issues -le 3 ]; then
                echo -e "${YELLOW}! Minor issues detected ($issues)${NC}"
            else
                echo -e "${RED}✗ Multiple issues detected ($issues)${NC}"
            fi
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
        fi
        
        # Exit code
        if [ $issues -eq 0 ]; then
            exit 0
        elif [ $issues -le 3 ]; then
            exit 1
        else
            exit 2
        fi
    fi
}

# ============================= PARSE ARGS ====================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK_MODE=true
            shift
            ;;
        --services)
            CHECK_DOCKER=false
            shift
            ;;
        --docker)
            CHECK_SERVICES=false
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Erro:${NC} Opção desconhecida: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# ============================= EXECUTE =======================================

main
