#!/bin/bash
# Fix VITE_ prefix exposure by removing VITE_ from secret variables
# Usage: bash scripts/security/fix-vite-secrets.sh

set -e

echo "🔧 Fixing VITE_ prefix exposure..."
echo ""

# 1. Backup .env
BACKUP_FILE=".env.backup-vite-fix-$(date +%Y%m%d-%H%M%S)"
cp .env "$BACKUP_FILE"
echo "✅ Created backup: $BACKUP_FILE"

# 2. Remove VITE_ prefix from secrets
echo "⚙️  Removing VITE_ prefix from secret variables..."

# List of secret variables to fix
SECRETS=(
  "VITE_LLAMAINDEX_JWT"
  "VITE_TP_CAPITAL_API_KEY"
  "VITE_GATEWAY_TOKEN"
  "VITE_TELEGRAM_GATEWAY_API_TOKEN"
  "VITE_N8N_BASIC_AUTH_PASSWORD"
  "VITE_API_SECRET_TOKEN"
)

for SECRET in "${SECRETS[@]}"; do
  NEW_NAME="${SECRET#VITE_}"
  if grep -q "^${SECRET}=" .env; then
    sed -i "s/^${SECRET}=/${NEW_NAME}=/" .env
    echo "   ✓ Renamed: $SECRET → $NEW_NAME"
  fi
done

# 3. Warn about manual frontend updates needed
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo ""
echo "Frontend code needs updating to remove VITE_ usage:"
echo ""
echo "File: frontend/dashboard/src/utils/tpCapitalApi.ts"
echo "   ❌ Remove: import.meta.env.VITE_TP_CAPITAL_API_KEY"
echo "   ✅ Use: fetch('/api/tp-capital/...')  // Proxied by Vite"
echo ""
echo "File: frontend/dashboard/vite.config.ts"
echo "   ❌ Remove: VITE_GATEWAY_TOKEN from define block"
echo "   ✅ Backend should mint tokens server-side"
echo ""
echo "After making changes, rebuild frontend:"
echo "   cd frontend/dashboard"
echo "   npm run build"
echo "   grep -r 'VITE_.*TOKEN' dist/  # Should return no results"
echo ""

# 4. Verify no VITE_ secrets remain
echo "🔍 Verifying fix..."
REMAINING=$(grep -rE "VITE_.*(TOKEN|KEY|PASSWORD|SECRET)=" .env 2>/dev/null | wc -l || echo "0")

if [ "$REMAINING" -gt 0 ]; then
  echo "⚠️  WARNING: $REMAINING VITE_ secrets still found in .env"
  grep -rE "VITE_.*(TOKEN|KEY|PASSWORD|SECRET)=" .env 2>/dev/null || true
else
  echo "✅ SUCCESS: No VITE_ secrets in .env"
fi

echo ""
echo "📋 Next Steps:"
echo "   1. Update frontend code (see above)"
echo "   2. Test functionality: npm run dev"
echo "   3. Build and verify: npm run build && grep -r VITE_.*SECRET dist/"
echo "   4. If all works, commit changes"
echo ""
echo "Backup available at: $BACKUP_FILE"
