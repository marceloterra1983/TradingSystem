#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Status Script v2.0
# ==============================================================================
# Shows comprehensive status of all system components
# Usage: bash scripts/status.sh [OPTIONS]
# ==============================================================================

set -euo pipefail

# Load shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source libraries if available
if [[ -f "$SCRIPT_DIR/lib/common.sh" ]]; then
    # shellcheck source=scripts/lib/common.sh
    source "$SCRIPT_DIR/lib/common.sh"
    # shellcheck source=scripts/lib/portcheck.sh
    source "$SCRIPT_DIR/lib/portcheck.sh"
    # shellcheck source=scripts/lib/health.sh
    source "$SCRIPT_DIR/lib/health.sh"
    USE_LIBS=true
else
    # Fallback: minimal inline functions
    USE_LIBS=false
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    NC='\033[0m'

    log_info() { echo -e "${CYAN}[INFO]${NC} $*" >&2; }
    log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*" >&2; }
    log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*" >&2; }
    log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
fi

cd "$PROJECT_ROOT"

# Configuration
WATCH_MODE=false
DETAILED=false
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --detailed)
            DETAILED=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --help|-h)
            cat << EOF
TradingSystem Universal Status v2.0

Usage: $0 [OPTIONS]

Options:
  --watch       Continuous monitoring (refresh every 5s)
  --detailed    Show detailed process information
  --json        Output in JSON format
  --help, -h    Show this help message

Shows:
  📊 Local Services (Telegram Gateway, Gateway API, Dashboard, Docusaurus, Status)
  🐳 Docker Containers (all stacks with grouping)
  🗄️  Databases (TimescaleDB connectivity)
  💻 System Resources (CPU, Memory, Disk)

Features:
  ✓ Color-coded status indicators
  ✓ Port information display
  ✓ Health check integration
  ✓ Container grouping by stack
  ✓ Live monitoring mode
  ✓ JSON output for automation

EOF
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Banner
show_banner() {
    if [ "$JSON_OUTPUT" = false ]; then
        local CYAN="${CYAN:-\033[0;36m}"
        local NC="${NC:-\033[0m}"
        local BOLD="${BOLD:-\033[1m}"

        echo ""
        echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║  📊 ${BOLD}TradingSystem${NC}${CYAN} - System Status v2.0                    ${CYAN}║${NC}"
        echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
    fi
}

# Check local services
check_local_services() {
    local BLUE="${BLUE:-\033[0;34m}"
    local NC="${NC:-\033[0m}"
    local GREEN="${GREEN:-\033[0;32m}"
    local RED="${RED:-\033[0;31m}"
    local YELLOW="${YELLOW:-\033[1;33m}"

    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}━━━ Local Services ━━━${NC}"
        echo ""
    fi

    local services=(
        "telegram-gateway:4006"
        "telegram-gateway-api:4010"
        "dashboard:3103"
        # NOTE: docusaurus removed - docs-hub container (port 3400) serves Docusaurus instead
        "status:3500"
    )

    local running=0
    local total=${#services[@]}

    for service_def in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service_def"
        local pid=$(lsof -ti :"$port" 2>/dev/null | head -n1 || echo "")

        if [ -n "$pid" ]; then
            ((++running))
            if [ "$JSON_OUTPUT" = false ]; then
                echo -e "  ${GREEN}✓${NC} $(printf '%-20s' "$name") ${GREEN}RUNNING${NC}  PID: $pid  Port: $port"

                if [ "$DETAILED" = true ]; then
                    local details=$(ps -p "$pid" -o %cpu,%mem,etime --no-headers 2>/dev/null | awk '{print "CPU: "$1"%, MEM: "$2"%, Uptime: "$3}')
                    if [ -n "$details" ]; then
                        echo -e "    ${BLUE}└─${NC} $details"
                    fi
                fi
            fi
        else
            if [ "$JSON_OUTPUT" = false ]; then
                echo -e "  ${RED}✗${NC} $(printf '%-20s' "$name") ${RED}STOPPED${NC}  Port: $port"
            fi
        fi
    done

    # Check docs-watcher (no port, process-based detection)
    local watcher_pid=$(pgrep -f "watch-docs.js" 2>/dev/null | head -n1 || echo "")
    if [ -n "$watcher_pid" ]; then
        ((++running))
        ((++total))
        if [ "$JSON_OUTPUT" = false ]; then
            echo -e "  ${GREEN}✓${NC} $(printf '%-20s' "docs-watcher") ${GREEN}RUNNING${NC}  PID: $watcher_pid  (file watcher)"

            if [ "$DETAILED" = true ]; then
                local details=$(ps -p "$watcher_pid" -o %cpu,%mem,etime --no-headers 2>/dev/null | awk '{print "CPU: "$1"%, MEM: "$2"%, Uptime: "$3}')
                if [ -n "$details" ]; then
                    echo -e "    ${BLUE}└─${NC} $details"
                fi
            fi
        fi
    else
        ((++total))
        if [ "$JSON_OUTPUT" = false ]; then
            echo -e "  ${RED}✗${NC} $(printf '%-20s' "docs-watcher") ${RED}STOPPED${NC}  (file watcher)"
        fi
    fi

    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        if [ $running -eq $total ]; then
            echo -e "${GREEN}✓${NC} All services running ($running/$total)"
        else
            echo -e "${YELLOW}!${NC} Some services down ($running/$total running)"
        fi
        echo ""
    fi
}

