#!/bin/bash
# Script para reiniciar Course Crawler com variáveis corretas
# Criado: 2025-11-07

set -e

echo "🔄 Reiniciando Course Crawler..."

# Limpar variáveis de ambiente que possam interferir
unset COURSE_CRAWLER_DATABASE_URL
unset COURSE_CRAWLER_NEON_DATABASE_URL

# Carregar .env
cd /home/marce/Projetos/TradingSystem
if [ -f .env ]; then
    echo "✅ Carregando variáveis do .env..."
    export $(grep -v '^#' .env | grep "COURSE_CRAWLER_" | xargs)
else
    echo "❌ Erro: Arquivo .env não encontrado!"
    exit 1
fi

# Verificar variável crítica
echo "📊 DATABASE_URL configurada:"
echo "   $COURSE_CRAWLER_DATABASE_URL"

# Garantir que aponta para course-crawler-db
if [[ "$COURSE_CRAWLER_DATABASE_URL" == *"course-crawler-db"* ]]; then
    echo "✅ DATABASE_URL correta!"
else
    echo "❌ ERRO: DATABASE_URL não aponta para course-crawler-db!"
    echo "   Esperado: postgresql://postgres:coursecrawler@course-crawler-db:5432/coursecrawler"
    echo "   Atual: $COURSE_CRAWLER_DATABASE_URL"
    exit 1
fi

# Parar containers (se estiverem rodando)
echo "🛑 Parando containers..."
docker compose -f tools/compose/docker-compose.course-crawler.yml down 2>/dev/null || true

# Iniciar containers
echo "🚀 Iniciando containers..."
docker compose -f tools/compose/docker-compose.course-crawler.yml up -d

# Aguardar inicialização
echo "⏳ Aguardando inicialização (10s)..."
sleep 10

# Verificar status
echo "📊 Status dos containers:"
docker ps --filter "name=course-crawler" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar variável dentro do container
echo ""
echo "🔍 Verificando DATABASE_URL dentro do container:"
docker exec course-crawler-api printenv | grep "COURSE_CRAWLER_DATABASE_URL" || echo "❌ Variável não encontrada!"

# Verificar logs
echo ""
echo "📋 Últimas 10 linhas de log do API:"
docker logs course-crawler-api --tail 10

echo ""
echo "✅ Course Crawler reiniciado!"
echo "   API: http://localhost:3601"
echo "   UI: http://localhost:4201"
