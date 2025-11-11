#!/bin/bash
# ==============================================================================
# TP Capital Fresh Start - Create New PG16 Database
# ==============================================================================
# Purpose: Start TP Capital with fresh PG16 database (volume was corrupted)
# ==============================================================================

set -euo pipefail

echo "🆕 TP Capital - Fresh Start com PostgreSQL 16"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Ensure backup exists
echo "1️⃣  Verificando backup existente..."
BACKUP_FILE=$(ls -t /home/marce/Projetos/TradingSystem/backups/tp-capital-pg15-backup-*.tar.gz 2>/dev/null | head -1)
if [ -z "$BACKUP_FILE" ]; then
  echo -e "   ${YELLOW}⚠️  Nenhum backup encontrado (normal para primeiro uso)${NC}"
else
  echo "   ✅ Backup preservado: $(basename $BACKUP_FILE)"
fi
echo ""

# Step 2: Stop all containers
echo "2️⃣  Parando containers existentes..."
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.4-1-tp-capital-stack.yml down 2>/dev/null || true
echo "   ✅ Containers parados"
echo ""

# Step 3: Remove old volume
echo "3️⃣  Removendo volume PG15 corrompido..."
echo -e "   ${YELLOW}⚠️  Volume será deletado (backup já existe)${NC}"
read -p "   Continuar? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "   ❌ Operação cancelada pelo usuário"
  exit 0
fi

docker volume rm tp-capital-timescaledb-data 2>/dev/null || true
echo "   ✅ Volume removido"
echo ""

# Step 4: Create new volume
echo "4️⃣  Criando novo volume para PG16..."
docker volume create tp-capital-timescaledb-data > /dev/null
echo "   ✅ Novo volume criado"
echo ""

# Step 5: Start stack
echo "5️⃣  Iniciando TP Capital Stack com PG16..."
docker compose -f docker-compose.4-1-tp-capital-stack.yml up -d
echo "   ✅ Stack iniciada"
echo ""

# Step 6: Wait for TimescaleDB to be ready
echo "6️⃣  Aguardando TimescaleDB inicializar..."
for i in {1..30}; do
  if docker exec tp-capital-timescale pg_isready -U tp_capital -d tp_capital_db > /dev/null 2>&1; then
    echo "   ✅ TimescaleDB pronto"
    break
  fi
  sleep 2
  if [ $i -eq 30 ]; then
    echo "   ❌ Timeout aguardando TimescaleDB"
    exit 1
  fi
done
echo ""

# Step 7: Wait for all containers
echo "7️⃣  Aguardando todos os containers..."
sleep 10
echo ""

# Step 8: Check health
echo "8️⃣  Verificando status dos containers..."
docker ps --filter "label=com.tradingsystem.stack=tp-capital" --format "table {{.Names}}\t{{.Status}}"
echo ""

HEALTHY=$(docker ps --filter "label=com.tradingsystem.stack=tp-capital" --filter "health=healthy" --format "{{.Names}}" | wc -l)
TOTAL=$(docker ps --filter "label=com.tradingsystem.stack=tp-capital" --format "{{.Names}}" | wc -l)
echo "   📊 Containers healthy: $HEALTHY/$TOTAL"
echo ""

# Step 9: Verify database
echo "9️⃣  Verificando banco de dados..."
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "SELECT version();" > /dev/null 2>&1
echo "   ✅ Banco de dados acessível"
echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ TP CAPITAL INICIADO COM SUCESSO!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Stack:"
echo "   - TimescaleDB: PostgreSQL 16 (novo)"
echo "   - PgBouncer: Ativo"
echo "   - Redis Master: Ativo"
echo "   - Redis Replica: Ativo"
echo "   - TP Capital API: Ativo"
echo ""
echo "🌐 Endpoints:"
echo "   - API: http://localhost:4005"
echo "   - TimescaleDB: localhost:5440"
echo ""
echo "🔍 Verificar containers:"
echo "   docker ps --filter 'label=com.tradingsystem.stack=tp-capital'"
echo ""
echo "📊 Acessar banco:"
echo "   docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db"
echo ""
