#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Start Script v2.0
# ==============================================================================
# Starts Docker containers and development services with advanced health checks
# Usage: bash scripts/start.sh [OPTIONS]
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
    # shellcheck source=scripts/lib/docker.sh
    source "$SCRIPT_DIR/lib/docker.sh"
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
    NC='\033[0m'

    log_info() { [ "$QUIET_MODE" = true ] && return; echo -e "${BLUE}[INFO]${NC} $*" >&2; }
    log_success() { [ "$QUIET_MODE" = true ] && return; echo -e "${GREEN}[SUCCESS]${NC} $*" >&2; }
    log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*" >&2; }
    log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
    section() { [ "$QUIET_MODE" = true ] && return; echo ""; echo "========================================"; echo -e "${BLUE}  $1${NC}"; echo "========================================"; echo ""; }
fi

cd "$PROJECT_ROOT"

# Configuration: load only versioned defaults to avoid sourcing user secrets
# and potentially invalid shell syntax in .env/.env.local. Per-service compose
# files read env files themselves via env_file. We still export image defaults
# to satisfy Compose variable substitution when launching stacks from here.
if [ -f "$PROJECT_ROOT/config/.env.defaults" ]; then
    set -a
    . "$PROJECT_ROOT/config/.env.defaults"
    set +a
fi

FORCE_KILL=false
SKIP_DOCKER=false
SKIP_SERVICES=false
WITH_VECTORS=true
SKIP_HEALTH_CHECKS=false
QUIET_MODE=false
SERVICES_DIR="${LOG_DIR:-/tmp/tradingsystem-logs}"
METRICS_FILE="$SERVICES_DIR/start-metrics.json"
mkdir -p "$SERVICES_DIR"

# Metrics tracking
declare -A SERVICE_START_TIMES
declare -A SERVICE_RETRY_COUNTS
START_SCRIPT_TIME=$(date +%s)

DOCKER_FLAG_SET=false
TARGET_MODE=false
declare -a REQUESTED_SERVICES=()
declare -A TARGET_SERVICES_MAP=()

# Service definitions (name:directory:port:command:env_file:dependencies:max_retries)
# Format: name=directory:port:command:optional_env_file:dependencies:max_retries
# dependencies = comma-separated list of service names (empty if none)
# max_retries = number of restart attempts (default: 3)
# NOTE: Workspace and TP Capital now run as Docker containers only
declare -A SERVICES=(
    ["telegram-gateway"]="apps/telegram-gateway:4006:npm run dev:::3"
    ["telegram-gateway-api"]="backend/api/telegram-gateway:4010:npm run dev::telegram-gateway:3"
    # NOTE: docs-api runs as Docker container (docs-api) on port 3401
    # NOTE: docusaurus runs as Docker container (docs-hub) on port 3400
    ["dashboard"]="frontend/dashboard:3103:npm run dev:::2"
    ["status"]="apps/status:3500:npm start:::2"
    ["docs-watcher"]="tools/llamaindex::npm run watch:::1"
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
            DOCKER_FLAG_SET=true
            shift
            ;;
        --with-docker)
            SKIP_DOCKER=false
            DOCKER_FLAG_SET=true
            shift
            ;;
        --skip-services)
            SKIP_SERVICES=true
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
        --skip-health-checks)
            SKIP_HEALTH_CHECKS=true
            shift
            ;;
        --quiet|-q)
            QUIET_MODE=true
            shift
            ;;
        --help|-h)
            cat << EOF
TradingSystem Universal Start v2.0

Usage: $0 [OPTIONS]

Options:
  --force-kill          Kill processes on occupied ports before starting
  --skip-docker         Skip Docker containers startup
  --skip-services       Skip local dev services startup
  --with-vectors        Start Qdrant + Ollama + LlamaIndex (default behaviour)
  --skip-vectors        Skip starting Qdrant/Ollama/LlamaIndex
  --skip-health-checks  Skip health checks (faster startup for experienced users)
  --quiet, -q           Quiet mode (only show errors and final summary)
  --help, -h            Show this help message

Services:
  🐳 Docker Containers:
     - tp-capital-api (4005) - Telegram ingestion & API
     - workspace-service (3200) - Workspace & Ideas management
     - TimescaleDB, QuestDB, and other infrastructure

  🖥️  Local Dev Services:
     - Telegram Gateway (4006) - Telegram MTProto gateway service
     - Telegram Gateway API (4010) - REST API for gateway messages
     - DocsAPI (3401) - Documentation API (hybrid search)
     - Docusaurus (3400) - Documentation site
     - Dashboard (3103) - React dashboard
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
            if [[ -n "${SERVICES[$1]:-}" ]]; then
                REQUESTED_SERVICES+=("$1")
                shift
            else
                log_error "Unknown option or service: $1"
                exit 1
            fi
            ;;
    esac
