#!/bin/bash
# ==============================================================================
# Rollback Telegram Migration to Shared TimescaleDB
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"

echo -e "${RED}⚠️  ROLLBACK: Reverting Telegram to shared TimescaleDB${NC}"
echo ""
echo "This will:"
echo "  1. Stop new dedicated stack (11 containers)"
echo "  2. Stop native MTProto service"
echo "  3. Restore old container-based configuration"
echo "  4. Restart old Gateway container"
echo ""
read -p "Continue with rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

# Find latest backup
LATEST_BACKUP=$(ls -t "$PROJECT_ROOT/backups" | grep "telegram-migration" | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo -e "${RED}❌ No migration backup found in $PROJECT_ROOT/backups/${NC}"
  exit 1
fi

BACKUP_DIR="$PROJECT_ROOT/backups/$LATEST_BACKUP"
echo -e "${BLUE}Using backup: $BACKUP_DIR${NC}"
echo ""

# ==============================================================================
# Step 1: Stop New Stack
# ==============================================================================
echo -e "${YELLOW}[1/6] Stopping new dedicated stack...${NC}"

# Stop systemd service
if systemctl is-active --quiet telegram-gateway; then
  sudo systemctl stop telegram-gateway
  echo "  ✅ Stopped native service"
fi

# Stop data layer
cd "$PROJECT_ROOT/tools/compose"
docker compose -f docker-compose.4-2-telegram-stack.yml down
echo "  ✅ Stopped data stack"

# ==============================================================================
# Step 2: Restore Sessions (if needed)
# ==============================================================================
echo ""
echo -e "${YELLOW}[2/6] Checking session files...${NC}"

if [ -f "$BACKUP_DIR/telegram-sessions.tar.gz" ]; then
  echo "  Restoring sessions from backup..."
  tar -xzf "$BACKUP_DIR/telegram-sessions.tar.gz" \
    -C "$PROJECT_ROOT/apps/telegram-gateway"
  echo "  ✅ Sessions restored"
else
  echo "  ℹ️  No session backup found (keeping current)"
fi

# ==============================================================================
# Step 3: Update Configuration
# ==============================================================================
echo ""
echo -e "${YELLOW}[3/6] Reverting configuration to shared TimescaleDB...${NC}"

# Create temp backup of current .env
cp "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.hybrid-backup"

echo "  ℹ️  Manual step: Update .env to point to shared TimescaleDB"
echo "  Old config (shared):"
echo "    TELEGRAM_DB_HOST=timescaledb"
echo "    TELEGRAM_DB_PORT=5432"
echo "    TELEGRAM_DB_NAME=tradingsystem"
echo ""
echo "  Current config (.env.hybrid-backup has current values for reference)"
echo ""

# ==============================================================================
# Step 4: Restart Old Stack
# ==============================================================================
echo ""
echo -e "${YELLOW}[4/6] Restarting old Gateway container...${NC}"

# Note: This assumes old docker-compose.yml still exists
# If not, need to recreate container manually

echo "  ℹ️  Manual step: Start old Gateway container"
echo "  Command: docker compose up -d telegram-gateway"
echo ""

# ==============================================================================
# Step 5: Verification
# ==============================================================================
echo ""
echo -e "${YELLOW}[5/6] Post-rollback verification...${NC}"
echo ""
echo "  Please verify:"
echo "  1. Gateway container is running: docker ps | grep telegram"
echo "  2. Health check passes: curl http://localhost:4006/health"
echo "  3. Logs show no errors: docker logs telegram-gateway --tail 50"
echo "  4. Messages are being processed: Check TP Capital"
echo ""

# ==============================================================================
# Step 6: Cleanup (Optional)
# ==============================================================================
echo ""
echo -e "${YELLOW}[6/6] Cleanup options...${NC}"
echo ""
echo "  To remove dedicated stack volumes (⚠️  WARNING: deletes all data):"
echo "  docker volume rm telegram-timescaledb-data telegram-rabbitmq-data"
echo ""
echo "  To disable systemd service:"
echo "  sudo systemctl disable telegram-gateway"
echo "  sudo rm /etc/systemd/system/telegram-gateway.service"
echo "  sudo systemctl daemon-reload"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Rollback Instructions Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Backup preserved at: $BACKUP_DIR${NC}"
echo -e "${YELLOW}Hybrid config backup: .env.hybrid-backup${NC}"
echo ""

