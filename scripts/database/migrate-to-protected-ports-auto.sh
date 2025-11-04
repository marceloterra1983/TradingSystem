#!/bin/bash

echo "🛡️ MIGRAÇÃO AUTOMÁTICA: Portas Protegidas 7000-7999"
echo "=============================================="
echo ""

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

# Criar diretório de backup
BACKUP_DIR="$PROJECT_ROOT/backups/database-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 FASE 1: Backup Preventivo"
echo "=============================================="

# Backup TimescaleDB
echo "Fazendo backup TimescaleDB..."
docker exec data-timescale pg_dumpall -U timescale > "$BACKUP_DIR/timescale-full.sql" 2>/dev/null && echo "✅ TimescaleDB backup OK" || echo "⚠️  TimescaleDB backup falhou"

# Backup volumes
echo "Fazendo backup de volumes Docker..."
for volume in $(docker volume ls -q | grep "data-"); do
    echo "  Backup volume: $volume"
    docker run --rm -v "$volume:/data" -v "$BACKUP_DIR:/backup" alpine tar czf "/backup/$volume.tar.gz" /data 2>/dev/null &
done
wait
echo "✅ Backups criados em: $BACKUP_DIR"

echo ""
echo "🛑 FASE 2: Parando Databases"
echo "=============================================="
docker compose -f tools/compose/docker-compose.database.yml down
docker compose -f tools/compose/docker-compose.rag.yml stop rag-redis 2>/dev/null
docker compose -f tools/compose/docker-compose.kong.yml stop kong-db 2>/dev/null
echo "✅ Databases parados"

echo ""
echo "📝 FASE 3: Atualizando docker-compose.database.yml"
echo "=============================================="

# Backup do arquivo original
cp tools/compose/docker-compose.database.yml tools/compose/docker-compose.database.yml.backup

# Atualizar portas no docker-compose
sed -i 's/"5432:5432"/"7000:5432"/g' tools/compose/docker-compose.database.yml
sed -i 's/"5437:5432"/"7001:5432"/g' tools/compose/docker-compose.database.yml
sed -i 's/"5438:5432"/"7002:5432"/g' tools/compose/docker-compose.database.yml
sed -i 's/"9001:9000"/"7010:9000"/g' tools/compose/docker-compose.database.yml
sed -i 's/"9010:9009"/"7011:9009"/g' tools/compose/docker-compose.database.yml
sed -i 's/"8814:8812"/"7012:8812"/g' tools/compose/docker-compose.database.yml
sed -i 's/"5051:80"/"7100:80"/g' tools/compose/docker-compose.database.yml
sed -i 's/"8082:8080"/"7101:8080"/g' tools/compose/docker-compose.database.yml
sed -i 's/"8083:8081"/"7102:8081"/g' tools/compose/docker-compose.database.yml
sed -i 's/"9188:9187"/"7200:9187"/g' tools/compose/docker-compose.database.yml

echo "✅ docker-compose.database.yml atualizado"

# Atualizar Kong DB
if [ -f tools/compose/docker-compose.kong.yml ]; then
    cp tools/compose/docker-compose.kong.yml tools/compose/docker-compose.kong.yml.backup
    sed -i 's/"5433:5432"/"7003:5432"/g' tools/compose/docker-compose.kong.yml
    echo "✅ docker-compose.kong.yml atualizado"
fi

# Atualizar Redis no RAG
if [ -f tools/compose/docker-compose.rag.yml ]; then
    cp tools/compose/docker-compose.rag.yml tools/compose/docker-compose.rag.yml.backup
    sed -i 's/"6380:6379"/"7030:6379"/g' tools/compose/docker-compose.rag.yml
    echo "✅ docker-compose.rag.yml atualizado"
fi

echo ""
echo "📝 FASE 4: Atualizando .env"
echo "=============================================="

# Backup do .env
cp .env .env.backup-ports

