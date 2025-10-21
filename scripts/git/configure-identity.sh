#!/usr/bin/env bash
# ============================================================================
# Configure Git Identity
# ============================================================================
# Sets up Git user name and email for this repository
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Git Identity Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if already configured globally
GLOBAL_NAME=$(git config --global user.name 2>/dev/null || echo "")
GLOBAL_EMAIL=$(git config --global user.email 2>/dev/null || echo "")

if [ -n "$GLOBAL_NAME" ] && [ -n "$GLOBAL_EMAIL" ]; then
    echo -e "${GREEN}✓${NC} Global Git identity already configured:"
    echo -e "  Name:  ${BLUE}$GLOBAL_NAME${NC}"
    echo -e "  Email: ${BLUE}$GLOBAL_EMAIL${NC}"
    echo ""
    
    read -p "Use this identity for this repository? (Y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        # Use global config
        echo -e "${GREEN}✓${NC} Using global identity"
        exit 0
    fi
fi

# Configure for this repository only
echo -e "${YELLOW}→${NC} Configure Git identity for this repository"
echo ""

# Get user name
read -p "Enter your name: " GIT_NAME
while [ -z "$GIT_NAME" ]; do
    echo -e "${YELLOW}!${NC} Name cannot be empty"
    read -p "Enter your name: " GIT_NAME
done

# Get user email
read -p "Enter your email: " GIT_EMAIL
while [ -z "$GIT_EMAIL" ]; do
    echo -e "${YELLOW}!${NC} Email cannot be empty"
    read -p "Enter your email: " GIT_EMAIL
done

# Validate email format
if ! echo "$GIT_EMAIL" | grep -qE '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'; then
    echo -e "${YELLOW}!${NC} Warning: Email format looks invalid"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi
fi

# Apply configuration (local to this repository)
echo ""
echo -e "${YELLOW}→${NC} Configuring Git identity (local to this repository)..."

git config user.name "$GIT_NAME"
git config user.email "$GIT_EMAIL"

echo -e "${GREEN}✓${NC} Git identity configured!"
echo ""
echo -e "  Name:  ${BLUE}$GIT_NAME${NC}"
echo -e "  Email: ${BLUE}$GIT_EMAIL${NC}"
echo ""

# Offer to set globally
read -p "Also set as global Git identity? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git config --global user.name "$GIT_NAME"
    git config --global user.email "$GIT_EMAIL"
    echo -e "${GREEN}✓${NC} Also configured globally"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Configuration complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "You can now make commits!"
echo ""
