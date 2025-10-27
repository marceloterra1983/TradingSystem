#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Status Script v2.0
# ==============================================================================
# Shows comprehensive status of all system components
# Usage: bash scripts/universal/status.sh [OPTIONS]
# ==============================================================================

set -euo pipefail

# Load shared libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source libraries if available
if [[ -f "$SCRIPT_DIR/../lib/common.sh" ]]; then
    # shellcheck source=scripts/lib/common.sh
    source "$SCRIPT_DIR/../lib/common.sh"
    # shellcheck source=scripts/lib/portcheck.sh
    source "$SCRIPT_DIR/../lib/portcheck.sh"
    # shellcheck source=scripts/lib/health.sh
    source "$SCRIPT_DIR/../lib/health.sh"
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
        "docusaurus:3205"
        "status:3500"
    )

    local running=0
    local total=${#services[@]}

    for service_def in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service_def"
        local pid=$(lsof -ti :"$port" 2>/dev/null || echo "")

        if [ -n "$pid" ]; then
            ((running++))
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

    if [ "$USE_LIBS" = true ]; then
        # Use advanced health checking from health.sh
        check_all_docker_stacks
        generate_health_summary --format text
    else
        # Fallback: simple check
        local container_count=$(docker ps -q 2>/dev/null | wc -l || echo "0")

        if [ "$container_count" -gt 0 ]; then
            echo -e "${GREEN}  ✓${NC} $container_count containers running"
            echo ""

            # Show application containers
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | \
                grep -E "tp-capital-api|workspace-service|timescaledb|questdb" || echo "  No TradingSystem containers found"
        else
            echo -e "${RED}  ✗${NC} No containers running"
        fi
        echo ""
    fi
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
    echo -e "  Documentation:       ${CYAN}http://localhost:3205${NC}"
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
