#!/bin/bash
set -e

echo "🔧 Fixing TradingSystem Stacks Issues"
echo "======================================"
echo ""

# 1. Parar tudo
echo "1️⃣ Stopping all running containers..."
docker ps -q | xargs -r docker stop 2>/dev/null || true
sleep 5

# 2. Remover containers problemáticos
echo "2️⃣ Removing conflicting containers..."
docker rm -f evolution-redis rag-llamaindex-query docker-control-server 2>/dev/null || true

# 3. Criar networks que estão faltando
echo "3️⃣ Creating missing networks..."
docker network create telegram_backend 2>/dev/null || echo "  telegram_backend already exists"
docker network create n8n_backend 2>/dev/null || echo "  n8n_backend already exists"
docker network create waha_backend 2>/dev/null || echo "  waha_backend already exists"
docker network create kestra_internal 2>/dev/null || echo "  kestra_internal already exists"

# 4. Criar arquivo prometheus-rag.yml se não existir
echo "4️⃣ Creating prometheus config..."
mkdir -p tools/monitoring
if [ ! -f "tools/monitoring/prometheus-rag.yml" ]; then
    cat > tools/monitoring/prometheus-rag.yml << 'PROM'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'rag-services'
    static_configs:
      - targets: ['rag-service:3000', 'rag-ollama:11434']
PROM
    echo "  ✅ Created prometheus-rag.yml"
else
    echo "  ✅ prometheus-rag.yml already exists"
fi

# 5. Criar .env com variáveis faltando
echo "5️⃣ Creating .env with missing variables..."
if ! grep -q "TELEGRAM_GATEWAY_API_TOKEN" .env 2>/dev/null; then
    cat >> .env << 'ENVVARS'

# Telegram Stack
TELEGRAM_GATEWAY_API_TOKEN=your-token-here
TELEGRAM_DB_PASSWORD=your-password-here
TELEGRAM_RABBITMQ_PASSWORD=your-rabbitmq-password-here
ENVVARS
    echo "  ✅ Added telegram variables to .env"
fi

# 6. Verificar portas em uso
echo "6️⃣ Checking port conflicts..."
PORT_8202=$(ss -tulpn 2>/dev/null | grep ":8202 " || echo "")
PORT_9880=$(ss -tulpn 2>/dev/null | grep ":9880 " || echo "")

if [ -n "$PORT_8202" ]; then
    echo "  ⚠️  Port 8202 is in use:"
    echo "$PORT_8202"
    echo "  💡 You may need to change RAG query port in docker-compose"
fi

if [ -n "$PORT_9880" ]; then
    echo "  ⚠️  Port 9880 is in use:"
    echo "$PORT_9880"
    echo "  💡 You may need to change docker-control port in docker-compose"
fi

echo ""
echo "✅ Fixes applied!"
echo ""
echo "📋 Next steps:"
echo "  1. Review .env file and add real credentials"
echo "  2. Fix port conflicts if needed"
echo "  3. Restart stacks: ./start-all-stacks.sh"
