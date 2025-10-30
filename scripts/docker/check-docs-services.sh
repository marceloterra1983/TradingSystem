#!/bin/bash
# ============================================================================
# Check Documentation Services Status
# ============================================================================
# Quick status check for Docusaurus and DocsAPI
# ============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Documentation Services - Status Check              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check DocsAPI (Docker)
echo -e "${BLUE}📡 DocsAPI (Port 3401):${NC}"

if docker ps --format '{{.Names}}' | grep -q docs-api; then
    health=$(docker inspect --format='{{.State.Health.Status}}' docs-api 2>/dev/null || echo "no-health-check")
    
    if [[ "$health" == "healthy" ]]; then
        echo -e "  Status: ${GREEN}✅ Running (Healthy)${NC}"
    elif [[ "$health" == "unhealthy" ]]; then
        echo -e "  Status: ${RED}⚠️  Running (Unhealthy)${NC}"
    elif [[ "$health" == "starting" ]]; then
        echo -e "  Status: ${YELLOW}🔄 Starting...${NC}"
    else
        echo -e "  Status: ${GREEN}✅ Running${NC} (no health check configured)"
    fi
    
    # Test HTTP
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3401/health | grep -q 200; then
        echo -e "  HTTP:   ${GREEN}✅ Responding${NC}"
    else
        echo -e "  HTTP:   ${RED}❌ Not responding${NC}"
    fi
    
    echo "  URL:    http://localhost:3401"
    echo "  Type:   🐳 Docker Container"
else
    echo -e "  Status: ${RED}❌ Not Running${NC}"
    echo "  Type:   🐳 Docker Container (Expected)"
    echo "  Hint:   docker compose --env-file .env -f tools/compose/docker-compose.docs.yml up -d"
fi

echo ""

# Check Docusaurus
echo -e "${BLUE}📚 Docusaurus (Port 3400):${NC}"

# Check if running as Docker
if docker ps --format '{{.Names}}' | grep -q tradingsystem-docusaurus; then
    echo -e "  Status: ${GREEN}✅ Running (Docker)${NC}"
    echo "  URL:    http://localhost:3400"
    echo "  Type:   🐳 Docker Container (Production)"
# Check if running as local service
elif lsof -i :3400 &> /dev/null; then
    echo -e "  Status: ${GREEN}✅ Running (Local)${NC}"
    echo "  URL:    http://localhost:3400"
    echo "  Type:   🖥️  Local Service (Development)"
else
    echo -e "  Status: ${YELLOW}⚠️  Not Running${NC}"
    echo "  Type:   🖥️  Local Service (Development)"
    echo "  Hint:   cd docs && npm run start -- --port 3400"
fi

echo ""

# Check TimescaleDB (dependency)
echo -e "${BLUE}💾 TimescaleDB (Port 5433) - Dependency:${NC}"

if docker ps --format '{{.Names}}' | grep -q '^data-timescaledb$'; then
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h localhost -p 5433 -t 2 >/dev/null 2>&1; then
            echo -e "  Status: ${GREEN}✅ Running (pg_isready OK)${NC}"
        else
            echo -e "  Status: ${YELLOW}⚠️  Running (pg_isready failed)${NC}"
        fi
    else
        echo -e "  Status: ${GREEN}✅ Running${NC} (pg_isready not installed)"
    fi

    echo "  Host:   localhost"
    echo "  Port:   5433 (mapped to container 5432)"
    echo "  Type:   🐳 Docker Container"
else
    echo -e "  Status: ${RED}❌ Not Running${NC}"
    echo "  Type:   🐳 Docker Container (Required for DocsAPI)"
    echo "  Hint:   docker compose --env-file .env -f tools/compose/docker-compose.timescale.yml up -d timescaledb"
fi

echo ""

# Quick Links
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                     Quick Links                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  📚 Docusaurus:     http://localhost:3400"
echo "  📡 DocsAPI:        http://localhost:3401"
echo "  📊 DocsAPI Health: http://localhost:3401/health"
echo "  📋 OpenAPI Spec:   http://localhost:3401/spec/openapi.yaml"
echo "  💾 PgAdmin:        http://localhost:5050 (login required)"
echo ""

# Management commands
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  Management Commands                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  Start DocsAPI:"
echo "    docker compose --env-file .env -f tools/compose/docker-compose.docs.yml up -d"
echo ""
echo "  Test DocsAPI:"
echo "    bash scripts/docker/test-docs-api.sh"
echo ""
echo "  View logs:"
echo "    docker compose --env-file .env -f tools/compose/docker-compose.docs.yml logs -f"
echo ""
echo "  Start Docusaurus (DEV):"
echo "    cd docs && npm run start -- --port 3400"
echo ""
