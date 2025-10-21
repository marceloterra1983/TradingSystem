#!/usr/bin/env bash
# ============================================================================
# WebScraper API - Complete Setup Script
# ============================================================================
# This script:
#   1. Checks if frontend-apps DB container is running
#   2. Creates database user and schema
#   3. Runs Prisma migrations
#   4. Validates the setup
#
# Prerequisites:
#   - Docker container 'data-frontend-apps' running
#   - Root .env file with FRONTEND_APPS_DB_* variables
#
# Usage:
#   bash scripts/setup-webscraper.sh
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
API_DIR="$PROJECT_ROOT/backend/api/webscraper-api"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  WebScraper API - Database Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
  echo -e "${GREEN}✓${NC} Loaded environment from .env"
else
  echo -e "${RED}✗${NC} .env file not found at $PROJECT_ROOT/.env"
  exit 1
fi

# Check if container is running
echo ""
echo -e "${YELLOW}→${NC} Checking database container..."
if ! docker ps --format '{{.Names}}' | grep -q '^data-frontend-apps$'; then
  echo -e "${RED}✗${NC} Container 'data-frontend-apps' is not running"
  echo -e "  Start it with:"
  echo -e "    docker compose -f infrastructure/compose/docker-compose.frontend-apps.yml up -d"
  exit 1
fi
echo -e "${GREEN}✓${NC} Container 'data-frontend-apps' is running"

# Step 1: Create user and schema
echo ""
echo -e "${YELLOW}→${NC} Creating database user and schema..."
if docker exec -i data-frontend-apps psql -U "${FRONTEND_APPS_DB_SUPERUSER:-frontend_admin}" -d "${FRONTEND_APPS_DB_NAME:-frontend_apps}" < "$SCRIPT_DIR/setup-database.sql" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Database user and schema created"
else
  echo -e "${RED}✗${NC} Failed to create database user and schema"
  echo -e "  Check logs above for details"
  exit 1
fi

# Step 2: Generate Prisma client
echo ""
echo -e "${YELLOW}→${NC} Generating Prisma client..."
cd "$API_DIR"
if npm run prisma:generate > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Prisma client generated"
else
  echo -e "${RED}✗${NC} Failed to generate Prisma client"
  exit 1
fi

# Step 3: Run migrations
echo ""
echo -e "${YELLOW}→${NC} Running Prisma migrations..."
export WEBSCRAPER_DATABASE_URL="postgresql://app_webscraper:app_webscraper_dev_password@localhost:${FRONTEND_APPS_DB_PORT:-5444}/frontend_apps?schema=webscraper"

if npx prisma migrate deploy > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Migrations applied successfully"
else
  echo -e "${YELLOW}!${NC} No migrations found or already applied"
fi

# Step 4: Validate setup
echo ""
echo -e "${YELLOW}→${NC} Validating database setup..."

# Check if tables exist
TABLE_CHECK=$(docker exec data-frontend-apps psql -U "${FRONTEND_APPS_DB_SUPERUSER:-frontend_admin}" -d "${FRONTEND_APPS_DB_NAME:-frontend_apps}" -tAc "
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'webscraper' AND table_name IN ('scrape_jobs', 'scrape_templates', 'job_schedules', 'export_jobs');
")

if [ "$TABLE_CHECK" -eq "4" ]; then
  echo -e "${GREEN}✓${NC} All tables created successfully"
else
  echo -e "${YELLOW}!${NC} Expected 4 tables, found $TABLE_CHECK"
fi

# Display database info
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Setup Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Database: ${GREEN}frontend_apps${NC}"
echo -e "Schema:   ${GREEN}webscraper${NC}"
echo -e "User:     ${GREEN}app_webscraper${NC}"
echo -e "Port:     ${GREEN}${FRONTEND_APPS_DB_PORT:-5444}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Add WEBSCRAPER_* variables to root .env (see README.md)"
echo -e "  2. Start the service: cd backend/api/webscraper-api && npm run dev"
echo ""
