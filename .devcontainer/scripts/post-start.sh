#!/bin/bash
# Post-start script - Runs every time the container starts
# Part of: Phase 1.5 - Dev Container Setup (Improvement Plan v1.0)

set -e

echo "🔄 TradingSystem Dev Container - Post-Start"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check Docker daemon is running
echo -e "\n${BLUE}🐳 Checking Docker daemon...${NC}"
if docker info &> /dev/null; then
    echo -e "${GREEN}✅ Docker daemon is running${NC}"
else
    echo -e "${YELLOW}⚠️  Docker daemon is not running. Starting...${NC}"
    sudo service docker start || echo -e "${YELLOW}⚠️  Failed to start Docker daemon${NC}"
fi

# 2. Activate Python virtual environment
echo -e "\n${BLUE}🐍 Activating Python virtual environment...${NC}"
if [ -d "/workspace/venv" ]; then
    source /workspace/venv/bin/activate
    echo -e "${GREEN}✅ Python venv activated${NC}"
else
    echo -e "${YELLOW}⚠️  Python venv not found. Run post-create.sh first.${NC}"
fi

# 3. Check environment file
echo -e "\n${BLUE}⚙️  Checking environment configuration...${NC}"
if [ -f "/workspace/.env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found. Please create it from .env.example${NC}"
fi

# 4. Check if ports are available
echo -e "\n${BLUE}🔌 Checking port availability...${NC}"
PORTS_TO_CHECK=(9080 9081 8090 3404 3200 4005)
PORTS_IN_USE=()

for PORT in "${PORTS_TO_CHECK[@]}"; do
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
        PORTS_IN_USE+=($PORT)
    fi
done

if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  The following ports are already in use: ${PORTS_IN_USE[*]}${NC}"
    echo -e "${YELLOW}   You may need to stop other services or use different ports.${NC}"
else
    echo -e "${GREEN}✅ All ports are available${NC}"
fi

# 5. Start TradingSystem stacks (using existing compose files)
echo -e "\n${BLUE}🚀 Starting TradingSystem stacks...${NC}"
cd /workspace

# Check if any stack is already running
if docker ps --filter "label=com.tradingsystem.stack" --format "{{.Names}}" | grep -q .; then
    echo -e "${GREEN}✅ Some stacks are already running${NC}"
    docker ps --filter "label=com.tradingsystem.stack" --format "table {{.Names}}\t{{.Status}}" | head -10
else
    echo -e "${BLUE}Starting all stacks (this may take 1-2 minutes)...${NC}"
    bash .devcontainer/scripts/start-all-stacks.sh
fi

# 6. Display status
echo -e "\n${GREEN}✅ Post-start completed!${NC}"
echo -e "\n${BLUE}📊 Environment Status:${NC}"
echo -e "  Node.js: $(node --version)"
echo -e "  npm: $(npm --version)"
echo -e "  Python: $(python3 --version)"
echo -e "  Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"

echo -e "\n${BLUE}🌐 Service URLs (via Port Forwarding):${NC}"
echo -e "  ${GREEN}http://localhost:9080${NC}      - API Gateway (Traefik)"
echo -e "  ${GREEN}http://localhost:9081${NC}      - Traefik Dashboard"
echo -e "  ${GREEN}http://localhost:8090${NC}      - Dashboard UI"
echo -e "  ${GREEN}http://localhost:3404${NC}      - Documentation Hub"
echo -e "  ${GREEN}http://localhost:3200${NC}      - Workspace API"

echo -e "\n${BLUE}💡 Quick Commands:${NC}"
echo -e "  ${GREEN}docker ps --filter \"label=com.tradingsystem.stack\"${NC}  - Check services"
echo -e "  ${GREEN}bash .devcontainer/scripts/start-all-stacks.sh${NC}        - Start all stacks"
echo -e "  ${GREEN}bash .devcontainer/scripts/stop-all-stacks.sh${NC}         - Stop all stacks"
echo -e "  ${GREEN}docker compose -f <stack-file> logs -f${NC}                - View logs"
echo -e "\n"
