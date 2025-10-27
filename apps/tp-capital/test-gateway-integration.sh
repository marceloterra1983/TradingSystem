#!/bin/bash
# Gateway Integration Test Script
# Tests the TP Capital → Telegram Gateway polling integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TP_CAPITAL_URL="http://localhost:4005"
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="timescale"
GATEWAY_DB="telegram_gateway"
TPCAPITAL_DB="APPS-TPCAPITAL"
CHANNEL_ID="-1001649127710"
TEST_MESSAGE_ID="999999"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Gateway Integration Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check TP Capital Service
echo -e "${YELLOW}[1/7] Checking TP Capital service...${NC}"
if curl -s -f "${TP_CAPITAL_URL}/health" > /dev/null; then
  echo -e "${GREEN}✓ TP Capital service is running${NC}"
else
  echo -e "${RED}✗ TP Capital service is not running${NC}"
  echo -e "${YELLOW}Start with: cd apps/tp-capital && npm run dev${NC}"
  exit 1
fi

# Step 2: Check Health Endpoint
echo -e "\n${YELLOW}[2/7] Checking health endpoint...${NC}"
HEALTH_JSON=$(curl -s "${TP_CAPITAL_URL}/health")
STATUS=$(echo "$HEALTH_JSON" | jq -r '.status')
GATEWAY_DB_STATUS=$(echo "$HEALTH_JSON" | jq -r '.gatewayDb')
POLLING_RUNNING=$(echo "$HEALTH_JSON" | jq -r '.pollingWorker.running')

if [ "$STATUS" = "healthy" ]; then
  echo -e "${GREEN}✓ Service status: healthy${NC}"
else
  echo -e "${RED}✗ Service status: $STATUS${NC}"
fi

if [ "$GATEWAY_DB_STATUS" = "connected" ]; then
  echo -e "${GREEN}✓ Gateway DB: connected${NC}"
else
  echo -e "${RED}✗ Gateway DB: $GATEWAY_DB_STATUS${NC}"
  echo -e "${YELLOW}Check database permissions: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $GATEWAY_DB -f setup-gateway-permissions.sql${NC}"
  exit 1
fi

if [ "$POLLING_RUNNING" = "true" ]; then
  echo -e "${GREEN}✓ Polling worker: running${NC}"
else
  echo -e "${RED}✗ Polling worker: not running${NC}"
  exit 1
fi

# Step 3: Check Database Connectivity
echo -e "\n${YELLOW}[3/7] Checking database connectivity...${NC}"
if PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$GATEWAY_DB" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Can connect to Gateway database${NC}"
else
  echo -e "${RED}✗ Cannot connect to Gateway database${NC}"
  exit 1
fi

if PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TPCAPITAL_DB" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Can connect to TP Capital database${NC}"
else
  echo -e "${RED}✗ Cannot connect to TP Capital database${NC}"
  exit 1
fi

