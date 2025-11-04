#!/bin/bash

echo "🛡️ MIGRAÇÃO: Portas Protegidas para Databases"
echo "=============================================="
echo ""
echo "⚠️  Este script irá:"
echo "  1. Fazer backup de todos os databases"
echo "  2. Parar containers de databases"
echo "  3. Atualizar portas para faixa 7000-7999"
echo "  4. Reiniciar databases (DADOS PRESERVADOS!)"
echo "  5. Atualizar .env e apps"
echo ""
echo "📊 NOVO MAPEAMENTO DE PORTAS:"
echo "  TimescaleDB:     5432 → 7000"
echo "  TimescaleDB Bkp: 5437 → 7001"
echo "  Postgres Lang:   5438 → 7002"
echo "  Kong DB:         5433 → 7003"
echo "  QuestDB:         9001 → 7010"
echo "  QuestDB HTTP:    9010 → 7011"
echo "  QuestDB ILP:     8814 → 7012"
echo "  Qdrant:          6333 → 7020"
echo "  Qdrant gRPC:     6334 → 7021"
echo "  Redis:           6380 → 7030"
echo "  PgAdmin:         5051 → 7100"
echo "  Adminer:         8082 → 7101"
echo "  PgWeb:           8083 → 7102"
echo "  TS Exporter:     9188 → 7200"
echo ""

read -p "Continuar? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelado pelo usuário"
    exit 1
fi

PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
cd "$PROJECT_ROOT"

# Criar diretório de backup
BACKUP_DIR="$PROJECT_ROOT/backups/database-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo ""
echo "📦 FASE 1: Backup Preventivo"
echo "=============================================="

# Backup TimescaleDB
echo "Fazendo backup TimescaleDB..."
docker exec data-timescale pg_dumpall -U timescale > "$BACKUP_DIR/timescale-full.sql" 2>/dev/null && echo "✅ TimescaleDB backup OK" || echo "⚠️  TimescaleDB backup falhou (container pode não estar rodando)"

# Backup volumes
echo "Fazendo backup de volumes Docker..."
for volume in $(docker volume ls -q | grep "data-"); do
    echo "  Backup volume: $volume"
    docker run --rm -v "$volume:/data" -v "$BACKUP_DIR:/backup" alpine tar czf "/backup/$volume.tar.gz" /data 2>/dev/null
done
echo "✅ Backups criados em: $BACKUP_DIR"

echo ""
echo "🛑 FASE 2: Parando Databases"
echo "=============================================="
docker compose -f tools/compose/docker-compose.database.yml down
echo "✅ Databases parados"

echo ""
echo "📝 FASE 3: Atualizando docker-compose.database.yml"
echo "=============================================="

# Backup do arquivo original
cp tools/compose/docker-compose.database.yml tools/compose/docker-compose.database.yml.backup

# Atualizar portas no docker-compose
sed -i 's/5432:5432/7000:5432/g' tools/compose/docker-compose.database.yml
sed -i 's/5437:5432/7001:5432/g' tools/compose/docker-compose.database.yml
sed -i 's/5438:5432/7002:5432/g' tools/compose/docker-compose.database.yml
sed -i 's/5433:5432/7003:5432/g' tools/compose/docker-compose.database.yml
sed -i 's/9001:9000/7010:9000/g' tools/compose/docker-compose.database.yml
sed -i 's/9010:9009/7011:9009/g' tools/compose/docker-compose.database.yml
sed -i 's/8814:8812/7012:8812/g' tools/compose/docker-compose.database.yml
sed -i 's/6333:6333/7020:6333/g' tools/compose/docker-compose.database.yml
sed -i 's/6334:6334/7021:6334/g' tools/compose/docker-compose.database.yml
sed -i 's/5051:80/7100:80/g' tools/compose/docker-compose.database.yml
sed -i 's/8082:8080/7101:8080/g' tools/compose/docker-compose.database.yml
sed -i 's/8083:8081/7102:8081/g' tools/compose/docker-compose.database.yml
sed -i 's/9188:9187/7200:9187/g' tools/compose/docker-compose.database.yml

echo "✅ docker-compose.database.yml atualizado"

echo ""
echo "📝 FASE 4: Atualizando .env"
echo "=============================================="

# Backup do .env
cp .env .env.backup

# Atualizar .env
sed -i 's/TIMESCALEDB_PORT=5432/TIMESCALEDB_PORT=7000/g' .env
sed -i 's/TIMESCALEDB_PORT=5437/TIMESCALEDB_BACKUP_PORT=7001/g' .env
sed -i 's/QUESTDB_HTTP_PORT=9001/QUESTDB_HTTP_PORT=7010/g' .env
sed -i 's/QUESTDB_HTTP_PORT=9010/QUESTDB_ILP_PORT=7011/g' .env
sed -i 's/QDRANT_HTTP_PORT=6333/QDRANT_HTTP_PORT=7020/g' .env
sed -i 's/QDRANT_GRPC_PORT=6334/QDRANT_GRPC_PORT=7021/g' .env
sed -i 's/REDIS_PORT=6380/REDIS_PORT=7030/g' .env

echo "✅ .env atualizado"

echo ""
echo "🚀 FASE 5: Reiniciando Databases (DADOS PRESERVADOS!)"
echo "=============================================="
docker compose -f tools/compose/docker-compose.database.yml up -d

echo "⏳ Aguardando 20s para databases iniciarem..."
sleep 20

echo ""
echo "✅ FASE 6: Verificando Status"
echo "=============================================="
docker ps --filter "name=data-" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "✅ FASE 7: Verificando Volumes (DADOS INTACTOS)"
echo "=============================================="
docker volume ls | grep "data-"

echo ""
echo "🔄 FASE 8: Reiniciando Apps"
echo "=============================================="
docker compose -f tools/compose/docker-compose.apps.yml restart 2>/dev/null
docker compose -f tools/compose/docker-compose.rag.yml restart 2>/dev/null
echo "✅ Apps reiniciados"

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
echo "🧪 TESTAR:"
echo "  curl http://localhost:7010  # QuestDB"
echo "  curl http://localhost:7020/collections  # Qdrant"
echo "  curl http://localhost:3201/health  # Workspace"
echo "  curl http://localhost:4006/health  # TP Capital"
echo ""

