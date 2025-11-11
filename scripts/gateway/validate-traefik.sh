#!/bin/bash
# ==============================================================================
# TradingSystem - Traefik API Gateway Validation Script
# ==============================================================================
# Purpose: Validate Traefik installation, configuration, and routing
# Usage:
#   bash scripts/gateway/validate-traefik.sh
#   bash scripts/gateway/validate-traefik.sh --verbose
#   bash scripts/gateway/validate-traefik.sh --fix
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
VERBOSE=false
FIX_MODE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --verbose)
      VERBOSE=true
      shift
      ;;
    --fix)
      FIX_MODE=true
      shift
      ;;
  esac
done

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
  ((PASSED++))
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
  ((FAILED++))
}

log_warning() {
  echo -e "${YELLOW}[⚠]${NC} $1"
  ((WARNINGS++))
}

verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}    →${NC} $1"
  fi
}

# ==============================================================================
# Validation Functions
# ==============================================================================

check_docker() {
  log_info "Checking Docker..."

  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    return 1
  fi

  if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running"
    return 1
  fi

  log_success "Docker is running"
  verbose "Docker version: $(docker --version)"
}

check_networks() {
  log_info "Checking Docker networks..."

  local required_networks=("tradingsystem_backend" "tradingsystem_frontend")

  for network in "${required_networks[@]}"; do
    if docker network inspect "$network" &> /dev/null; then
      log_success "Network $network exists"
    else
      log_error "Network $network does not exist"

      if [ "$FIX_MODE" = true ]; then
        log_info "Creating network $network..."
        docker network create "$network"
        log_success "Network $network created"
      fi
    fi
  done
}

check_traefik_container() {
  log_info "Checking Traefik container..."

  if docker ps --filter "name=api-gateway" --filter "status=running" | grep -q api-gateway; then
    log_success "Traefik container is running"

    # Check health
    local health=$(docker inspect --format='{{.State.Health.Status}}' api-gateway 2>/dev/null || echo "unknown")
    if [ "$health" = "healthy" ]; then
      log_success "Traefik container is healthy"
    else
      log_warning "Traefik container health: $health"
    fi

    verbose "Container ID: $(docker ps --filter 'name=api-gateway' --format '{{.ID}}')"
  else
    log_error "Traefik container is not running"

    if [ "$FIX_MODE" = true ]; then
      log_info "Starting Traefik container..."
      cd "$(dirname "$0")/../.."
      docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d
      sleep 5
      log_success "Traefik container started"
    fi
  fi
}

