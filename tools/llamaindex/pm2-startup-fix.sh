#!/bin/bash
# ==============================================================================
# PM2 Startup Fix - Resolve PATH issues with spaces
# ==============================================================================
# This script configures PM2 to start on boot, handling PATH with spaces correctly
# Usage: bash pm2-startup-fix.sh
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  PM2 Startup Configuration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Get PM2 startup command WITHOUT executing
echo -e "${BLUE}[1/4]${NC} Generating startup script..."

PM2_PATH=$(which pm2)
NODE_PATH=$(dirname $(dirname $PM2_PATH))

echo -e "  Node path: ${GREEN}$NODE_PATH${NC}"
echo -e "  PM2 path: ${GREEN}$PM2_PATH${NC}"

# Step 2: Clean PATH (remove entries with spaces)
echo -e "\n${BLUE}[2/4]${NC} Cleaning PATH..."

CLEAN_PATH=$(echo "$PATH" | tr ':' '\n' | grep -v " " | tr '\n' ':' | sed 's/:$//')
echo -e "  Original entries: ${YELLOW}$(echo "$PATH" | tr ':' '\n' | wc -l)${NC}"
echo -e "  Cleaned entries: ${GREEN}$(echo "$CLEAN_PATH" | tr ':' '\n' | wc -l)${NC}"

# Step 3: Generate systemd service file
echo -e "\n${BLUE}[3/4]${NC} Creating systemd service..."

SERVICE_FILE="/tmp/pm2-marce.service"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=marce
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=$NODE_PATH/bin:/usr/bin:/bin
Environment=PM2_HOME=/home/marce/.pm2
PIDFile=/home/marce/.pm2/pm2.pid
Restart=on-failure

ExecStart=$PM2_PATH resurrect
ExecReload=$PM2_PATH reload all
ExecStop=$PM2_PATH kill

[Install]
WantedBy=multi-user.target
EOF

echo -e "  Service file created: ${GREEN}$SERVICE_FILE${NC}"

# Step 4: Instructions for sudo install
echo -e "\n${BLUE}[4/4]${NC} Installation instructions:"
echo ""
echo -e "${YELLOW}Run these commands to complete setup:${NC}"
echo ""
echo -e "${GREEN}sudo cp $SERVICE_FILE /etc/systemd/system/pm2-marce.service${NC}"
echo -e "${GREEN}sudo systemctl daemon-reload${NC}"
echo -e "${GREEN}sudo systemctl enable pm2-marce${NC}"
echo -e "${GREEN}sudo systemctl start pm2-marce${NC}"
echo ""
echo -e "${BLUE}To verify:${NC}"
echo -e "${GREEN}sudo systemctl status pm2-marce${NC}"
echo -e "${GREEN}pm2 list${NC}"
echo ""

# Option: Auto-execute if user wants
read -p "$(echo -e "${YELLOW}Execute commands now? (requires sudo) [y/N]:${NC} ")" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Installing systemd service...${NC}"

    sudo cp "$SERVICE_FILE" /etc/systemd/system/pm2-marce.service
    sudo systemctl daemon-reload
    sudo systemctl enable pm2-marce
    sudo systemctl start pm2-marce

    echo ""
    echo -e "${GREEN}✓ Installation complete!${NC}"
    echo ""
    echo -e "${BLUE}Status:${NC}"
    sudo systemctl status pm2-marce --no-pager -l

    echo ""
    echo -e "${BLUE}PM2 List:${NC}"
    pm2 list
else
    echo ""
    echo -e "${YELLOW}Skipped installation. Run commands above manually.${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
