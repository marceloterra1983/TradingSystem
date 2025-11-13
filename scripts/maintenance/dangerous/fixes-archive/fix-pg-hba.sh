#!/bin/bash
echo "Corrigindo pg_hba.conf para usar MD5..."

# Backup do arquivo original
docker exec tp-capital-timescale cp /var/lib/postgresql/data/pg_hba.conf /var/lib/postgresql/data/pg_hba.conf.backup

# Alterar scram-sha-256 para md5
docker exec tp-capital-timescale sed -i 's/scram-sha-256/md5/g' /var/lib/postgresql/data/pg_hba.conf

echo "Verificando alteração:"
docker exec tp-capital-timescale cat /var/lib/postgresql/data/pg_hba.conf | grep "host all all all"

echo ""
echo "Recarregando configuração do PostgreSQL..."
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "SELECT pg_reload_conf();"

echo ""
echo "Aguarde 10 segundos..."
sleep 10

echo "Reiniciando PgBouncer e API..."
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-pgbouncer
sleep 5
docker compose -f docker-compose.4-1-tp-capital-stack.yml restart tp-capital-api

echo ""
echo "Aguarde 30 segundos para health check..."
sleep 30

echo ""
echo "Status final:"
docker ps --filter "label=com.tradingsystem.stack=tp-capital" --format "table {{.Names}}\t{{.Status}}"