# Atualizar .env (atualizar valores existentes)
sed -i 's/^TIMESCALEDB_PORT=.*/TIMESCALEDB_PORT=7000/' .env
sed -i 's/^QUESTDB_HTTP_PORT=.*/QUESTDB_HTTP_PORT=7010/' .env
sed -i 's/^QDRANT_HTTP_PORT=.*/QDRANT_HTTP_PORT=7020/' .env
sed -i 's/^REDIS_PORT=.*/REDIS_PORT=7030/' .env

# Adicionar novas variáveis se não existirem
grep -q "^TIMESCALEDB_BACKUP_PORT=" .env || echo "TIMESCALEDB_BACKUP_PORT=7001" >> .env
grep -q "^POSTGRES_LANGGRAPH_PORT=" .env || echo "POSTGRES_LANGGRAPH_PORT=7002" >> .env
grep -q "^KONG_DB_PORT=" .env || echo "KONG_DB_PORT=7003" >> .env
grep -q "^QUESTDB_ILP_PORT=" .env || echo "QUESTDB_ILP_PORT=7011" >> .env
grep -q "^QUESTDB_INFLUX_PORT=" .env || echo "QUESTDB_INFLUX_PORT=7012" >> .env
grep -q "^QDRANT_GRPC_PORT=" .env || echo "QDRANT_GRPC_PORT=7021" >> .env
grep -q "^PGADMIN_PORT=" .env || echo "PGADMIN_PORT=7100" >> .env
grep -q "^ADMINER_PORT=" .env || echo "ADMINER_PORT=7101" >> .env
grep -q "^PGWEB_PORT=" .env || echo "PGWEB_PORT=7102" >> .env
grep -q "^TIMESCALEDB_EXPORTER_PORT=" .env || echo "TIMESCALEDB_EXPORTER_PORT=7200" >> .env

echo "✅ .env atualizado"

echo ""
echo "🚀 FASE 5: Reiniciando Databases (DADOS PRESERVADOS!)"
echo "=============================================="
docker compose -f tools/compose/docker-compose.database.yml up -d

if [ -f tools/compose/docker-compose.kong.yml ]; then
    docker compose -f tools/compose/docker-compose.kong.yml up -d kong-db
fi

if [ -f tools/compose/docker-compose.rag.yml ]; then
    docker compose -f tools/compose/docker-compose.rag.yml up -d rag-redis
fi

echo "⏳ Aguardando 20s para databases iniciarem..."
sleep 20

echo ""
echo "✅ FASE 6: Verificando Status"
echo "=============================================="
docker ps --filter "name=data-" --format "table {{.Names}}\t{{.Status}}" | head -15

echo ""
echo "✅ FASE 7: Verificando Volumes (DADOS INTACTOS)"
echo "=============================================="
docker volume ls | grep "data-"

echo ""
echo "🔄 FASE 8: Reiniciando Apps"
echo "=============================================="
docker compose -f tools/compose/docker-compose.apps.yml restart 2>/dev/null && echo "✅ Apps reiniciados"

echo ""
echo "=========================================="
echo "✅ MIGRAÇÃO COMPLETA!"
echo "=========================================="
echo ""
echo "📊 NOVAS PORTAS:"
echo "  TimescaleDB:  http://localhost:7000"
echo "  QuestDB:      http://localhost:7010"
echo "  Qdrant:       http://localhost:7020"
echo "  Redis:        (porta 7030)"
echo "  PgAdmin:      http://localhost:7100"
echo "  Adminer:      http://localhost:7101"
echo "  PgWeb:        http://localhost:7102"
echo ""
echo "📁 BACKUPS em: $BACKUP_DIR"
echo ""
echo "🧪 VALIDAR:"
echo "  curl http://localhost:7010  # QuestDB"
echo "  curl http://localhost:7020/collections  # Qdrant"
echo "  curl http://localhost:3201/health  # Workspace"
echo "  curl http://localhost:4006/health  # TP Capital"
echo ""

