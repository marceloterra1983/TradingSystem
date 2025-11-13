#!/bin/bash
# Quick fix for PgBouncer authentication
cd /home/marce/Projetos/TradingSystem
source .env

# Step 1: Change PostgreSQL to MD5
echo "Changing PostgreSQL to MD5..."
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "ALTER SYSTEM SET password_encryption = 'md5';"
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "SELECT pg_reload_conf();"

# Step 2: Reset password with MD5
echo "Resetting password..."
docker exec -e PGPASSWORD="$TP_CAPITAL_DB_PASSWORD" tp-capital-timescale psql -U tp_capital -d postgres -c "ALTER USER tp_capital WITH PASSWORD '$TP_CAPITAL_DB_PASSWORD';"

# Step 3: Update docker-compose
echo "Updating docker-compose..."
cd tools/compose
sed -i 's/AUTH_TYPE=scram-sha-256/AUTH_TYPE=md5/g' docker-compose.4-1-tp-capital-stack.yml

# Step 4: Restart containers
echo "Restarting containers..."
docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-pgbouncer
sleep 10
docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-api
sleep 20

# Step 5: Check status
echo ""
echo "Container status:"
docker ps --filter "label=com.tradingsystem.stack=tp-capital" --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "Done! Check API health in 30 seconds with: curl http://localhost:4005/health"
