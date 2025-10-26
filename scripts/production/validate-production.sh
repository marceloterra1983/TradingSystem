#!/bin/bash
# Production Validation Script
# Validates production deployment of TradingSystem containerized services
# Usage: bash scripts/production/validate-production.sh [--env-file .env.production]

set -euo pipefail

# ============================================
# Configuration
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# ============================================
# Helper Functions
# ============================================

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}## $1${NC}"
    echo ""
}

check_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    echo -e "   ${YELLOW}Fix:${NC} $2"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    echo -e "   ${YELLOW}Note:${NC} $2"
    ((WARNING_CHECKS++))
    ((TOTAL_CHECKS++))
}

# ============================================
# Parse Arguments
# ============================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--env-file .env.production]"
            echo ""
            echo "Validates production deployment of TradingSystem services"
            echo ""
            echo "Options:"
            echo "  --env-file FILE    Path to production .env file (default: .env.production)"
            echo "  --help, -h         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# ============================================
# Main Validation
# ============================================

print_header "Production Validation - TradingSystem"
echo "Project Root: $PROJECT_ROOT"
echo "Environment File: $ENV_FILE"
echo "Started: $(date)"
echo ""

# ============================================
# Section 1: Prerequisites
# ============================================

print_section "1. System Prerequisites"

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    check_pass "Docker installed (version $DOCKER_VERSION)"
else
    check_fail "Docker not installed" "Install Docker: https://docs.docker.com/get-docker/"
fi

# Check Docker Compose
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short)
    check_pass "Docker Compose installed (version $COMPOSE_VERSION)"
else
    check_fail "Docker Compose not installed" "Install Docker Compose v2"
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$NODE_MAJOR" -ge 18 ]]; then
        check_pass "Node.js installed ($NODE_VERSION)"
    else
        check_warn "Node.js version $NODE_VERSION is old" "Recommended: Node.js 20+"
    fi
else
    check_warn "Node.js not installed" "Required only for Telegram Gateway"
fi

# Check Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    check_pass "Git installed (version $GIT_VERSION)"
else
    check_warn "Git not installed" "Recommended for version control"
fi

# ============================================
# Section 2: Configuration Files
# ============================================

print_section "2. Configuration Files"

