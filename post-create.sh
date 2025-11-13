#!/bin/bash
set -e

echo "🚀 TradingSystem Dev Container - Post-Create"
echo "============================================="

# Fix permissions FIRST
echo "🔧 Fixing node_modules permissions..."
sudo chown -R vscode:vscode /workspace/node_modules 2>/dev/null || true
sudo chown -R vscode:vscode /workspace/frontend/dashboard/node_modules 2>/dev/null || true
sudo chown -R vscode:vscode /workspace/docs/node_modules 2>/dev/null || true

# Install root dependencies
echo "📦 Installing root dependencies..."
cd /workspace
if npm install --legacy-peer-deps 2>&1 | grep -v "deprecated\|npm warn"; then
    echo "   ✅ Root packages installed"
else
    echo "   ⚠️  Some warnings (check if critical)"
fi

# Install dashboard
echo "📦 Installing dashboard..."
cd /workspace/frontend/dashboard
if npm install --legacy-peer-deps 2>&1 | grep -v "deprecated\|npm warn"; then
    echo "   ✅ Dashboard packages installed"
fi

# Install docs
echo "📦 Installing docs..."
cd /workspace/docs
if npm install --legacy-peer-deps 2>&1 | grep -v "deprecated\|npm warn"; then
    echo "   ✅ Docs packages installed"
fi

echo ""
echo "✅ Post-create completed!"