done

if [ ${#REQUESTED_SERVICES[@]} -gt 0 ]; then
    TARGET_MODE=true
    if [ "$DOCKER_FLAG_SET" = false ]; then
        SKIP_DOCKER=true
    fi
fi

# ==============================================================================
# Signal Handlers
# ==============================================================================

cleanup_on_exit() {
    log_warning "Interrupt detected. Cleaning up..."
    # Kill background processes started by this script
    jobs -p | xargs -r kill 2>/dev/null || true
    log_info "Cleanup complete. Exiting."
    exit 1
}

# Register signal handlers
trap cleanup_on_exit SIGINT SIGTERM

# ==============================================================================
# Dependency Resolution
# ==============================================================================

# Function to resolve service dependencies (topological sort)
resolve_dependencies() {
    local -n services_map=$1
    local -a sorted_services=()
    local -A visited=()
    local -A temp_mark=()
    
    # DFS visit function
    visit() {
        local node=$1
        
        # Check for circular dependency
        if [[ -n "${temp_mark[$node]:-}" ]]; then
            log_error "Circular dependency detected: $node"
            return 1
        fi
        
        # Skip if already visited
        if [[ -n "${visited[$node]:-}" ]]; then
            return 0
        fi
        
        temp_mark[$node]=1
        
        # Get dependencies
        local config="${services_map[$node]}"
        local deps=$(echo "$config" | cut -d':' -f5)
        
        # Visit dependencies first
        if [ -n "$deps" ]; then
            IFS=',' read -ra dep_array <<< "$deps"
            for dep in "${dep_array[@]}"; do
                dep=$(echo "$dep" | tr -d ' ')  # trim whitespace
                if [ -n "$dep" ] && [[ -n "${services_map[$dep]:-}" ]]; then
                    visit "$dep"
                fi
            done
        fi
        
        unset temp_mark[$node]
        visited[$node]=1
        sorted_services+=("$node")
    }
    
    # Visit all services
    for service in "${!services_map[@]}"; do
        if [[ -z "${visited[$service]:-}" ]]; then
            visit "$service"
        fi
    done
    
    # Return sorted list
    echo "${sorted_services[@]}"
}

add_target_service() {
    local service=$1
    if [[ -z "${SERVICES[$service]:-}" ]]; then
        return
    fi
    if [[ -n "${TARGET_SERVICES_MAP[$service]:-}" ]]; then
        return
    fi

    TARGET_SERVICES_MAP[$service]=1

    local config="${SERVICES[$service]}"
    local deps=$(echo "$config" | cut -d':' -f5)
    if [ -n "$deps" ]; then
        IFS=',' read -ra dep_array <<< "$deps"
        for dep in "${dep_array[@]}"; do
            dep=$(echo "$dep" | tr -d ' ')
            if [ -n "$dep" ]; then
                add_target_service "$dep"
            fi
        done
    fi
}

# Function to check if port is in use (portable)
port_in_use() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -i :"$port" -sTCP:LISTEN -t >/dev/null 2>&1
        return $?
    elif command -v ss >/dev/null 2>&1; then
        ss -ltn "sport = :$port" | awk 'NR>1 && /LISTEN/ {found=1} END{exit (found?0:1)}'
        return $?
    else
        timeout 1 bash -lc ">/dev/tcp/127.0.0.1/$port" >/dev/null 2>&1
        return $?
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        local pids
        pids=$(lsof -ti :"$port" 2>/dev/null | tr '\n' ' ')
        if [ -n "$pids" ]; then
            log_warning "Killing process(es) on port $port (PID(s): $pids)"
            kill -9 $pids 2>/dev/null || true
            sleep 1
        fi
    elif command -v fuser >/dev/null 2>&1; then
        log_warning "Killing process(es) on port $port via fuser"
        fuser -k -n tcp "$port" 2>/dev/null || true
        sleep 1
    else
        log_warning "No lsof/fuser available to kill processes on port $port"
    fi
}

# Function to start Docker containers
start_containers() {
    section "Starting Docker Containers"

    # Check if docker-compose.apps.yml exists
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.apps.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_warning "No docker-compose.apps.yml found - skipping containers"
        return 0
    fi

    # Ensure external networks exist (some stacks expect them)
    for net in tradingsystem_backend tradingsystem_infra tradingsystem_data Database_default; do
        if ! docker network ls --format '{{.Name}}' | grep -qx "$net"; then
            log_info "Creating docker network: $net"
            docker network create "$net" >/dev/null || true
        fi
    done

    # Start database stack (ALL 9 services) first if compose file exists
    local DB_COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.database.yml"
    if [ -f "$DB_COMPOSE_FILE" ]; then
        # Provide sane defaults for image variables when not set in .env
        export IMG_DATA_TIMESCALEDB="${IMG_DATA_TIMESCALEDB:-timescale/timescaledb}"
        export IMG_DATA_QDRANT="${IMG_DATA_QDRANT:-qdrant/qdrant}"
        export IMG_VERSION="${IMG_VERSION:-latest}"

        # Check if DATABASE stack is already running
        local db_running=$(docker ps --filter "name=data-timescale" --format "{{.Names}}" 2>/dev/null | wc -l)

        if [ "$db_running" -gt 0 ]; then
            local db_health=$(docker inspect --format='{{.State.Health.Status}}' data-timescale 2>/dev/null || echo "unknown")
            if [ "$db_health" = "healthy" ]; then
                log_success "✓ DATABASE stack already running and healthy (9 services)"
            else
                log_info "DATABASE stack running but not healthy, restarting..."
                docker compose -p data -f "$DB_COMPOSE_FILE" restart
            fi
        else
            log_info "Starting DATABASE stack (9 services: TimescaleDB, QuestDB, Qdrant, PgAdmin, etc.)..."

            # Start entire DATABASE stack
            docker compose -p data -f "$DB_COMPOSE_FILE" up -d --remove-orphans

            # Wait for TimescaleDB to be healthy (primary database)
            log_info "Waiting for TimescaleDB health..."
            local max_db_wait=60
            local waited_db=0
            while [ $waited_db -lt $max_db_wait ]; do
                local db_health
                db_health=$(docker inspect --format='{{.State.Health.Status}}' data-timescale 2>/dev/null || echo starting)
                if [ "$db_health" = "healthy" ]; then
                    log_success "✓ TimescaleDB healthy"
                    break
                fi
                sleep 2
                waited_db=$((waited_db + 2))
            done
            if [ $waited_db -ge $max_db_wait ]; then
                log_warning "⚠ TimescaleDB health check timed out; continuing anyway"
            fi
        fi
    else
        log_warning "Database compose file not found; skipping DATABASE stack"
    fi

    # If ports are busy by host processes and --force-kill, free them
    if [ "$FORCE_KILL" = true ]; then
        for p in 4005 3200; do
            if port_in_use "$p"; then
                log_warning "Killing host process on port $p (--force-kill)"
                kill_port "$p"
            fi
        done
    fi

    # If --force-kill is set, always restart containers (consistent behavior)
    if [ "$FORCE_KILL" = true ]; then
        if docker ps -a --format '{{.Names}}' | grep -qE '^(apps-tpcapital|apps-workspace)$'; then
            log_warning "--force-kill: Forcing restart of all application containers (healthy or not)"
            docker compose -p apps -f "$COMPOSE_FILE" down || true
            sleep 2
        fi
    # If not forcing and containers already running, check health and skip if healthy
    elif docker ps --format '{{.Names}}' | grep -qE '^(apps-tpcapital|apps-workspace)$'; then
        ws_health=$(docker inspect --format='{{.State.Health.Status}}' apps-workspace 2>/dev/null || echo none)
        tp_health=$(docker inspect --format='{{.State.Health.Status}}' apps-tpcapital 2>/dev/null || echo none)

        if [ "$ws_health" = "healthy" ] && [ "$tp_health" = "healthy" ]; then
            log_info "Application containers already healthy; skipping restart"
            return 0
        else
            log_warning "Containers exist but not healthy (ws=$ws_health, tp=$tp_health); restarting..."
            docker compose -p apps -f "$COMPOSE_FILE" down || true
            sleep 2
        fi
    fi

    # Start containers
    log_info "Starting apps stack (tp-capital, workspace)..."
    docker compose -p apps -f "$COMPOSE_FILE" up -d --force-recreate

    # Wait for containers to be healthy
    log_info "Waiting for containers to be healthy..."
    local max_wait=120
    local waited=0

    while [ $waited -lt $max_wait ]; do
        local ws_health tp_health
        ws_health=$(docker inspect --format='{{.State.Health.Status}}' apps-workspace 2>/dev/null || echo starting)
        tp_health=$(docker inspect --format='{{.State.Health.Status}}' apps-tpcapital 2>/dev/null || echo starting)

        if [ "$ws_health" = "healthy" ] && [ "$tp_health" = "healthy" ]; then
            log_success "✓ App containers are healthy"
            break
        fi

        sleep 2
        waited=$((waited + 2))

        if [ $((waited % 10)) -eq 0 ]; then
            log_info "Still waiting... (${waited}s/${max_wait}s) [workspace: $ws_health, tpcapital: $tp_health]"
        fi
    done

    if [ $waited -ge $max_wait ]; then
        log_warning "⚠ Containers may not be fully healthy yet"
        log_info "Check status with: docker ps"
    fi

    log_success "✓ Containers started"
    log_info "  - tp-capital-api:    http://localhost:4005"
    log_info "  - workspace-service: http://localhost:3200"
}

# Function to start DOCS stack
start_docs_stack() {
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.docs.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_warning "Docs compose file not found, skipping"
        return 0
    fi

    # Check if DOCS stack is already running and healthy
    local docs_running=$(docker ps --filter "name=docs-" --format "{{.Names}}" 2>/dev/null | wc -l)
    if [ "$docs_running" -ge 2 ]; then
        local docs_api_health=$(docker inspect --format='{{.State.Health.Status}}' docs-api 2>/dev/null || echo "unknown")
        local docs_hub_health=$(docker inspect --format='{{.State.Health.Status}}' docs-hub 2>/dev/null || echo "unknown")

        if [ "$docs_api_health" = "healthy" ] && [ "$docs_hub_health" = "healthy" ]; then
            log_success "✓ DOCS stack already running and healthy (2 services)"
            return 0
        fi
    fi

    log_info "Starting DOCS stack (docs-api, docs-hub)..."

    # Start or restart containers (smart mode - only recreates if needed)
    docker compose -p documentation -f "$COMPOSE_FILE" up -d --remove-orphans

    # Wait for health
    local max_wait=30
    local waited=0
    while [ $waited -lt $max_wait ]; do
        local docs_api_health=$(docker inspect --format='{{.State.Health.Status}}' docs-api 2>/dev/null || echo starting)
        local docs_hub_health=$(docker inspect --format='{{.State.Health.Status}}' docs-hub 2>/dev/null || echo starting)

        if [ "$docs_api_health" = "healthy" ] && [ "$docs_hub_health" = "healthy" ]; then
            log_success "✓ DOCS stack healthy"
            return 0
        fi

        sleep 2
        waited=$((waited + 2))
    done

    log_warning "⚠ DOCS stack may not be fully healthy yet"
}

# Function to start RAG stack
start_rag_stack() {
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.rag.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_warning "RAG compose file not found, skipping"
        return 0
    fi

    export IMG_RAG_OLLAMA="${IMG_RAG_OLLAMA:-ollama/ollama}"
    export IMG_VERSION="${IMG_VERSION:-latest}"

    # If core containers already exist, avoid recreating them to prevent conflicts or accidental restarts
    if docker ps -a --format '{{.Names}}' --filter "name=^rag-ollama$" | grep -q '^rag-ollama$'; then
        local ollama_state=$(docker inspect --format='{{.State.Status}}' rag-ollama 2>/dev/null || echo "unknown")
        local ollama_health=$(docker inspect --format='{{.State.Health.Status}}' rag-ollama 2>/dev/null || echo "unknown")

        if [ "$ollama_state" = "running" ]; then
            log_success "✓ RAG stack already running (rag-ollama container detected)"
            return 0
        fi

        log_warning "RAG containers already exist but are not running (status: $ollama_state)."
        log_info "Skip automatic recreate to avoid overwriting existing state."
        log_info "Start manually if needed: docker compose -f tools/compose/docker-compose.rag.yml up -d"
        return 0
    fi

    log_info "Starting RAG stack (Ollama, LlamaIndex)..."

    # Start or restart containers (smart mode - only recreates if needed)
    docker compose -p rag -f "$COMPOSE_FILE" up -d --remove-orphans

    # Wait for Ollama first
    log_info "Waiting for Ollama to be healthy..."
    local max_wait=60
    local waited=0
    while [ $waited -lt $max_wait ]; do
        local ollama_health=$(docker inspect --format='{{.State.Health.Status}}' rag-ollama 2>/dev/null || echo starting)

        if [ "$ollama_health" = "healthy" ]; then
            log_success "✓ Ollama healthy"
            break
        fi

        sleep 2
        waited=$((waited + 2))
    done

    log_success "✓ RAG stack started"
}

# Function to start MONITORING stack
start_monitoring_stack() {
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.monitoring.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_warning "Monitoring compose file not found, skipping"
        return 0
    fi

    export IMG_MON_PROMETHEUS="${IMG_MON_PROMETHEUS:-prom/prometheus}"
    export IMG_MON_GRAFANA="${IMG_MON_GRAFANA:-grafana/grafana}"
    export IMG_VERSION="${IMG_VERSION:-latest}"

    # Check if MONITORING stack is already running
    local monitor_running=$(docker ps --filter "name=monitor-" --format "{{.Names}}" 2>/dev/null | wc -l)
    if [ "$monitor_running" -ge 4 ]; then
        log_success "✓ MONITORING stack already running (4 services)"
        return 0
    fi

    log_info "Starting MONITORING stack (Prometheus, Grafana, Alertmanager)..."

    # Start or restart containers (smart mode - only recreates if needed)
    docker compose -p monitoring -f "$COMPOSE_FILE" up -d --remove-orphans

    log_success "✓ MONITORING stack started"
}

# Function to start TOOLS stack
start_tools_stack() {
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.tools.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_warning "Tools compose file not found, skipping"
        return 0
    fi

    export IMG_TOOLS_LANGGRAPH="${IMG_TOOLS_LANGGRAPH:-img-tools-langgraph}"
    export IMG_TOOLS_AGNO_AGENTS="${IMG_TOOLS_AGNO_AGENTS:-img-tools-agno-agents}"
    export IMG_VERSION="${IMG_VERSION:-latest}"

    # Check if TOOLS stack is already running (LangGraph and Agno only, not Firecrawl)
    local tools_running=$(docker ps --filter "name=tools-langgraph" --format "{{.Names}}" 2>/dev/null | wc -l)
    tools_running=$((tools_running + $(docker ps --filter "name=tools-agno" --format "{{.Names}}" 2>/dev/null | wc -l)))
    if [ "$tools_running" -ge 2 ]; then
        log_success "✓ TOOLS stack already running (2 services)"
        return 0
    fi

    log_info "Starting TOOLS stack (LangGraph, Agno Agents)..."

    # Start or restart containers (smart mode - only recreates if needed)
    docker compose -p tools -f "$COMPOSE_FILE" up -d --remove-orphans

    log_success "✓ TOOLS stack started"
}

# Function to start FIRECRAWL stack
start_firecrawl_stack() {
    local COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.firecrawl.yml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_warning "Firecrawl compose file not found, skipping"
        return 0
    fi

    export IMG_TOOLS_FIRECRAWL_PROXY="${IMG_TOOLS_FIRECRAWL_PROXY:-img-firecrawl-proxy}"
    export IMG_VERSION="${IMG_VERSION:-latest}"

    # Check if FIRECRAWL stack is already running
    local firecrawl_running=$(docker ps --filter "name=tools-firecrawl-" --format "{{.Names}}" 2>/dev/null | wc -l)
    if [ "$firecrawl_running" -ge 5 ]; then
        log_success "✓ FIRECRAWL stack already running (5 services)"
        return 0
    fi

    log_info "Starting FIRECRAWL stack..."

    # Start or restart containers (smart mode - only recreates if needed)
    docker compose -p firecrawl -f "$COMPOSE_FILE" up -d --remove-orphans

    log_success "✓ FIRECRAWL stack started"
}

# Function to validate service environment
validate_service_env() {
    local name=$1
    local env_file=$2
    
    if [ -z "$env_file" ] || [ "$env_file" = "$name" ]; then
        return 0  # No env file specified, skip validation
    fi
    
    local full_path="$PROJECT_ROOT/$env_file"
    
    if [ ! -f "$full_path" ]; then
        log_warning "$name: Environment file not found: $env_file"
        log_info "  Create it from .env.example or configure manually"
        return 1
    fi
    
    return 0
}

# Function to check service health
check_service_health() {
    local name=$1
    local port=$2
    local max_attempts=3
    local attempt=0

    # Skip health checks if flag is set
    if [ "$SKIP_HEALTH_CHECKS" = true ]; then
        log_info "  ⊘ $name health check skipped (--skip-health-checks)"
        return 0
    fi

    # Try HTTP health check if available
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf --max-time 5 "http://localhost:$port/health" >/dev/null 2>&1; then
            log_success "  ✓ $name health check passed"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    # Fallback: just check if port is listening
    if lsof -i :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_info "  ✓ $name is listening on port $port (health endpoint not available)"
        return 0
    fi

    return 1
}

# Function to calculate exponential backoff delay
calculate_backoff() {
    local attempt=$1
    local base_delay=${2:-2}
    local max_delay=${3:-30}
    
    # Calculate delay: base_delay * 2^(attempt-1)
    local delay=$((base_delay * (1 << (attempt - 1))))
    
    # Cap at max_delay
    if [ $delay -gt $max_delay ]; then
        delay=$max_delay
    fi
    
    echo $delay
}

# Function to save metrics to JSON file
save_metrics() {
    local total_time=$(($(date +%s) - START_SCRIPT_TIME))
    local total_declared
    if [ "$TARGET_MODE" = true ] && [ ${#TARGET_SERVICES_MAP[@]} -gt 0 ]; then
        total_declared=${#TARGET_SERVICES_MAP[@]}
    else
        total_declared=${#SERVICES[@]}
    fi

    local running_count=0
    if [ "$TARGET_MODE" = true ] && [ ${#TARGET_SERVICES_MAP[@]} -gt 0 ]; then
        for svc in "${!TARGET_SERVICES_MAP[@]}"; do
            if [ -f "$SERVICES_DIR/${svc}.pid" ]; then
                running_count=$((running_count + 1))
            fi
        done
    else
        running_count=$(ls -1 "$SERVICES_DIR"/*.pid 2>/dev/null | wc -l)
    fi
    
    cat > "$METRICS_FILE" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "totalDurationSeconds": $total_time,
  "services": [
EOF
    
    local first=true
    for service in "${!SERVICE_START_TIMES[@]}"; do
        if [ "$first" = false ]; then
            echo "," >> "$METRICS_FILE"
        fi
        first=false
        
        local start_time="${SERVICE_START_TIMES[$service]}"
        local retry_count="${SERVICE_RETRY_COUNTS[$service]:-0}"
        local status="success"
        
        # Check if service is still running
        local pid_file="$SERVICES_DIR/${service}.pid"
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if ! kill -0 "$pid" 2>/dev/null; then
                status="failed"
            fi
        else
            status="failed"
        fi
        
        cat >> "$METRICS_FILE" <<EOF
    {
      "name": "$service",
      "startTimeSeconds": $start_time,
      "retryCount": $retry_count,
      "status": "$status"
    }
EOF
    done
    
    cat >> "$METRICS_FILE" <<EOF

  ],
  "failedServices": [],
  "summary": {
    "totalServices": $total_declared,
    "successfulServices": $running_count,
    "failedServices": 0
  }
}
EOF
    
    log_info "Metrics saved to: $METRICS_FILE"
}

# Function to start a service with retry logic
start_service() {
    local name=$1
    local config="${SERVICES[$name]}"
    
    # Parse config (format: dir:port:command:env_file:deps:max_retries)
    local dir=$(echo "$config" | cut -d':' -f1)
    local port=$(echo "$config" | cut -d':' -f2)
    local command=$(echo "$config" | cut -d':' -f3)
    local env_file=$(echo "$config" | cut -d':' -f4)
    local dependencies=$(echo "$config" | cut -d':' -f5)
    local max_retries=$(echo "$config" | cut -d':' -f6)
    max_retries=${max_retries:-3}
    
    local log_file="$SERVICES_DIR/${name}-$(date +%Y%m%d).log"
    local pid_file="$SERVICES_DIR/${name}.pid"
    
    # Track start time for metrics
    SERVICE_START_TIMES[$name]=$(date +%s)
    SERVICE_RETRY_COUNTS[$name]=0

    log_info "Starting ${name}..."
    
    # Check dependencies
    if [ -n "$dependencies" ]; then
        IFS=',' read -ra deps <<< "$dependencies"
        for dep in "${deps[@]}"; do
            dep=$(echo "$dep" | tr -d ' ')
            if [ -n "$dep" ]; then
                local dep_pid_file="$SERVICES_DIR/${dep}.pid"
                if [ ! -f "$dep_pid_file" ]; then
                    log_warning "$name depends on $dep, but $dep is not running"
                    log_info "  Waiting for $dep to start..."
                    sleep 3
                fi
            fi
        done
    fi

    # Check if directory exists
    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
        log_error "Directory not found: $PROJECT_ROOT/$dir"
        return 1
    fi
    
    # Validate environment file if specified; for telegram-gateway fall back to root .env,
    # for outros serviços sem env_file, pular com aviso
    local env_ok=0
    local use_root_env_fallback=0
    if [ -n "$env_file" ] && [ "$env_file" != "$command" ]; then
        if ! validate_service_env "$name" "$env_file"; then
            if [ "$name" = "telegram-gateway" ]; then
                log_warning "$name: Environment file not found: $env_file"
                log_info "  Falling back to project .env/.env.local"
                use_root_env_fallback=1
            else
                log_warning "$name: required environment file missing; skipping start"
                env_ok=1
            fi
        fi
    fi
    if [ $env_ok -eq 1 ]; then
        return 0
    fi

    # Special handling for PM2-managed watcher
    if [ "$name" = "docs-watcher" ] && command -v pm2 >/dev/null 2>&1; then
        if pm2 show docs-watcher >/dev/null 2>&1; then
            if pm2 show docs-watcher 2>/dev/null | grep -qi "status\s*: online"; then
                log_info "docs-watcher managed by PM2 (online); skipping local start"
                echo $$ > "$pid_file"
                return 0
            fi
        fi
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

    # Check port; if healthy service already listening, skip start
    if [ -n "$port" ]; then
        if curl -sf --max-time 5 "http://localhost:$port/health" >/dev/null 2>&1; then
            log_info "$name already running on port $port (health OK); skipping start"
            echo $$ > "$pid_file"; return 0
        fi
        if port_in_use "$port"; then
            if [ "$FORCE_KILL" = true ]; then
                kill_port "$port"
            else
                log_warning "Port $port already in use. Use --force-kill to restart"
                return 0
            fi
        fi
    fi

    # Install dependencies if needed
    if [ ! -d "$PROJECT_ROOT/$dir/node_modules" ]; then
        log_info "Installing dependencies for $name..."
        (cd "$PROJECT_ROOT/$dir" && npm install --silent)
    fi

    # Start service in background
    cd "$PROJECT_ROOT/$dir"

    # Use command from service config (supports inline env like "PORT=3401 npm start")
    if [ -z "$command" ]; then
        command="npm run dev"
    fi
    if [ $use_root_env_fallback -eq 1 ]; then
        nohup bash -lc "set -a; [ -f '$PROJECT_ROOT/.env' ] && . '$PROJECT_ROOT/.env'; [ -f '$PROJECT_ROOT/.env.local' ] && . '$PROJECT_ROOT/.env.local'; set +a; $command" > "$log_file" 2>&1 &
    else
        nohup bash -lc "$command" > "$log_file" 2>&1 &
    fi

    local pid=$!
    echo "$pid" > "$pid_file"

    # Retry logic with exponential backoff
    local attempt=1
    local success=false
    
    while [ $attempt -le $max_retries ]; do
        if [ $attempt -gt 1 ]; then
            local backoff=$(calculate_backoff $attempt)
            SERVICE_RETRY_COUNTS[$name]=$((attempt - 1))
            log_warning "$name retry attempt $attempt/$max_retries (waiting ${backoff}s)..."
            sleep $backoff
            
            # Clean up previous attempt
            if [ -f "$pid_file" ]; then
                local old_pid=$(cat "$pid_file")
                kill -9 "$old_pid" 2>/dev/null || true
                rm -f "$pid_file"
            fi
            
            # Restart service
            cd "$PROJECT_ROOT/$dir"
            nohup bash -lc "$command" > "$log_file" 2>&1 &
            pid=$!
            echo "$pid" > "$pid_file"
        fi
        
        # Wait for port to become active (or ensure process stays alive when no port is published)
        log_info "Waiting for $name to start (attempt $attempt/$max_retries)..."
        local max_wait=30
        if [ -z "$port" ]; then
            max_wait=5
        fi
        local waited=0

        while [ $waited -lt $max_wait ]; do
            if [ -z "$port" ]; then
                if kill -0 "$pid" 2>/dev/null; then
                    log_success "✓ $name started (PID: $pid)"
                    log_info "  Log: $log_file"
                    success=true
                    cd "$PROJECT_ROOT"
                    return 0
                fi
            else
                if lsof -i :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
                    log_success "✓ $name started (PID: $pid, Port: $port)"
                    log_info "  Log: $log_file"
                    
                    # Perform health check
                    if check_service_health "$name" "$port"; then
                        success=true
                        cd "$PROJECT_ROOT"
                        return 0  # Return immediately on success
                    else
                        log_warning "  Service started but health check inconclusive"
                        success=true
                        cd "$PROJECT_ROOT"
                        return 0  # Return immediately even if health check is inconclusive
                    fi
                fi
            fi

            # Check if process is still alive
            if ! kill -0 "$pid" 2>/dev/null; then
                log_error "$name failed to start (process died)"
                if [ $attempt -eq $max_retries ]; then
                    log_error "Last 20 lines of log:"
                    tail -n 20 "$log_file" | sed 's/^/    /'
                fi
                rm -f "$pid_file"
                cd "$PROJECT_ROOT"
                break  # Break inner loop, continue with retry
            fi

            sleep 1
            waited=$((waited + 1))
        done
        
        # If we succeeded (shouldn't reach here due to early return, but just in case)
        if [ "$success" = true ]; then
            return 0
        fi
        
        # If we're here, the service failed this attempt
        if [ $waited -ge $max_wait ]; then
            log_error "$name failed to start (timeout on attempt $attempt/$max_retries)"
        fi
        
        # Move to next attempt
        attempt=$((attempt + 1))
        
        # If we've exhausted all attempts, exit the function with error
        if [ $attempt -gt $max_retries ]; then
            break
        fi
    done

    # Only reached if all retries failed
    log_error "$name failed to start after $max_retries attempts"
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

    # Step 1: Start Docker stacks
    if [ "$SKIP_DOCKER" = false ]; then
        # Start in dependency order
        start_containers  # Starts database + apps stacks

        # Start docs stack
        start_docs_stack

        # Start RAG stack (optional)
        if [ "${WITH_VECTORS:-true}" = true ]; then
            start_rag_stack
        else
            log_info "Skipping RAG stack (use --with-vectors to enable)"
        fi

        # Start monitoring stack
        start_monitoring_stack

        # Start tools stack
        start_tools_stack

        # Start firecrawl stack
        start_firecrawl_stack

        echo ""
    else
        log_info "Skipping Docker containers (--skip-docker)"
        echo ""
    fi

    # Step 2: Start local development services
    if [ "$SKIP_SERVICES" = false ]; then
        section "Starting Local Development Services"

        # Resolve dependencies and get sorted order
        log_info "Resolving service dependencies..."
        if [ "$TARGET_MODE" = true ]; then
            log_info "Targeted services: ${REQUESTED_SERVICES[*]}"
            for svc in "${REQUESTED_SERVICES[@]}"; do
                add_target_service "$svc"
            done
            if [ ${#TARGET_SERVICES_MAP[@]} -gt 0 ]; then
                log_info "Resolved target set: ${!TARGET_SERVICES_MAP[@]}"
            fi
        fi
        local sorted_services
        sorted_services=$(resolve_dependencies SERVICES)
        log_info "Start order: $sorted_services"
        echo ""

        local failed_services=()
        # Start services in dependency order
        for service in $sorted_services; do
            if [ "$TARGET_MODE" = true ] && [ ${#TARGET_SERVICES_MAP[@]} -gt 0 ] && [[ -z "${TARGET_SERVICES_MAP[$service]:-}" ]]; then
                log_info "Skipping ${service} (not requested)"
                continue
            fi
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
        
        # Save metrics
        save_metrics
    else
        log_info "Skipping local services (--skip-services)"
    fi

    # Final summary
    local -a services_to_check=()
    if [ "$TARGET_MODE" = true ] && [ ${#TARGET_SERVICES_MAP[@]} -gt 0 ]; then
        services_to_check=("${!TARGET_SERVICES_MAP[@]}")
    else
        services_to_check=("${!SERVICES[@]}")
    fi
    local total_services=${#services_to_check[@]}
    local stopped_count=0
    for service in "${services_to_check[@]}"; do
        local pid_file="$SERVICES_DIR/${service}.pid"
        if [ ! -f "$pid_file" ]; then
            ((stopped_count++))
        fi
    done

    section "Summary ($total_services services, $stopped_count stopped)"

    # Ensure colors are defined for this section
    local CYAN='\033[0;36m'
    local NC='\033[0m'
    local BLUE='\033[0;34m'
    local GREEN='\033[0;32m'
    local YELLOW='\033[1;33m'
    local RED='\033[0;31m'

    echo -e "${CYAN}🐳 Docker Containers:${NC}"
    echo -e "  💹 TP Capital API:    http://localhost:4005"
    echo -e "  📚 Workspace API:     http://localhost:3200"
    echo -e "  💾 TimescaleDB:       postgresql://timescale:pass_timescale@localhost:5433/${TIMESCALEDB_DB:-tradingsystem}"
    echo -e "     ├─ pgAdmin:        http://localhost:${PGADMIN_HOST_PORT:-5050}"
    echo -e "     └─ pgWeb:          http://localhost:${PGWEB_PORT:-8081}"
    echo ""
    echo -e "${CYAN}🖥️  Local Dev Services:${NC}"
    echo -e "  📨 Telegram Gateway:      http://localhost:4006  (health: /health)"
    echo -e "  📊 Telegram Gateway API:  http://localhost:4010  (health: /health)"
    echo -e "  📚 DocsAPI:               http://localhost:3401  (docs-api container)"
    echo -e "  📖 Documentation Hub:     http://localhost:3400  (docs-hub container)"
    echo -e "  🎨 Dashboard:             http://localhost:3103"
    echo -e "  📊 Status API:            http://localhost:3500"
    if [ "$WITH_VECTORS" = true ]; then
      echo -e "  🔍 LlamaIndex Query:      http://localhost:8202  (health: /health)"
      echo -e "  📥 LlamaIndex Ingestion:  http://localhost:8201  (health: /health)"
      echo -e "  🧠 Qdrant Vector DB:      http://localhost:6333"
    else
      echo ""
      echo -e "  ⚠️  Vetores desativados (--skip-vectors). Sem Qdrant/Ollama/LlamaIndex os recursos RAG ficarão indisponíveis."
    fi
    echo ""
    echo -e "${CYAN}📝 Management:${NC}"
    echo -e "  Check status:  ${BLUE}bash scripts/status.sh${NC} (or: status)"
    echo -e "  Stop services: ${BLUE}bash scripts/stop.sh${NC}   (or: stop)"
    echo -e "  View logs:     ${BLUE}tail -f $SERVICES_DIR/<service>-$(date +%Y%m%d).log${NC}"
    echo ""
    echo -e "${CYAN}Legend:${NC}"
    echo -e "  ${GREEN}✓${NC} - Service running and healthy"
    echo -e "  ${YELLOW}⚠${NC} - Service running but health check failed"
    echo -e "  ${RED}✗${NC} - Service not running"
    echo -e "  ${BLUE}⊘${NC} - Health check skipped (--skip-health-checks)"
    echo ""
}

# Run main
main "$@"
