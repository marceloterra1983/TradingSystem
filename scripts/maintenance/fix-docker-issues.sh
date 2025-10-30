#!/bin/bash

# fix-docker-issues.sh
# Quick fix script for failing Docker containers
# Date: 2025-10-12

set -e

echo "🔧 TradingSystem - Docker Issues Fix Script"
echo "=========================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    print_error "Not in TradingSystem root directory!"
    exit 1
fi

echo "Current directory: $PROJECT_ROOT"
echo ""

# Issue #1: Fix Dashboard Container
echo "📊 Issue #1: Fixing Dashboard Container..."
echo "Problem: Invalid --host option passed to npm-run-all"
echo ""

DASHBOARD_DIR="$PROJECT_ROOT/frontend/dashboard"
DASHBOARD_PKG="$DASHBOARD_DIR/package.json"

if [ -f "$DASHBOARD_PKG" ]; then
    cd "$DASHBOARD_DIR"

    # Check if package.json has the dev:vite script
    if grep -q '"dev:vite"' package.json; then
        print_status "Found dev:vite script in package.json"

        # Stop the container
        print_status "Stopping dashboard container..."
        docker compose down 2>/dev/null || true

        # Update docker-compose.yml to remove --host flag
        if [ -f "docker-compose.yml" ]; then
            # Backup original
            cp docker-compose.yml docker-compose.yml.bak

            # Replace command line
            sed -i 's/command: \["npm", "run", "dev", "--", "--host", "0.0.0.0"\]/command: ["npm", "run", "dev"]/' docker-compose.yml

            print_status "Updated docker-compose.yml (backup saved)"
        fi

        # Ensure package.json has --host in dev:vite
        if ! grep -q '"dev:vite".*--host' package.json; then
            print_warning "Updating package.json to add --host flag to dev:vite"
            # This is a simple replacement, might need manual adjustment
            sed -i 's/"dev:vite": "vite"/"dev:vite": "vite --host 0.0.0.0"/' package.json
        fi

        # Restart container
        print_status "Restarting dashboard container..."
        docker compose up -d

        print_status "Dashboard fix applied!"
    else
        print_error "Could not find dev:vite script in package.json"
    fi

    cd "$PROJECT_ROOT"
else
    print_error "Dashboard package.json not found at $DASHBOARD_PKG"
fi

echo ""

# Issue #2: Fix Docs Container
echo "📚 Issue #2: Fixing Docs Container..."
echo "Problem: Missing @akebifiky/remark-simple-plantuml dependency"
echo ""

DOCS_DIR="$PROJECT_ROOT/docs"

if [ -d "$DOCS_DIR" ]; then
    cd "$DOCS_DIR"

    # Stop the container
    print_status "Stopping docs container..."
    docker compose down 2>/dev/null || true

    # Install missing dependency
    print_status "Installing missing PlantUML dependency..."
    npm install @akebifiky/remark-simple-plantuml --save

    # Rebuild container
    print_status "Rebuilding docs container..."
    docker compose build --no-cache

    # Start container
    print_status "Starting docs container..."
    docker compose up -d

    print_status "Docs fix applied!"

    cd "$PROJECT_ROOT"
else
    print_error "Docs directory not found at $DOCS_DIR"
fi

echo ""

# Issue #3: Fix Alertmanager Configuration
echo "🚨 Issue #3: Fixing Alertmanager Configuration..."
echo "Problem: Invalid/empty webhook URL in alertmanager.yml"
echo ""

ALERTMANAGER_CONFIG="$PROJECT_ROOT/tools/monitoring/alertmanager/alertmanager.yml"

if [ -f "$ALERTMANAGER_CONFIG" ]; then
    # Backup original
    cp "$ALERTMANAGER_CONFIG" "$ALERTMANAGER_CONFIG.bak"
    print_status "Backed up original alertmanager.yml"

    # Create a simple working config
    cat > "$ALERTMANAGER_CONFIG" << 'EOF'
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    # Simple receiver - logs only
    # To enable Slack: uncomment and add webhook URL
    # slack_configs:
    #   - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    #     channel: '#alerts'
    #     title: 'TradingSystem Alert'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']
EOF

    print_status "Created new alertmanager.yml with default receiver"

    # Restart monitoring stack
    cd "$PROJECT_ROOT/tools/monitoring"
    print_status "Restarting monitoring stack..."
    docker compose restart alertmanager
    sleep 3
    docker compose restart alert-router

    print_status "Alertmanager fix applied!"

    cd "$PROJECT_ROOT"
else
    print_error "Alertmanager config not found at $ALERTMANAGER_CONFIG"
fi

echo ""
echo "=========================================="
echo "🎉 Fix script completed!"
echo ""
echo "📊 Checking container status..."
echo ""

# Show current status
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "tradingsystem-|tp-capital-"

echo ""
echo "💡 Tips:"
echo "  - Wait 30-60 seconds for containers to fully start"
echo "  - Check logs: docker logs tradingsystem-dashboard"
echo "  - Check logs: docker logs tradingsystem-docs"
echo "  - Check logs: docker logs tradingsystem-alertmanager"
echo ""
echo "🌐 Access URLs:"
echo "  - Dashboard:    http://localhost:5173"
echo "  - Docs:         http://localhost:3400"
echo "  - Prometheus:   http://localhost:9090"
echo "  - Grafana:      http://localhost:3000 (admin/admin)"
echo "  - Alertmanager: http://localhost:9093"
echo ""
echo "📝 Backups created:"
echo "  - $DASHBOARD_DIR/docker-compose.yml.bak"
echo "  - $ALERTMANAGER_CONFIG.bak"
echo ""
