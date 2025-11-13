#!/bin/bash
# Migrate unencrypted Telegram session to encrypted storage
# 
# This script:
# 1. Backs up old session file
# 2. Encrypts session using new SecureSessionStorage
# 3. Deletes old unencrypted file
#
# Usage: bash scripts/setup/migrate-telegram-session.sh

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
OLD_SESSION_FILE="$PROJECT_ROOT/backend/api/telegram-gateway/.telegram-session"
NEW_CONFIG_DIR="$HOME/.config/telegram-gateway"
BACKUP_DIR="$PROJECT_ROOT/backups/telegram-sessions"

echo "🔐 Telegram Session Migration Tool"
echo ""

# Check if old session exists
if [ ! -f "$OLD_SESSION_FILE" ]; then
  echo "✅ No old session file found at $OLD_SESSION_FILE"
  echo "   Nothing to migrate!"
  exit 0
fi

# Check if encryption key is set
if [ -z "$TELEGRAM_SESSION_ENCRYPTION_KEY" ]; then
  echo "❌ ERROR: TELEGRAM_SESSION_ENCRYPTION_KEY not set in .env"
  echo ""
  echo "Please run:"
  echo "  bash scripts/setup/generate-telegram-gateway-keys.sh"
  echo ""
  echo "Then add the keys to .env and run this script again."
  exit 1
fi

echo "⚠️  Found unencrypted session file!"
echo "   Location: $OLD_SESSION_FILE"
echo ""
echo "📋 Migration Steps:"
echo "   1. Backup old session"
echo "   2. Create new encrypted session"
echo "   3. Delete old unencrypted file"
echo ""

read -p "Continue with migration? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Migration cancelled"
  exit 0
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup old session
BACKUP_FILE="$BACKUP_DIR/session-$(date +%Y%m%d-%H%M%S).bak"
cp "$OLD_SESSION_FILE" "$BACKUP_FILE"
echo "✅ Backed up to: $BACKUP_FILE"

# Run Node.js migration script
echo "🔄 Migrating session..."
node << 'EOF'
import { SecureSessionStorage } from './backend/api/telegram-gateway/src/services/SecureSessionStorage.js';
import fs from 'fs/promises';

const oldSessionFile = process.argv[1];
const sessionStorage = new SecureSessionStorage();

// Read old session
const oldSession = await fs.readFile(oldSessionFile, 'utf8');

// Save encrypted
await sessionStorage.save(oldSession.trim());

console.log('✅ Session encrypted and saved to:', sessionStorage.getSessionFilePath());
EOF

# Delete old file
rm "$OLD_SESSION_FILE"
echo "✅ Deleted old unencrypted session"

echo ""
echo "🎉 Migration complete!"
echo ""
echo "📁 New session location: $NEW_CONFIG_DIR/session.enc"
echo "🔐 Session is now encrypted with AES-256-GCM"
echo "🔒 File permissions: 0600 (owner only)"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Backup file saved to: $BACKUP_FILE"
echo "   2. Keep this backup in a secure location"
echo "   3. Delete backup after confirming migration works"
echo ""
echo "🚀 Next steps:"
echo "   1. Restart Telegram Gateway"
echo "   2. Test authentication"
echo "   3. Delete backup: rm $BACKUP_FILE"
echo ""

