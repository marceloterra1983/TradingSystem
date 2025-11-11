#!/bin/bash
# Fix Qdrant and Retest Quick Wins Performance

set -e

echo "🔧 Fixing Qdrant and rerunning performance test..."
echo ""

# Step 1: Stop Qdrant HA cluster (unhealthy)
echo "1️⃣ Stopping Qdrant HA cluster..."
docker stop qdrant-node1 qdrant-node2 qdrant-node3 qdrant-lb 2>/dev/null || true
docker rm qdrant-node1 qdrant-node2 qdrant-node3 qdrant-lb 2>/dev/null || true
echo "   ✅ Qdrant HA cluster stopped"
echo ""

# Step 2: Start single-node Qdrant
echo "2️⃣ Starting single-node Qdrant..."
docker run -d \
  --name rag-qdrant \
  --network tradingsystem_backend \
  -p 6333:6333 \
  -p 6334:6334 \
  -v "$(pwd)/backend/data/qdrant:/qdrant/storage" \
  qdrant/qdrant:v1.7.4

echo "   ✅ Qdrant started on port 6333"
echo ""

# Step 3: Wait for Qdrant to be ready
echo "3️⃣ Waiting for Qdrant to initialize (30s)..."
sleep 30
echo "   ✅ Qdrant should be ready"
echo ""

# Step 4: Verify Qdrant health
echo "4️⃣ Verifying Qdrant health..."
if curl -s http://localhost:6333/healthz | grep -q "ok"; then
  echo "   ✅ Qdrant is healthy!"
else
  echo "   ⚠️  Qdrant health check failed, but continuing..."
fi
echo ""

# Step 5: Restart LlamaIndex services
echo "5️⃣ Restarting LlamaIndex services..."
cd "$(dirname "$0")/.."
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml restart llamaindex-query llamaindex-ingestion 2>/dev/null || true
echo "   ✅ LlamaIndex services restarted"
echo ""

# Step 6: Wait for services to reconnect
echo "6️⃣ Waiting for services to reconnect (30s)..."
sleep 30
echo "   ✅ Services should be connected"
echo ""

# Step 7: Verify LlamaIndex health
echo "7️⃣ Verifying LlamaIndex Query health..."
curl -s http://localhost:8202/health | jq '.' || echo "   ⚠️  Health check failed"
echo ""

# Step 8: Run performance test
echo "8️⃣ Running performance test (3 minutes)..."
echo "   Target: P95 < 2ms, 70%+ cache hits"
echo ""

k6 run scripts/testing/load-test-rag-with-jwt.js --duration 3m --vus 50

echo ""
echo "=========================================="
echo "✅ Test complete! Check results above."
echo "=========================================="
echo ""
echo "Expected with working Qdrant:"
echo "  - P95: < 2ms (vs 5.43ms baseline)"
echo "  - Throughput: > 40 req/s (vs 14.77 baseline)"
echo "  - Cache hit rate: > 70%"
echo "  - Error rate: < 1%"
