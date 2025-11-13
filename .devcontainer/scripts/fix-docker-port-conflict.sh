#!/bin/bash
# Fix Docker port conflicts by restarting Docker service
# This clears iptables rules that may be holding ports

set -e

echo "🔧 Fixing Docker Port Conflicts"
echo "==============================="
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

echo "📊 Current port usage:"
netstat -tuln 2>/dev/null | grep -E ":(3200|3405|6388|9300|3908)" || echo "No conflicts detected by netstat"
echo ""

echo "🔄 Restarting Docker service to clear iptables rules..."
echo "This requires sudo privileges."
echo ""
echo "Please run this script with sudo:"
echo "  sudo bash .devcontainer/scripts/fix-docker-port-conflict.sh"
echo ""
echo "Commands that will be executed:"
echo "  1. systemctl restart docker"
echo "  2. Wait 10 seconds for Docker to restart"
echo "  3. Verify Docker is healthy"
echo ""

read -p "Press Ctrl+C to cancel, or Enter to continue..." -r
echo ""

# Restart Docker service
systemctl restart docker

echo "⏳ Waiting 10 seconds for Docker to restart..."
sleep 10

# Verify Docker is healthy
if docker info >/dev/null 2>&1; then
    echo "✅ Docker restarted successfully"
else
    echo "❌ Docker failed to restart"
    exit 1
fi

echo ""
echo "✅ Port conflicts should now be resolved"
echo "You can now start your stacks with:"
echo "  bash .devcontainer/scripts/start-all-stacks.sh"
