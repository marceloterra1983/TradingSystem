#!/bin/bash
# Post-attach script - Runs every time a terminal is attached

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
echo -e "  Dashboard:         ${GREEN}http://localhost:8090${NC}"
echo -e "  API Gateway:       ${GREEN}http://localhost:9080${NC} (Traefik dashboard on 9081)"
echo -e "  Documentation:     Via Gateway (check routes)"
echo -e "  Workspace API:     Via Gateway (port 3200)"
echo -e "  TP Capital:        ${GREEN}http://localhost:4005${NC}"
echo -e "  RAG System:        ${GREEN}http://localhost:8202${NC}"

# Display documentation links
echo -e "\n${BLUE}📚 Documentation:${NC}"
echo -e "  • README:          cat README.md | less"
echo -e "  • CLAUDE.md:       cat CLAUDE.md | less"
echo -e "  • Quick Start:     cat .devcontainer/README.md | less"

echo -e "\n${GREEN}✨ Ready to code! Happy hacking! ✨${NC}\n"
