#!/bin/bash
# Comprehensive secret scanning script
# Usage: bash scripts/security/scan-secrets.sh

set -e

REPORT_FILE="governance/evidence/audits/secrets-scan-$(date +%Y-%m-%d).json"
REPORT_DIR=$(dirname "$REPORT_FILE")

mkdir -p "$REPORT_DIR"

echo "🔍 Running comprehensive secret scan..."
echo "📝 Report will be saved to: $REPORT_FILE"
echo ""

# Initialize report
cat > "$REPORT_FILE" <<EOF
{
  "scan_date": "$(date -Iseconds)",
  "scanner_version": "1.0",
  "findings": [],
  "summary": {
    "total_secrets": 0,
    "vite_exposed": 0,
    "local_envs": 0,
    "git_history": 0
  }
}
EOF

# 1. Check for VITE_ exposed secrets
echo "⚙️  [1/5] Checking VITE_ prefix exposure..."
VITE_SECRETS=$(grep -rE "VITE_.*(TOKEN|KEY|PASSWORD|SECRET)=" .env 2>/dev/null | wc -l || echo "0")
if [ "$VITE_SECRETS" -gt 0 ]; then
  echo "❌ FAIL: $VITE_SECRETS secrets exposed via VITE_ prefix"
  grep -rE "VITE_.*(TOKEN|KEY|PASSWORD|SECRET)=" .env 2>/dev/null || true
else
  echo "✅ PASS: No secrets exposed via VITE_ prefix"
fi

# 2. Check for local .env files
echo ""
echo "⚙️  [2/5] Checking for local .env files..."
LOCAL_ENVS=$(find . -name ".env" -not -path "./node_modules/*" -not -path "./.git/*" | wc -l || echo "0")
if [ "$LOCAL_ENVS" -gt 1 ]; then
  echo "❌ FAIL: $LOCAL_ENVS .env files found (should be 1 root only)"
  find . -name ".env" -not -path "./node_modules/*" -not -path "./.git/*"
else
  echo "✅ PASS: Centralized .env configuration"
fi

# 3. Check file permissions
echo ""
echo "⚙️  [3/5] Checking .env file permissions..."
if [ -f ".env" ]; then
  PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%OLp" .env 2>/dev/null || echo "unknown")
  if [ "$PERMS" = "600" ]; then
    echo "✅ PASS: .env has secure permissions (600)"
  else
    echo "❌ FAIL: .env has insecure permissions ($PERMS), should be 600"
  fi
else
  echo "⚠️  WARNING: .env file not found"
fi

# 4. Check for hardcoded secrets in code
echo ""
echo "⚙️  [4/5] Scanning for hardcoded secrets in code..."
HARDCODED=$(grep -rE "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|xox[pboa]-[a-zA-Z0-9-]{10,})" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude="*.json" \
  --exclude="*.md" \
  . 2>/dev/null | wc -l || echo "0")

if [ "$HARDCODED" -gt 0 ]; then
  echo "❌ FAIL: $HARDCODED potential hardcoded secrets found"
  grep -rE "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36})" \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist \
    --exclude="*.json" \
    --exclude="*.md" \
    . 2>/dev/null | head -5 || true
else
  echo "✅ PASS: No hardcoded API keys detected"
fi

# 5. Check git history (if TruffleHog is available)
echo ""
echo "⚙️  [5/5] Checking git history for secrets..."
if command -v trufflehog &> /dev/null; then
  GIT_SECRETS=$(trufflehog git file://. --since-commit HEAD~100 --only-verified --json 2>/dev/null | wc -l || echo "0")
  if [ "$GIT_SECRETS" -gt 0 ]; then
    echo "❌ FAIL: $GIT_SECRETS verified secrets in git history"
  else
    echo "✅ PASS: No verified secrets in recent git history"
  fi
else
  echo "⚠️  SKIP: TruffleHog not installed"
  echo "   Install: curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh"
  GIT_SECRETS=0
fi

# Generate summary
echo ""
echo "📊 Secret Scan Summary"
echo "======================"
echo "VITE_ exposed secrets: $VITE_SECRETS"
echo "Local .env files: $LOCAL_ENVS"
echo "Hardcoded secrets: $HARDCODED"
echo "Git history secrets: $GIT_SECRETS"
echo ""

# Update report
jq --arg vite "$VITE_SECRETS" \
   --arg local "$LOCAL_ENVS" \
   --arg hardcoded "$HARDCODED" \
   --arg git "$GIT_SECRETS" \
   '.summary.vite_exposed = ($vite | tonumber) |
    .summary.local_envs = ($local | tonumber) |
    .summary.hardcoded = ($hardcoded | tonumber) |
    .summary.git_history = ($git | tonumber) |
    .summary.total_secrets = (($vite | tonumber) + ($hardcoded | tonumber) + ($git | tonumber))' \
   "$REPORT_FILE" > "${REPORT_FILE}.tmp" && mv "${REPORT_FILE}.tmp" "$REPORT_FILE"

# Exit status
TOTAL_ISSUES=$((VITE_SECRETS + HARDCODED + GIT_SECRETS))
if [ $TOTAL_ISSUES -gt 0 ]; then
  echo "❌ SCAN FAILED: $TOTAL_ISSUES security issues found"
  echo "📋 Full report: $REPORT_FILE"
  exit 1
else
  echo "✅ SCAN PASSED: No security issues found"
  echo "📋 Full report: $REPORT_FILE"
  exit 0
fi
