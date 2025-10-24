#!/bin/bash
# ==============================================================================
# TradingSystem - Universal Stop Script
# ==============================================================================
# Stops all Node.js services
# Usage: bash scripts/universal/stop.sh [--force] [--clean-logs] [--help]
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVICES_DIR="$PROJECT_ROOT/logs/services"

# Configuration
FORCE=false
CLEAN_LOGS=false

# Service ports
PORTS=(3103 3200 3500 4005)

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
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force         Use SIGKILL instead of SIGTERM"
            echo "  --clean-logs    Remove service logs after stopping"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Function to stop service on port
stop_port() {
    local port=$1
    local pid=$(lsof -ti :"$port" 2>/dev/null)
    
    if [ -z "$pid" ]; then
        echo -e "${YELLOW}  No process on port $port${NC}"
        return 0
    fi
    
    if [ "$FORCE" = true ]; then
        echo -e "${RED}  Force killing process on port $port (PID: $pid)${NC}"
        kill -9 "$pid" 2>/dev/null || true
    else
        echo -e "${GREEN}  Gracefully stopping process on port $port (PID: $pid)${NC}"
        kill -15 "$pid" 2>/dev/null || true
    fi
    
    sleep 1
}

# Main execution
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  🛑 ${CYAN}TradingSystem - Universal Stop${NC}                      ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Stopping Node.js services...${NC}"
for port in "${PORTS[@]}"; do
    stop_port "$port"
done
echo ""

# Clean logs if requested
if [ "$CLEAN_LOGS" = true ]; then
    echo -e "${CYAN}Cleaning service logs...${NC}"
    if [ -d "$SERVICES_DIR" ]; then
        rm -f "$SERVICES_DIR"/*.log
        echo -e "${GREEN}  ✓ Logs cleaned${NC}"
    fi
    echo ""
fi

echo -e "${GREEN}✅ All services stopped${NC}"
echo ""


