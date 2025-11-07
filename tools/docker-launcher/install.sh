#!/bin/bash
###############################################################################
# Docker Control Server - Installation Script
#
# Este script configura o Docker Control Server no sistema
# Precisa ser executado com privilégios de administrador (sudo)
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
SERVICE_FILE="${PROJECT_ROOT}/tools/docker-launcher/docker-control.service"
SYSTEMD_DIR="/etc/systemd/system"
USER="marce"

function print_header() {
  echo -e "${BLUE}"
  cat <<'EOF'
╔════════════════════════════════════════════════════════════════╗
║  Docker Control Server - Installation                         ║
╚════════════════════════════════════════════════════════════════╝
EOF
  echo -e "${NC}"
}

function check_requirements() {
  echo -e "${YELLOW}→ Checking requirements...${NC}"

  # Check if running as root
  if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}✗ This script must be run as root (use sudo)${NC}"
    exit 1
  fi

  # Check if docker is installed
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
  fi

  # Check if user exists
  if ! id "$USER" &> /dev/null; then
    echo -e "${RED}✗ User $USER does not exist${NC}"
    exit 1
  fi

  # Check if user is in docker group
  if ! groups "$USER" | grep -q docker; then
    echo -e "${YELLOW}! User $USER is not in docker group${NC}"
    echo -e "${YELLOW}  Adding user to docker group...${NC}"
    usermod -aG docker "$USER"
    echo -e "${GREEN}✓ User added to docker group${NC}"
    echo -e "${YELLOW}  Note: You may need to log out and back in for this to take effect${NC}"
  fi

  # Check if node is installed
  if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ All requirements met${NC}"
  echo ""
}

function install_service() {
  echo -e "${YELLOW}→ Installing systemd service...${NC}"

  # Copy service file
  cp "$SERVICE_FILE" "$SYSTEMD_DIR/docker-control.service"
  echo -e "${GREEN}✓ Service file copied${NC}"

  # Reload systemd
  systemctl daemon-reload
  echo -e "${GREEN}✓ Systemd reloaded${NC}"

  # Enable service
  systemctl enable docker-control.service
  echo -e "${GREEN}✓ Service enabled${NC}"

  # Start service
  systemctl start docker-control.service
  echo -e "${GREEN}✓ Service started${NC}"

  echo ""
}

function verify_installation() {
  echo -e "${YELLOW}→ Verifying installation...${NC}"

  # Check service status
  if systemctl is-active --quiet docker-control.service; then
    echo -e "${GREEN}✓ Service is running${NC}"
  else
    echo -e "${RED}✗ Service is not running${NC}"
    echo "Check logs with: sudo journalctl -u docker-control.service -f"
    exit 1
  fi

  # Test HTTP endpoint
  sleep 2
  if curl -s http://127.0.0.1:9876/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Server is responding${NC}"
  else
    echo -e "${RED}✗ Server is not responding${NC}"
    exit 1
  fi

  echo ""
}

function print_success() {
  echo -e "${GREEN}"
  cat <<'EOF'
╔════════════════════════════════════════════════════════════════╗
║  Installation Complete!                                        ║
╚════════════════════════════════════════════════════════════════╝
EOF
  echo -e "${NC}"

  echo "Service Status:"
  systemctl status docker-control.service --no-pager | head -5
  echo ""

  echo "Useful Commands:"
  echo "  • Check status:  sudo systemctl status docker-control"
  echo "  • View logs:     sudo journalctl -u docker-control -f"
  echo "  • Restart:       sudo systemctl restart docker-control"
  echo "  • Stop:          sudo systemctl stop docker-control"
  echo ""

  echo "CLI Usage:"
  echo "  • List:          tools/docker-launcher/docker-control-cli.sh list"
  echo "  • Restart:       tools/docker-launcher/docker-control-cli.sh restart <container>"
  echo ""

  echo "API Endpoint: http://127.0.0.1:9876"
  echo ""
}

# Main
print_header
check_requirements
install_service
verify_installation
print_success
