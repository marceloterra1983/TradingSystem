#!/bin/bash
# ==============================================================================
# Telegram Gateway Migration to Hybrid Stack
# ==============================================================================
# Migrates from shared TimescaleDB (containerized Gateway) to:
# - Native MTProto service (systemd)
# - Dedicated TimescaleDB container
# - Redis cache cluster
# - RabbitMQ queue (optional)
# - Full monitoring stack
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
BACKUP_DIR="$PROJECT_ROOT/backups/telegram-migration-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Telegram Gateway - Hybrid Migration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==============================================================================
# Pre-flight Checks
# ==============================================================================
echo -e "${YELLOW}[1/12] Pre-flight checks...${NC}"

# Check if old container exists
if ! docker ps -a | grep -q "data-timescale"; then
  echo -e "${RED}✗ Shared TimescaleDB container not found${NC}"
  exit 1
fi

# Check if .session directory exists
if [ ! -d "$PROJECT_ROOT/apps/telegram-gateway/.session" ]; then
  echo -e "${RED}✗ Session directory not found${NC}"
  exit 1
fi

# Check if Docker networks exist
if ! docker network ls | grep -q "tradingsystem_backend"; then
  echo -e "${RED}✗ Network tradingsystem_backend not found${NC}"
  echo -e "${YELLOW}Creating network...${NC}"
  docker network create tradingsystem_backend
fi

# Check if required ports are available
for port in 5434 6434 6379 6380 26379 5672 15672 4010 9090 3100 9187 9121; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}✗ Port $port is already in use${NC}"
    lsof -i :$port
    exit 1
  fi
done

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"

# ==============================================================================
# Create Backup Directory
# ==============================================================================
echo -e "\n${YELLOW}[2/12] Creating backup directory...${NC}"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup dir: $BACKUP_DIR${NC}"

# ==============================================================================
# Backup Session Files
# ==============================================================================
echo -e "\n${YELLOW}[3/12] Backing up Telegram sessions...${NC}"
tar -czf "$BACKUP_DIR/telegram-sessions.tar.gz" \
  -C "$PROJECT_ROOT/apps/telegram-gateway" .session/

# Verify backup
if tar -tzf "$BACKUP_DIR/telegram-sessions.tar.gz" | grep -q ".session"; then
  echo -e "${GREEN}✓ Sessions backed up ($(du -h "$BACKUP_DIR/telegram-sessions.tar.gz" | cut -f1))${NC}"
else
  echo -e "${RED}✗ Session backup verification failed${NC}"
  exit 1
fi

# ==============================================================================
# Dump telegram_gateway Schema
# ==============================================================================
echo -e "\n${YELLOW}[4/12] Dumping telegram_gateway schema from shared database...${NC}"

docker exec data-timescale pg_dump \
  -U timescale \
  -d tradingsystem \
  -n telegram_gateway \
  --format=custom \
  --verbose \
  --file=/tmp/telegram_gateway.dump 2>&1 | grep -E "processing|dumping"

docker cp data-timescale:/tmp/telegram_gateway.dump "$BACKUP_DIR/"

# Verify dump size
DUMP_SIZE=$(du -h "$BACKUP_DIR/telegram_gateway.dump" | cut -f1)
echo -e "${GREEN}✓ Schema dumped ($DUMP_SIZE)${NC}"

# ==============================================================================
# Start Dedicated Telegram Stack (7 containers)
# ==============================================================================
echo -e "\n${YELLOW}[5/12] Starting Telegram stack (7 containers)...${NC}"
cd "$PROJECT_ROOT/tools/compose"

docker compose -f docker-compose.telegram.yml up -d

echo -e "${GREEN}✓ Containers started${NC}"

# ==============================================================================
# Wait for TimescaleDB to be Healthy
# ==============================================================================
echo -e "\n${YELLOW}[6/12] Waiting for TimescaleDB to be ready...${NC}"
timeout=120
elapsed=0

while [ $elapsed -lt $timeout ]; do
  if docker exec telegram-timescale pg_isready -U telegram -d telegram_gateway &>/dev/null; then
    echo -e "${GREEN}✓ TimescaleDB ready (${elapsed}s)${NC}"
    break
  fi
  echo -n "."
  sleep 2
  elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $timeout ]; then
  echo -e "${RED}✗ TimescaleDB timeout after ${timeout}s${NC}"
  docker logs telegram-timescale --tail 50
  exit 1
fi

# ==============================================================================
# Wait for PgBouncer to be Healthy
# ==============================================================================
echo -e "\n${YELLOW}[7/12] Waiting for PgBouncer to be ready...${NC}"
timeout=60
elapsed=0

while [ $elapsed -lt $timeout ]; do
  if docker exec telegram-pgbouncer psql -h localhost -U telegram -d pgbouncer -c "SHOW POOLS" &>/dev/null; then
    echo -e "${GREEN}✓ PgBouncer ready (${elapsed}s)${NC}"
    break
  fi
  echo -n "."
  sleep 2
  elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $timeout ]; then
  echo -e "${RED}✗ PgBouncer timeout${NC}"
  docker logs telegram-pgbouncer --tail 50
  exit 1
fi

# ==============================================================================
# Restore Schema to Dedicated Database
# ==============================================================================
echo -e "\n${YELLOW}[8/12] Restoring schema to dedicated TimescaleDB...${NC}"

docker cp "$BACKUP_DIR/telegram_gateway.dump" telegram-timescale:/tmp/

docker exec telegram-timescale pg_restore \
  -U telegram \
  -d telegram_gateway \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  /tmp/telegram_gateway.dump 2>&1 | grep -E "processing|restoring"

