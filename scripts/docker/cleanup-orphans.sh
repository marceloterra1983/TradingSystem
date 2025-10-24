#!/usr/bin/env bash
# ============================================================================
# Docker Compose - Cleanup Orphan Containers
# ============================================================================
# This script removes orphan containers caused by project name conflicts
# and ensures all compose files use unique project names
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

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       Docker Compose - Orphan Containers Cleanup               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$REPO_ROOT"

# ============================================================================
# Step 1: Identify Orphan Containers
# ============================================================================
echo -e "${BLUE}[1/4]${NC} Identifying orphan containers..."
echo ""

ORPHANS=$(docker ps -a --filter "label=com.docker.compose.project" --format "{{.Names}}" | grep -E "^(database|timescale|frontend-apps)" || true)

if [ -z "$ORPHANS" ]; then
    echo -e "${GREEN}✓${NC} No orphan containers found"
else
    echo -e "${YELLOW}Found orphan containers:${NC}"
    echo "$ORPHANS" | sed 's/^/  • /'
fi

echo ""

# ============================================================================
# Step 2: Verify Compose File Project Names
# ============================================================================
echo -e "${BLUE}[2/4]${NC} Verifying compose file project names..."
echo ""

echo -e "${CYAN}Project names in use:${NC}"
grep -h "^name:" tools/compose/*.yml tools/monitoring/*.yml 2>/dev/null | sort -u | sed 's/name: /  • /'

# Check for duplicates
DUPLICATES=$(grep -h "^name:" tools/compose/*.yml tools/monitoring/*.yml 2>/dev/null | cut -d: -f2 | tr -d ' ' | sort | uniq -d)

if [ -n "$DUPLICATES" ]; then
    echo ""
    echo -e "${RED}✗${NC} Duplicate project names found:"
    echo "$DUPLICATES" | sed 's/^/  • /'
    echo ""
    echo -e "${YELLOW}⚠${NC}  This causes orphan container warnings!"
    echo -e "${YELLOW}⚠${NC}  Each compose file must have a unique 'name:' field"
    exit 1
else
    echo ""
    echo -e "${GREEN}✓${NC} All project names are unique"
fi

echo ""

# ============================================================================
# Step 3: Clean Up Orphans
# ============================================================================
echo -e "${BLUE}[3/4]${NC} Cleaning up orphan containers..."
echo ""

# Stop and remove containers that might be orphans
COMPOSE_FILES=(
    "tools/compose/docker-compose.timescale.yml"
    "tools/compose/docker-compose.frontend-apps.yml"
)

for COMPOSE_FILE in "${COMPOSE_FILES[@]}"; do
    if [ -f "$COMPOSE_FILE" ]; then
        PROJECT_NAME=$(grep "^name:" "$COMPOSE_FILE" | cut -d: -f2 | tr -d ' ')
        echo -e "${YELLOW}→${NC} Processing: $PROJECT_NAME ($COMPOSE_FILE)"
        
        # Run compose down with --remove-orphans
        docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>&1 | grep -v "warn" || true
        
        echo -e "${GREEN}  ✓${NC} Cleaned"
    fi
done

echo ""

# ============================================================================
# Step 4: Restart Services
# ============================================================================
echo -e "${BLUE}[4/4]${NC} Restarting services..."
echo ""

echo -e "${YELLOW}→${NC} Starting TimescaleDB stack..."
docker compose -f tools/compose/docker-compose.timescale.yml up -d --remove-orphans
echo -e "${GREEN}  ✓${NC} Started"

echo -e "${YELLOW}→${NC} Starting Frontend Apps DB..."
docker compose -f tools/compose/docker-compose.frontend-apps.yml up -d --remove-orphans
echo -e "${GREEN}  ✓${NC} Started"

echo ""

# ============================================================================
# Verification
# ============================================================================
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                     Verification                               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Running containers:${NC}"
docker ps --filter "label=com.docker.compose.project" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20

echo ""
echo -e "${GREEN}✓${NC} Cleanup complete!"
echo ""

# Check for remaining orphans
REMAINING_ORPHANS=$(docker compose -f tools/compose/docker-compose.timescale.yml ps 2>&1 | grep -c "Found orphan" || true)

if [ "$REMAINING_ORPHANS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No orphan containers detected"
else
    echo -e "${YELLOW}!${NC} Some orphan warnings may still appear"
    echo -e "  This is normal during the first run after cleanup"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All Done${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