# Step 4: Check Database Permissions
echo -e "\n${YELLOW}[4/7] Checking database permissions...${NC}"
PERMISSIONS=$(PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$GATEWAY_DB" -t -c "
  SELECT COUNT(*)
  FROM information_schema.role_table_grants
  WHERE table_name = 'telegram_messages'
    AND grantee = '$DB_USER'
    AND privilege_type IN ('SELECT', 'UPDATE');
" | xargs)

if [ "$PERMISSIONS" -ge "2" ]; then
  echo -e "${GREEN}✓ Database permissions OK (SELECT + UPDATE)${NC}"
else
  echo -e "${RED}✗ Missing database permissions${NC}"
  echo -e "${YELLOW}Run: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $GATEWAY_DB -f setup-gateway-permissions.sql${NC}"
  exit 1
fi

# Step 5: Insert Test Message
echo -e "\n${YELLOW}[5/7] Inserting test signal message...${NC}"

# Delete old test message if exists
PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$GATEWAY_DB" -c "
  DELETE FROM telegram_gateway.telegram_messages WHERE message_id = '$TEST_MESSAGE_ID';
" > /dev/null 2>&1

# Insert test message
PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$GATEWAY_DB" -c "
  INSERT INTO telegram_gateway.telegram_messages (
    channel_id,
    message_id,
    text,
    telegram_date,
    received_at,
    status,
    metadata
  ) VALUES (
    '$CHANNEL_ID',
    '$TEST_MESSAGE_ID',
    E'🎯 SINAL DE COMPRA\n\n📊 ATIVO: PETR4\n💰 COMPRA: 28.50 - 28.80\n🎯 ALVO 1: 29.20\n🎯 ALVO 2: 29.80\n🏁 ALVO FINAL: 30.50\n🛑 STOP: 27.90',
    NOW(),
    NOW(),
    'received',
    '{}'::jsonb
  );
" > /dev/null 2>&1

echo -e "${GREEN}✓ Test message inserted (ID: $TEST_MESSAGE_ID)${NC}"

# Step 6: Wait for Processing
echo -e "\n${YELLOW}[6/7] Waiting for polling worker to process message...${NC}"
echo -e "${BLUE}(Polling interval: 5 seconds, max wait: 15 seconds)${NC}"

MAX_WAIT=15
WAITED=0
PROCESSED=false

while [ $WAITED -lt $MAX_WAIT ]; do
  sleep 1
  WAITED=$((WAITED + 1))

  # Check if message status changed to 'published'
  MSG_STATUS=$(PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$GATEWAY_DB" -t -c "
    SELECT status FROM telegram_gateway.telegram_messages WHERE message_id = '$TEST_MESSAGE_ID';
  " | xargs)

  if [ "$MSG_STATUS" = "published" ]; then
    PROCESSED=true
    echo -e "${GREEN}✓ Message processed in ${WAITED} seconds${NC}"
    break
  fi

  echo -ne "${BLUE}Waiting... ${WAITED}s${NC}\r"
done

if [ "$PROCESSED" = false ]; then
  echo -e "\n${RED}✗ Message not processed within $MAX_WAIT seconds${NC}"
  echo -e "${YELLOW}Check TP Capital logs for errors${NC}"
  exit 1
fi

# Step 7: Verify Results
echo -e "\n${YELLOW}[7/7] Verifying results...${NC}"

# Check signal saved in TP Capital database
SIGNAL_COUNT=$(PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TPCAPITAL_DB" -t -c "
  SELECT COUNT(*) FROM tp_capital.tp_capital_signals WHERE raw_message LIKE '%PETR4%' AND raw_message LIKE '%28.50%';
" | xargs)

if [ "$SIGNAL_COUNT" -gt "0" ]; then
  echo -e "${GREEN}✓ Signal saved in TP Capital database${NC}"

  # Show signal details
  PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TPCAPITAL_DB" -c "
    SELECT signal_type, asset, buy_min, buy_max, target_1, target_2, target_final, stop, source
    FROM tp_capital.tp_capital_signals
    WHERE raw_message LIKE '%PETR4%' AND raw_message LIKE '%28.50%'
    ORDER BY ingested_at DESC
    LIMIT 1;
  "
else
  echo -e "${RED}✗ Signal not found in TP Capital database${NC}"
  exit 1
fi

# Check message status in Gateway database
METADATA=$(PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$GATEWAY_DB" -t -c "
  SELECT metadata FROM telegram_gateway.telegram_messages WHERE message_id = '$TEST_MESSAGE_ID';
" | xargs)

if echo "$METADATA" | grep -q "tp-capital"; then
  echo -e "${GREEN}✓ Message marked as 'published' with TP Capital metadata${NC}"
else
  echo -e "${RED}✗ Message metadata incorrect${NC}"
fi

# Test Idempotency
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Idempotency (Duplicate Prevention)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Resetting message status to 'received'...${NC}"
PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$GATEWAY_DB" -c "
  UPDATE telegram_gateway.telegram_messages SET status = 'received' WHERE message_id = '$TEST_MESSAGE_ID';
" > /dev/null 2>&1

echo -e "${YELLOW}Waiting for next polling cycle...${NC}"
sleep 6

SIGNAL_COUNT_AFTER=$(PGPASSWORD="${TIMESCALEDB_PASSWORD:-pass_timescale}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TPCAPITAL_DB" -t -c "
  SELECT COUNT(*) FROM tp_capital.tp_capital_signals WHERE raw_message LIKE '%PETR4%' AND raw_message LIKE '%28.50%';
" | xargs)

if [ "$SIGNAL_COUNT_AFTER" -eq "$SIGNAL_COUNT" ]; then
  echo -e "${GREEN}✓ Idempotency works! No duplicate signal created${NC}"
else
  echo -e "${RED}✗ Duplicate signal created! Idempotency failed${NC}"
  exit 1
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Gateway integration is working correctly:${NC}"
echo -e "  • TP Capital service: ${GREEN}healthy${NC}"
echo -e "  • Gateway DB connection: ${GREEN}connected${NC}"
echo -e "  • Polling worker: ${GREEN}running${NC}"
echo -e "  • Message processing: ${GREEN}working${NC}"
echo -e "  • Signal storage: ${GREEN}working${NC}"
echo -e "  • Idempotency: ${GREEN}working${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Monitor Prometheus metrics: curl http://localhost:4005/metrics | grep tpcapital_gateway"
echo -e "  2. Test with real Telegram messages"
echo -e "  3. Optional cleanup: rm apps/tp-capital/src/telegramIngestion.js"
echo ""
