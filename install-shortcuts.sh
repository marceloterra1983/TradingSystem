#!/bin/bash
# ==============================================================================
# TradingSystem - Install Shortcuts
# ==============================================================================
# Installs global shortcuts for universal commands
# Usage: bash install-shortcuts.sh
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts/universal"

# Detect shell
SHELL_RC=""
if [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
else
    SHELL_RC="$HOME/.bashrc"
fi

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  🔧 ${CYAN}TradingSystem - Install Shortcuts${NC}                   ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Make scripts executable
echo -e "${CYAN}Making scripts executable...${NC}"
chmod +x "$SCRIPTS_DIR"/*.sh
echo -e "${GREEN}  ✓ Scripts are now executable${NC}"
echo ""

# Add aliases to shell config
echo -e "${CYAN}Installing aliases to ${BLUE}${SHELL_RC}${NC}"

# Remove old aliases if they exist
sed -i '/# TradingSystem Universal Commands/,/# End TradingSystem Universal Commands/d' "$SHELL_RC" 2>/dev/null || true

# Add new aliases
cat >> "$SHELL_RC" << EOF

# TradingSystem Universal Commands
alias start='bash $SCRIPTS_DIR/start.sh'
alias stop='bash $SCRIPTS_DIR/stop.sh'
alias status='bash $SCRIPTS_DIR/status.sh'
alias ts-start='bash $SCRIPTS_DIR/start.sh'
alias ts-stop='bash $SCRIPTS_DIR/stop.sh'
alias ts-status='bash $SCRIPTS_DIR/status.sh'
# End TradingSystem Universal Commands
EOF

echo -e "${GREEN}  ✓ Aliases installed${NC}"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ✅ ${CYAN}Installation Complete!${NC}                              ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Available commands:${NC}"
echo -e "  ${BLUE}start${NC}      - Start all services"
echo -e "  ${BLUE}stop${NC}       - Stop all services"
echo -e "  ${BLUE}status${NC}     - Show service status"
echo ""
echo -e "${CYAN}Prefixed commands (avoid conflicts):${NC}"
echo -e "  ${BLUE}ts-start${NC}   - Start all services"
echo -e "  ${BLUE}ts-stop${NC}    - Stop all services"
echo -e "  ${BLUE}ts-status${NC}  - Show service status"
echo ""
echo -e "${YELLOW}⚠️  Reload your shell to use the commands:${NC}"
echo -e "  ${BLUE}source ${SHELL_RC}${NC}"
echo -e "  ${BLUE}# or${NC}"
echo -e "  ${BLUE}exec \$SHELL${NC}"
echo ""
echo -e "${CYAN}Quick start:${NC}"
echo -e "  ${BLUE}source ${SHELL_RC} && start${NC}"
echo ""


