#!/usr/bin/env bash
# ============================================================================
# Docker Compose - Validate Project Names
# ============================================================================
# Validates that all compose files have unique project names
# Run this before committing changes to compose files
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Docker Compose - Project Names Validation                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Find all compose files
# ============================================================================
echo -e "${BLUE}[1/3]${NC} Finding compose files..."
echo ""

COMPOSE_FILES=$(find infrastructure -name "*.yml" -o -name "*.yaml" | grep -E "(compose|docker)" | sort)

if [ -z "$COMPOSE_FILES" ]; then
    echo -e "${RED}✗${NC} No compose files found"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found $(echo "$COMPOSE_FILES" | wc -l) compose files"
echo ""

# ============================================================================
# Extract project names
# ============================================================================
echo -e "${BLUE}[2/3]${NC} Extracting project names..."
echo ""

declare -A PROJECT_NAMES
declare -A PROJECT_FILES
ERRORS=0

while IFS= read -r FILE; do
    if [ -f "$FILE" ]; then
        # Extract project name (support both 'name:' at root and in services)
        NAME=$(grep -m1 "^name:" "$FILE" 2>/dev/null | cut -d: -f2 | tr -d ' "' || echo "")
        
        if [ -n "$NAME" ]; then
            # Check if name already exists
            if [ -n "${PROJECT_NAMES[$NAME]:-}" ]; then
                echo -e "${RED}✗ CONFLICT:${NC} Project name '${CYAN}$NAME${NC}' used in multiple files:"
                echo -e "  1. ${PROJECT_NAMES[$NAME]}"
                echo -e "  2. $FILE"
                echo ""
                ((ERRORS++))
            else
                PROJECT_NAMES[$NAME]="$FILE"
                echo -e "${GREEN}✓${NC} ${CYAN}$NAME${NC}"
                echo -e "  File: $FILE"
                echo ""
            fi
        else
            echo -e "${YELLOW}!${NC} No project name found in: $FILE"
            echo -e "  ${YELLOW}Warning:${NC} Will use directory name as project name"
            echo ""
        fi
    fi
done <<< "$COMPOSE_FILES"

# ============================================================================
# Report Results
# ============================================================================
echo -e "${BLUE}[3/3]${NC} Validation results..."
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All project names are unique!${NC}"
    echo ""
    
    echo -e "${CYAN}Project names in use:${NC}"
    for NAME in "${!PROJECT_NAMES[@]}"; do
        echo -e "  • ${CYAN}$NAME${NC}"
    done
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  ✓ VALIDATION PASSED                          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Found $ERRORS conflict(s)${NC}"
    echo ""
    echo -e "${YELLOW}How to fix:${NC}"
    echo -e "  1. Edit the conflicting compose files"
    echo -e "  2. Change the 'name:' field to a unique value"
    echo -e "  3. Run this script again to verify"
    echo ""
    echo -e "${YELLOW}Example:${NC}"
    echo -e "  ${BLUE}name: database${NC}  →  ${GREEN}name: frontend-apps${NC}"
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                  ✗ VALIDATION FAILED                          ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi
