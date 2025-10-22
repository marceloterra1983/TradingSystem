#!/bin/bash

# Terminal Copy Button Extension - Installation Script
# Installs the extension to Cursor/VSCode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_NAME="terminal-copy-button"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Terminal Copy Button Extension - Installer${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detect Cursor or VSCode
CURSOR_DIR="$HOME/.cursor/extensions"
VSCODE_DIR="$HOME/.vscode/extensions"
VSCODE_SERVER_DIR="$HOME/.vscode-server/extensions"

TARGET_DIR=""

if [ -d "$CURSOR_DIR" ]; then
    echo -e "${GREEN}✓${NC} Cursor detected"
    TARGET_DIR="$CURSOR_DIR"
elif [ -d "$VSCODE_DIR" ]; then
    echo -e "${GREEN}✓${NC} VSCode detected"
    TARGET_DIR="$VSCODE_DIR"
elif [ -d "$VSCODE_SERVER_DIR" ]; then
    echo -e "${GREEN}✓${NC} VSCode Server detected"
    TARGET_DIR="$VSCODE_SERVER_DIR"
else
    echo -e "${YELLOW}⚠${NC}  No Cursor/VSCode installation found"
    echo ""
    echo "Creating Cursor extensions directory..."
    mkdir -p "$CURSOR_DIR"
    TARGET_DIR="$CURSOR_DIR"
fi

INSTALL_PATH="$TARGET_DIR/$EXTENSION_NAME"

echo -e "${BLUE}→${NC} Target: $INSTALL_PATH"
echo ""

# Remove old installation
if [ -d "$INSTALL_PATH" ]; then
    echo -e "${YELLOW}⚠${NC}  Removing old installation..."
    rm -rf "$INSTALL_PATH"
fi

# Copy extension
echo -e "${BLUE}→${NC} Installing extension..."
mkdir -p "$INSTALL_PATH"
cp -r "$SCRIPT_DIR"/* "$INSTALL_PATH/"

# Verify installation
if [ -f "$INSTALL_PATH/package.json" ]; then
    echo -e "${GREEN}✓${NC} Extension installed successfully!"
else
    echo -e "${RED}✗${NC} Installation failed"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   Installation Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Reload Cursor/VSCode:"
echo -e "   ${BLUE}Ctrl+Shift+P${NC} → ${BLUE}Developer: Reload Window${NC}"
echo ""
echo "2. Look for the button in the status bar (bottom-right):"
echo -e "   ${GREEN}$(echo -e '\u00A0')📋 Copy Terminal${NC}"
echo ""
echo "3. Click the button and choose a capture method:"
echo "   • Capture Selection (fastest)"
echo "   • Capture Visible Area (with history)"
echo "   • Manual Paste (fallback)"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Offer to reload if cursor/code is running
if command -v cursor &> /dev/null; then
    read -p "Reload Cursor now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}→${NC} Reloading Cursor..."
        # Note: This won't work automatically, user needs to manually reload
        echo -e "${YELLOW}⚠${NC}  Please manually reload: Ctrl+Shift+P → Developer: Reload Window"
    fi
fi

echo -e "${GREEN}Done!${NC}"
