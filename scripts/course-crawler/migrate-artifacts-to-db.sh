#!/bin/bash
# Script para migrar artifacts existentes para o banco de dados
# Criado: 2025-11-07

set -e

OUTPUTS_DIR="/home/marce/Projetos/TradingSystem/outputs/course-crawler"
DB_CONTAINER="course-crawler-db"
DB_USER="postgres"
DB_NAME="coursecrawler"

echo "🔍 Migrando artifacts para o banco de dados..."
echo ""

# Contar runs com artifacts
TOTAL_REPORTS=$(find "$OUTPUTS_DIR" -name "run-report.json" | wc -l)
echo "📊 Encontrados $TOTAL_REPORTS runs com artifacts"
echo ""

MIGRATED=0
SKIPPED=0
FAILED=0

# Processar cada run
for REPORT_PATH in $(find "$OUTPUTS_DIR" -name "run-report.json"); do
    # Extrair run_id do path (report está em outputs/RUN_ID/TIMESTAMP/run-report.json)
    RUN_TIMESTAMP_DIR=$(dirname "$REPORT_PATH")
    RUN_BASE_DIR=$(dirname "$RUN_TIMESTAMP_DIR")
    RUN_ID=$(basename "$RUN_BASE_DIR")

    # Ler dados do report
    STATUS=$(jq -r '.status // "unknown"' "$REPORT_PATH")
    CLASSES=$(jq -r '.metrics.classesProcessed // 0' "$REPORT_PATH")
    STARTED_AT=$(jq -r '.metrics.startedAt // null' "$REPORT_PATH")
    FINISHED_AT=$(jq -r '.metrics.finishedAt // null' "$REPORT_PATH")

    # Verificar se run já existe no banco
    EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM course_crawler.crawl_runs WHERE id = '$RUN_ID';" | tr -d ' ')

    if [ "$EXISTS" -gt 0 ]; then
        echo "⏭️  Run $RUN_ID já existe no banco (skipping)"
        ((SKIPPED++))
        continue
    fi

    # Status válidos: queued, running, success, failed, cancelled, partial
    # Mapear "partial" para "success" pois gerou artifacts úteis
    DB_STATUS="$STATUS"
    if [ "$STATUS" = "partial" ]; then
        DB_STATUS="success"
    fi

    # Converter null para NULL do SQL
    if [ "$STARTED_AT" = "null" ]; then
        STARTED_AT_SQL="NULL"
    else
        STARTED_AT_SQL="'$STARTED_AT'"
    fi

    if [ "$FINISHED_AT" = "null" ]; then
        FINISHED_AT_SQL="NULL"
    else
        FINISHED_AT_SQL="'$FINISHED_AT'"
    fi

    # Extrair metrics como JSON
    METRICS_JSON=$(jq -c '.metrics' "$REPORT_PATH")

    # Extrair error se houver
    ERROR=$(jq -r '.error.message // null' "$REPORT_PATH")
    if [ "$ERROR" = "null" ]; then
        ERROR_SQL="NULL"
    else
        # Escape single quotes
        ERROR_ESCAPED=$(echo "$ERROR" | sed "s/'/''/g")
        ERROR_SQL="'$ERROR_ESCAPED'"
    fi

    # Path dos outputs (usar o diretório com timestamp)
    OUTPUTS_PATH="$RUN_TIMESTAMP_DIR"

    # Tentar inferir course_id do path ou logs
    # Por enquanto, vamos usar NULL (pode ser atualizado manualmente depois)
    COURSE_ID_SQL="NULL"

    # Inserir no banco
    echo "📥 Migrando run $RUN_ID ($STATUS, $CLASSES classes)..."

    INSERT_QUERY="
    INSERT INTO course_crawler.crawl_runs
        (id, course_id, status, outputs_dir, metrics, error, created_at, started_at, finished_at)
    VALUES
        ('$RUN_ID', $COURSE_ID_SQL, '$DB_STATUS', '$OUTPUTS_PATH', '$METRICS_JSON'::jsonb, $ERROR_SQL, $STARTED_AT_SQL, $STARTED_AT_SQL, $FINISHED_AT_SQL)
    ON CONFLICT (id) DO NOTHING;
    "

    if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$INSERT_QUERY" > /dev/null 2>&1; then
        echo "   ✅ Migrado com sucesso!"
        ((MIGRATED++))
    else
        echo "   ❌ Erro ao migrar (verificar logs)"
        ((FAILED++))
    fi

    echo ""
done

echo ""
echo "📊 Resumo da migração:"
echo "   ✅ Migrados: $MIGRATED"
echo "   ⏭️  Já existiam: $SKIPPED"
echo "   ❌ Falharam: $FAILED"
echo ""

if [ "$MIGRATED" -gt 0 ]; then
    echo "🎉 Migração concluída!"
    echo ""
    echo "📋 Verificar no banco:"
    echo "   docker exec course-crawler-db psql -U postgres -d coursecrawler \\"
    echo "     -c 'SELECT id, status, metrics->>\"classesProcessed\" as classes FROM course_crawler.crawl_runs ORDER BY created_at DESC LIMIT 10;'"
fi
