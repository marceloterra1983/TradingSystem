#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Fixing .env Line Endings"
echo "============================"
echo ""

REPO_ROOT="/home/marce/projetos/TradingSystem"
ENV_FILE="$REPO_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found at: $ENV_FILE"
    exit 1
fi

# Check if file has Windows line endings
if file "$ENV_FILE" | grep -q "CRLF"; then
    echo "⚠️  Detected Windows line endings (CRLF) in .env"
    echo "🔄 Converting to Unix line endings (LF)..."
    
    # Create backup
    cp "$ENV_FILE" "$ENV_FILE.backup-$(date +%Y%m%d-%H%M%S)"
    echo "   ✅ Backup created: $ENV_FILE.backup-$(date +%Y%m%d-%H%M%S)"
    
    # Convert line endings
    dos2unix "$ENV_FILE" 2>/dev/null || sed -i 's/\r$//' "$ENV_FILE"
    
    echo "   ✅ Line endings converted to Unix (LF)"
else
    echo "✅ File already has Unix line endings (LF)"
fi

echo ""
echo "🔍 Verifying .env file..."
if file "$ENV_FILE" | grep -q "CRLF"; then
    echo "❌ Conversion failed - file still has CRLF"
    exit 1
else
    echo "✅ Verification passed - file has LF line endings"
fi

echo ""
echo "✅ Success! .env file is ready"
echo ""
echo "Next step: Retry WebScraper API startup"
echo "  ./fix-webscraper.sh"
