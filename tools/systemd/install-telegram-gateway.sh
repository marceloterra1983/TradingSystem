#!/bin/bash
# Installation script for Telegram Gateway systemd service
# Run as root or with sudo

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Telegram Gateway - systemd Installation${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}ERROR: This script must be run as root${NC}"
   echo "Usage: sudo bash install-telegram-gateway.sh"
   exit 1
fi

# Check if .env file exists
if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
    echo -e "${RED}ERROR: .env file not found at $PROJECT_ROOT/.env${NC}"
    echo "Please create .env from .env.example first"
    exit 1
fi

# Check if Telegram credentials are configured
if ! grep -q "TELEGRAM_API_ID=" "$PROJECT_ROOT/.env" || \
   ! grep -q "TELEGRAM_API_HASH=" "$PROJECT_ROOT/.env" || \
   ! grep -q "TELEGRAM_BOT_TOKEN=" "$PROJECT_ROOT/.env"; then
    echo -e "${YELLOW}WARNING: Telegram credentials not fully configured in .env${NC}"
    echo "Service will fail to start without proper credentials"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    echo "Please install Node.js 20+ first"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [[ "$NODE_VERSION" -lt 18 ]]; then
    echo -e "${YELLOW}WARNING: Node.js version $NODE_VERSION detected. Recommended: 20+${NC}"
fi

# Install dependencies
echo -e "${GREEN}[1/6]${NC} Installing npm dependencies..."
cd "$PROJECT_ROOT/apps/telegram-gateway"
npm install --production

# Create required directories
echo -e "${GREEN}[2/6]${NC} Creating required directories..."
mkdir -p "$PROJECT_ROOT/apps/telegram-gateway/data"
mkdir -p "$PROJECT_ROOT/apps/telegram-gateway/logs"
chown -R marce:marce "$PROJECT_ROOT/apps/telegram-gateway/data"
chown -R marce:marce "$PROJECT_ROOT/apps/telegram-gateway/logs"

# Copy systemd service file
echo -e "${GREEN}[3/6]${NC} Installing systemd service..."
cp "$SCRIPT_DIR/telegram-gateway.service" /etc/systemd/system/telegram-gateway.service
chmod 644 /etc/systemd/system/telegram-gateway.service

# Reload systemd
echo -e "${GREEN}[4/6]${NC} Reloading systemd daemon..."
systemctl daemon-reload

# Enable service
echo -e "${GREEN}[5/6]${NC} Enabling service to start on boot..."
systemctl enable telegram-gateway.service

# Ask if user wants to start now
echo -e "${GREEN}[6/6]${NC} Installation complete!"
echo ""
echo -e "${YELLOW}Service is installed but not started yet.${NC}"
echo ""
echo "Available commands:"
echo "  sudo systemctl start telegram-gateway    # Start the service"
echo "  sudo systemctl stop telegram-gateway     # Stop the service"
echo "  sudo systemctl restart telegram-gateway  # Restart the service"
echo "  sudo systemctl status telegram-gateway   # Check service status"
echo "  sudo journalctl -u telegram-gateway -f   # View logs (follow mode)"
echo ""

read -p "Do you want to start the service now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Starting service...${NC}"
    systemctl start telegram-gateway.service
    sleep 2
    systemctl status telegram-gateway.service --no-pager
    echo ""
    echo -e "${GREEN}Service started successfully!${NC}"
    echo "View logs with: sudo journalctl -u telegram-gateway -f"
else
    echo -e "${YELLOW}Service not started. Start manually when ready.${NC}"
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
