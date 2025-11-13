#!/bin/bash
# ============================================================================
# TradingSystem - Complete Environment Cleanup
# ============================================================================
# WARNING: This script will:
#   - Stop ALL Docker containers
#   - Kill processes on ports: 9080, 9081, 8090, 3404, 3200, 3405, 4005
#   - Remove orphan containers
#   - Clean Docker networks (optional)
#
# Run with: sudo bash .devcontainer/scripts/cleanup-environment.sh
# ============================================================================

set -e

echo "🧹 TradingSystem - Complete Environment Cleanup"
echo "================================================"
echo ""
echo "⚠️  WARNING: This will stop all containers and kill port processes!"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================================================
# Step 1: Stop all Docker containers
# ============================================================================
echo -e "${BLUE}1️⃣  Stopping all Docker containers...${NC}"
CONTAINERS=$(docker ps -aq)
if [ -n "$CONTAINERS" ]; then
    docker stop $(docker ps -aq) 2>/dev/null || true
    echo -e "${GREEN}✅ All containers stopped${NC}"
else
    echo -e "${YELLOW}⚠️  No running containers found${NC}"
fi
echo ""

# ============================================================================
# Step 2: Remove all stopped containers (optional - cleanup)
# ============================================================================
echo -e "${BLUE}2️⃣  Removing stopped containers...${NC}"
STOPPED=$(docker ps -aq --filter "status=exited")
if [ -n "$STOPPED" ]; then
    docker rm $(docker ps -aq --filter "status=exited") 2>/dev/null || true
    echo -e "${GREEN}✅ Stopped containers removed${NC}"
else
    echo -e "${YELLOW}⚠️  No stopped containers to remove${NC}"
fi
echo ""

# ============================================================================
# Step 3: Kill processes on specific ports
# ============================================================================
echo -e "${BLUE}3️⃣  Killing processes on TradingSystem ports...${NC}"
PORTS=(9080 9081 8090 3404 3200 3405 4005 4008 4010)

for PORT in "${PORTS[@]}"; do
    PID=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo -e "${YELLOW}   Port $PORT → Killing PID: $PID${NC}"
        kill -9 $PID 2>/dev/null || true
        echo -e "${GREEN}   ✅ Port $PORT freed${NC}"
    else
        echo -e "${GREEN}   ✅ Port $PORT already free${NC}"
    fi
done
echo ""

# ============================================================================
# Step 4: Verify ports are free
# ============================================================================
echo -e "${BLUE}4️⃣  Verifying ports are free...${NC}"
STILL_IN_USE=()
for PORT in "${PORTS[@]}"; do
    if lsof -ti:$PORT >/dev/null 2>&1; then
        STILL_IN_USE+=($PORT)
    fi
done

if [ ${#STILL_IN_USE[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All ports are free!${NC}"
else
    echo -e "${RED}❌ The following ports are still in use: ${STILL_IN_USE[*]}${NC}"
    echo -e "${YELLOW}   Try running: lsof -i :<port> to investigate${NC}"
fi
echo ""

# ============================================================================
# Step 5: Show current system state
# ============================================================================
echo -e "${BLUE}5️⃣  Current system state:${NC}"
echo ""
echo -e "${BLUE}Running containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No containers running"
echo ""

echo -e "${BLUE}Port usage:${NC}"
netstat -tuln | grep -E ':(9080|9081|8090|3404|3200|3405|4005)' || echo "No TradingSystem ports in use"
echo ""

# ============================================================================
# Done
# ============================================================================
echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review the output above"
echo "  2. Start services: bash .devcontainer/scripts/start-all-stacks.sh"
echo ""
