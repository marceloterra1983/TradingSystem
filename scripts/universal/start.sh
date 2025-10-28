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
    ["telegram-gateway"]="apps/telegram-gateway:4006:npm run dev:apps/telegram-gateway/.env::3"
    ["telegram-gateway-api"]="backend/api/telegram-gateway:4010:npm run dev:backend/api/telegram-gateway/.env:telegram-gateway:3"
    ["dashboard"]="frontend/dashboard:3103:npm run dev:::2"
    ["docusaurus"]="docs:3205:npm run docs:dev:::2"
    ["status"]="apps/status:3500:npm start:::2"
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
     - Telegram Gateway (4006) - Telegram MTProto gateway service  
     - Telegram Gateway API (4010) - REST API for gateway messages
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
    
    # Validate environment file if specified
    if [ -n "$env_file" ] && [ "$env_file" != "$command" ]; then
        if ! validate_service_env "$name" "$env_file"; then
            log_warning "$name requires configuration - continuing anyway..."
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
            if [ "$name" = "docusaurus" ]; then
                nohup npm run docs:dev > "$log_file" 2>&1 &
            else
                nohup npm run dev > "$log_file" 2>&1 &
            fi
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
    echo ""
    echo -e "${CYAN}🖥️  Local Dev Services:${NC}"
    echo -e "  📨 Telegram Gateway:      http://localhost:4006  (health: /health)"
    echo -e "  📊 Telegram Gateway API:  http://localhost:4010  (health: /health)"
    echo -e "  🎨 Dashboard:             http://localhost:3103"
    echo -e "  📖 Docusaurus:            http://localhost:3205"
    echo -e "  📊 Status API:            http://localhost:3500"
    echo ""
    echo -e "${CYAN}📝 Management:${NC}"
    echo -e "  Check status:  ${BLUE}bash scripts/universal/status.sh${NC} (or: status)"
    echo -e "  Stop services: ${BLUE}bash scripts/universal/stop.sh${NC}   (or: stop)"
    echo -e "  View logs:     ${BLUE}tail -f $SERVICES_DIR/<service>.log${NC}"
    echo ""
}

# Run main
main "$@"
