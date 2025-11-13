#!/bin/bash
cd /home/marce/Projetos/TradingSystem
source .env

echo "Resetando senha com MD5 (usando usuário tp_capital)..."
echo "1. Alterando para senha temporária..."
docker exec -e PGPASSWORD="$TP_CAPITAL_DB_PASSWORD" tp-capital-timescale \
  psql -U tp_capital -d tp_capital_db -c "ALTER USER tp_capital WITH PASSWORD 'temp_password_123';"

echo ""
echo "2. Voltando para senha original..."
docker exec -e PGPASSWORD="temp_password_123" tp-capital-timescale \
  psql -U tp_capital -d tp_capital_db -c "ALTER USER tp_capital WITH PASSWORD '$TP_CAPITAL_DB_PASSWORD';"

echo ""
echo "3. Verificando tipo do hash (deve começar com 'md5')..."
docker exec -e PGPASSWORD="$TP_CAPITAL_DB_PASSWORD" tp-capital-timescale \
  psql -U tp_capital -d tp_capital_db -c "SELECT substring(rolpassword, 1, 3) as hash_type FROM pg_authid WHERE rolname = 'tp_capital';"

echo ""
echo "✅ Senha resetada! Agora reiniciando containers..."
cd tools/compose
docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-pgbouncer
sleep 5
docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-api

echo ""
echo "Aguarde 30 segundos para os containers ficarem healthy..."
sleep 30

echo ""
echo "Status dos containers:"
docker ps --filter "label=com.tradingsystem.stack=tp-capital" --format "table {{.Names}}\t{{.Status}}"
