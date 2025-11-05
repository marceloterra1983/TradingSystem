#!/bin/bash
#
# Install Playwright System Dependencies
#
# This script installs the required system libraries for Playwright
# to run Chromium browser on Linux (WSL2).
#
# Required libraries:
# - libnspr4:    Mozilla Netscape Portable Runtime
# - libnss3:     Network Security Service libraries
# - libasound2:  ALSA sound library
#
# REQUIRES SUDO: System package installation
#

set -e

echo ""
echo "=============================================="
echo "Playwright System Dependencies Installation"
echo "=============================================="
echo ""

echo "This script will install:"
echo "  - libnspr4 (Mozilla Netscape Portable Runtime)"
echo "  - libnss3 (Network Security Service)"
echo "  - libasound2t64 (ALSA sound library)"
echo ""

# Update package list
echo "Updating package list..."
apt-get update -qq

echo ""
echo "Installing Playwright dependencies..."
echo ""

# Install required libraries
apt-get install -y \
  libnspr4 \
  libnss3 \
  libasound2t64

echo ""
echo "=============================================="
echo "Installation Complete!"
echo "=============================================="
echo ""
echo "Playwright is now ready to run browsers."
echo ""
echo "Next steps:"
echo "  cd frontend/dashboard"
echo "  npm run test:e2e:ui"
echo ""

