#!/usr/bin/env bash
# ============================================================================
# Create Symlinks for Root Wrappers
# ============================================================================
# This script creates symlinks for:
#   - reiniciar → scripts/startup/restart-dashboard-stack.sh
#   - start-tradingsystem → scripts/startup/start-tradingsystem-full.sh
#   - stop-tradingsystem → scripts/shutdown/stop-tradingsystem-full.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

echo ""
echo "============================================================================"
echo "Creating Root Wrapper Symlinks"
echo "============================================================================"
echo ""

# ============================================================================
# 1. reiniciar → scripts/startup/restart-dashboard-stack.sh
# ============================================================================
echo "[1/4] Processing 'reiniciar'..."

if [ -f "reiniciar" ] && [ ! -L "reiniciar" ]; then
    BACKUP="reiniciar.backup-$(date +%Y%m%d-%H%M%S)"
    echo "      Backing up old file → $BACKUP"
    mv reiniciar "$BACKUP"
fi

if [ -L "reiniciar" ]; then
    echo "      Removing existing symlink"
    rm reiniciar
fi

echo "      Creating symlink: reiniciar → scripts/startup/restart-dashboard-stack.sh"
ln -sf scripts/startup/restart-dashboard-stack.sh reiniciar
chmod +x scripts/startup/restart-dashboard-stack.sh
echo "      ✓ Done"
echo ""

# ============================================================================
# 2. start-tradingsystem → scripts/startup/start-tradingsystem-full.sh
# ============================================================================
echo "[2/4] Processing 'start-tradingsystem'..."

if [ -f "start-tradingsystem" ] && [ ! -L "start-tradingsystem" ]; then
    BACKUP="start-tradingsystem.backup-$(date +%Y%m%d-%H%M%S)"
    echo "      Backing up old file → $BACKUP"
    mv start-tradingsystem "$BACKUP"
fi

if [ -L "start-tradingsystem" ]; then
    echo "      Removing existing symlink"
    rm start-tradingsystem
fi

echo "      Creating symlink: start-tradingsystem → scripts/startup/start-tradingsystem-full.sh"
ln -sf scripts/startup/start-tradingsystem-full.sh start-tradingsystem
chmod +x scripts/startup/start-tradingsystem-full.sh
echo "      ✓ Done"
echo ""

# ============================================================================
# 3. stop-tradingsystem → scripts/shutdown/stop-tradingsystem-full.sh
# ============================================================================
echo "[3/4] Processing 'stop-tradingsystem'..."

if [ -f "stop-tradingsystem" ] && [ ! -L "stop-tradingsystem" ]; then
    BACKUP="stop-tradingsystem.backup-$(date +%Y%m%d-%H%M%S)"
    echo "      Backing up old file → $BACKUP"
    mv stop-tradingsystem "$BACKUP"
fi

if [ -L "stop-tradingsystem" ]; then
    echo "      Removing existing symlink"
    rm stop-tradingsystem
fi

echo "      Creating symlink: stop-tradingsystem → scripts/shutdown/stop-tradingsystem-full.sh"
ln -sf scripts/shutdown/stop-tradingsystem-full.sh stop-tradingsystem
chmod +x scripts/shutdown/stop-tradingsystem-full.sh
echo "      ✓ Done"
echo ""

# ============================================================================
# 4. status-tradingsystem → scripts/startup/status-tradingsystem.sh
# ============================================================================
echo "[4/4] Processing 'status-tradingsystem'..."

if [ -f "status-tradingsystem" ] && [ ! -L "status-tradingsystem" ]; then
    BACKUP="status-tradingsystem.backup-$(date +%Y%m%d-%H%M%S)"
    echo "      Backing up old file → $BACKUP"
    mv status-tradingsystem "$BACKUP"
fi

if [ -L "status-tradingsystem" ]; then
    echo "      Removing existing symlink"
    rm status-tradingsystem
fi

echo "      Creating symlink: status-tradingsystem → scripts/startup/status-tradingsystem.sh"
ln -sf scripts/startup/status-tradingsystem.sh status-tradingsystem
chmod +x scripts/startup/status-tradingsystem.sh
echo "      ✓ Done"
echo ""

# ============================================================================
# Verification
# ============================================================================
echo "============================================================================"
echo "Verification"
echo "============================================================================"
echo ""

ls -lh reiniciar start-tradingsystem stop-tradingsystem status-tradingsystem 2>/dev/null || true

echo ""
echo "✓ All symlinks created successfully!"
echo ""
echo "Test commands:"
echo "  ./reiniciar"
echo "  ./start-tradingsystem --help"
echo "  ./stop-tradingsystem --help"
echo "  ./status-tradingsystem --quick"
echo ""