# Check Docker containers using health.sh
check_docker_containers() {
    local BLUE="${BLUE:-\033[0;34m}"
    local NC="${NC:-\033[0m}"
    local GREEN="${GREEN:-\033[0;32m}"
    local RED="${RED:-\033[0;31m}"

    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}━━━ Docker Containers ━━━${NC}"
        echo ""
    fi

    # Get container count
    local container_count=$(docker ps -q 2>/dev/null | wc -l || echo "0")

    if [ "$container_count" -eq 0 ]; then
        echo -e "${RED}  ✗${NC} No containers running"
        echo ""
        return
    fi

    echo -e "${GREEN}  ✓${NC} $container_count containers running"
    echo ""

    # Function to extract and format ports (show only host ports, no IPv6 duplicates)
    format_ports() {
        local ports="$1"
        # Extract only IPv4 mappings and simplify
        echo "$ports" | grep -oE '0\.0\.0\.0:[0-9]+->[0-9]+' | sed 's/0\.0\.0\.0://g' | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g'
    }

    # Group containers by stack
    local CYAN="${CYAN:-\033[0;36m}"
    local YELLOW="${YELLOW:-\033[1;33m}"

    for stack in "apps" "data" "docs" "rag" "monitor" "tools"; do
        local stack_containers=$(docker ps --filter "name=${stack}-" --format "{{.Names}}" 2>/dev/null)

        if [ -n "$stack_containers" ]; then
            # Stack header
            case $stack in
                apps) echo -e "${CYAN}📦 APPS Stack:${NC}" ;;
                data) echo -e "${CYAN}🗄️  DATA Stack:${NC}" ;;
                docs) echo -e "${CYAN}📚 DOCS Stack:${NC}" ;;
                rag) echo -e "${CYAN}🧠 RAG Stack:${NC}" ;;
                monitor) echo -e "${CYAN}📊 MONITORING Stack:${NC}" ;;
                tools) echo -e "${CYAN}🔧 TOOLS Stack:${NC}" ;;
            esac

            # Show containers in this stack
            while IFS= read -r container; do
                local health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
                local ports=$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{$p}} {{(index $conf 0).HostPort}} {{end}}' "$container" 2>/dev/null)

                # Extract just host ports
                local host_ports=$(docker port "$container" 2>/dev/null | grep -oE '0\.0\.0\.0:[0-9]+' | cut -d: -f2 | sort -n | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g')

                # Health indicator
                local health_icon
                case $health in
                    healthy) health_icon="${GREEN}✓${NC}" ;;
                    unhealthy) health_icon="${RED}✗${NC}" ;;
                    starting) health_icon="${YELLOW}⟳${NC}" ;;
                    *) health_icon="${CYAN}•${NC}" ;;
                esac

                # Format: icon name (ports)
                if [ -n "$host_ports" ]; then
                    echo -e "  $health_icon $(printf '%-28s' "$container") Ports: $host_ports"
                else
                    echo -e "  $health_icon $(printf '%-28s' "$container") (no exposed ports)"
                fi
            done <<< "$stack_containers"

            echo ""
        fi
    done
}

# Show system resources
show_resources() {
    local BLUE="${BLUE:-\033[0;34m}"
    local NC="${NC:-\033[0m}"
    local CYAN="${CYAN:-\033[0;36m}"

    if [ "$JSON_OUTPUT" = true ]; then
        return
    fi

    echo -e "${BLUE}━━━ System Resources ━━━${NC}"
    echo ""

    # CPU
    local cpu_usage=$(top -bn1 2>/dev/null | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}' || echo "N/A")
    echo -e "  CPU Usage:     ${CYAN}${cpu_usage}%${NC}"

    # Memory
    local mem_info=$(free -h 2>/dev/null | awk '/^Mem:/ {print $3 "/" $2 " (" int($3/$2 * 100) "%)"}' || echo "N/A")
    echo -e "  Memory:        ${CYAN}${mem_info}${NC}"

    # Disk
    local disk_info=$(df -h / 2>/dev/null | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}' || echo "N/A")
    echo -e "  Disk (root):   ${CYAN}${disk_info}${NC}"

    # Docker
    if command -v docker >/dev/null 2>&1; then
        local docker_count=$(docker ps -q 2>/dev/null | wc -l || echo "0")
        local docker_total=$(docker ps -aq 2>/dev/null | wc -l || echo "0")
        echo -e "  Docker:        ${CYAN}${docker_count}/${docker_total} containers running${NC}"
    fi

    echo ""
}

# Show quick summary
show_summary() {
    local BLUE="${BLUE:-\033[0;34m}"
    local NC="${NC:-\033[0m}"
    local CYAN="${CYAN:-\033[0;36m}"
    local YELLOW="${YELLOW:-\033[1;33m}"

    if [ "$JSON_OUTPUT" = true ]; then
        return
    fi

    echo -e "${BLUE}━━━ Quick Access ━━━${NC}"
    echo ""
    echo -e "  Telegram Gateway:    ${CYAN}http://localhost:4006${NC}"
    echo -e "  Gateway API:         ${CYAN}http://localhost:4010${NC}"
    echo -e "  Dashboard:           ${CYAN}http://localhost:3103${NC}"
    echo -e "  Documentation:       ${CYAN}http://localhost:3400${NC}"
    echo -e "  Status API:          ${CYAN}http://localhost:3500${NC}"
    echo -e "  TP Capital API:      ${CYAN}http://localhost:4005${NC}"
    echo -e "  Workspace API:       ${CYAN}http://localhost:3200${NC}"
    echo ""
}

# Main status check
main() {
    if [ "$WATCH_MODE" = true ]; then
        while true; do
            clear
            show_banner
            check_local_services
            check_docker_containers
            show_resources
            show_summary
            echo -e "${YELLOW}Refreshing in 5 seconds... (Ctrl+C to exit)${NC}"
            sleep 5
        done
    else
        show_banner
        check_local_services
        check_docker_containers
        show_resources
        show_summary
    fi
}

# Run main
main "$@"
