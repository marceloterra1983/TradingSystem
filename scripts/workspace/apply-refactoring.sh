#!/bin/bash
#
# Apply Workspace Refactoring
#
# This script replaces old routes with refactored versions.
# Backup old files automatically.
#
# Usage: bash scripts/workspace/apply-refactoring.sh [--dry-run]
#

set -e

DRY_RUN=false

if [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  echo "DRY RUN MODE - No files will be modified"
  echo ""
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "Workspace Refactoring - Apply Changes"
echo "=============================================="
echo ""

# Backup directory
BACKUP_DIR="backend/api/workspace/src/routes/backup-$(date +%Y%m%d-%H%M%S)"

if [ "$DRY_RUN" = false ]; then
  mkdir -p "$BACKUP_DIR"
  echo -e "${GREEN}✓${NC} Created backup directory: $BACKUP_DIR"
fi

# Files to refactor
declare -A FILES=(
  ["backend/api/workspace/src/routes/items.js"]="backend/api/workspace/src/routes/items.refactored.js"
  ["backend/api/workspace/src/routes/categories.js"]="backend/api/workspace/src/routes/categories.refactored.js"
)

echo ""
echo "Files to refactor:"
for old_file in "${!FILES[@]}"; do
  new_file="${FILES[$old_file]}"
  echo "  • $old_file"
  echo "    → $new_file"
done
echo ""

if [ "$DRY_RUN" = false ]; then
  echo -n "Proceed with refactoring? (yes/no): "
  read -r response
  if [ "$response" != "yes" ]; then
    echo "Refactoring cancelled"
    exit 0
  fi
fi

echo ""
echo "Applying refactoring..."
echo ""

for old_file in "${!FILES[@]}"; do
  new_file="${FILES[$old_file]}"
  
  if [ ! -f "$new_file" ]; then
    echo -e "${YELLOW}⚠${NC}  Skipping $old_file (refactored version not found)"
    continue
  fi
  
  if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}[DRY RUN]${NC} Would replace $old_file with $new_file"
    continue
  fi
  
  # Backup old file
  cp "$old_file" "$BACKUP_DIR/$(basename $old_file)"
  echo -e "${GREEN}✓${NC} Backed up: $old_file → $BACKUP_DIR/$(basename $old_file)"
  
  # Replace with refactored version
  cp "$new_file" "$old_file"
  echo -e "${GREEN}✓${NC} Replaced: $old_file"
  
  # Remove .refactored file
  rm "$new_file"
  echo -e "${GREEN}✓${NC} Cleaned up: $new_file"
  echo ""
done

if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "=============================================="
  echo "Refactoring Applied Successfully!"
  echo "=============================================="
  echo ""
  echo "Backups saved to: $BACKUP_DIR"
  echo ""
  echo "Next steps:"
  echo "1. Restart API:"
  echo "   docker compose restart workspace-api"
  echo ""
  echo "2. Test refactored endpoints:"
  echo "   curl http://localhost:3210/health"
  echo "   curl http://localhost:3210/api/items"
  echo ""
  echo "3. Run tests:"
  echo "   cd backend/api/workspace && npm test"
  echo ""
  echo "If issues occur, rollback with:"
  echo "   cp $BACKUP_DIR/*.js backend/api/workspace/src/routes/"
  echo ""
else
  echo ""
  echo "DRY RUN COMPLETE - No changes made"
fi

