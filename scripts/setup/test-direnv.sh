#!/usr/bin/env bash
# Test script for direnv + .envrc setup
# This verifies the .envrc configuration without requiring direnv to be installed

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "🧪 TradingSystem - direnv Test Suite"
echo "========================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "$(dirname "$(dirname "$0")")")" && pwd)"
cd "$PROJECT_ROOT"

# Test 1: Check if .envrc exists
echo -n "1. Checking if .envrc exists... "
if [ -f ".envrc" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL - .envrc not found!${NC}"
    exit 1
fi

# Test 2: Validate .envrc syntax (bash)
echo -n "2. Validating .envrc syntax... "
if bash -n .envrc 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL - Syntax errors in .envrc!${NC}"
    exit 1
fi

# Test 3: Check if venv exists
echo -n "3. Checking if Python venv exists... "
if [ -d "venv" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${YELLOW}⚠️  WARN - venv/ not found (create with: python3 -m venv venv)${NC}"
fi

# Test 4: Check if .bin directory exists (for PATH_add)
echo -n "4. Checking if .bin directory exists... "
if [ -d ".bin" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${YELLOW}⚠️  WARN - .bin/ not found (will be created by install-shortcuts.sh)${NC}"
fi

# Test 5: Check if direnv is installed
echo -n "5. Checking if direnv is installed... "
if command -v direnv &> /dev/null; then
    echo -e "${GREEN}✅ PASS - $(direnv version)${NC}"
    DIRENV_INSTALLED=true
else
    echo -e "${YELLOW}⚠️  NOT INSTALLED - Run: bash scripts/setup/setup-direnv.sh${NC}"
    DIRENV_INSTALLED=false
fi

# Test 6: Check if direnv hook is configured (only if direnv is installed)
if [ "$DIRENV_INSTALLED" = true ]; then
    echo -n "6. Checking if direnv hook is configured... "
    SHELL_NAME=$(basename "$SHELL")
    case "$SHELL_NAME" in
        bash)
            SHELL_RC="$HOME/.bashrc"
            ;;
        zsh)
            SHELL_RC="$HOME/.zshrc"
            ;;
        *)
            echo -e "${YELLOW}⚠️  SKIP - Unsupported shell: $SHELL_NAME${NC}"
            SHELL_RC=""
            ;;
    esac
    
    if [ -n "$SHELL_RC" ] && [ -f "$SHELL_RC" ]; then
        if grep -q "direnv hook" "$SHELL_RC" 2>/dev/null; then
            echo -e "${GREEN}✅ PASS${NC}"
        else
            echo -e "${RED}❌ FAIL - Hook not found in $SHELL_RC${NC}"
            echo "   Run: eval \"\$(direnv hook $SHELL_NAME)\" >> $SHELL_RC"
        fi
    fi
fi

# Test 7: Check if .envrc is allowed (only if direnv is installed)
if [ "$DIRENV_INSTALLED" = true ]; then
    echo -n "7. Checking if .envrc is allowed... "
    if direnv status 2>/dev/null | grep -q "Found RC allowed true" || direnv status 2>/dev/null | grep -q "Loaded RC allowed true"; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${YELLOW}⚠️  NOT ALLOWED - Run: direnv allow${NC}"
    fi
fi

# Test 8: Check if .gitignore allows .envrc
echo -n "8. Checking if .gitignore allows .envrc... "
if grep -q "^!\.envrc" .gitignore 2>/dev/null || ! grep -q "^\.envrc" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL - .envrc is blocked in .gitignore!${NC}"
fi

# Test 9: Check if .bashrc backup exists
echo -n "9. Checking if .bashrc backup exists... "
if ls backups/dotfiles/.bashrc.backup-* 1>/dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${YELLOW}⚠️  INFO - No backup found (migration not yet done)${NC}"
fi

# Test 10: Verify .bashrc is removed from root
echo -n "10. Verifying .bashrc is removed from root... "
if [ ! -f ".bashrc" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${YELLOW}⚠️  WARN - .bashrc still exists (old approach)${NC}"
fi

echo ""
echo "========================================="
echo "📊 Test Summary"
echo "========================================="
echo ""

if [ "$DIRENV_INSTALLED" = true ]; then
    echo -e "${GREEN}✅ direnv is installed and configured!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. direnv allow    (if not allowed yet)"
    echo "  2. cd ../ && cd $PROJECT_ROOT    (test auto-activation)"
else
    echo -e "${YELLOW}⚠️  direnv is NOT installed${NC}"
    echo ""
    echo "To complete setup:"
    echo "  bash scripts/setup/setup-direnv.sh"
fi

echo ""
echo "📚 Documentation:"
echo "  - README.md (Quick Start section)"
echo "  - CLAUDE.md (Python Environment section)"
echo "  - backups/dotfiles/README.md (Migration info)"
echo ""

