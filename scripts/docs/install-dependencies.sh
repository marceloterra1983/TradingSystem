#!/usr/bin/env bash
# ==============================================================================
# Install Health Dashboard Dependencies
# ==============================================================================
#
# Description:
#   Installs all required Python dependencies for health monitoring scripts
#
# Usage:
#   bash scripts/docs/install-dependencies.sh
#
# Options:
#   --user      Install in user space (no sudo required)
#   --dev       Install development dependencies
#   --upgrade   Upgrade existing packages
#
# ==============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Parse arguments
USER_INSTALL=false
DEV_INSTALL=false
UPGRADE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --user)
            USER_INSTALL=true
            shift
            ;;
        --dev)
            DEV_INSTALL=true
            shift
            ;;
        --upgrade)
            UPGRADE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--user] [--dev] [--upgrade]"
            exit 1
            ;;
    esac
done

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  Installing Health Dashboard Dependencies                        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | awk '{print $2}')
log_info "Python version: ${PYTHON_VERSION}"

# Check pip
if ! command -v pip3 &> /dev/null; then
    log_warning "pip3 not found, installing..."
    python3 -m ensurepip --default-pip
fi

# Build pip command
PIP_CMD="pip3 install"

if [ "$USER_INSTALL" = true ]; then
    PIP_CMD="$PIP_CMD --user --break-system-packages"
    log_info "Installing in user space (with --break-system-packages for Python 3.12+)"
fi

if [ "$UPGRADE" = true ]; then
    PIP_CMD="$PIP_CMD --upgrade"
    log_info "Upgrading existing packages"
fi

# Required packages
log_info "Installing required packages..."
$PIP_CMD PyYAML requests

log_success "Required packages installed"

# Optional packages (improves UX)
log_info "Installing optional packages..."
$PIP_CMD tqdm python-dotenv || {
    log_warning "Some optional packages failed to install"
    log_info "The scripts will work but without progress bars"
}

log_success "Optional packages installed"

# Development packages
if [ "$DEV_INSTALL" = true ]; then
    log_info "Installing development packages..."
    $PIP_CMD pytest pytest-cov black flake8 mypy
    log_success "Development packages installed"
fi

# Verify installation
echo ""
log_info "Verifying installation..."

python3 -c "import yaml; print(f'✓ PyYAML {yaml.__version__}')"
python3 -c "import requests; print(f'✓ requests {requests.__version__}')"

if python3 -c "import tqdm" 2>/dev/null; then
    python3 -c "import tqdm; print(f'✓ tqdm {tqdm.__version__}')"
else
    log_warning "tqdm not installed (optional)"
fi

if python3 -c "import dotenv" 2>/dev/null; then
    python3 -c "import dotenv; print(f'✓ python-dotenv installed')"
else
    log_warning "python-dotenv not installed (optional)"
fi

echo ""
log_success "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Run pre-flight check: bash scripts/docs/pre-flight-check.sh"
echo "  2. Run health tests: bash scripts/docs/run-all-health-tests-v2.sh"
echo ""