check_traefik_api() {
  log_info "Checking Traefik API..."

  if curl -f -s http://localhost:9080/api/overview &> /dev/null; then
    log_success "Traefik API is accessible"

    if [ "$VERBOSE" = true ]; then
      local providers=$(curl -s http://localhost:9080/api/overview | jq -r '.providers | keys[]' 2>/dev/null || echo "")
      verbose "Providers: $providers"
    fi
  else
    log_error "Traefik API is not accessible (http://localhost:9080/api/overview)"
  fi
}

check_traefik_dashboard() {
  log_info "Checking Traefik Dashboard..."

  if curl -f -s http://localhost:9081/dashboard/ &> /dev/null; then
    log_success "Traefik Dashboard is accessible"
    verbose "URL: http://localhost:9081/dashboard/"
  else
    log_error "Traefik Dashboard is not accessible"
  fi
}

check_gateway_entrypoint() {
  log_info "Checking Gateway entrypoint..."

  if curl -f -s http://localhost:9080/ &> /dev/null; then
    log_success "Gateway entrypoint is accessible"
    verbose "URL: http://localhost:9080/"
  else
    log_warning "Gateway entrypoint returned non-200 status (expected if no services are routed)"
  fi
}

check_metrics_endpoint() {
  log_info "Checking Prometheus metrics..."

  if curl -f -s http://localhost:9080/metrics | grep -q "traefik_"; then
    log_success "Prometheus metrics are exposed"
    verbose "URL: http://localhost:9080/metrics"

    if [ "$VERBOSE" = true ]; then
      local total_requests=$(curl -s http://localhost:9080/metrics | grep "traefik_http_requests_total" | head -1 || echo "N/A")
      verbose "Sample metric: $total_requests"
    fi
  else
    log_error "Prometheus metrics are not accessible"
  fi
}

check_routers() {
  log_info "Checking configured routers..."

  local routers=$(curl -s http://localhost:9080/api/http/routers | jq -r '.[].name' 2>/dev/null)

  if [ -n "$routers" ]; then
    local count=$(echo "$routers" | wc -l)
    log_success "Found $count configured routers"

    if [ "$VERBOSE" = true ]; then
      echo "$routers" | while read -r router; do
        local rule=$(curl -s http://localhost:9080/api/http/routers | jq -r ".[] | select(.name==\"$router\") | .rule")
        verbose "Router: $router → $rule"
      done
    fi
  else
    log_warning "No routers configured yet (expected before services are added)"
  fi
}

check_middlewares() {
  log_info "Checking configured middlewares..."

  local middlewares=$(curl -s http://localhost:9080/api/http/middlewares | jq -r '.[].name' 2>/dev/null | grep -v "@internal" || echo "")

  if [ -n "$middlewares" ]; then
    local count=$(echo "$middlewares" | wc -l)
    log_success "Found $count configured middlewares"

    if [ "$VERBOSE" = true ]; then
      echo "$middlewares" | while read -r middleware; do
        verbose "Middleware: $middleware"
      done
    fi
  else
    log_warning "No middlewares loaded from file provider"
  fi
}

check_services_health() {
  log_info "Checking service health endpoints..."

  local services=(
    "workspace-api:3210:/health"
    "docs-api:3405:/health"
    "dashboard:3103:/health"
  )

  for service_config in "${services[@]}"; do
    IFS=':' read -r name port path <<< "$service_config"

    if curl -f -s "http://localhost:$port$path" &> /dev/null; then
      log_success "Service $name is healthy"
    else
      log_warning "Service $name is not accessible (container may not be running)"
    fi
  done
}

test_rate_limiting() {
  log_info "Testing rate limiting (if configured)..."

  # Make 10 rapid requests
  local success_count=0
  local rate_limited=false

  for i in {1..10}; do
    local status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9080/)
    if [ "$status" = "429" ]; then
      rate_limited=true
      break
    elif [ "$status" = "200" ] || [ "$status" = "404" ]; then
      ((success_count++))
    fi
  done

  if [ "$rate_limited" = true ]; then
    log_success "Rate limiting is working (429 returned)"
  else
    log_warning "Rate limiting not triggered (may not be configured yet)"
    verbose "Successful requests: $success_count/10"
  fi
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
  echo "================================================================================"
  echo "  TradingSystem - Traefik API Gateway Validation"
  echo "================================================================================"
  echo ""

  # System checks
  check_docker
  check_networks

  # Traefik checks
  check_traefik_container
  check_traefik_api
  check_traefik_dashboard
  check_gateway_entrypoint
  check_metrics_endpoint

  # Configuration checks
  check_routers
  check_middlewares

  # Service checks
  check_services_health

  # Feature tests
  test_rate_limiting

  # Summary
  echo ""
  echo "================================================================================"
  echo "  Validation Summary"
  echo "================================================================================"
  echo -e "${GREEN}Passed:${NC}   $PASSED"
  echo -e "${RED}Failed:${NC}   $FAILED"
  echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
  echo ""

  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Open Traefik Dashboard: http://localhost:9081/dashboard/"
    echo "  2. Check routers and middlewares"
    echo "  3. Add Traefik labels to your services"
    echo ""
    exit 0
  else
    echo -e "${RED}✗ Some checks failed. Please review errors above.${NC}"
    echo ""
    if [ "$FIX_MODE" = false ]; then
      echo "Tip: Run with --fix flag to auto-fix some issues:"
      echo "  bash $0 --fix"
      echo ""
    fi
    exit 1
  fi
}

# Run main
main
