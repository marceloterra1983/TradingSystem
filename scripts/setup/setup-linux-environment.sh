#!/bin/bash
# Setup script for Linux environment
# Run this after migrating the project to Linux
# Usage: bash scripts/setup/setup-linux-environment.sh

set -e

echo "=========================================="
echo "TradingSystem - Linux Environment Setup"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "📁 Current directory: $REPO_ROOT"
echo ""

# Step 1: Make scripts executable
echo "1️⃣  Making scripts executable..."
find scripts -name "*.sh" -type f -exec chmod +x {} \;
echo "   ✅ Scripts are now executable"
echo ""

# Step 2: Check system dependencies
echo "2️⃣  Checking system dependencies..."

check_command() {
    if command -v "$1" &> /dev/null; then
        echo "   ✅ $1 is installed"
        return 0
    else
        echo "   ❌ $1 is NOT installed"
        return 1
    fi
}

MISSING_DEPS=()

check_command "node" || MISSING_DEPS+=("node")
check_command "npm" || MISSING_DEPS+=("npm")
check_command "docker" || MISSING_DEPS+=("docker")
check_command "git" || MISSING_DEPS+=("git")

# Terminal emulator (at least one should exist)
TERMINAL_FOUND=false
if check_command "gnome-terminal"; then
    TERMINAL_FOUND=true
elif check_command "konsole"; then
    TERMINAL_FOUND=true
elif check_command "xterm"; then
    TERMINAL_FOUND=true
fi

if [ "$TERMINAL_FOUND" = false ]; then
    echo "   ⚠️  No suitable terminal emulator found (gnome-terminal, konsole, or xterm)"
    MISSING_DEPS+=("terminal-emulator")
fi

echo ""

# Step 3: Create necessary directories
echo "3️⃣  Creating necessary directories..."
mkdir -p backend/data/runtime/context7
mkdir -p backend/data/runtime/exa
mkdir -p backend/data/runtime/langgraph
mkdir -p backend/data/backups
mkdir -p apps/tp-capital/logs
mkdir -p backend/api/idea-bank/uploads
mkdir -p backend/api/documentation-api/uploads
echo "   ✅ Directories created"
echo ""

# Step 4: Check environment files
echo "4️⃣  Checking environment files..."

check_env_file() {
    local example_file="$1"
    local target_file="$2"
    
    if [ -f "$target_file" ]; then
        echo "   ✅ $target_file exists"
    else
        echo "   ⚠️  $target_file does NOT exist"
        echo "      Copy from: $example_file"
        return 1
    fi
}

ENV_FILES_MISSING=false

check_env_file "apps/tp-capital/tools/tp-capital-signals.env.example" "apps/tp-capital/tools/tp-capital-signals.env" || ENV_FILES_MISSING=true

echo ""

# Step 5: Check Docker group membership
echo "5️⃣  Checking Docker permissions..."
if groups | grep -q docker; then
    echo "   ✅ User is in docker group"
else
    echo "   ⚠️  User is NOT in docker group"
    echo "      Run: sudo usermod -aG docker $USER"
    echo "      Then logout and login again"
fi
echo ""

# Step 6: Test Docker
echo "6️⃣  Testing Docker..."
if docker ps &> /dev/null; then
    echo "   ✅ Docker is working"
else
    echo "   ❌ Docker is NOT working or requires sudo"
    echo "      Make sure Docker daemon is running"
    echo "      If you need sudo, add user to docker group (see step 5)"
fi
echo ""

# Step 7: Install npm dependencies (optional)
echo "7️⃣  Checking npm dependencies..."
echo "   This step is optional - dependencies will be installed when services start"

MODULES_TO_CHECK=(
    "backend/api/idea-bank"
    "apps/service-launcher"
    "frontend/dashboard"
    "docs"
)

NEEDS_INSTALL=()
for dir in "${MODULES_TO_CHECK[@]}"; do
    if [ -d "$dir" ]; then
        if [ ! -d "$dir/node_modules" ]; then
            echo "   ⚠️  $dir: node_modules not found"
            NEEDS_INSTALL+=("$dir")
        else
            echo "   ✅ $dir: node_modules exists"
        fi
    fi
done

if [ ${#NEEDS_INSTALL[@]} -gt 0 ]; then
    echo ""
    echo "   Would you like to install dependencies now? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        for dir in "${NEEDS_INSTALL[@]}"; do
            echo "   📦 Installing dependencies in $dir..."
            (cd "$dir" && npm install)
        done
    else
        echo "   ⏭️  Skipping npm install (will be done when services start)"
    fi
fi
echo ""

# Summary
echo "=========================================="
echo "Setup Summary"
echo "=========================================="
echo ""

if [ ${#MISSING_DEPS[@]} -eq 0 ] && [ "$ENV_FILES_MISSING" = false ]; then
    echo "✅ All checks passed! You're ready to go."
    echo ""
    echo "To start development services, run:"
    echo "   bash scripts/startup/start-trading-system-dev.sh"
    echo ""
    echo "For more information, see:"
    echo "   docs/context/ops/linux-migration-guide.md"
else
    echo "⚠️  Some issues need attention:"
    echo ""
    
    if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
        echo "Missing dependencies:"
        for dep in "${MISSING_DEPS[@]}"; do
            echo "   - $dep"
        done
        echo ""
    fi
    
    if [ "$ENV_FILES_MISSING" = true ]; then
        echo "Missing environment files - copy from .example files and configure"
        echo ""
    fi
    
    echo "See the Linux Migration Guide for detailed instructions:"
    echo "   docs/context/ops/linux-migration-guide.md"
fi

echo ""
echo "=========================================="







