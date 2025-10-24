#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Start Script
# ==============================================================================
# Starts all Node.js services and Docker containers with a single command
# Usage: bash scripts/universal/start.sh [--force-kill] [--help]
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Configuration
FORCE_KILL=false
SERVICES_DIR="$PROJECT_ROOT/logs/services"
mkdir -p "$SERVICES_DIR"

# Service definitions (name, directory, port)
declare -A SERVICES=(
    ["dashboard"]="$PROJECT_ROOT/frontend/dashboard:3103"
    ["workspace"]="$PROJECT_ROOT/backend/api/workspace:3200"
    ["status"]="$PROJECT_ROOT/apps/status:3500"
    ["tp-capital"]="$PROJECT_ROOT/apps/tp-capital:4005"
)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force-kill)
            FORCE_KILL=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force-kill    Kill processes on occupied ports before starting"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "Services started:"
            echo "  - Dashboard (3103)"
            echo "  - Workspace API (3200)"
            echo "  - Status API (3500)"
            echo "  - TP-Capital (4005)"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
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
        echo -e "${YELLOW}  Killing process on port $port (PID: $pid)${NC}"
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
}

# Function to start a service
start_service() {
    local name=$1
    local config=$2
    local dir=$(echo "$config" | cut -d':' -f1)
    local port=$(echo "$config" | cut -d':' -f2)
    local log_file="$SERVICES_DIR/${name}.log"

    echo -e "${CYAN}Starting ${name}...${NC}"

    # Check if already running
    if check_port "$port" > /dev/null; then
        if [ "$FORCE_KILL" = true ]; then
            kill_port "$port"
        else
            echo -e "${YELLOW}  Port $port already in use. Use --force-kill to restart${NC}"
            return 0
        fi
    fi

    # Start service in background
    cd "$dir"
    nohup npm run dev > "$log_file" 2>&1 &
    local pid=$!
    
    echo -e "${GREEN}  Started $name (PID: $pid, Port: $port)${NC}"
    echo -e "${BLUE}  Log: $log_file${NC}"
    
    cd "$PROJECT_ROOT"
}

# Main execution
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  🚀 ${CYAN}TradingSystem - Universal Start${NC}                     ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker containers are running
echo -e "${CYAN}Checking Docker containers...${NC}"
CONTAINER_COUNT=$(docker ps -q | wc -l)
if [ "$CONTAINER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}  ✓ $CONTAINER_COUNT Docker containers running${NC}"
else
    echo -e "${YELLOW}  ⚠ No Docker containers running. Start them with:${NC}"
    echo -e "${YELLOW}    bash scripts/docker/start-stacks.sh${NC}"
fi
echo ""

# Start all services
echo -e "${CYAN}Starting Node.js services...${NC}"
for service in dashboard workspace status tp-capital; do
    start_service "$service" "${SERVICES[$service]}"
done
echo ""

# Wait for services to initialize
echo -e "${CYAN}Waiting for services to initialize...${NC}"
sleep 5
echo ""

# Health check
echo -e "${CYAN}Running health checks...${NC}"
declare -A HEALTH_URLS=(
    ["Dashboard"]="http://localhost:3103"
    ["Workspace API"]="http://localhost:3200/health"
    ["Status API"]="http://localhost:3500/api/status"
    ["TP-Capital"]="http://localhost:4005/health"
)

for service in "${!HEALTH_URLS[@]}"; do
    url="${HEALTH_URLS[$service]}"
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ $service${NC}"
    else
        echo -e "${RED}  ✗ $service (may still be starting)${NC}"
    fi
done
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ✅ ${CYAN}Services Started Successfully${NC}                        ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Access your services:${NC}"
echo -e "  🖥️  Dashboard:     ${BLUE}http://localhost:3103${NC}"
echo -e "  📚 Workspace API:  ${BLUE}http://localhost:3200${NC}"
echo -e "  📊 Status API:     ${BLUE}http://localhost:3500${NC}"
echo -e "  💹 TP-Capital:     ${BLUE}http://localhost:4005${NC}"
echo ""
echo -e "${CYAN}Logs location:${NC} ${BLUE}$SERVICES_DIR${NC}"
echo -e "${CYAN}Stop services:${NC} ${BLUE}bash scripts/universal/stop.sh${NC}"
echo ""


