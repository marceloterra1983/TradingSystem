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
SERVICES_DIR="${LOG_DIR:-/tmp/tradingsystem-logs}"
METRICS_FILE="$SERVICES_DIR/start-metrics.json"
mkdir -p "$SERVICES_DIR"

# Metrics tracking
declare -A SERVICE_START_TIMES
declare -A SERVICE_RETRY_COUNTS
START_SCRIPT_TIME=$(date +%s)

# Service definitions (name:directory:port:command:env_file:dependencies:max_retries)
# Format: name=directory:port:command:optional_env_file:dependencies:max_retries
# dependencies = comma-separated list of service names (empty if none)
# max_retries = number of restart attempts (default: 3)
# NOTE: Workspace and TP Capital now run as Docker containers only
declare -A SERVICES=(
    ["telegram-gateway"]="apps/telegram-gateway:4006:npm run dev:::3"
    ["telegram-gateway-api"]="backend/api/telegram-gateway:4010:npm run dev::telegram-gateway:3"
    ["docs-api"]="backend/api/documentation-api:3401:PORT=3401 npm start:::3"
    # Use npm run start (docs package maps start -> docs:dev) to avoid ':' in command string
    ["docusaurus"]="docs:3400:PORT=3400 npm run start:::2"
    ["dashboard"]="frontend/dashboard:3103:npm run dev::docs-api,docusaurus:2"
    ["status"]="apps/status:3500:npm start:::2"
    ["docs-watcher"]="tools/llamaindex::npm run watch::docs-api:1"
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
        --with-vectors)
            WITH_VECTORS=true
            shift
            ;;
        --skip-vectors|--no-vectors)
            WITH_VECTORS=false
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
  --with-vectors     Start Qdrant + Ollama + LlamaIndex (default behaviour)
  --skip-vectors     Skip starting Qdrant/Ollama/LlamaIndex
  --help, -h         Show this help message

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
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

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

    # Start database stack (TimescaleDB) first if compose file exists
    local DB_COMPOSE_FILE="$PROJECT_ROOT/tools/compose/docker-compose.timescale.yml"
    if [ -f "$DB_COMPOSE_FILE" ]; then
        # Provide sane defaults for image variables when not set in .env
        export IMG_DATA_TIMESCALEDB="${IMG_DATA_TIMESCALEDB:-timescale/timescaledb}"
        export IMG_DATA_QDRANT="${IMG_DATA_QDRANT:-qdrant/qdrant}"
        export IMG_VERSION="${IMG_VERSION:-latest}"
        log_info "Starting TimescaleDB stack..."
        if [ "$FORCE_KILL" = true ]; then
            # Free host DB ports
            for p in 5433 8081 5050; do
                if port_in_use "$p"; then
                    log_warning "Killing host process on port $p (--force-kill)"
                    kill_port "$p"
                fi
            done
            # Only remove DB container if unhealthy or not running
            if docker ps -a --format '{{.Names}}' | grep -qx "data-timescaledb"; then
                db_state=$(docker inspect --format='{{.State.Status}}' data-timescaledb 2>/dev/null || echo unknown)
                db_health=$(docker inspect --format='{{.State.Health.Status}}' data-timescaledb 2>/dev/null || echo none)
                if [ "$db_state" != "running" ] || { [ "$db_health" != "healthy" ] && [ "$db_health" != "none" ]; }; then
                    log_warning "Removing 'data-timescaledb' (state=$db_state, health=$db_health)"
                    docker rm -f data-timescaledb >/dev/null 2>&1 || true
                fi
            fi
        fi

        if docker ps -a --format '{{.Names}}' | grep -qx "data-timescaledb"; then
            db_state=$(docker inspect --format='{{.State.Status}}' data-timescaledb 2>/dev/null || echo unknown)
            if [ "$db_state" = "running" ]; then
                log_info "TimescaleDB already running (data-timescaledb)"
            else
                log_info "Starting existing TimescaleDB container (data-timescaledb)"
                docker start data-timescaledb >/dev/null || true
            fi
        else
            docker compose -p database -f "$DB_COMPOSE_FILE" up -d timescaledb >/dev/null
        fi

        # Wait health for TimescaleDB (container name: data-timescaledb)
        log_info "Waiting for TimescaleDB health..."
        local max_db_wait=60
        local waited_db=0
        while [ $waited_db -lt $max_db_wait ]; do
            local db_health
            db_health=$(docker inspect --format='{{.State.Health.Status}}' data-timescaledb 2>/dev/null || echo starting)
            if [ "$db_health" = "healthy" ]; then
                log_success "✓ TimescaleDB healthy"
                break
            fi
            sleep 2
            waited_db=$((waited_db + 2))
        done
        if [ $waited_db -ge $max_db_wait ]; then
            log_warning "⚠ TimescaleDB health check timed out; continuing"
        fi
    else
        log_warning "Timescale compose not found; assuming DB is already available"
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

    # Remove conflicting containers by name when --force-kill (handles exited containers too)
    if [ "$FORCE_KILL" = true ]; then
        for cname in apps-workspace apps-tp-capital; do
            if docker ps -a --format '{{.Names}}' | grep -qx "$cname"; then
                state=$(docker inspect --format='{{.State.Status}}' "$cname" 2>/dev/null || echo unknown)
                health=$(docker inspect --format='{{.State.Health.Status}}' "$cname" 2>/dev/null || echo none)
                if [ "$state" != "running" ] || { [ "$health" != "healthy" ] && [ "$health" != "none" ]; }; then
                    log_warning "Removing '$cname' (state=$state, health=$health)"
                    docker rm -f "$cname" >/dev/null 2>&1 || true
                fi
            fi
        done
    fi

    # If already running and not forcing, skip
    if docker ps --format '{{.Names}}' | grep -qE '^(apps-tp-capital|apps-workspace)$'; then
        log_info "Application containers already running"
        if [ "$FORCE_KILL" = true ]; then
            ws_health=$(docker inspect --format='{{.State.Health.Status}}' apps-workspace 2>/dev/null || echo none)
            tp_health=$(docker inspect --format='{{.State.Health.Status}}' apps-tp-capital 2>/dev/null || echo none)
            if [ "$ws_health" = "healthy" ] && [ "$tp_health" = "healthy" ]; then
                log_info "Containers healthy; skipping restart (ignoring --force-kill)"
                return 0
            else
                log_info "Restarting containers (--force-kill)..."
                docker compose -p apps -f "$COMPOSE_FILE" down || true
                sleep 2
            fi
        else
            return 0
        fi
    fi

    # Start containers
    log_info "Starting apps stack (tp-capital, workspace)..."
    docker compose -p apps -f "$COMPOSE_FILE" up -d --force-recreate

    # Wait for containers to be healthy
    log_info "Waiting for containers to be healthy..."
    local max_wait=60
    local waited=0

    while [ $waited -lt $max_wait ]; do
        local ws_health tp_health
        ws_health=$(docker inspect --format='{{.State.Health.Status}}' apps-workspace 2>/dev/null || echo starting)
        tp_health=$(docker inspect --format='{{.State.Health.Status}}' apps-tp-capital 2>/dev/null || echo starting)

        if [ "$ws_health" = "healthy" ] && [ "$tp_health" = "healthy" ]; then
            log_success "✓ App containers are healthy"
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
    log_info "  - tp-capital-api:    http://localhost:4005"
    log_info "  - workspace-service: http://localhost:3200"
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
    
    # Try HTTP health check if available
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
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
    "totalServices": ${#SERVICES[@]},
    "successfulServices": $(ls -1 "$SERVICES_DIR"/*.pid 2>/dev/null | wc -l),
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
    
    local log_file="$SERVICES_DIR/${name}.log"
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
        if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
            log_info "$name already running on port $port (health OK); skipping start"
            echo $$ > "$pid_file"; return 0
        fi
        # Special-case: docs-api — skip local start if docker container is exposing 3401
        if [ "$name" = "docs-api" ]; then
            if docker ps --format '{{.Names}}' | grep -qx docs-api; then
                log_info "docs-api container detected; skipping local docs-api"
                echo $$ > "$pid_file"; return 0
            fi
        fi
        if port_in_use "$port"; then
            if [ "$FORCE_KILL" = true ]; then
                # Avoid killing docker-proxy for containerized docs-api; skip instead
                if [ "$name" = "docs-api" ] && docker ps --format '{{.Names}}' | grep -qx docs-api; then
                    log_info "docs-api port in use by container; skipping local start"
                    echo $$ > "$pid_file"; return 0
                fi
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
        
        # Wait for port to become active
        log_info "Waiting for $name to start (attempt $attempt/$max_retries)..."
        local max_wait=30
        local waited=0

        while [ $waited -lt $max_wait ]; do
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

    # Step 1: Start Docker containers
    if [ "$SKIP_DOCKER" = false ]; then
        start_containers
        echo ""
    else
        log_info "Skipping Docker containers (--skip-docker)"
        echo ""
    fi

    # Optional: Start vectors stack (Qdrant + Ollama + LlamaIndex)
    if [ "$WITH_VECTORS" = true ]; then
        section "Starting Vectors Stack (Qdrant + Ollama + LlamaIndex)"
        local vec_script="$PROJECT_ROOT/scripts/docker/start-llamaindex-local.sh"
        if [ -f "$vec_script" ]; then
            bash "$vec_script"
        else
            log_warning "Vectors start script not found. Skipping."
        fi
        echo ""
    fi

    # Step 2: Start local development services
    if [ "$SKIP_SERVICES" = false ]; then
        section "Starting Local Development Services"

        # Resolve dependencies and get sorted order
        log_info "Resolving service dependencies..."
        local sorted_services
        sorted_services=$(resolve_dependencies SERVICES)
        log_info "Start order: $sorted_services"
        echo ""

        local failed_services=()
        # Start services in dependency order
        for service in $sorted_services; do
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
    section "Summary"

    # Ensure colors are defined for this section
    local CYAN='\033[0;36m'
    local NC='\033[0m'
    local BLUE='\033[0;34m'

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
    echo -e "  📚 DocsAPI:               http://localhost:3401  (health: /health)"
    echo -e "  📖 Docusaurus:            http://localhost:3400"
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
    echo -e "  Check status:  ${BLUE}bash scripts/universal/status.sh${NC} (or: status)"
    echo -e "  Stop services: ${BLUE}bash scripts/universal/stop.sh${NC}   (or: stop)"
    echo -e "  View logs:     ${BLUE}tail -f $SERVICES_DIR/<service>.log${NC}"
    echo ""
}

# Run main
main "$@"
