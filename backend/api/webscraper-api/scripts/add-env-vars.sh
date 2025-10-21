#!/usr/bin/env bash
# ============================================================================
# Add WebScraper API variables to root .env file
# ============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Adding WebScraper API Variables to .env${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}✗${NC} .env file not found at: $ENV_FILE"
  exit 1
fi

# Check if variables already exist
if grep -q "WEBSCRAPER_API_PORT" "$ENV_FILE"; then
  echo -e "${YELLOW}!${NC} WEBSCRAPER_* variables already exist in .env"
  echo -e "  Skipping..."
  exit 0
fi

# Backup .env
BACKUP_FILE="${ENV_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓${NC} Created backup: $BACKUP_FILE"

# Add variables
cat >> "$ENV_FILE" << 'EOF'

# ============================================================================
# WebScraper API Configuration
# ============================================================================
WEBSCRAPER_API_PORT=3700
WEBSCRAPER_DATABASE_URL=postgresql://app_webscraper:app_webscraper_dev_password@localhost:5444/frontend_apps?schema=webscraper
WEBSCRAPER_FIRECRAWL_PROXY_URL=http://localhost:3600

# Scheduler (optional - default: disabled)
WEBSCRAPER_SCHEDULER_ENABLED=false
WEBSCRAPER_SCHEDULER_MAX_CONCURRENT_JOBS=5
WEBSCRAPER_SCHEDULER_RETRY_ATTEMPTS=3
WEBSCRAPER_SCHEDULER_RETRY_DELAY_MS=1000
WEBSCRAPER_SCHEDULER_MAX_FAILURES=10
WEBSCRAPER_SCHEDULER_TIMEZONE=America/Sao_Paulo

# Export (optional)
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

# CORS Configuration
WEBSCRAPER_CORS_ORIGIN=http://localhost:3103,http://localhost:3004
WEBSCRAPER_DISABLE_CORS=false
EOF

echo -e "${GREEN}✓${NC} Variables added to .env"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next step:${NC}"
echo -e "  bash backend/api/webscraper-api/scripts/setup-webscraper.sh"
echo ""
