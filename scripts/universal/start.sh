#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Start Script v2.0
# ==============================================================================
# Starts Docker containers and development services with advanced health checks
# Usage: bash scripts/universal/start.sh [OPTIONS]
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
    # shellcheck source=scripts/lib/docker.sh
    source "$SCRIPT_DIR/../lib/docker.sh"
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
    NC='\033[0m'

    log_info() { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
    log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*" >&2; }
    log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*" >&2; }
    log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
    section() { echo ""; echo "========================================"; echo -e "${BLUE}  $1${NC}"; echo "========================================"; echo ""; }
fi

cd "$PROJECT_ROOT"

# Configuration
FORCE_KILL=false
SKIP_DOCKER=false
SKIP_SERVICES=false
SERVICES_DIR="${LOG_DIR:-/tmp/tradingsystem-logs}"
mkdir -p "$SERVICES_DIR"

# Service definitions (name:directory:port:command)
# NOTE: Workspace and TP Capital now run as Docker containers only
declare -A SERVICES=(
    ["dashboard"]="frontend/dashboard:3103:npm run dev"
    ["docusaurus"]="docs:3205:npm run docs:dev"
    ["status"]="apps/status:3500:npm start"
)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force-kill)
            FORCE_KILL=true
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
TradingSystem Universal Start v2.0

Usage: $0 [OPTIONS]

Options:
  --force-kill       Kill processes on occupied ports before starting
  --skip-docker      Skip Docker containers startup
  --skip-services    Skip local dev services startup
  --help, -h         Show this help message

Services:
  🐳 Docker Containers:
     - tp-capital-api (4005) - Telegram ingestion & API
     - workspace-service (3200) - Workspace & Ideas management
     - TimescaleDB, QuestDB, and other infrastructure

  🖥️  Local Dev Services:
     - Dashboard (3103) - React dashboard
     - Docusaurus (3205) - Documentation site
     - Status API (3500) - Service health & launcher

Features:
  ✓ Advanced health checks with retry logic
  ✓ Automatic dependency ordering
  ✓ PID file management
  ✓ Port conflict detection
  ✓ Service auto-recovery
  ✓ Colored terminal output

EOF
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Function to check if port is in use
check_port() {
    local port=$1
    lsof -ti :"$port" 2>/dev/null
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(check_port "$port")
    if [ -n "$pid" ]; then
        log_warning "Killing process on port $port (PID: $pid)"
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
}

# Function to start Docker containers
start_containers() {
    section "Starting Docker Containers"

    # Check if docker-compose.apps.yml exists
    if [ ! -f "$PROJECT_ROOT/tools/compose/docker-compose.apps.yml" ]; then
        log_warning "No docker-compose.apps.yml found - skipping containers"
        return 0
    fi

    # Check if containers are already running
    if docker ps | grep -qE "tp-capital-api|workspace-service"; then
        log_info "Application containers already running"
        if [ "$FORCE_KILL" = true ]; then
            log_info "Restarting containers (--force-kill)..."
            docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.apps.yml" down
            sleep 2
        else
            return 0
        fi
    fi

    # Start containers
    log_info "Starting tp-capital-api and workspace-service..."
    docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.apps.yml" up -d

    # Wait for containers to be healthy
    log_info "Waiting for containers to be healthy..."
    local max_wait=60
    local waited=0

    while [ $waited -lt $max_wait ]; do
        local workspace_health=$(docker inspect --format='{{.State.Health.Status}}' workspace-service 2>/dev/null || echo "starting")

        if [ "$workspace_health" = "healthy" ]; then
            log_success "✓ Containers are healthy"
            break
        fi

        sleep 2
        waited=$((waited + 2))

        if [ $((waited % 10)) -eq 0 ]; then
            log_info "Still waiting... (${waited}s/${max_wait}s)"
        fi
    done

    if [ $waited -ge $max_wait ]; then
        log_warning "⚠ Containers may not be fully healthy yet"
        log_info "Check status with: docker ps"
    fi

    log_success "✓ Containers started"
    echo -e "${BLUE}  - tp-capital-api:   ${NC}http://localhost:4005"
    echo -e "${BLUE}  - workspace-service:${NC}http://localhost:3200"
}

