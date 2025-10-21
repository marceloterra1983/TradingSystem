#!/bin/bash
# Shared health check functions for TradingSystem services
# Usage: source "$PROJECT_ROOT/infrastructure/scripts/health-checks.sh"

# Check MCP server health using multiple fallback endpoints
# Args: $1 - port number
# Returns: 0 if healthy, 1 if unhealthy
check_mcp_health() {
  local port="$1"
  
  if ! command -v curl >/dev/null 2>&1; then
    # No curl available - cannot perform HTTP checks
    return 1
  fi
  
  # Try /messages/ endpoint first (primary endpoint, accept 200/401/405 as healthy)
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:${port}/messages/" 2>/dev/null || echo "000")
  if [[ "$http_code" == "200" || "$http_code" == "401" || "$http_code" == "405" ]]; then
    return 0
  fi
  
  # Fallback to /health endpoint (if available)
  if curl -fsS --max-time 2 "http://localhost:${port}/health" >/dev/null 2>&1; then
    return 0
  fi
  
  # Last fallback to /api/status endpoint (if available, includes detailed info)
  if curl -fsS --max-time 2 "http://localhost:${port}/api/status" >/dev/null 2>&1; then
    return 0
  fi
  
  # All endpoints failed
  return 1
}

# Get MCP health status with detailed HTTP code
# Args: $1 - port number
# Returns: HTTP code or "healthy" if health endpoint responded
get_mcp_health_detail() {
  local port="$1"
  
  if ! command -v curl >/dev/null 2>&1; then
    echo "no-curl"
    return 1
  fi
  
  # Try /messages/ endpoint first (primary endpoint, accept 200/401/405 as healthy)
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:${port}/messages/" 2>/dev/null || echo "000")
  if [[ "$http_code" == "200" || "$http_code" == "401" || "$http_code" == "405" ]]; then
    echo "messages-${http_code}"
    return 0
  fi
  
  # Fallback to /health endpoint
  if curl -fsS --max-time 2 "http://localhost:${port}/health" >/dev/null 2>&1; then
    echo "health"
    return 0
  fi
  
  # Last fallback to /api/status
  if curl -fsS --max-time 2 "http://localhost:${port}/api/status" >/dev/null 2>&1; then
    echo "status"
    return 0
  fi
  
  echo "failed-${http_code}"
  return 1
}

