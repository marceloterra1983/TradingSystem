#!/bin/bash
# Post-attach script - Runs every time a terminal is attached
# Part of: Phase 1.5 - Dev Container Setup (Improvement Plan v1.0)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Display welcome message
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║           🚀 Welcome to TradingSystem Dev Container!         ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Display project info
echo -e "${BLUE}📁 Project:${NC} TradingSystem"
echo -e "${BLUE}🏠 Workspace:${NC} /workspace"
echo -e "${BLUE}👤 User:${NC} $(whoami)"

# Display environment info
echo -e "\n${BLUE}🔧 Environment:${NC}"
echo -e "  Node.js:  $(node --version)"
echo -e "  npm:      $(npm --version)"
echo -e "  Python:   $(python3 --version 2>&1)"
echo -e "  Docker:   $(docker --version 2>&1 | cut -d' ' -f3 | cut -d',' -f1)"

# Check if .env exists
if [ ! -f "/workspace/.env" ]; then
    echo -e "\n${YELLOW}⚠️  Warning: .env file not found!${NC}"
    echo -e "${YELLOW}   Run: cp .env.example .env && npm run env:validate${NC}"
fi

# Display useful commands
echo -e "\n${BLUE}💡 Quick Commands:${NC}"
echo -e "  ${GREEN}start${NC}              - Start all services (alias for npm run start)"
echo -e "  ${GREEN}stop${NC}               - Stop all services (alias for npm run stop)"
echo -e "  ${GREEN}npm-check${NC}          - Validate .env (alias for npm run env:validate)"
echo -e "  ${GREEN}dc${NC}                 - Docker Compose shortcut"
echo -e "  ${GREEN}ll${NC}                 - List files (ls -alh)"

# Display service ports
echo -e "\n${BLUE}🌐 Service Ports:${NC}"
echo -e "  Dashboard:         http://localhost:3103"
echo -e "  Documentation:     http://localhost:3404"
echo -e "  Workspace API:     http://localhost:3200"
echo -e "  TP Capital:        http://localhost:4005"
echo -e "  RAG System:        http://localhost:8202"

# Display documentation links
echo -e "\n${BLUE}📚 Documentation:${NC}"
echo -e "  • README:          cat README.md | less"
echo -e "  • CLAUDE.md:       cat CLAUDE.md | less"
echo -e "  • Quick Start:     cat .devcontainer/README.md | less"

# Activate Python venv automatically
if [ -d "/workspace/venv" ] && [ -z "$VIRTUAL_ENV" ]; then
    echo -e "\n${BLUE}🐍 Activating Python virtual environment...${NC}"
    source /workspace/venv/bin/activate
fi

echo -e "\n${GREEN}✨ Ready to code! Happy hacking! ✨${NC}\n"
