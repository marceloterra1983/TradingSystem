#!/bin/bash
# Script para recuperar runs órfãos (travados como "running" após restart de container)
# Criado: 2025-11-07

set -e

DB_CONTAINER="course-crawler-db"
DB_USER="postgres"
DB_NAME="coursecrawler"

echo "🔍 Procurando runs órfãos (status 'running' sem processo ativo)..."
echo ""

# Buscar runs com status "running"
ORPHANED_RUNS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT id FROM course_crawler.crawl_runs WHERE status = 'running';" | xargs)

if [ -z "$ORPHANED_RUNS" ]; then
  echo "✅ Nenhum run órfão encontrado!"
  exit 0
fi

echo "📋 Runs em status 'running':"
for RUN_ID in $ORPHANED_RUNS; do
  echo "   - $RUN_ID"
done
echo ""

# Verificar se há processo ativo no worker
WORKER_RUNNING=$(docker ps --filter "name=course-crawler-worker" --filter "status=running" --format "{{.ID}}" | wc -l)

if [ "$WORKER_RUNNING" -eq 0 ]; then
  echo "⚠️  Worker container não está rodando!"
  echo "   Todos os runs devem ser marcados como failed."
else
  echo "✅ Worker container está rodando"
  echo "   Verificando logs para identificar run ativo..."

  # Buscar run ID nos logs recentes do worker (últimos 30s)
  ACTIVE_RUN=$(docker logs --since 30s course-crawler-worker 2>&1 | grep -oP "Processing run \K[a-f0-9-]+" | head -1 || echo "")

  if [ -n "$ACTIVE_RUN" ]; then
    echo "   ✅ Run ativo encontrado: $ACTIVE_RUN"
    # Remover run ativo da lista de órfãos
    ORPHANED_RUNS=$(echo "$ORPHANED_RUNS" | tr ' ' '\n' | grep -v "$ACTIVE_RUN" | tr '\n' ' ')
  fi
fi

if [ -z "$ORPHANED_RUNS" ]; then
  echo ""
  echo "✅ Todos os runs 'running' têm processo ativo!"
  exit 0
fi

echo ""
echo "⚠️  Runs órfãos detectados (sem processo ativo):"
for RUN_ID in $ORPHANED_RUNS; do
  echo "   - $RUN_ID"
done
echo ""

read -p "Deseja marcar esses runs como 'failed'? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Operação cancelada"
  exit 0
fi

echo ""
echo "🔧 Marcando runs órfãos como 'failed'..."
echo ""

RECOVERED=0
for RUN_ID in $ORPHANED_RUNS; do
  echo "📝 Atualizando run $RUN_ID..."

  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "UPDATE course_crawler.crawl_runs
     SET status = 'failed',
         error = 'Process terminated unexpectedly (container restart or SIGTERM). Run was interrupted during execution.',
         finished_at = NOW()
     WHERE id = '$RUN_ID'
     RETURNING id, status;" > /dev/null

  if [ $? -eq 0 ]; then
    echo "   ✅ Run $RUN_ID marcado como failed"
    ((RECOVERED++))
  else
    echo "   ❌ Erro ao atualizar run $RUN_ID"
  fi
done

echo ""
echo "🎉 Recuperação concluída!"
echo "   ✅ Runs recuperados: $RECOVERED"
echo ""

# Mostrar resumo de status
echo "📊 Resumo de status dos runs:"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT status, COUNT(*) as count
   FROM course_crawler.crawl_runs
   GROUP BY status
   ORDER BY status;"
