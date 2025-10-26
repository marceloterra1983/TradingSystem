#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Stop Script v2.0
# ==============================================================================
# Stops all services: Node.js services and Docker containers
# Usage: bash scripts/universal/stop.sh [OPTIONS]
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
    # shellcheck source=scripts/lib/logging.sh
    source "$SCRIPT_DIR/../lib/logging.sh"
    # shellcheck source=scripts/lib/pidfile.sh
    source "$SCRIPT_DIR/../lib/pidfile.sh"
    USE_LIBS=true
else
    # Fallback: minimal inline functions
    USE_LIBS=false
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    NC='\033[0m'

    log_info() { echo -e "${CYAN}[INFO]${NC} $*" >&2; }
    log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*" >&2; }
    log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*" >&2; }
    log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
    section() { echo ""; echo "========================================"; echo "$1"; echo "========================================"; echo ""; }
fi

cd "$PROJECT_ROOT"

# Configuration
FORCE=false
CLEAN_LOGS=false
SKIP_DOCKER=false
SKIP_SERVICES=false
SERVICES_DIR="${LOG_DIR:-/tmp/tradingsystem-logs}"

# Node.js service ports
PORTS=(3103 3205 3500)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --clean-logs)
            CLEAN_LOGS=true
            shift
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-services)
            SKIP_SERVICES=true
            shift
            ;;
        --help|-h)
            cat << EOF
TradingSystem Universal Stop v2.0

Usage: $0 [OPTIONS]

Options:
  --force         Use SIGKILL instead of SIGTERM
  --clean-logs    Remove service logs after stopping
  --skip-docker   Skip stopping Docker containers
  --skip-services Skip stopping local services
  --help, -h      Show this help message

Stops:
  🖥️  Node.js services (Dashboard, Docusaurus, Status API)
  🐳 Docker containers (TP Capital API, Workspace)

Features:
  ✓ Graceful shutdown with SIGTERM (default)
  ✓ Force kill with SIGKILL (--force)
  ✓ PID file cleanup
  ✓ Port conflict resolution
  ✓ Log cleanup option

EOF
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Function to stop service on port
stop_port() {
    local port=$1
    local pid=$(lsof -ti :"$port" 2>/dev/null)

    if [ -z "$pid" ]; then
        return 0
    fi

    if [ "$FORCE" = true ]; then
        log_info "Force killing process on port $port (PID: $pid)"
        kill -9 "$pid" 2>/dev/null || true
    else
        log_info "Gracefully stopping process on port $port (PID: $pid)"
        kill -15 "$pid" 2>/dev/null || true

        # Wait for graceful shutdown
        local waited=0
        while [ $waited -lt 5 ]; do
            if ! kill -0 "$pid" 2>/dev/null; then
                break
            fi
            sleep 1
            waited=$((waited + 1))
        done

        # Force kill if still alive
        if kill -0 "$pid" 2>/dev/null; then
            log_warning "Process $pid did not stop gracefully, forcing..."
            kill -9 "$pid" 2>/dev/null || true
        fi
    fi

    sleep 1
}

# Function to stop Docker containers
stop_containers() {
    section "Stopping Docker Containers"

    # Check if docker-compose.apps.yml exists
    if [ ! -f "$PROJECT_ROOT/tools/compose/docker-compose.apps.yml" ]; then
        log_info "No docker-compose.apps.yml found"
        return 0
    fi

    # Check if containers are running
    if docker ps | grep -qE "tp-capital-api|workspace-service"; then
        log_info "Stopping tp-capital-api and workspace-service..."
        docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.apps.yml" down
        log_success "✓ Containers stopped"
    else
        log_info "No application containers running"
    fi
}

# Function to stop services by PID files
stop_services_by_pidfiles() {
    if [ ! -d "$SERVICES_DIR" ]; then
        return 0
    fi

    local pidfiles=$(find "$SERVICES_DIR" -name "*.pid" -type f 2>/dev/null || true)

    if [ -z "$pidfiles" ]; then
        return 0
    fi

    echo "$pidfiles" | while read -r pidfile; do
        local service=$(basename "$pidfile" .pid)
        local pid=$(cat "$pidfile" 2>/dev/null || echo "")

        if [ -z "$pid" ]; then
            rm -f "$pidfile"
            continue
        fi

        if ! kill -0 "$pid" 2>/dev/null; then
            log_info "$service: PID $pid not running, cleaning up"
            rm -f "$pidfile"
            continue
        fi

        if [ "$FORCE" = true ]; then
            log_info "Force killing $service (PID: $pid)"
            kill -9 "$pid" 2>/dev/null || true
        else
            log_info "Gracefully stopping $service (PID: $pid)"
            kill -15 "$pid" 2>/dev/null || true

            # Wait for graceful shutdown
            local waited=0
            while [ $waited -lt 5 ]; do
                if ! kill -0 "$pid" 2>/dev/null; then
                    break
                fi
                sleep 1
                waited=$((waited + 1))
            done

            # Force kill if still alive
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "$service (PID $pid) did not stop gracefully, forcing..."
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi

        rm -f "$pidfile"
        log_success "✓ $service stopped"
    done
}

# Main execution
main() {
    section "TradingSystem - Universal Stop v2.0"

    local stopped_count=0

    # Step 1: Stop Node.js services
    if [ "$SKIP_SERVICES" = false ]; then
        section "Stopping Node.js Services"

        # Stop by PID files
        stop_services_by_pidfiles

        # Stop by known ports
        for port in "${PORTS[@]}"; do
            if lsof -ti :"$port" >/dev/null 2>&1; then
                stop_port "$port"
                stopped_count=$((stopped_count + 1))
            fi
        done

        if [ $stopped_count -eq 0 ]; then
            log_info "No Node.js services running"
        else
            log_success "✓ Stopped $stopped_count service(s)"
        fi
    else
        log_info "Skipping local services (--skip-services)"
    fi

    echo ""

    # Step 2: Stop Docker containers
    if [ "$SKIP_DOCKER" = false ]; then
        stop_containers
    else
        log_info "Skipping Docker containers (--skip-docker)"
    fi

    echo ""

    # Clean logs if requested
    if [ "$CLEAN_LOGS" = true ]; then
        section "Cleaning Logs"
        if [ -d "$SERVICES_DIR" ]; then
            log_info "Removing logs from $SERVICES_DIR..."
            rm -f "$SERVICES_DIR"/*.log "$SERVICES_DIR"/*.pid 2>/dev/null || true
            log_success "✓ Logs cleaned"
        fi
    fi

    # Final summary
    section "Summary"
    log_success "✅ All services stopped"
    echo ""
    echo "💡 Tips:"
    echo "  Start services: bash scripts/universal/start.sh (or: start)"
    echo "  Check status:   bash scripts/universal/status.sh (or: status)"
    if [ "$CLEAN_LOGS" = false ]; then
        echo "  Clean logs:     bash scripts/universal/stop.sh --clean-logs"
    fi
    echo ""
}

# Run main
main "$@"
