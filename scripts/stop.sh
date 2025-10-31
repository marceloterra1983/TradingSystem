#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Stop Script v2.0
# ==============================================================================
# Stops all services: Node.js services and Docker containers
# Usage: bash scripts/stop.sh [OPTIONS]
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
    # shellcheck source=scripts/lib/logging.sh
    source "$SCRIPT_DIR/lib/logging.sh"
    # shellcheck source=scripts/lib/pidfile.sh
    source "$SCRIPT_DIR/lib/pidfile.sh"
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
WITH_DB=false
WITH_VECTORS=true
PRUNE_NETWORKS=false
SERVICES_DIR="${LOG_DIR:-/tmp/tradingsystem-logs}"

# Node.js service ports
# NOTE: Port 3400 removed - docs-hub container (not Node.js service)
# NOTE: Port 3401 removed - docs-api container (not Node.js service)
PORTS=(4006 4010 3103 3500)

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
        --with-db)
            WITH_DB=true
            shift
            ;;
        --with-vectors)
            WITH_VECTORS=true
            shift
            ;;
        --skip-vectors|--no-vectors)
            WITH_VECTORS=false
            shift
            ;;
        --prune-networks|--remove-networks)
            PRUNE_NETWORKS=true
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
  --with-db       Also stop database stack (TimescaleDB, UI tools)
  --with-vectors  Also stop vectors stack (default behaviour)
  --skip-vectors  Leave LlamaIndex/Ollama/Qdrant running
  --prune-networks Remove shared Docker networks if unused
  --help, -h      Show this help message

Stops:
  🖥️  Node.js services (Telegram Gateway, Gateway API, Dashboard, Docusaurus, Status)
  🐳 Docker containers (TP Capital API, Workspace)
  🐳 Database stack (when --with-db)
  🧠 Vectors stack (omit with --skip-vectors)

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
    if docker ps --format '{{.Names}}' | grep -qE '^(apps-tp-capital|apps-workspace)$'; then
        log_info "Stopping apps stack (apps-tp-capital, apps-workspace)..."
        docker compose -f "$PROJECT_ROOT/tools/compose/docker-compose.apps.yml" down --remove-orphans
        log_success "✓ Containers stopped"
    else
        log_info "No application containers running"
    fi
}

# Function to stop database stack (TimescaleDB + tools)
stop_db_stack() {
    section "Stopping Database Stack (TimescaleDB)"
    local DB_COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.database.yml"
    if [ ! -f "$DB_COMPOSE_FILE" ]; then
        log_info "Timescale compose file not found (skipping)"
        return 0
    fi
    # Stop primary DB service; down is safe to ensure removal of orphans
    docker compose -f "$DB_COMPOSE_FILE" down --remove-orphans || true
    log_success "✓ Database stack stopped"
}

# Function to stop DOCS stack
stop_docs_stack() {
    section "Stopping DOCS Stack"
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.docs.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_info "Docs compose file not found (skipping)"
        return 0
    fi
    docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
    log_success "✓ DOCS stack stopped"
}

# Function to stop RAG stack (Ollama + LlamaIndex)
stop_rag_stack() {
    section "Stopping RAG Stack (Ollama, LlamaIndex)"
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.rag.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_info "RAG compose file not found (skipping)"
        return 0
    fi
    docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
    log_success "✓ RAG stack stopped"
}

# Function to stop MONITORING stack
stop_monitoring_stack() {
    section "Stopping MONITORING Stack"
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.monitoring.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_info "Monitoring compose file not found (skipping)"
        return 0
    fi
    docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
    log_success "✓ MONITORING stack stopped"
}

# Function to stop TOOLS stack
stop_tools_stack() {
    section "Stopping TOOLS Stack"
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.tools.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_info "Tools compose file not found (skipping)"
        return 0
    fi
    docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
    log_success "✓ TOOLS stack stopped"
}

# Function to stop FIRECRAWL stack
stop_firecrawl_stack() {
    section "Stopping FIRECRAWL Stack"
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.firecrawl.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_info "Firecrawl compose file not found (skipping)"
        return 0
    fi
    docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
    log_success "✓ FIRECRAWL stack stopped"
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

        # Stop docs-watcher (file watcher without port)
        if pgrep -f "watch-docs.js" > /dev/null 2>&1; then
            log_info "Stopping docs-watcher..."
            if [ "$FORCE" = true ]; then
                pkill -9 -f "watch-docs.js" || true
            else
                pkill -15 -f "watch-docs.js" || true
                sleep 1
                # Force kill if still alive
                if pgrep -f "watch-docs.js" > /dev/null 2>&1; then
                    pkill -9 -f "watch-docs.js" || true
                fi
            fi
            log_success "✓ Stopped docs-watcher"
        fi
    else
        log_info "Skipping local services (--skip-services)"
    fi

    echo ""

    # Step 2: Stop Docker containers
    if [ "$SKIP_DOCKER" = false ]; then
        # Stop in reverse dependency order
        stop_firecrawl_stack
        stop_tools_stack
        stop_monitoring_stack

        # Stop RAG stack (optional)
        if [ "$WITH_VECTORS" = true ]; then
            stop_rag_stack
        else
            log_info "Skipping RAG stack (--skip-vectors was set)"
        fi

        stop_docs_stack
        stop_containers  # APPS stack

        # Stop database stack (optional)
        if [ "$WITH_DB" = true ]; then
            stop_db_stack
        fi
        if [ "$PRUNE_NETWORKS" = true ]; then
            section "Pruning shared Docker networks"
            for net in tradingsystem_backend tradingsystem_infra tradingsystem_data; do
                if docker network ls --format '{{.Name}}' | grep -qx "$net"; then
                    docker network rm "$net" >/dev/null 2>&1 || true
                fi
            done
            log_success "✓ Network prune attempted (ignored if in use)"
        fi
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
    echo "  Start services: bash scripts/start.sh (or: start)"
    echo "  Check status:   bash scripts/status.sh (or: status)"
    if [ "$CLEAN_LOGS" = false ]; then
        echo "  Clean logs:     bash scripts/stop.sh --clean-logs"
    fi
    echo ""
}

# Run main
main "$@"
