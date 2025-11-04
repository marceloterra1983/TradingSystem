#!/usr/bin/env bash
# ==============================================================================
# Update Documentation Metrics API
# ==============================================================================
#
# Sends audit data to Documentation API to update dashboard metrics
#
# Usage:
#   bash scripts/docs/update-metrics-api.sh [PORT]
#
# PORT: Documentation API port (default: 3405)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
REPORTS_DIR="${PROJECT_ROOT}/docs/reports"
API_PORT="${1:-3405}"
API_URL="http://localhost:${API_PORT}/api/v1/docs/health/update-metrics"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Update Documentation Metrics API${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Find latest frontmatter validation report
LATEST_FRONTMATTER=$(find "$REPORTS_DIR" -name "frontmatter-validation-*.json" -type f | sort -r | head -1)

if [ -z "$LATEST_FRONTMATTER" ]; then
    echo -e "${RED}✗ No frontmatter validation report found${NC}"
    echo -e "${YELLOW}Run: bash scripts/docs/maintenance-audit.sh${NC}"
    exit 1
fi

echo -e "${BLUE}📄 Latest frontmatter report:${NC} $(basename "$LATEST_FRONTMATTER")"

# Find latest maintenance audit report
LATEST_AUDIT=$(find "$REPORTS_DIR" -name "maintenance-audit-*.md" -type f | sort -r | head -1)

if [ -z "$LATEST_AUDIT" ]; then
    echo -e "${RED}✗ No maintenance audit report found${NC}"
    echo -e "${YELLOW}Run: bash scripts/docs/maintenance-audit.sh${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Latest audit report:${NC} $(basename "$LATEST_AUDIT")"

# Extract health score from markdown report
HEALTH_SCORE=$(grep -oP "Health Score\s*\|\s*\K[\d.]+" "$LATEST_AUDIT" | head -1 || echo "0")
TOTAL_FILES=$(grep -oP "Total Files\s*\|\s*\K[\d]+" "$LATEST_AUDIT" | head -1 || echo "0")
STALE_FILES=$(grep -oP "Stale Files\s*\|\s*\K[\d]+" "$LATEST_AUDIT" | head -1 || echo "0")
BROKEN_LINKS=$(grep -oP "Broken Links\s*\|\s*\K[\d]+" "$LATEST_AUDIT" | head -1 || echo "0")

echo -e "${BLUE}📈 Metrics Summary:${NC}"
echo -e "  Health Score: ${HEALTH_SCORE}"
echo -e "  Total Files:  ${TOTAL_FILES}"
echo -e "  Stale Files:  ${STALE_FILES}"
echo -e "  Broken Links: ${BROKEN_LINKS}"
echo ""

# Load frontmatter JSON
FRONTMATTER_DATA=$(cat "$LATEST_FRONTMATTER")

# Create payload
PAYLOAD=$(cat <<EOF
{
  "health_score": ${HEALTH_SCORE},
  "frontmatter": ${FRONTMATTER_DATA},
  "links": {
    "total_broken": ${BROKEN_LINKS},
    "broken_links": ${BROKEN_LINKS}
  },
  "duplicates": {}
}
EOF
)

# Send to API
echo -e "${BLUE}🚀 Sending data to API...${NC}"
echo -e "   URL: ${API_URL}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" || echo "ERROR\n000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Metrics updated successfully!${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ Failed to update metrics (HTTP ${HTTP_CODE})${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Metrics Update Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "\n${BLUE}Dashboard:${NC} http://localhost:3103/documentation-metrics"
echo ""

