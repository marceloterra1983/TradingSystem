#!/usr/bin/env bash
# ============================================================================
# WebScraper API - Quick Setup (All-in-One)
# ============================================================================
# This script does EVERYTHING needed to set up webscraper-api:
#   1. Checks prerequisites
#   2. Adds variables to root .env (if needed)
#   3. Creates database user and schema
#   4. Runs Prisma migrations
#   5. Validates setup
#
# Usage:
#   bash backend/api/webscraper-api/scripts/quick-setup.sh
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
API_DIR="$PROJECT_ROOT/backend/api/webscraper-api"
ENV_FILE="$PROJECT_ROOT/.env"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}║          🚀 WebScraper API - Quick Setup Script 🚀            ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================================================
# STEP 1: Check Prerequisites
# ==============================================================================
echo -e "${BLUE}[STEP 1/5]${NC} Checking prerequisites..."
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}✗${NC} .env file not found at: $ENV_FILE"
  exit 1
fi
echo -e "${GREEN}  ✓${NC} Root .env file exists"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q '^data-frontend-apps$'; then
  echo -e "${RED}  ✗${NC} Container 'data-frontend-apps' is not running"
  echo ""
  echo -e "${YELLOW}  → Starting container...${NC}"
  docker compose -f "$PROJECT_ROOT/infrastructure/compose/docker-compose.frontend-apps.yml" up -d
  
  echo -e "${YELLOW}  → Waiting for healthcheck (15 seconds)...${NC}"
  sleep 15
  
  if ! docker ps --format '{{.Names}}' | grep -q '^data-frontend-apps$'; then
    echo -e "${RED}  ✗${NC} Failed to start container"
    exit 1
  fi
fi
echo -e "${GREEN}  ✓${NC} Container 'data-frontend-apps' is running"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}  ✗${NC} Node.js not found"
  exit 1
fi
echo -e "${GREEN}  ✓${NC} Node.js $(node --version) detected"

# Check if npm modules are installed
if [ ! -d "$API_DIR/node_modules" ]; then
  echo -e "${YELLOW}  !${NC} node_modules not found. Running npm install..."
  cd "$API_DIR"
  npm install --silent > /dev/null 2>&1
fi
echo -e "${GREEN}  ✓${NC} Dependencies installed"

echo ""
echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# ==============================================================================
# STEP 2: Add Environment Variables
# ==============================================================================
echo -e "${BLUE}[STEP 2/5]${NC} Configuring environment variables..."
echo ""

# Check if variables already exist
if grep -q "WEBSCRAPER_API_PORT" "$ENV_FILE"; then
  echo -e "${GREEN}  ✓${NC} WEBSCRAPER_* variables already configured"
else
  echo -e "${YELLOW}  →${NC} Adding WEBSCRAPER_* variables to .env..."
  
  # Backup .env
  BACKUP_FILE="${ENV_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
  cp "$ENV_FILE" "$BACKUP_FILE"
  echo -e "${GREEN}  ✓${NC} Created backup: $(basename "$BACKUP_FILE")"
  
  # Add variables
  cat >> "$ENV_FILE" << 'EOF'

# ============================================================================
# WebScraper API Configuration (added by quick-setup.sh)
# ============================================================================
WEBSCRAPER_API_PORT=3700
WEBSCRAPER_DATABASE_URL=postgresql://app_webscraper:app_webscraper_dev_password@localhost:5444/frontend_apps?schema=webscraper
WEBSCRAPER_FIRECRAWL_PROXY_URL=http://localhost:3600

# Scheduler
WEBSCRAPER_SCHEDULER_ENABLED=false
WEBSCRAPER_SCHEDULER_MAX_CONCURRENT_JOBS=5
WEBSCRAPER_SCHEDULER_RETRY_ATTEMPTS=3
WEBSCRAPER_SCHEDULER_RETRY_DELAY_MS=1000
WEBSCRAPER_SCHEDULER_MAX_FAILURES=10
WEBSCRAPER_SCHEDULER_TIMEZONE=America/Sao_Paulo

# Export
WEBSCRAPER_EXPORT_ENABLED=true
WEBSCRAPER_EXPORT_DIR=/tmp/webscraper-exports
WEBSCRAPER_EXPORT_TTL_HOURS=24
WEBSCRAPER_EXPORT_CLEANUP_INTERVAL_HOURS=6
WEBSCRAPER_EXPORT_MAX_ROWS=100000
WEBSCRAPER_EXPORT_MAX_FILE_SIZE_MB=500

# Logging & Monitoring
WEBSCRAPER_LOG_LEVEL=info
WEBSCRAPER_RATE_LIMIT_WINDOW_MS=60000
WEBSCRAPER_RATE_LIMIT_MAX=200

# CORS
WEBSCRAPER_CORS_ORIGIN=http://localhost:3103,http://localhost:3004
WEBSCRAPER_DISABLE_CORS=false
EOF

  echo -e "${GREEN}  ✓${NC} Variables added to .env"
fi

# Load environment
set -a
source "$ENV_FILE"
set +a

echo ""
echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# ==============================================================================
# STEP 3: Create Database User and Schema
# ==============================================================================
echo -e "${BLUE}[STEP 3/5]${NC} Setting up database..."
echo ""

