#!/bin/bash
# Rebuild Course Crawler Worker with NEON_DATABASE_URL fix

set -e

echo "🔄 Rebuilding course-crawler-worker..."
cd /home/marce/Projetos/TradingSystem/tools/compose

docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d --build course-crawler-worker

echo ""
echo "✅ Worker rebuilt successfully!"
echo ""
echo "📊 Container status:"
docker ps --filter "name=course-crawler-worker" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🧪 To test, schedule a new run via UI at http://localhost:4201"
