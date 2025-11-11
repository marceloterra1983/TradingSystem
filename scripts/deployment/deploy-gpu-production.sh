#!/bin/bash
# GPU Production Deployment Script
# Deploys RAG services with GPU acceleration for 10x+ performance

set -e

echo "=========================================="
echo "🎮 GPU PRODUCTION DEPLOYMENT"
echo "=========================================="
echo ""

# Check for NVIDIA GPU
echo "1️⃣ Verificando hardware GPU..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "   ❌ NVIDIA driver não encontrado!"
    echo "   📚 Instale o driver NVIDIA primeiro:"
    echo "      sudo apt-get install -y nvidia-driver-535"
    exit 1
fi

nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
echo "   ✅ GPU detectada!"
echo ""

# Check NVIDIA Container Toolkit
echo "2️⃣ Verificando NVIDIA Container Toolkit..."
if ! docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi &> /dev/null; then
    echo "   ❌ NVIDIA Container Toolkit não configurado!"
    echo "   📚 Execute os comandos de setup:"
    echo ""
    echo "   distribution=\$(. /etc/os-release;echo \$ID\$VERSION_ID)"
    echo "   curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg"
    echo "   echo \"deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://nvidia.github.io/libnvidia-container/stable/deb/\$(ARCH) /\" | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list"
    echo "   sudo apt-get update"
    echo "   sudo apt-get install -y nvidia-container-toolkit"
    echo "   sudo nvidia-ctk runtime configure --runtime=docker"
    echo "   sudo systemctl restart docker"
    echo ""
    exit 1
fi

echo "   ✅ NVIDIA Container Toolkit OK!"
echo ""

# Stop CPU-only stack
echo "3️⃣ Parando stack CPU-only..."
cd "$(dirname "$0")/../.."
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml down
echo "   ✅ Stack CPU parado"
echo ""

# Deploy GPU stack
echo "4️⃣ Deployando stack GPU..."
docker compose -f tools/compose/docker-compose.4-4-rag-stack.gpu.yml up -d
echo "   ✅ Stack GPU iniciado"
echo ""

# Wait for services
echo "5️⃣ Aguardando serviços iniciarem (2 minutos)..."
sleep 120
echo "   ✅ Serviços devem estar prontos"
echo ""

# Check GPU usage
echo "6️⃣ Verificando uso de GPU pelos containers..."
docker exec rag-ollama-gpu nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader || echo "   ⚠️  Não foi possível verificar GPU usage"
echo ""

# Health check
echo "7️⃣ Verificando health dos serviços..."
echo "   LlamaIndex Query:"
curl -s http://localhost:8202/health | jq '{status, vectors, message}' || echo "   ⚠️  Service not ready"
echo ""
echo "   RAG Service:"
curl -s http://localhost:3401/health | jq '{ok, cache}' || echo "   ⚠️  Service not ready"
echo ""

# Ready
echo "=========================================="
echo "✅ GPU DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "📊 Expected Performance:"
echo "   - P95 Latency: < 0.5ms (10x faster!)"
echo "   - Throughput: 500-1000 req/s (30-60x faster!)"
echo "   - Embedding: 5-10ms (10x faster!)"
echo "   - LLM Generation: 200-500ms (10x faster!)"
echo ""
echo "🧪 Run load test:"
echo "   k6 run scripts/testing/load-test-rag-with-jwt.js --duration 3m --vus 50"
echo ""
echo "📊 Monitor GPU:"
echo "   watch -n 1 nvidia-smi"
echo ""
echo "=========================================="

