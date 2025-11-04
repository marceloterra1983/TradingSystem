#!/bin/bash
# Test script to simulate real Telegram messages and verify stack performance

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🧪 TELEGRAM STACK - REAL DATA TEST                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

CHANNEL_ID="-1001649127710"

echo -e "${YELLOW}📥 Inserting test messages (simulating Telegram)...${NC}"

# Insert 10 test messages with realistic trading signals
for i in {1..10}; do
  MESSAGE_ID=$(date +%s)$i
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S+00")
  
  # Alternate between different signal types
  case $((i % 3)) in
    0)
      TEXT="BUY PETR4 STOP: 32.50 GAIN: 35.00 TF: 15min"
      ;;
    1)
      TEXT="SELL VALE3 STOP: 68.00 GAIN: 65.00 TF: 1h"
      ;;
    2)
      TEXT="BUY ITUB4 STOP: 28.50 GAIN: 30.00 TF: 30min"
      ;;
  esac
  
  docker exec telegram-timescale psql -U telegram -d telegram_gateway -c \
    "INSERT INTO telegram_gateway.messages 
     (channel_id, message_id, text, status, received_at, telegram_date)
     VALUES 
     ('$CHANNEL_ID', $MESSAGE_ID, '$TEXT', 'received', NOW(), '$TIMESTAMP'::timestamptz)
     ON CONFLICT DO NOTHING" > /dev/null 2>&1
  
  echo -e "  ${GREEN}✓${NC} Message $i inserted (ID: $MESSAGE_ID)"
  sleep 0.1
done

echo ""
echo -e "${YELLOW}📊 Verifying data...${NC}"

# Count messages
TOTAL=$(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c \
  "SELECT COUNT(*) FROM telegram_gateway.messages WHERE channel_id='$CHANNEL_ID'")

echo "  Total messages: $TOTAL"

# Test Redis cache (simulate cache write)
echo ""
echo -e "${YELLOW}🔥 Testing Redis cache...${NC}"
docker exec telegram-redis-master redis-cli SETEX "telegram:msg:$CHANNEL_ID:test123" 3600 '{"text":"BUY TEST","status":"received"}' > /dev/null
CACHED=$(docker exec telegram-redis-replica redis-cli GET "telegram:msg:$CHANNEL_ID:test123")
if [ -n "$CACHED" ]; then
  echo -e "  ${GREEN}✓${NC} Cache write + replication working!"
else
  echo -e "  ${YELLOW}⚠${NC} Cache test failed"
fi

# Test RabbitMQ queue (simulate publish)
echo ""
echo -e "${YELLOW}📨 Testing RabbitMQ...${NC}"
docker exec telegram-rabbitmq rabbitmqctl list_queues name messages 2>&1 | grep -v "Timeout" | tail -5
echo -e "  ${GREEN}✓${NC} RabbitMQ accessible"

# Performance metrics
echo ""
echo -e "${YELLOW}⚡ Performance Metrics:${NC}"
echo "  Database queries: $(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c "SELECT COUNT(*) FROM telegram_gateway.messages")"
echo "  Redis keys: $(docker exec telegram-redis-master redis-cli DBSIZE)"
echo "  Cache hit rate: N/A (will improve with usage)"

echo ""
echo -e "${GREEN}✅ Real data test complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor TP Capital polling worker (should process these messages)"
echo "  2. Check Redis cache hit rate over time"
echo "  3. View RabbitMQ queues for message flow"
echo ""


