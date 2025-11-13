#!/bin/bash
# Generate secure keys for Telegram Gateway
# Usage: bash scripts/setup/generate-telegram-gateway-keys.sh

set -e

echo "🔐 Generating Secure Keys for Telegram Gateway"
echo ""

# Generate session encryption key (64 hex chars = 32 bytes)
SESSION_KEY=$(openssl rand -hex 32)

# Generate API key (64 hex chars = 32 bytes)
API_KEY=$(openssl rand -hex 32)

echo "✅ Keys generated successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Add these to your .env file:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Telegram Gateway Security Keys"
echo "TELEGRAM_SESSION_ENCRYPTION_KEY=$SESSION_KEY"
echo "TELEGRAM_GATEWAY_API_KEY=$API_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Copy both keys to your .env file"
echo "  2. Never commit these keys to Git"
echo "  3. Keep .env in .gitignore"
echo "  4. After adding keys, restart Telegram Gateway"
echo ""
echo "🔧 Quick Add (CAREFUL - review .env after):"
echo ""
echo "cat >> .env << EOF"
echo "TELEGRAM_SESSION_ENCRYPTION_KEY=$SESSION_KEY"
echo "TELEGRAM_GATEWAY_API_KEY=$API_KEY"
echo "EOF"
echo ""

