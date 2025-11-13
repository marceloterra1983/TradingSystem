#!/bin/bash
set -e

echo "🔧 Fixing duplicate group_add..."

cd .devcontainer

# Backup
cp docker-compose.yml docker-compose.yml.broken-$(date +%Y%m%d-%H%M%S)

# Remove ALL occurrences of group_add section
sed -i '/^[[:space:]]*group_add:/,/^[[:space:]]*- "989"/d' docker-compose.yml

# Now add it ONCE in the correct place (after privileged: true)
sed -i '/privileged: true/a\    \n    group_add:\n      - "989"' docker-compose.yml

echo "✅ Fixed!"
echo ""
echo "Verificando:"
grep -A3 "privileged:" docker-compose.yml

cd ..
