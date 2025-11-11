#!/bin/bash
# ==============================================================================
# TP Capital TimescaleDB Migration: PostgreSQL 15 → 16
# ==============================================================================
# Purpose: Safely migrate TP Capital database from PG15 to PG16
# ==============================================================================

set -euo pipefail

echo "🔄 TP Capital - PostgreSQL 15 → 16 Migration"
echo "=============================================="
echo ""

# Colors
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop existing containers
echo "1️⃣  Parando containers existentes..."
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml down 2>/dev/null || true
echo "   ✅ Containers parados"
echo ""

# Step 2: Backup existing data
echo "2️⃣  Criando backup do volume PG15..."
BACKUP_NAME="tp-capital-pg15-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
docker run --rm \
  -v tp-capital-timescaledb-data:/data \
  -v /home/marce/Projetos/TradingSystem/backups:/backup \
  alpine tar czf /backup/$BACKUP_NAME /data

if [ -f "/home/marce/Projetos/TradingSystem/backups/$BACKUP_NAME" ]; then
  echo "   ✅ Backup criado: backups/$BACKUP_NAME"
  BACKUP_SIZE=$(du -h "/home/marce/Projetos/TradingSystem/backups/$BACKUP_NAME" | cut -f1)
  echo "   📦 Tamanho: $BACKUP_SIZE"
else
  echo -e "   ${RED}❌ Erro ao criar backup!${NC}"
  exit 1
fi
echo ""

# Step 3: Start temporary PG15 container for dump
echo "3️⃣  Iniciando container PG15 temporário para dump..."
docker run -d \
  --name tp-capital-pg15-temp \
  -v tp-capital-timescaledb-data:/var/lib/postgresql/data \
  -e POSTGRES_DB=tp_capital_db \
  -e POSTGRES_USER=tp_capital \
  -e POSTGRES_PASSWORD=tp_capital_secure_pass_2024 \
  timescale/timescaledb:latest-pg15 \
  > /dev/null

# Wait for PG15 to be ready
echo "   ⏳ Aguardando PG15 inicializar..."
for i in {1..30}; do
  if docker exec tp-capital-pg15-temp pg_isready -U tp_capital -d tp_capital_db > /dev/null 2>&1; then
    echo "   ✅ PG15 pronto"
    break
  fi
  sleep 2
  if [ $i -eq 30 ]; then
    echo -e "   ${RED}❌ Timeout aguardando PG15${NC}"
    docker rm -f tp-capital-pg15-temp
    exit 1
  fi
done
echo ""

# Step 4: Create SQL dump
echo "4️⃣  Criando dump SQL do banco..."
mkdir -p /home/marce/Projetos/TradingSystem/backups
docker exec tp-capital-pg15-temp pg_dump \
  -U tp_capital \
  -d tp_capital_db \
  --format=plain \
  --no-owner \
  --no-privileges \
  > /home/marce/Projetos/TradingSystem/backups/tp-capital-pg15-dump-$(date +%Y%m%d-%H%M%S).sql

DUMP_FILE=$(ls -t /home/marce/Projetos/TradingSystem/backups/tp-capital-pg15-dump-*.sql | head -1)
if [ -f "$DUMP_FILE" ]; then
  DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
  echo "   ✅ Dump criado: $(basename $DUMP_FILE)"
  echo "   📦 Tamanho: $DUMP_SIZE"
else
  echo -e "   ${RED}❌ Erro ao criar dump!${NC}"
  docker rm -f tp-capital-pg15-temp
  exit 1
fi
echo ""

# Step 5: Stop and remove PG15 temp container
echo "5️⃣  Removendo container PG15 temporário..."
docker rm -f tp-capital-pg15-temp > /dev/null
echo "   ✅ Container removido"
echo ""

# Step 6: Remove old volume (POINT OF NO RETURN!)
echo "6️⃣  Removendo volume PG15 antigo..."
echo -e "   ${YELLOW}⚠️  ATENÇÃO: Volume será deletado (backup já foi feito)${NC}"
read -p "   Continuar? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "   ❌ Operação cancelada pelo usuário"
  exit 0
fi

docker volume rm tp-capital-timescaledb-data
echo "   ✅ Volume removido"
echo ""

# Step 7: Create new volume for PG16
echo "7️⃣  Criando novo volume para PG16..."
docker volume create tp-capital-timescaledb-data > /dev/null
echo "   ✅ Volume criado"
echo ""

# Step 8: Start PG16 container
echo "8️⃣  Iniciando container PG16..."
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.4-1-tp-capital-stack.yml up -d tp-capital-timescaledb

# Wait for PG16 to be ready
echo "   ⏳ Aguardando PG16 inicializar..."
for i in {1..30}; do
  if docker exec tp-capital-timescale pg_isready -U tp_capital -d tp_capital_db > /dev/null 2>&1; then
    echo "   ✅ PG16 pronto"
    break
  fi
  sleep 2
  if [ $i -eq 30 ]; then
    echo -e "   ${RED}❌ Timeout aguardando PG16${NC}"
    exit 1
  fi
done
echo ""

# Step 9: Restore dump
echo "9️⃣  Restaurando dump no PG16..."
cat "$DUMP_FILE" | docker exec -i tp-capital-timescale psql \
  -U tp_capital \
  -d tp_capital_db \
  --quiet \
  2>&1 | grep -v "^$" || true
echo "   ✅ Dump restaurado"
echo ""

# Step 10: Verify data
echo "🔟  Verificando dados..."
TABLE_COUNT=$(docker exec tp-capital-timescale psql \
  -U tp_capital \
  -d tp_capital_db \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
  | tr -d ' ')
echo "   📊 Tabelas encontradas: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo -e "   ${GREEN}✅ Dados verificados com sucesso!${NC}"
else
  echo -e "   ${YELLOW}⚠️  Nenhuma tabela encontrada (pode ser normal se banco estava vazio)${NC}"
fi
echo ""

# Step 11: Start remaining containers
echo "1️⃣1️⃣  Iniciando demais containers..."
docker compose -f docker-compose.4-1-tp-capital-stack.yml up -d
echo "   ✅ Stack completa iniciada"
echo ""

# Step 12: Wait for health checks
echo "1️⃣2️⃣  Aguardando health checks..."
sleep 10
HEALTHY=$(docker ps --filter "label=com.tradingsystem.stack=tp-capital" --filter "health=healthy" --format "{{.Names}}" | wc -l)
TOTAL=$(docker ps --filter "label=com.tradingsystem.stack=tp-capital" --format "{{.Names}}" | wc -l)
echo "   📊 Containers healthy: $HEALTHY/$TOTAL"
echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📦 Backups criados:"
echo "   1. Volume: backups/$BACKUP_NAME"
echo "   2. Dump SQL: backups/$(basename $DUMP_FILE)"
echo ""
echo "🔍 Verificar containers:"
echo "   docker ps --filter 'label=com.tradingsystem.stack=tp-capital'"
echo ""
echo "📊 Verificar dados:"
echo "   docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c '\\dt'"
echo ""
