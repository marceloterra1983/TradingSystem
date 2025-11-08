#!/bin/bash
# ==============================================================================
# WhatsApp Gateway Stack - Health Check Script
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🏥 WhatsApp Gateway Stack - Health Check"
echo "========================================"
echo ""

# Function to check container health
check_container() {
    local container_name=$1
    local display_name=$2
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo -e "${RED}❌ $display_name${NC} - Container not running"
        return 1
    fi
    
    local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")
    
    case "$health" in
        "healthy")
            echo -e "${GREEN}✅ $display_name${NC} - Healthy"
            return 0
            ;;
        "unhealthy")
            echo -e "${RED}❌ $display_name${NC} - Unhealthy"
            return 1
            ;;
        "starting")
            echo -e "${YELLOW}⏳ $display_name${NC} - Starting..."
            return 2
            ;;
        "no-healthcheck")
            local status=$(docker inspect --format='{{.State.Status}}' "$container_name")
            if [ "$status" = "running" ]; then
                echo -e "${GREEN}✅ $display_name${NC} - Running (no healthcheck)"
                return 0
            else
                echo -e "${RED}❌ $display_name${NC} - Not running"
                return 1
            fi
            ;;
        *)
            echo -e "${YELLOW}⚠️  $display_name${NC} - Unknown status: $health"
            return 2
            ;;
    esac
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local display_name=$2
    
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $display_name${NC} - Responding"
        return 0
    else
        echo -e "${RED}❌ $display_name${NC} - Not responding"
        return 1
    fi
}

# Function to check database connection
check_database() {
    local host=$1
    local port=$2
    local db=$3
    local user=$4
    local display_name=$5
    
    if docker exec whatsapp-timescale pg_isready -h "$host" -p "$port" -U "$user" -d "$db" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $display_name${NC} - Connection OK"
        return 0
    else
        echo -e "${RED}❌ $display_name${NC} - Connection failed"
        return 1
    fi
}

# Check containers
echo "📦 Container Health:"
check_container "whatsapp-timescale" "TimescaleDB"
check_container "whatsapp-pgbouncer" "PgBouncer"
check_container "whatsapp-redis" "Redis"
check_container "whatsapp-minio" "MinIO"
check_container "whatsapp-gateway-core" "WhatsApp Core"
check_container "whatsapp-gateway-api" "Gateway API"
check_container "whatsapp-sync-service" "Sync Service"

echo ""
echo "🌐 HTTP Endpoints:"
check_http "http://localhost:${WHATSAPP_GATEWAY_API_PORT:-4011}/health" "Gateway API"
check_http "http://localhost:${WHATSAPP_CORE_PORT:-3311}/health" "WhatsApp Core"
check_http "http://localhost:${WHATSAPP_MINIO_API_PORT:-9302}/minio/health/live" "MinIO"

echo ""
echo "💾 Database:"
source "$PROJECT_ROOT/.env"
check_database "localhost" "${WHATSAPP_DB_PORT:-5435}" "whatsapp_gateway" "${WHATSAPP_DB_USER:-whatsapp}" "TimescaleDB Connection"

echo ""
echo "📊 Quick Stats:"

# Get message count
message_count=$(docker exec whatsapp-timescale psql -U "${WHATSAPP_DB_USER:-whatsapp}" -d whatsapp_gateway -t -c \
    "SELECT COUNT(*) FROM whatsapp_gateway.messages" 2>/dev/null | tr -d ' ' || echo "N/A")
echo "  Total Messages: $message_count"

# Get contact count
contact_count=$(docker exec whatsapp-timescale psql -U "${WHATSAPP_DB_USER:-whatsapp}" -d whatsapp_gateway -t -c \
    "SELECT COUNT(*) FROM whatsapp_gateway.contacts" 2>/dev/null | tr -d ' ' || echo "N/A")
echo "  Total Contacts: $contact_count"

# Get session count
session_count=$(docker exec whatsapp-timescale psql -U "${WHATSAPP_DB_USER:-whatsapp}" -d whatsapp_gateway -t -c \
    "SELECT COUNT(*) FROM whatsapp_gateway.sessions WHERE status = 'connected'" 2>/dev/null | tr -d ' ' || echo "N/A")
echo "  Active Sessions: $session_count"

# Get pending media downloads
pending_media=$(docker exec whatsapp-timescale psql -U "${WHATSAPP_DB_USER:-whatsapp}" -d whatsapp_gateway -t -c \
    "SELECT COUNT(*) FROM whatsapp_gateway.media_downloads WHERE download_status = 'pending'" 2>/dev/null | tr -d ' ' || echo "N/A")
echo "  Pending Media Downloads: $pending_media"

echo ""
echo "✅ Health check completed"