echo -e "${GREEN}✓ Schema restored${NC}"

# ==============================================================================
# Verify Data Integrity
# ==============================================================================
echo -e "\n${YELLOW}[9/12] Verifying data integrity...${NC}"

# Count messages in old DB
OLD_COUNT=$(docker exec data-timescale psql -U timescale -d tradingsystem \
  -t -c "SELECT COUNT(*) FROM telegram_gateway.messages" 2>/dev/null | tr -d ' ' || echo "0")

# Count messages in new DB (via PgBouncer)
NEW_COUNT=$(docker exec telegram-pgbouncer psql -U telegram -d telegram_gateway \
  -t -c "SELECT COUNT(*) FROM telegram_gateway.messages" | tr -d ' ')

echo "Old database: $OLD_COUNT messages"
echo "New database: $NEW_COUNT messages"

if [ "$OLD_COUNT" != "$NEW_COUNT" ]; then
  echo -e "${RED}✗ Row count mismatch: OLD=$OLD_COUNT, NEW=$NEW_COUNT${NC}"
  echo -e "${YELLOW}Rolling back...${NC}"
  docker compose -f docker-compose.telegram.yml down
  exit 1
fi

echo -e "${GREEN}✓ Data integrity verified ($NEW_COUNT messages)${NC}"

# ==============================================================================
# Start Monitoring Stack (4 containers)
# ==============================================================================
echo -e "\n${YELLOW}[10/12] Starting monitoring stack (Prometheus + Grafana)...${NC}"
docker compose -f docker-compose.telegram-monitoring.yml up -d
echo -e "${GREEN}✓ Monitoring stack started${NC}"

# ==============================================================================
# Install systemd Service (Manual Step)
# ==============================================================================
echo -e "\n${YELLOW}[11/12] Installing systemd service...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  MANUAL STEP REQUIRED (needs sudo):${NC}"
echo ""
echo -e "${GREEN}sudo cp $PROJECT_ROOT/tools/systemd/telegram-gateway.service /etc/systemd/system/${NC}"
echo -e "${GREEN}sudo systemctl daemon-reload${NC}"
echo -e "${GREEN}sudo systemctl enable telegram-gateway${NC}"
echo -e "${GREEN}sudo systemctl start telegram-gateway${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
read -p "Press ENTER after executing the commands above..."

# Verify systemd service
if systemctl is-active --quiet telegram-gateway; then
  echo -e "${GREEN}✓ systemd service is running${NC}"
else
  echo -e "${RED}✗ systemd service failed to start${NC}"
  sudo journalctl -u telegram-gateway -n 50
  exit 1
fi

# ==============================================================================
# Final Validation
# ==============================================================================
echo -e "\n${YELLOW}[12/12] Final validation...${NC}"

echo ""
echo -e "${BLUE}Checking service health:${NC}"

# TimescaleDB
echo -n "  TimescaleDB (via PgBouncer)... "
if docker exec telegram-pgbouncer psql -U telegram -d telegram_gateway -c "SELECT 1" &>/dev/null; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Redis Master
echo -n "  Redis Master... "
if docker exec telegram-redis-master redis-cli ping | grep -q "PONG"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Redis Replica
echo -n "  Redis Replica... "
if docker exec telegram-redis-replica redis-cli ping | grep -q "PONG"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# RabbitMQ
echo -n "  RabbitMQ... "
if docker exec telegram-rabbitmq rabbitmq-diagnostics ping &>/dev/null; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# MTProto Gateway
echo -n "  MTProto Gateway (native)... "
if curl -s http://localhost:4006/health | grep -q "healthy"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Gateway API
echo -n "  Gateway API... "
if curl -s http://localhost:4010/health | grep -q "healthy"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Prometheus
echo -n "  Prometheus... "
if curl -s http://localhost:9090/-/healthy | grep -q "Prometheus"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Grafana
echo -n "  Grafana... "
if curl -s http://localhost:3100/api/health | grep -q "ok"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# ==============================================================================
# Migration Complete
# ==============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Migration Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}📊 Stack Overview:${NC}"
echo -e "  • Native Service: MTProto Gateway (port 4006)"
echo -e "  • Containers: 11 total (7 data + 4 monitoring)"
echo -e "  • Database: Dedicated TimescaleDB (port 5434, via PgBouncer 6434)"
echo -e "  • Cache: Redis cluster (master 6379, replica 6380, sentinel 26379)"
echo -e "  • Queue: RabbitMQ (AMQP 5672, UI 15672)"
echo -e "  • Monitoring: Grafana (3100), Prometheus (9090)"
echo ""
echo -e "${BLUE}🔗 Access Points:${NC}"
echo -e "  • MTProto Health: http://localhost:4006/health"
echo -e "  • Gateway API: http://localhost:4010/health"
echo -e "  • Grafana UI: http://localhost:3100 (admin/admin)"
echo -e "  • Prometheus: http://localhost:9090"
echo -e "  • RabbitMQ UI: http://localhost:15672 (telegram/<password>)"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "  1. Verify systemd: sudo systemctl status telegram-gateway"
echo -e "  2. Check logs: sudo journalctl -u telegram-gateway -f"
echo -e "  3. Monitor metrics: curl http://localhost:4006/metrics"
echo -e "  4. Test end-to-end: Send message to Telegram channel"
echo -e "  5. Verify dashboards: Open Grafana at http://localhost:3100"
echo ""
echo -e "${YELLOW}📂 Backup Location:${NC} $BACKUP_DIR"
echo -e "${YELLOW}📚 Rollback Script:${NC} bash $PROJECT_ROOT/scripts/telegram/rollback-migration.sh"
echo ""

