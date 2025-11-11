#!/bin/bash
# Restart Course Crawler Worker after CLI rebuild

set -e

cd /home/marce/Projetos/TradingSystem/tools/compose

echo "🔄 Restarting course-crawler-worker..."
echo ""

docker compose -f docker-compose.4-5-course-crawler-stack.yml restart course-crawler-worker

echo ""
echo "✅ Worker restarted successfully!"
echo ""
echo "📊 Container status:"
docker ps --filter "name=course-crawler-worker" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "🧪 Próximos passos:"
echo "  1. Acesse: http://localhost:4201"
echo "  2. Crie novo run para o curso 'DQ Labs'"
echo "  3. Aguarde ~5-10 minutos"
echo "  4. Verifique se o erro desapareceu"
echo ""
