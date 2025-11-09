#!/bin/bash
# ==============================================================================
# Start Telegram Stack (Native Service + 11 Containers)
# ==============================================================================

set -e

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Missing .env file at $ENV_FILE"
  exit 1
fi

# Export root .env so docker compose picks up TELEGRAM_* overrides
set -a
source "$ENV_FILE"
set +a

cd "$PROJECT_ROOT/tools/compose"

echo "🚀 Starting Telegram Stack..."
echo ""

# ==============================================================================
# Step 1: Start Data Layer (7 containers)
# ==============================================================================
echo "1️⃣ Starting data layer containers (7)..."
docker compose -f docker-compose.4-2-telegram-stack.yml up -d

# ==============================================================================
# Step 2: Wait for Health Checks
# ==============================================================================
echo ""
echo "2️⃣ Waiting for services to be healthy..."

services=(
  "telegram-timescale:TimescaleDB"
  "telegram-pgbouncer:PgBouncer"
  "telegram-redis-master:Redis Master"
  "telegram-redis-replica:Redis Replica"
  "telegram-redis-sentinel:Redis Sentinel"
  "telegram-rabbitmq:RabbitMQ"
  "telegram-gateway-api:Gateway API"
)

for entry in "${services[@]}"; do
  IFS=':' read -r container label <<< "$entry"
  echo -n "  $label... "
  
  timeout=60
  elapsed=0
  
  while [ $elapsed -lt $timeout ]; do
    if docker ps --filter "name=$container" --filter "health=healthy" | grep -q "$container"; then
      echo "✅"
      break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  
  if [ $elapsed -ge $timeout ]; then
    echo "❌ (timeout)"
    docker logs "$container" --tail 50
    exit 1
  fi
done

# ==============================================================================
# Step 3: Start Monitoring Stack (4 containers)
# ==============================================================================
echo ""
echo "3️⃣ Starting monitoring stack (4 containers)..."
docker compose -f docker-compose.4-2-telegram-stack-monitoring.yml up -d

sleep 10

# ==============================================================================
# Step 4: Start Native MTProto Service
# ==============================================================================
echo ""
echo "4️⃣ Starting native MTProto service (systemd)..."

if command -v systemctl >/dev/null 2>&1; then
  if sudo -n systemctl is-active --quiet telegram-gateway 2>/dev/null; then
    echo "  Already running ✅"
  else
    if sudo -n systemctl start telegram-gateway 2>/dev/null; then
      sleep 5
      if sudo -n systemctl is-active --quiet telegram-gateway 2>/dev/null; then
        echo "  Started ✅"
      else
        echo "  Failed to start ❌"
        sudo -n journalctl -u telegram-gateway -n 50 2>/dev/null || true
        exit 1
      fi
    else
      echo "  ⚠️ Unable to control telegram-gateway via systemd (sudo access required)."
      echo "     Please run 'sudo systemctl start telegram-gateway' manually if needed."
    fi
  fi
else
  echo "  Systemd not available; skipping native service start."
fi

# ==============================================================================
# Step 5: Verify Stack Health
# ==============================================================================
echo ""
echo "5️⃣ Verifying stack health..."

checks=(
  "TimescaleDB:PGPASSWORD=\"${TELEGRAM_DB_PASSWORD}\" psql -h localhost -p \"${TELEGRAM_PGBOUNCER_PORT:-6434}\" -U \"${TELEGRAM_DB_USER:-telegram}\" -d telegram_gateway -c 'SELECT 1'"
  "Redis Master:docker exec telegram-redis-master redis-cli ping"
  "RabbitMQ:docker exec telegram-rabbitmq rabbitmq-diagnostics ping"
  "MTProto Gateway:curl -s http://localhost:${GATEWAY_PORT:-4006}/health"
  "Gateway API:curl -s http://localhost:4010/health"
  "Prometheus:curl -s http://localhost:9090/-/healthy"
  "Grafana:curl -s http://localhost:3100/api/health"
)

for entry in "${checks[@]}"; do
  IFS=':' read -r label command <<< "$entry"
  echo -n "  $label... "
  
  if eval "$command" &>/dev/null; then
    echo "✅"
  else
    echo "❌"
  fi
done

echo ""
echo "✅ Telegram Stack is running!"
echo ""
echo "📊 Monitoring:"
echo "  • MTProto logs: sudo journalctl -u telegram-gateway -f"
echo "  • Container logs: docker logs -f telegram-timescale"
echo "  • Stack status: docker compose -f docker-compose.4-2-telegram-stack.yml ps"
echo "  • Grafana: http://localhost:3100"
echo "  • Prometheus: http://localhost:9090"
echo "  • RabbitMQ UI: http://localhost:15672"
echo ""
echo "🔗 Health Endpoints:"
echo "  • MTProto: http://localhost:${GATEWAY_PORT:-4006}/health"
echo "  • Gateway API: http://localhost:4010/health"
echo "  • Metrics: http://localhost:${GATEWAY_PORT:-4006}/metrics"
echo ""
