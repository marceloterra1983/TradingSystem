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
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

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

# Create wrapper scripts in .bin directory
BIN_DIR="$PROJECT_ROOT/.bin"
mkdir -p "$BIN_DIR"

echo -e "${CYAN}Creating wrapper scripts...${NC}"

# Create start wrapper
cat > "$BIN_DIR/start" << 'EOF'
#!/bin/bash
exec bash "$HOME/Projetos/TradingSystem/scripts/start.sh" "$@"
EOF

# Create stop wrapper
cat > "$BIN_DIR/stop" << 'EOF'
#!/bin/bash
exec bash "$HOME/Projetos/TradingSystem/scripts/stop.sh" "$@"
EOF

# Create status wrapper
cat > "$BIN_DIR/status" << 'EOF'
#!/bin/bash
exec bash "$HOME/Projetos/TradingSystem/scripts/status.sh" "$@"
EOF

chmod +x "$BIN_DIR"/*

echo -e "${GREEN}  ✓ Wrapper scripts created${NC}"
echo ""

# Add .bin to PATH in shell config
echo -e "${CYAN}Adding .bin directory to PATH in ${BLUE}${SHELL_RC}${NC}"

# Remove old PATH entry if it exists
sed -i '/# TradingSystem Universal Commands/,/# End TradingSystem Universal Commands/d' "$SHELL_RC" 2>/dev/null || true

# Add new PATH entry
cat >> "$SHELL_RC" << 'EOF'

# TradingSystem Universal Commands
export PATH="$HOME/Projetos/TradingSystem/.bin:$PATH"
# End TradingSystem Universal Commands
EOF

echo -e "${GREEN}  ✓ PATH updated${NC}"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ✅ ${CYAN}Installation Complete!${NC}                              ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Available commands (from any directory):${NC}"
echo -e "  ${BLUE}start${NC}      - Start all services"
echo -e "  ${BLUE}stop${NC}       - Stop all services"
echo -e "  ${BLUE}status${NC}     - Show service status"
echo ""
echo -e "${YELLOW}⚠️  Reload your shell to use the commands:${NC}"
echo -e "  ${BLUE}source ${SHELL_RC}${NC}"
echo -e "  ${BLUE}# or${NC}"
echo -e "  ${BLUE}exec \$SHELL${NC}"
echo ""
echo -e "${CYAN}Quick start:${NC}"
echo -e "  ${BLUE}source ${SHELL_RC} && start${NC}"
echo ""