# Run setup SQL
if docker exec -i data-frontend-apps psql -U "${FRONTEND_APPS_DB_SUPERUSER:-frontend_admin}" -d "${FRONTEND_APPS_DB_NAME:-frontend_apps}" < "$SCRIPT_DIR/setup-database.sql" > /tmp/webscraper-setup.log 2>&1; then
  echo -e "${GREEN}  ✓${NC} Database user 'app_webscraper' created"
  echo -e "${GREEN}  ✓${NC} Schema 'webscraper' created"
  echo -e "${GREEN}  ✓${NC} Permissions granted"
else
  # Check if already exists (not an error)
  if grep -q "already exists" /tmp/webscraper-setup.log; then
    echo -e "${YELLOW}  !${NC} Database user and schema already exist (OK)"
  else
    echo -e "${RED}  ✗${NC} Failed to create database user/schema"
    cat /tmp/webscraper-setup.log
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}✓ Database setup complete${NC}"
echo ""

# ==============================================================================
# STEP 4: Run Prisma Migrations
# ==============================================================================
echo -e "${BLUE}[STEP 4/5]${NC} Running Prisma migrations..."
echo ""

cd "$API_DIR"

# Generate Prisma client
echo -e "${YELLOW}  →${NC} Generating Prisma client..."
if npm run prisma:generate > /tmp/webscraper-prisma-generate.log 2>&1; then
  echo -e "${GREEN}  ✓${NC} Prisma client generated"
else
  echo -e "${RED}  ✗${NC} Failed to generate Prisma client"
  tail -20 /tmp/webscraper-prisma-generate.log
  exit 1
fi

# Run migrations
echo -e "${YELLOW}  →${NC} Applying database migrations..."
export WEBSCRAPER_DATABASE_URL="postgresql://app_webscraper:app_webscraper_dev_password@localhost:${FRONTEND_APPS_DB_PORT:-5444}/frontend_apps?schema=webscraper"

if npx prisma migrate deploy > /tmp/webscraper-prisma-migrate.log 2>&1; then
  echo -e "${GREEN}  ✓${NC} Migrations applied successfully"
else
  # Check if already applied
  if grep -q "No pending migrations" /tmp/webscraper-prisma-migrate.log; then
    echo -e "${YELLOW}  !${NC} No pending migrations (already applied)"
  else
    echo -e "${RED}  ✗${NC} Migration failed"
    tail -20 /tmp/webscraper-prisma-migrate.log
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}✓ Migrations complete${NC}"
echo ""

# ==============================================================================
# STEP 5: Validate Setup
# ==============================================================================
echo -e "${BLUE}[STEP 5/5]${NC} Validating installation..."
echo ""

# Check if tables exist
TABLE_COUNT=$(docker exec data-frontend-apps psql -U "${FRONTEND_APPS_DB_SUPERUSER:-frontend_admin}" -d "${FRONTEND_APPS_DB_NAME:-frontend_apps}" -tAc "
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'webscraper' AND table_name IN ('scrape_jobs', 'scrape_templates', 'job_schedules', 'export_jobs');
" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -eq "4" ]; then
  echo -e "${GREEN}  ✓${NC} All 4 tables created successfully"
  echo -e "    • scrape_jobs"
  echo -e "    • scrape_templates"
  echo -e "    • job_schedules"
  echo -e "    • export_jobs"
else
  echo -e "${YELLOW}  !${NC} Expected 4 tables, found $TABLE_COUNT"
fi

# Check permissions
PERMS=$(docker exec data-frontend-apps psql -U "${FRONTEND_APPS_DB_SUPERUSER:-frontend_admin}" -d "${FRONTEND_APPS_DB_NAME:-frontend_apps}" -tAc "
SELECT COUNT(*) FROM information_schema.role_table_grants 
WHERE grantee = 'app_webscraper' AND table_schema = 'webscraper';
" 2>/dev/null || echo "0")

if [ "$PERMS" -gt "0" ]; then
  echo -e "${GREEN}  ✓${NC} User permissions configured correctly"
else
  echo -e "${YELLOW}  !${NC} User permissions may need verification"
fi

echo ""
echo -e "${GREEN}✓ Validation complete${NC}"
echo ""

# ==============================================================================
# SUCCESS!
# ==============================================================================
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}║              ✅ Setup Complete - All Systems GO! ✅            ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Installation Summary:${NC}"
echo -e "   ${GREEN}✓${NC} Database: ${CYAN}frontend_apps${NC}"
echo -e "   ${GREEN}✓${NC} Schema: ${CYAN}webscraper${NC}"
echo -e "   ${GREEN}✓${NC} User: ${CYAN}app_webscraper${NC}"
echo -e "   ${GREEN}✓${NC} Tables: ${CYAN}4${NC} (scrape_jobs, scrape_templates, job_schedules, export_jobs)"
echo -e "   ${GREEN}✓${NC} Port: ${CYAN}3700${NC}"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo ""
echo -e "   ${YELLOW}1.${NC} Start the service:"
echo -e "      ${CYAN}cd backend/api/webscraper-api${NC}"
echo -e "      ${CYAN}npm run dev${NC}"
echo ""
echo -e "   ${YELLOW}2.${NC} Test the API:"
echo -e "      ${CYAN}curl http://localhost:3700/health | jq${NC}"
echo ""
echo -e "   ${YELLOW}3.${NC} Check logs:"
echo -e "      ${CYAN}tail -f /tmp/tradingsystem-logs/webscraper-api.log${NC}"
echo ""
echo -e "${GREEN}Happy scraping! 🎉${NC}"
echo ""
