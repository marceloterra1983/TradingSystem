#!/bin/bash
cd /home/marce/Projetos/TradingSystem
source .env

echo "Resetando senha com MD5..."
echo "1. Alterando para senha temporária..."
docker exec tp-capital-timescale psql -U postgres -d postgres -c "ALTER USER tp_capital WITH PASSWORD 'temp_password_123';"

echo "2. Voltando para senha original..."
docker exec tp-capital-timescale psql -U postgres -d postgres -c "ALTER USER tp_capital WITH PASSWORD '$TP_CAPITAL_DB_PASSWORD';"

echo "3. Verificando tipo do hash (deve começar com 'md5')..."
docker exec tp-capital-timescale psql -U postgres -d postgres -c "SELECT substring(rolpassword, 1, 3) as hash_type FROM pg_authid WHERE rolname = 'tp_capital';"

echo ""
echo "Agora reinicie PgBouncer e API:"
echo "cd tools/compose"
echo "docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-pgbouncer"
echo "docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-api"
