#!/bin/bash
# Emergency Docusaurus Recovery Script
# Auto-fixes 500 errors caused by missing/empty build
#
# Usage:
#   bash scripts/docs/emergency-recovery.sh
#
# Exit codes:
#   0 - Success
#   1 - Build failed
#   2 - Container restart failed
#   3 - Health check failed

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 Docusaurus Emergency Recovery"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Diagnose the problem
log_info "Step 1/5: Diagnosing issue..."

if [ -f "docs/build/index.html" ]; then
  BUILD_AGE=$(find docs/build/index.html -mmin +60 2>/dev/null | wc -l)
  if [ "$BUILD_AGE" -gt 0 ]; then
    log_warning "Build exists but is older than 1 hour"
    BUILD_NEEDED=true
  else
    log_success "Build exists and is recent"
    BUILD_NEEDED=false
  fi
else
  log_error "Build missing - index.html not found"
  BUILD_NEEDED=true
fi

# Check container logs for redirect loop
if docker logs docs-hub --tail 20 2>&1 | grep -q "rewrite or internal redirection cycle"; then
  log_error "Redirect loop detected in NGINX logs"
  BUILD_NEEDED=true
fi

# Step 2: Rebuild Docusaurus if needed
if [ "$BUILD_NEEDED" = true ]; then
  log_info "Step 2/5: Rebuilding Docusaurus..."

  cd docs

  # Check if node_modules exists
  if [ ! -d "node_modules" ]; then
    log_warning "node_modules missing - running npm ci"
    npm ci || {
      log_error "npm ci failed"
      exit 1
    }
  fi

  # Clear old build
  rm -rf build/

  # Build Docusaurus
  log_info "Running npm run docs:build..."
  npm run docs:build || {
    log_error "Docusaurus build failed"
    exit 1
  }

  # Verify build
  if [ ! -f "build/index.html" ]; then
    log_error "Build failed - index.html not found"
    exit 1
  fi

  BUILD_SIZE=$(du -sh build/ | cut -f1)
  log_success "Build completed successfully ($BUILD_SIZE)"

  cd ..
else
  log_info "Step 2/5: Skipping build (not needed)"
fi

# Step 3: Stop container
log_info "Step 3/5: Stopping docs-hub container..."
docker compose -f tools/compose/docker-compose.docs.yml stop documentation || {
  log_warning "Container may not be running"
}

# Step 4: Rebuild and start container
log_info "Step 4/5: Rebuilding container..."
docker compose -f tools/compose/docker-compose.docs.yml up -d --build --force-recreate documentation || {
  log_error "Container restart failed"
  exit 2
}

# Wait for container to start
sleep 5

# Step 5: Verify recovery
log_info "Step 5/5: Verifying recovery..."

# Wait for health check (max 60 seconds)
TIMEOUT=60
ELAPSED=0
log_info "Waiting for service to be healthy (timeout: ${TIMEOUT}s)..."

while [ $ELAPSED -lt $TIMEOUT ]; do
  if curl -sf http://localhost:3404/health > /dev/null 2>&1; then
    log_success "Health check passed!"
    break
  fi

  sleep 2
  ELAPSED=$((ELAPSED + 2))

  if [ $((ELAPSED % 10)) -eq 0 ]; then
    log_info "Still waiting... (${ELAPSED}s elapsed)"
  fi
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  log_error "Health check timeout after ${TIMEOUT}s"
  log_error "Container logs:"
  docker logs docs-hub --tail 50
  exit 3
fi

# Test homepage
if curl -sI http://localhost:3404/ | grep -q "200 OK"; then
  log_success "Homepage responding correctly"
else
  log_warning "Homepage may have issues - check manually"
fi

# Check for redirect loops in logs
if docker logs docs-hub --tail 20 2>&1 | grep -q "rewrite or internal redirection cycle"; then
  log_error "Redirect loop still present!"
  log_error "Recent logs:"
  docker logs docs-hub --tail 30
  exit 3
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Recovery completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Service URL: http://localhost:3404"
echo "🏥 Health check: http://localhost:3404/health"
echo "📊 Container status: docker ps | grep docs-hub"
echo ""