# Check .env.production exists
if [[ -f "$ENV_FILE" ]]; then
    check_pass ".env.production file exists"

    # Check file permissions
    PERMS=$(stat -c "%a" "$ENV_FILE" 2>/dev/null || stat -f "%Lp" "$ENV_FILE" 2>/dev/null)
    if [[ "$PERMS" == "600" ]]; then
        check_pass ".env.production has correct permissions (600)"
    else
        check_fail ".env.production has incorrect permissions ($PERMS)" "Run: chmod 600 $ENV_FILE"
    fi

    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a

    # Check required variables
    if [[ -n "${TIMESCALEDB_PASSWORD:-}" ]]; then
        if [[ ${#TIMESCALEDB_PASSWORD} -ge 20 ]]; then
            check_pass "TIMESCALEDB_PASSWORD is set (${#TIMESCALEDB_PASSWORD} characters)"
        else
            check_warn "TIMESCALEDB_PASSWORD is weak" "Recommended: 32+ characters"
        fi
    else
        check_fail "TIMESCALEDB_PASSWORD not set" "Set in $ENV_FILE"
    fi

    if [[ -n "${GATEWAY_SECRET_TOKEN:-}" ]]; then
        if [[ ${#GATEWAY_SECRET_TOKEN} -ge 30 ]]; then
            check_pass "GATEWAY_SECRET_TOKEN is set (${#GATEWAY_SECRET_TOKEN} characters)"
        else
            check_warn "GATEWAY_SECRET_TOKEN is weak" "Recommended: 40+ characters"
        fi
    else
        check_fail "GATEWAY_SECRET_TOKEN not set" "Set in $ENV_FILE"
    fi

    # Check NODE_ENV
    if [[ "${NODE_ENV:-}" == "production" ]]; then
        check_pass "NODE_ENV set to production"
    else
        check_fail "NODE_ENV not set to production (current: ${NODE_ENV:-not set})" "Set NODE_ENV=production in $ENV_FILE"
    fi

    # Check LOG_LEVEL
    if [[ "${LOG_LEVEL:-}" == "warn" ]] || [[ "${LOG_LEVEL:-}" == "error" ]]; then
        check_pass "LOG_LEVEL set appropriately (${LOG_LEVEL})"
    else
        check_warn "LOG_LEVEL is verbose (${LOG_LEVEL:-not set})" "Recommended: warn or error for production"
    fi

    # Check CORS_ORIGIN
    if [[ -n "${CORS_ORIGIN:-}" ]]; then
        if [[ "$CORS_ORIGIN" == *"localhost"* ]]; then
            check_fail "CORS_ORIGIN allows localhost" "Set to production domain only"
        elif [[ "$CORS_ORIGIN" == "*" ]]; then
            check_fail "CORS_ORIGIN allows all origins (*)" "Set to production domain only"
        else
            check_pass "CORS_ORIGIN restricted to production domain"
        fi
    else
        check_warn "CORS_ORIGIN not set" "Set to production domain"
    fi

else
    check_fail ".env.production file not found" "Copy from .env.example and configure"
fi

# Check docker-compose.apps.prod.yml exists
if [[ -f "$PROJECT_ROOT/tools/compose/docker-compose.apps.prod.yml" ]]; then
    check_pass "docker-compose.apps.prod.yml exists"
else
    check_fail "docker-compose.apps.prod.yml not found" "Create production compose file"
fi

# ============================================
# Section 3: Docker Resources
# ============================================

print_section "3. Docker Resources"

# Check Docker is running
if docker ps &> /dev/null; then
    check_pass "Docker daemon is running"
else
    check_fail "Docker daemon is not running" "Start Docker: sudo systemctl start docker"
fi

# Check Docker network exists
if docker network inspect tradingsystem_backend &> /dev/null; then
    check_pass "tradingsystem_backend network exists"
else
    check_warn "tradingsystem_backend network not found" "Will be created automatically"
fi

# Check Docker images exist
if docker images | grep -q "tp-capital-api.*production"; then
    check_pass "TP Capital API production image exists"
else
    check_warn "TP Capital API production image not built" "Build with: docker compose -f tools/compose/docker-compose.apps.prod.yml build"
fi

if docker images | grep -q "workspace-service.*production"; then
    check_pass "Workspace service production image exists"
else
    check_warn "Workspace service production image not built" "Build with: docker compose -f tools/compose/docker-compose.apps.prod.yml build"
fi

# ============================================
# Section 4: Database
# ============================================

print_section "4. Database (TimescaleDB)"

# Check TimescaleDB container exists
if docker ps -a | grep -q "data-timescaledb"; then
    check_pass "TimescaleDB container exists"

    # Check if running
    if docker ps | grep -q "data-timescaledb"; then
        check_pass "TimescaleDB container is running"

        # Check if healthy
        HEALTH_STATUS=$(docker inspect data-timescaledb --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        if [[ "$HEALTH_STATUS" == "healthy" ]]; then
            check_pass "TimescaleDB is healthy"
        else
            check_warn "TimescaleDB health status: $HEALTH_STATUS" "May still be starting up (wait 60s)"
        fi

        # Test database connection
        if [[ -n "${TIMESCALEDB_PASSWORD:-}" ]]; then
            if PGPASSWORD="$TIMESCALEDB_PASSWORD" psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -c "SELECT 1" &> /dev/null; then
                check_pass "Database connection successful"

                # Check schemas exist
                if PGPASSWORD="$TIMESCALEDB_PASSWORD" psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -c "\dn" | grep -q "tp_capital"; then
                    check_pass "tp_capital schema exists"
                else
                    check_warn "tp_capital schema not found" "Will be created on first API start"
                fi

                if PGPASSWORD="$TIMESCALEDB_PASSWORD" psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -c "\dn" | grep -q "workspace"; then
                    check_pass "workspace schema exists"
                else
                    check_warn "workspace schema not found" "Will be created on first API start"
                fi

            else
                check_fail "Database connection failed" "Check TIMESCALEDB_PASSWORD or wait for DB to be ready"
            fi
        fi

        # Check TimescaleDB is on backend network
        if docker network inspect tradingsystem_backend 2>/dev/null | grep -q "data-timescaledb"; then
            check_pass "TimescaleDB connected to backend network"
        else
            check_warn "TimescaleDB not on backend network" "Connect with: docker network connect --alias timescaledb tradingsystem_backend data-timescaledb"
        fi

    else
        check_fail "TimescaleDB container is not running" "Start with: docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb"
    fi
else
    check_fail "TimescaleDB container not found" "Deploy with: docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb"
fi

# ============================================
# Section 5: Application Containers
# ============================================

print_section "5. Application Containers"

# Check TP Capital API
if docker ps | grep -q "tp-capital-api"; then
    check_pass "TP Capital API container is running"

    # Check health
    HEALTH=$(docker inspect tp-capital-api --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    if [[ "$HEALTH" == "healthy" ]]; then
        check_pass "TP Capital API is healthy"
    else
        check_warn "TP Capital API health: $HEALTH" "May still be starting (wait 60s)"
    fi

    # Test health endpoint
    if curl -sf http://localhost:4005/health &> /dev/null; then
        check_pass "TP Capital API health endpoint responding"

        # Check database connection in health endpoint
        if curl -sf http://localhost:4005/health | jq -e '.database.connected == true' &> /dev/null; then
            check_pass "TP Capital API database connection verified"
        else
            check_warn "TP Capital API database not connected" "Check logs: docker logs tp-capital-api"
        fi
    else
        check_fail "TP Capital API health endpoint not responding" "Check logs: docker logs tp-capital-api"
    fi

else
    check_warn "TP Capital API container not running" "Start with: docker compose -f tools/compose/docker-compose.apps.prod.yml up -d"
fi

# Check Workspace Service
if docker ps | grep -q "workspace-service"; then
    check_pass "Workspace service container is running"

    # Check health
    HEALTH=$(docker inspect workspace-service --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    if [[ "$HEALTH" == "healthy" ]]; then
        check_pass "Workspace service is healthy"
    else
        check_warn "Workspace service health: $HEALTH" "May still be starting (wait 60s)"
    fi

    # Test health endpoint
    if curl -sf http://localhost:3200/health &> /dev/null; then
        check_pass "Workspace service health endpoint responding"
    else
        check_fail "Workspace service health endpoint not responding" "Check logs: docker logs workspace-service"
    fi

else
    check_warn "Workspace service container not running" "Start with: docker compose -f tools/compose/docker-compose.apps.prod.yml up -d"
fi

# ============================================
# Section 6: Security
# ============================================

print_section "6. Security Checks"

# Check containers running as non-root
if docker ps | grep -q "tp-capital-api"; then
    UID=$(docker exec tp-capital-api id -u 2>/dev/null || echo "0")
    if [[ "$UID" != "0" ]]; then
        check_pass "TP Capital API running as non-root user (uid: $UID)"
    else
        check_fail "TP Capital API running as root" "Update Dockerfile to use non-root user"
    fi
fi

if docker ps | grep -q "workspace-service"; then
    UID=$(docker exec workspace-service id -u 2>/dev/null || echo "0")
    if [[ "$UID" != "0" ]]; then
        check_pass "Workspace service running as non-root user (uid: $UID)"
    else
        check_fail "Workspace service running as root" "Update Dockerfile to use non-root user"
    fi
fi

# Check .env not in Git
if git check-ignore -q .env.production 2>/dev/null; then
    check_pass ".env.production is gitignored"
else
    check_fail ".env.production NOT gitignored" "Add to .gitignore"
fi

# Check for secrets in logs (basic check)
if docker ps -q | xargs -I {} docker logs --tail 100 {} 2>&1 | grep -qiE "password.*=|secret.*=|token.*=" 2>/dev/null; then
    check_warn "Potential secrets found in logs" "Review logs for exposed credentials"
else
    check_pass "No obvious secrets in container logs"
fi

# ============================================
# Section 7: Ports
# ============================================

print_section "7. Port Availability"

# Check port 4005 (TP Capital API)
if lsof -ti :4005 &> /dev/null; then
    PID=$(lsof -ti :4005)
    PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
    if docker ps | grep -q "tp-capital-api"; then
        check_pass "Port 4005 in use by TP Capital API"
    else
        check_fail "Port 4005 in use by $PROCESS (PID: $PID)" "Stop conflicting process or change port"
    fi
else
    check_warn "Port 4005 not in use" "TP Capital API not started yet"
fi

# Check port 3200 (Workspace API)
if lsof -ti :3200 &> /dev/null; then
    PID=$(lsof -ti :3200)
    PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
    if docker ps | grep -q "workspace-service"; then
        check_pass "Port 3200 in use by Workspace service"
    else
        check_fail "Port 3200 in use by $PROCESS (PID: $PID)" "Stop conflicting process or change port"
    fi
else
    check_warn "Port 3200 not in use" "Workspace service not started yet"
fi

# Check port 4006 (Telegram Gateway) - optional
if command -v node &> /dev/null; then
    if lsof -ti :4006 &> /dev/null; then
        check_pass "Port 4006 in use (Telegram Gateway)"
    else
        check_warn "Port 4006 not in use" "Telegram Gateway not started (optional)"
    fi
fi

# ============================================
# Summary
# ============================================

print_header "Validation Summary"

echo "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo ""

# Calculate percentage
if [[ $TOTAL_CHECKS -gt 0 ]]; then
    PASS_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
else
    PASS_PERCENTAGE=0
fi

echo -e "Pass Rate: ${PASS_PERCENTAGE}%"
echo ""

# Overall status
if [[ $FAILED_CHECKS -eq 0 ]]; then
    if [[ $WARNING_CHECKS -eq 0 ]]; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}✅ VALIDATION PASSED - Production Ready${NC}"
        echo -e "${GREEN}========================================${NC}"
        exit 0
    else
        echo -e "${YELLOW}========================================${NC}"
        echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS${NC}"
        echo -e "${YELLOW}========================================${NC}"
        echo ""
        echo "Review warnings above before deploying to production."
        exit 0
    fi
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Fix failed checks above before deploying to production."
    echo "See PRODUCTION-DEPLOYMENT-CHECKLIST.md for detailed steps."
    exit 1
fi
