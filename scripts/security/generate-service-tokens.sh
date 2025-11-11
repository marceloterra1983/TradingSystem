#!/usr/bin/env bash
# ==============================================================================
# Generate Service-to-Service Authentication Tokens
# ==============================================================================
# Creates JWT tokens for inter-service communication with proper expiration.
#
# Part of: Phase 2.2 - Security Infrastructure
#
# Usage:
#   bash scripts/security/generate-service-tokens.sh
#   bash scripts/security/generate-service-tokens.sh --rotate
#   bash scripts/security/generate-service-tokens.sh --service workspace-api
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
TOKENS_FILE="${REPO_ROOT}/.service-tokens.json"
EXPIRATION="24h" # Default token expiration

# Services that need tokens
SERVICES=(
  "workspace-api"
  "documentation-api"
  "telegram-gateway"
  "tp-capital"
  "firecrawl-proxy"
  "health-monitor"
)

echo -e "${BLUE}🔐 TradingSystem Service Token Generator${NC}"
echo "=========================================="

# Check for INTER_SERVICE_SECRET
if [[ -z "${INTER_SERVICE_SECRET:-}" ]]; then
  echo -e "${RED}❌ INTER_SERVICE_SECRET not set in environment${NC}"
  echo ""
  echo "Please set INTER_SERVICE_SECRET in your .env file:"
  echo "  INTER_SERVICE_SECRET=\"$(openssl rand -hex 32)\""
  echo ""
  exit 1
fi

# Create Node.js script to generate tokens
node_script=$(cat <<'EOF'
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const secret = process.env.INTER_SERVICE_SECRET;
const services = process.argv[2].split(',');
const expiration = process.argv[3] || '24h';
const tokensFile = process.argv[4];

const tokens = {};

services.forEach(serviceName => {
  const payload = {
    serviceName,
    issuer: 'tradingsystem',
  };

  const token = jwt.sign(payload, secret, {
    expiresIn: expiration,
    issuer: 'tradingsystem',
  });

  // Decode to get expiration time
  const decoded = jwt.decode(token);

  tokens[serviceName] = {
    token,
    expiresAt: new Date(decoded.exp * 1000).toISOString(),
    issuedAt: new Date(decoded.iat * 1000).toISOString(),
  };
});

// Save to file
fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));

// Print summary
console.log('\n✅ Tokens generated successfully!\n');
Object.entries(tokens).forEach(([service, info]) => {
  console.log(`📦 ${service}`);
  console.log(`   Token: ${info.token.substring(0, 50)}...`);
  console.log(`   Expires: ${info.expiresAt}`);
  console.log('');
});

console.log(`💾 Tokens saved to: ${tokensFile}`);
console.log('⚠️  Keep this file secure - do NOT commit to git!');
EOF
)

# Parse arguments
ROTATE=false
SPECIFIC_SERVICE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --rotate)
      ROTATE=true
      shift
      ;;
    --service)
      SPECIFIC_SERVICE="$2"
      shift 2
      ;;
    --expiration)
      EXPIRATION="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is required but not found${NC}"
  exit 1
fi

# Check if jsonwebtoken is installed
if ! node -e "require('jsonwebtoken')" 2>/dev/null; then
  echo -e "${YELLOW}📦 Installing jsonwebtoken...${NC}"
  cd "${REPO_ROOT}/backend/shared"
  npm install jsonwebtoken
  cd "${REPO_ROOT}"
fi

# Determine services to generate tokens for
if [[ -n "${SPECIFIC_SERVICE}" ]]; then
  SERVICES_TO_GENERATE="${SPECIFIC_SERVICE}"
else
  SERVICES_TO_GENERATE="${SERVICES[*]}"
  SERVICES_TO_GENERATE="${SERVICES_TO_GENERATE// /,}" # Convert to comma-separated
fi

# Check for existing tokens
if [[ -f "${TOKENS_FILE}" ]] && [[ "${ROTATE}" == "false" ]]; then
  echo -e "${YELLOW}⚠️  Tokens file already exists: ${TOKENS_FILE}${NC}"
  echo ""
  read -p "Do you want to regenerate tokens? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

# Generate tokens
echo -e "${BLUE}🔑 Generating service tokens...${NC}"
echo "${node_script}" | node - "${SERVICES_TO_GENERATE}" "${EXPIRATION}" "${TOKENS_FILE}"

# Set proper permissions
chmod 600 "${TOKENS_FILE}"

echo ""
echo -e "${GREEN}✅ Token generation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Tokens are saved in: ${TOKENS_FILE}"
echo "2. Use these tokens in service-to-service requests"
echo "3. Set up token rotation (recommended: daily)"
echo ""
echo "Example usage:"
echo "  curl -H 'x-service-token: \$(jq -r '.\"workspace-api\".token' ${TOKENS_FILE})' \\"
echo "    http://localhost:3200/internal/data"
echo ""
echo -e "${YELLOW}⚠️  Security reminders:${NC}"
echo "  - Keep ${TOKENS_FILE} secure"
echo "  - Add to .gitignore"
echo "  - Rotate tokens regularly (--rotate flag)"
echo "  - Use HTTPS in production"
