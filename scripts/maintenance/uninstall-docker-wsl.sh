#!/bin/bash
# Uninstall Docker from WSL (Ubuntu)
# Run with: bash uninstall-docker-wsl.sh

echo "======================================"
echo "Docker Uninstall Script for WSL"
echo "======================================"
echo ""

# Stop Docker service if running
echo "1. Stopping Docker service..."
sudo systemctl stop docker 2>/dev/null || echo "   Docker service not running"
sudo systemctl disable docker 2>/dev/null || echo "   Docker service not enabled"

# Remove Docker packages
echo ""
echo "2. Removing Docker packages..."
sudo apt-get remove --purge -y \
    docker.io \
    docker-compose \
    python3-docker \
    python3-compose \
    python3-dockerpty \
    containerd \
    runc

# Clean up dependencies
echo ""
echo "3. Removing unused dependencies..."
sudo apt-get autoremove -y
sudo apt-get autoclean

# Remove Docker data directories
echo ""
echo "4. Removing Docker data directories..."
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
sudo rm -rf /etc/docker
sudo rm -rf ~/.docker

# Remove Docker group
echo ""
echo "5. Removing Docker group..."
sudo groupdel docker 2>/dev/null || echo "   Docker group not found"

# Verify removal
echo ""
echo "6. Verifying Docker removal..."
which docker && echo "   WARNING: docker command still found in PATH" || echo "   ✓ Docker command removed"
dpkg -l | grep -i docker && echo "   WARNING: Docker packages still installed" || echo "   ✓ No Docker packages found"

echo ""
echo "======================================"
echo "✓ Docker uninstall complete!"
echo "======================================"
echo ""
echo "Note: Docker Compose volumes remain intact; re-run the stacks when needed."
echo "Use the stack scripts under scripts/docker/ when you reinstall Docker."
echo ""