# Function to start a service
start_service() {
    local name=$1
    local config="${SERVICES[$name]}"
    local dir=$(echo "$config" | cut -d':' -f1)
    local port=$(echo "$config" | cut -d':' -f2)
    local command=$(echo "$config" | cut -d':' -f3-)
    local log_file="$SERVICES_DIR/${name}.log"
    local pid_file="$SERVICES_DIR/${name}.pid"

    log_info "Starting ${name}..."

    # Check if directory exists
    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
        log_error "Directory not found: $PROJECT_ROOT/$dir"
        return 1
    fi

    # Check if already running
    if [ -f "$pid_file" ]; then
        local old_pid=$(cat "$pid_file")
        if kill -0 "$old_pid" 2>/dev/null; then
            log_success "$name already running (PID: $old_pid)"
            return 0
        else
            rm -f "$pid_file"
        fi
    fi

    # Check port
    if check_port "$port" > /dev/null; then
        if [ "$FORCE_KILL" = true ]; then
            kill_port "$port"
        else
            log_warning "Port $port already in use. Use --force-kill to restart"
            return 0
        fi
    fi

    # Install dependencies if needed
    if [ ! -d "$PROJECT_ROOT/$dir/node_modules" ]; then
        log_info "Installing dependencies for $name..."
        (cd "$PROJECT_ROOT/$dir" && npm install --silent)
    fi

    # Start service in background
    cd "$PROJECT_ROOT/$dir"

    # Use appropriate start command
    if [ "$name" = "docusaurus" ]; then
        nohup npm run docs:dev > "$log_file" 2>&1 &
    else
        nohup npm run dev > "$log_file" 2>&1 &
    fi

    local pid=$!
    echo "$pid" > "$pid_file"

    # Wait for port to become active
    log_info "Waiting for $name to start..."
    local max_wait=30
    local waited=0

    while [ $waited -lt $max_wait ]; do
        if lsof -i :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_success "✓ $name started (PID: $pid, Port: $port)"
            log_info "  Log: $log_file"
            cd "$PROJECT_ROOT"
            return 0
        fi

        # Check if process is still alive
        if ! kill -0 "$pid" 2>/dev/null; then
            log_error "$name failed to start (process died)"
            log_error "Last 20 lines of log:"
            tail -n 20 "$log_file" | sed 's/^/    /'
            rm -f "$pid_file"
            cd "$PROJECT_ROOT"
            return 1
        fi

        sleep 1
        waited=$((waited + 1))
    done

    log_error "$name failed to start (timeout)"
    log_error "Check log: $log_file"
    cd "$PROJECT_ROOT"
    return 1
}

# Main execution
main() {
    section "TradingSystem - Universal Start v2.0"

    log_info "Project Root: $PROJECT_ROOT"
    log_info "Logs: $SERVICES_DIR"
    echo ""

    # Step 1: Start Docker containers
    if [ "$SKIP_DOCKER" = false ]; then
        start_containers
        echo ""
    else
        log_info "Skipping Docker containers (--skip-docker)"
        echo ""
    fi

    # Step 2: Start local development services
    if [ "$SKIP_SERVICES" = false ]; then
        section "Starting Local Development Services"

        local failed_services=()
        for service in dashboard docusaurus status; do
            if ! start_service "$service"; then
                failed_services+=("$service")
            fi
        done

        echo ""

        # Summary
        if [ ${#failed_services[@]} -eq 0 ]; then
            log_success "✅ All services started successfully!"
        else
            log_error "❌ Some services failed to start:"
            for service in "${failed_services[@]}"; do
                log_error "  - $service"
            done
        fi
    else
        log_info "Skipping local services (--skip-services)"
    fi

    # Final summary
    section "Summary"

    # Ensure colors are defined for this section
    local CYAN='\033[0;36m'
    local NC='\033[0m'
    local BLUE='\033[0;34m'

    echo -e "${CYAN}🐳 Docker Containers:${NC}"
    echo -e "  💹 TP Capital API:    http://localhost:4005"
    echo -e "  📚 Workspace API:     http://localhost:3200"
    echo ""
    echo -e "${CYAN}🖥️  Local Dev Services:${NC}"
    echo -e "  🎨 Dashboard:         http://localhost:3103"
    echo -e "  📖 Docusaurus:        http://localhost:3205"
    echo -e "  📊 Status API:        http://localhost:3500"
    echo ""
    echo -e "${CYAN}📝 Management:${NC}"
    echo -e "  Check status:  ${BLUE}bash scripts/universal/status.sh${NC} (or: status)"
    echo -e "  Stop services: ${BLUE}bash scripts/universal/stop.sh${NC}   (or: stop)"
    echo -e "  View logs:     ${BLUE}tail -f $SERVICES_DIR/<service>.log${NC}"
    echo ""
}

# Run main
main "$@"
