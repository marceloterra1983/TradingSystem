#!/bin/bash
# Performance monitoring script for Telegram stack

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📊 TELEGRAM STACK - PERFORMANCE MONITORING         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check container stats
echo -e "${YELLOW}📈 Container Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
  telegram-timescale telegram-redis-master telegram-rabbitmq 2>/dev/null || echo "  Some containers not running"

echo ""
echo -e "${YELLOW}🗄️  Database Metrics:${NC}"

# Database size
DB_SIZE=$(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c \
  "SELECT pg_size_pretty(pg_database_size('telegram_gateway'))" | xargs)
echo "  Database size: $DB_SIZE"

# Table sizes
echo "  Table sizes:"
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
  SELECT 
    schemaname || '.' || tablename as table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables 
  WHERE schemaname = 'telegram_gateway'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
" 2>/dev/null | tail -5

# Message counts by status
echo ""
echo "  Messages by status:"
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
  SELECT status, COUNT(*) as count
  FROM telegram_gateway.messages
  GROUP BY status
  ORDER BY count DESC
" 2>/dev/null | tail -10

echo ""
echo -e "${YELLOW}🔥 Redis Cache Metrics:${NC}"

# Memory usage
REDIS_MEM=$(docker exec telegram-redis-master redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | xargs)
echo "  Memory used: $REDIS_MEM"

# Keyspace stats
HITS=$(docker exec telegram-redis-master redis-cli INFO stats | grep keyspace_hits | cut -d: -f2 | xargs)
MISSES=$(docker exec telegram-redis-master redis-cli INFO stats | grep keyspace_misses | cut -d: -f2 | xargs)

if [ "$HITS" != "0" ] || [ "$MISSES" != "0" ]; then
  TOTAL=$((HITS + MISSES))
  if [ "$TOTAL" -gt 0 ]; then
    HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
    echo "  Cache hit rate: ${HIT_RATE}%"
  else
    echo "  Cache hit rate: 0% (no requests yet)"
  fi
else
  echo "  Cache hit rate: N/A (no activity yet)"
fi

# Replication status
REPLICA_LAG=$(docker exec telegram-redis-master redis-cli INFO replication | grep master_repl_offset | cut -d: -f2 | xargs)
echo "  Replication offset: $REPLICA_LAG"

echo ""
echo -e "${YELLOW}📨 RabbitMQ Metrics:${NC}"

# Queue stats
QUEUE_COUNT=$(docker exec telegram-rabbitmq rabbitmqctl list_queues name messages 2>&1 | grep -v "Timeout" | wc -l)
echo "  Queues: $QUEUE_COUNT"

# Connections
CONNS=$(docker exec telegram-rabbitmq rabbitmqctl list_connections 2>&1 | grep -v "Timeout" | wc -l)
echo "  Connections: $CONNS"

echo ""
echo -e "${YELLOW}📊 Performance Summary:${NC}"
echo "  Database: $DB_SIZE"
echo "  Redis: $REDIS_MEM"
echo "  Messages: $(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c "SELECT COUNT(*) FROM telegram_gateway.messages" | xargs)"
echo "  Unprocessed: $(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c "SELECT COUNT(*) FROM telegram_gateway.messages WHERE status='received'" | xargs)"

echo ""
echo -e "${GREEN}✅ Monitoring complete!${NC}"
echo ""
echo "📊 Access dashboards:"
echo "  • Grafana: http://localhost:3100"
echo "  • Prometheus: http://localhost:9090"
echo "  • RabbitMQ UI: http://localhost:15672"
echo ""


