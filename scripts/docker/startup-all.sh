#!/bin/bash

echo "🟢 Iniciando startup completo do TradingSystem..."
echo ""

cd /workspace/tools/compose

# Verificar redes
echo "📡 Verificando redes Docker..."
docker network create tradingsystem_backend 2>/dev/null && echo "   ✅ tradingsystem_backend criada" || echo "   ✅ tradingsystem_backend já existe"
docker network create tradingsystem_frontend 2>/dev/null && echo "   ✅ tradingsystem_frontend criada" || echo "   ✅ tradingsystem_frontend já existe"
docker network create tp_capital_backend 2>/dev/null && echo "   ✅ tp_capital_backend criada" || echo "   ✅ tp_capital_backend já existe"
echo ""

# 1. Database Stack (PRIMEIRO!)
echo "1️⃣  Iniciando Database Stack..."
docker compose -f docker-compose.5-0-database-stack.yml up -d
echo "   ⏳ Aguardando 10s para banco de dados ficar pronto..."
sleep 10
echo ""

# 2. TP Capital Stack
echo "2️⃣  Iniciando TP Capital Stack..."
docker compose -f docker-compose.4-1-tp-capital-stack.yml up -d
echo "   ⏳ Aguardando 5s..."
sleep 5
echo ""

# 3. Workspace Stack
echo "3️⃣  Iniciando Workspace Stack..."
docker compose -f docker-compose.4-3-workspace-stack.yml up -d
echo "   ⏳ Aguardando 5s..."
sleep 5
echo ""

# 4. Telegram Stack (12 containers)
echo "4️⃣  Iniciando Telegram Stack (12 containers)..."
docker compose -f docker-compose.4-2-telegram-stack-minimal-ports.yml up -d
echo "   ⏳ Aguardando 10s para todos os containers..."
sleep 10
echo ""

# 5. Gateway (Traefik) - Antes do Dashboard!
echo "5️⃣  Iniciando API Gateway (Traefik)..."
docker compose -f docker-compose.0-gateway-stack.yml up -d
echo "   ⏳ Aguardando 5s..."
sleep 5
echo ""

# 6. Dashboard
echo "6️⃣  Iniciando Dashboard..."
docker compose -f docker-compose.1-dashboard-stack.yml up -d
echo "   ⏳ Aguardando 5s..."
sleep 5
echo ""

# 7. Documentação
echo "7️⃣  Iniciando Documentation Stack..."
docker compose -f docker-compose.2-docs-stack.yml up -d
echo "   ⏳ Aguardando 3s..."
sleep 3
echo ""

# 8. Serviços Auxiliares (não bloqueiam se falharem)
echo "8️⃣  Iniciando serviços auxiliares..."
docker compose -f docker-compose.4-4-rag-stack.yml up -d 2>/dev/null && echo "   ✅ RAG Stack (LlamaIndex) iniciado" || echo "   ⚠️  RAG Stack não disponível (opcional)"
docker compose -f docker-compose-5-1-n8n-stack.yml up -d 2>/dev/null && echo "   ✅ N8N iniciado" || echo "   ⚠️  N8N não disponível (opcional)"
docker compose -f docker-compose.5-2-evolution-api-stack.yml up -d 2>/dev/null && echo "   ✅ Evolution API iniciado" || echo "   ⚠️  Evolution API não disponível (opcional)"
docker compose -f docker-compose.5-3-waha-stack.yml up -d 2>/dev/null && echo "   ✅ WAHA iniciado" || echo "   ⚠️  WAHA não disponível (opcional)"
docker compose -f docker-compose.5-5-kestra-stack.yml up -d 2>/dev/null && echo "   ✅ Kestra iniciado" || echo "   ⚠️  Kestra não disponível (opcional)"
docker compose -f docker-compose.5-7-firecrawl-stack.yml up -d 2>/dev/null && echo "   ✅ Firecrawl iniciado" || echo "   ⚠️  Firecrawl não disponível (opcional)"
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d 2>/dev/null && echo "   ✅ Course Crawler iniciado" || echo "   ⚠️  Course Crawler não disponível (opcional)"
docker compose -f docker-compose.6-1-monitoring-stack.yml up -d 2>/dev/null && echo "   ✅ Monitoring Stack iniciado" || echo "   ⚠️  Monitoring não disponível (opcional)"
echo ""

echo "✅ Startup completo!"
echo ""
echo "📊 Containers em execução:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -25
echo ""
echo "🌐 Acesse:"
echo "   - Dashboard: http://localhost:9082/"
echo "   - Documentação: http://localhost:9082/docs/"
echo "   - Traefik Dashboard: http://localhost:9083/dashboard/"
echo ""
echo "⏱️  Tempo total de startup: ~50 segundos"
echo "💡 Aguarde mais 30s para todos os health checks ficarem prontos"
