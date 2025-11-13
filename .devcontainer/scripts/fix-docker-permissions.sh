#!/bin/bash
# Fix Docker socket permissions for dev container
# Part of: Dev Container Setup - TradingSystem

set -e

echo "🔧 Fixing Docker Socket Permissions"
echo "===================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run with sudo${NC}"
    echo -e "${YELLOW}Usage: sudo bash $0${NC}"
    exit 1
fi

# 1. Check Docker socket
echo -e "\n${BLUE}🔍 Checking Docker socket...${NC}"
if [ -S "/var/run/docker-host.sock" ]; then
    echo -e "${GREEN}✅ Docker socket found: /var/run/docker-host.sock${NC}"
    ls -la /var/run/docker-host.sock
else
    echo -e "${RED}❌ Docker socket not found${NC}"
    exit 1
fi

# 2. Get current socket group
SOCKET_GROUP=$(stat -c '%g' /var/run/docker-host.sock)
echo -e "\n${BLUE}Current socket group: ${SOCKET_GROUP}${NC}"

# 3. Add vscode user to the socket group
echo -e "\n${BLUE}📝 Adding vscode user to group ${SOCKET_GROUP}...${NC}"
if usermod -aG ${SOCKET_GROUP} vscode; then
    echo -e "${GREEN}✅ User vscode added to group ${SOCKET_GROUP}${NC}"
else
    echo -e "${YELLOW}⚠️  Failed to add user to group. Trying alternative method...${NC}"

    # Alternative: Change socket permissions
    echo -e "\n${BLUE}🔧 Changing socket permissions...${NC}"
    chmod 666 /var/run/docker-host.sock
    echo -e "${GREEN}✅ Socket permissions changed to 666${NC}"
fi

# 4. Also fix /var/run/docker.sock if it exists
if [ -S "/var/run/docker.sock" ]; then
    echo -e "\n${BLUE}🔧 Fixing /var/run/docker.sock as well...${NC}"
    chmod 666 /var/run/docker.sock
    echo -e "${GREEN}✅ /var/run/docker.sock permissions fixed${NC}"
fi

# 5. Verify permissions
echo -e "\n${BLUE}✅ Verification:${NC}"
ls -la /var/run/docker*.sock

# 6. Test Docker access
echo -e "\n${BLUE}🧪 Testing Docker access...${NC}"
if su - vscode -c "docker info" &> /dev/null; then
    echo -e "${GREEN}✅ Docker access working for vscode user${NC}"
else
    echo -e "${YELLOW}⚠️  Docker access test failed. User may need to logout/login.${NC}"
fi

echo -e "\n${GREEN}✅ Docker permissions fixed!${NC}"
echo -e "${YELLOW}💡 If Docker still doesn't work, try:${NC}"
echo -e "${YELLOW}   1. Logout and login again (newgrp docker)${NC}"
echo -e "${YELLOW}   2. Restart the dev container${NC}"
