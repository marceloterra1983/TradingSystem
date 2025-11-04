#!/bin/bash
# ==============================================================================
# Backup Telegram Stack (All Data)
# ==============================================================================

set -e

BACKUP_ROOT="/home/marce/Projetos/TradingSystem/backups"
BACKUP_DIR="$BACKUP_ROOT/telegram-stack-$(date +%Y%m%d-%H%M%S)"

echo "💾 Backing up Telegram Stack..."
echo ""

mkdir -p "$BACKUP_DIR"

# ==============================================================================
# Backup Session Files
# ==============================================================================
echo "1️⃣ Backing up session files..."
if [ -d "/home/marce/Projetos/TradingSystem/apps/telegram-gateway/.session" ]; then
  tar -czf "$BACKUP_DIR/telegram-sessions.tar.gz" \
    -C "/home/marce/Projetos/TradingSystem/apps/telegram-gateway" .session/
  echo "  ✅ Sessions: $(du -h "$BACKUP_DIR/telegram-sessions.tar.gz" | cut -f1)"
else
  echo "  ⚠️  No session directory found"
fi

# ==============================================================================
# Backup TimescaleDB
# ==============================================================================
echo ""
echo "2️⃣ Backing up TimescaleDB (pg_dump)..."
docker exec telegram-timescale pg_dump \
  -U telegram \
  -d telegram_gateway \
  --format=custom \
  --compress=9 \
  --file=/tmp/telegram_gateway_backup.dump

docker cp telegram-timescale:/tmp/telegram_gateway_backup.dump "$BACKUP_DIR/"
echo "  ✅ Database: $(du -h "$BACKUP_DIR/telegram_gateway_backup.dump" | cut -f1)"

# ==============================================================================
# Backup Redis Snapshot (RDB)
# ==============================================================================
echo ""
echo "3️⃣ Backing up Redis (RDB snapshot)..."
docker exec telegram-redis-master redis-cli BGSAVE
sleep 5  # Wait for save to complete

docker cp telegram-redis-master:/data/dump.rdb "$BACKUP_DIR/redis-dump.rdb"
echo "  ✅ Redis: $(du -h "$BACKUP_DIR/redis-dump.rdb" | cut -f1)"

# ==============================================================================
# Backup RabbitMQ Definitions
# ==============================================================================
echo ""
echo "4️⃣ Backing up RabbitMQ definitions..."
curl -s -u telegram:${TELEGRAM_RABBITMQ_PASSWORD} \
  http://localhost:15672/api/definitions \
  > "$BACKUP_DIR/rabbitmq-definitions.json"
echo "  ✅ RabbitMQ: $(du -h "$BACKUP_DIR/rabbitmq-definitions.json" | cut -f1)"

# ==============================================================================
# Backup Configuration Files
# ==============================================================================
echo ""
echo "5️⃣ Backing up configuration files..."
mkdir -p "$BACKUP_DIR/config"

cp /home/marce/Projetos/TradingSystem/tools/compose/docker-compose.telegram.yml "$BACKUP_DIR/config/"
cp /home/marce/Projetos/TradingSystem/tools/compose/docker-compose.telegram-monitoring.yml "$BACKUP_DIR/config/"
cp /home/marce/Projetos/TradingSystem/tools/compose/telegram/*.conf "$BACKUP_DIR/config/" 2>/dev/null || true
cp /home/marce/Projetos/TradingSystem/tools/compose/telegram/*.ini "$BACKUP_DIR/config/" 2>/dev/null || true
cp /etc/systemd/system/telegram-gateway.service "$BACKUP_DIR/config/" 2>/dev/null || true

echo "  ✅ Config files backed up"

# ==============================================================================
# Create Backup Metadata
# ==============================================================================
echo ""
echo "6️⃣ Creating backup metadata..."

cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
Telegram Stack Backup
=====================
Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Hostname: $(hostname)
Backup Directory: $BACKUP_DIR

Contents:
---------
- telegram-sessions.tar.gz         Session files (.session/)
- telegram_gateway_backup.dump     TimescaleDB schema dump (custom format)
- redis-dump.rdb                   Redis RDB snapshot
- rabbitmq-definitions.json        RabbitMQ definitions (exchanges, queues)
- config/                          Configuration files (docker-compose, systemd)

Database Stats:
--------------
Messages: $(docker exec telegram-pgbouncer psql -U telegram -d telegram_gateway -t -c "SELECT COUNT(*) FROM telegram_gateway.messages" | tr -d ' ')
Channels: $(docker exec telegram-pgbouncer psql -U telegram -d telegram_gateway -t -c "SELECT COUNT(*) FROM telegram_gateway.channels" | tr -d ' ')

Redis Stats:
-----------
Keys: $(docker exec telegram-redis-master redis-cli DBSIZE | cut -d: -f2)
Memory: $(docker exec telegram-redis-master redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r\n ')

RabbitMQ Stats:
--------------
Queues: $(curl -s -u telegram:${TELEGRAM_RABBITMQ_PASSWORD} http://localhost:15672/api/queues | jq '. | length')

Restore Instructions:
--------------------
1. Stop current stack: bash scripts/telegram/stop-telegram-stack.sh
2. Restore database: docker cp telegram_gateway_backup.dump telegram-timescale:/tmp/ && docker exec telegram-timescale pg_restore ...
3. Restore sessions: tar -xzf telegram-sessions.tar.gz -C apps/telegram-gateway/
4. Restart stack: bash scripts/telegram/start-telegram-stack.sh
EOF

echo "  ✅ Metadata created"

# ==============================================================================
# Create Compressed Archive
# ==============================================================================
echo ""
echo "7️⃣ Creating compressed archive..."
cd "$BACKUP_ROOT"
tar -czf "telegram-stack-$(basename "$BACKUP_DIR").tar.gz" "$(basename "$BACKUP_DIR")"

ARCHIVE_SIZE=$(du -h "telegram-stack-$(basename "$BACKUP_DIR").tar.gz" | cut -f1)
echo "  ✅ Archive: $ARCHIVE_SIZE"

# ==============================================================================
# Summary
# ==============================================================================
echo ""
echo -e "${GREEN}✅ Backup Complete!${NC}"
echo ""
echo -e "${BLUE}📂 Backup Location:${NC}"
echo "  Directory: $BACKUP_DIR"
echo "  Archive: telegram-stack-$(basename "$BACKUP_DIR").tar.gz"
echo "  Total Size: $ARCHIVE_SIZE"
echo ""
echo -e "${BLUE}📝 Backup Contents:${NC}"
ls -lh "$BACKUP_DIR"
echo ""
echo -e "${YELLOW}💡 Retention Policy:${NC}"
echo "  • Keep daily backups for 7 days"
echo "  • Keep weekly backups for 30 days"
echo "  • Keep monthly backups for 1 year"
echo ""

