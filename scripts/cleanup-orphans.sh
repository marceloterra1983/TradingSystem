#!/bin/bash
# ============================================================================
# TradingSystem - Cleanup Orphaned Processes and Files
# ============================================================================
# Removes orphaned PID files, stops conflicting processes, and cleans up
# processes that should not be running based on current architecture.
#
# Usage:
#   bash scripts/cleanup-orphans.sh [--dry-run]
#
# Flags:
#   --dry-run    Show what would be cleaned without actually cleaning
#
# Last Updated: 2025-10-30
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🧹 TradingSystem - Cleanup Orphans                          ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}⚠️  DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# ============================================================================
# 1. Clean orphaned PID files
# ============================================================================
echo -e "${BLUE}━━━ 1. Cleaning Orphaned PID Files ━━━${NC}"
echo ""

PID_DIR="/tmp/tradingsystem-logs"
removed_pids=0

if [ -d "$PID_DIR" ]; then
    find "$PID_DIR" -name "*.pid" -type f 2>/dev/null | while read pidfile; do
        service=$(basename "$pidfile" .pid)
        pid=$(cat "$pidfile" 2>/dev/null || echo "")

        if [ -z "$pid" ]; then
            echo -e "  ${YELLOW}⚠${NC}  $service: Empty PID file"
            if [ "$DRY_RUN" = false ]; then
                rm -f "$pidfile"
                ((removed_pids++))
            fi
        elif ! kill -0 "$pid" 2>/dev/null; then
            echo -e "  ${RED}✗${NC}  $service: Dead process (PID: $pid)"
            if [ "$DRY_RUN" = false ]; then
                rm -f "$pidfile"
                ((removed_pids++))
            fi
        else
            echo -e "  ${GREEN}✓${NC}  $service: Active (PID: $pid)"
        fi
    done

    if [ "$DRY_RUN" = false ] && [ $removed_pids -gt 0 ]; then
        echo ""
        echo -e "${GREEN}✓${NC} Removed $removed_pids orphaned PID files"
    fi
else
    echo -e "  ${BLUE}ℹ${NC}  PID directory not found"
fi

echo ""

# ============================================================================
# 2. Check for processes on container ports (should not exist)
# ============================================================================
echo -e "${BLUE}━━━ 2. Checking Container Ports ━━━${NC}"
echo ""

# Ports that should ONLY have docker-proxy (container ports)
CONTAINER_PORTS=(3400 3401 3200 4005)
conflicts=0

for port in "${CONTAINER_PORTS[@]}"; do
    pid=$(lsof -ti:$port 2>/dev/null | head -1 || echo "")

    if [ -n "$pid" ]; then
        process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")

        if [[ "$process" == "docker-proxy" ]]; then
            echo -e "  ${GREEN}✓${NC}  Port $port: docker-proxy (OK)"
        else
            echo -e "  ${RED}⚠${NC}  Port $port: $process (PID: $pid) - CONFLICT!"
            ((conflicts++))

            if [ "$DRY_RUN" = false ]; then
                echo -e "     ${YELLOW}→${NC}  Killing process..."
                kill -15 "$pid" 2>/dev/null || true
                sleep 1
                if kill -0 "$pid" 2>/dev/null; then
                    kill -9 "$pid" 2>/dev/null || true
                fi
            fi
        fi
    else
        echo -e "  ${BLUE}ℹ${NC}  Port $port: Free (container may be stopped)"
    fi
done

if [ $conflicts -gt 0 ]; then
    echo ""
    if [ "$DRY_RUN" = false ]; then
        echo -e "${GREEN}✓${NC} Killed $conflicts conflicting processes"
    else
        echo -e "${YELLOW}⚠${NC} Found $conflicts conflicts (would kill in normal mode)"
    fi
fi

echo ""

# ============================================================================
# 3. Check for stopped Docker containers
# ============================================================================
echo -e "${BLUE}━━━ 3. Checking Stopped Containers ━━━${NC}"
echo ""

stopped=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | wc -l)

if [ $stopped -gt 0 ]; then
    echo -e "  ${YELLOW}⚠${NC}  Found $stopped stopped containers:"
    docker ps -a --filter "status=exited" --format "  - {{.Names}}: {{.Status}}" | head -10
    echo ""

    if [ "$DRY_RUN" = false ]; then
        echo -n "  Remove stopped containers? [y/N] "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            docker container prune -f
            echo -e "${GREEN}✓${NC} Removed stopped containers"
        fi
    else
        echo -e "${BLUE}ℹ${NC}  Would prompt to remove in normal mode"
    fi
else
    echo -e "  ${GREEN}✓${NC}  No stopped containers"
fi

echo ""

# ============================================================================
# 4. Summary
# ============================================================================
echo -e "${BLUE}━━━ Summary ━━━${NC}"
echo ""

# Count current services
local_services=$(ps aux | grep -E 'telegram-gateway|dashboard|status|docs-watcher' | grep -v grep | wc -l)
containers=$(docker ps -q | wc -l)

echo -e "  ${GREEN}✓${NC} Local services running: $local_services/5"
echo -e "  ${GREEN}✓${NC} Docker containers running: $containers/27"

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo -e "${YELLOW}⚠️  This was a DRY RUN - no changes were made${NC}"
    echo -e "${BLUE}ℹ${NC}  Run without --dry-run to apply changes"
fi

echo ""
echo -e "${GREEN}✓ Cleanup complete!${NC}"
