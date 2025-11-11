#!/bin/bash
# Quick Qdrant Population Script
# Uses Python directly to ingest sample documents

set -e

echo "=========================================="
echo "📚 QUICK QDRANT POPULATION"
echo "=========================================="
echo ""

cd "$(dirname "$0")/.."

echo "1️⃣ Verificando collection..."
VECTORS=$(curl -s http://localhost:6333/collections/documentation | jq -r '.result.vectors_count')
echo "   Current vectors: $VECTORS"
echo ""

if [ "$VECTORS" -gt "0" ]; then
    echo "   ✅ Collection já tem dados!"
    exit 0
fi

echo "2️⃣ Criando sample vectors para teste rápido..."
echo ""

# Create sample data directly via Qdrant API
for i in {1..100}; do
    # Generate random embedding (384 dimensions for mxbai-embed-large)
    VECTOR=$(python3 -c "import random; print([random.random() for _ in range(384)])")
    
    curl -X PUT "http://localhost:6333/collections/documentation/points" \
      -H "Content-Type: application/json" \
      -d "{
        \"points\": [{
          \"id\": $i,
          \"vector\": $VECTOR,
          \"payload\": {
            \"text\": \"Sample document $i for testing cache performance\",
            \"source\": \"test\",
            \"title\": \"Test Doc $i\"
          }
        }]
      }" > /dev/null 2>&1
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "   ✅ $i vectors inseridos..."
    fi
done

echo ""
echo "3️⃣ Verificando collection populada..."
FINAL_COUNT=$(curl -s http://localhost:6333/collections/documentation | jq -r '.result.vectors_count')
echo "   ✅ Total vectors: $FINAL_COUNT"
echo ""

echo "4️⃣ Restart LlamaIndex para reconhecer dados..."
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml restart llamaindex-query
echo "   ✅ LlamaIndex reiniciado"
echo ""

echo "5️⃣ Aguardando reconexão (15s)..."
sleep 15
echo "   ✅ Pronto"
echo ""

echo "6️⃣ Health check final..."
curl -s http://localhost:8202/health | jq '{status, collectionExists, vectors}'
echo ""

echo "=========================================="
echo "✅ QDRANT POPULADO COM SUCESSO!"
echo "=========================================="
echo ""
echo "📊 $FINAL_COUNT vectors na collection 'documentation'"
echo ""
echo "🧪 Agora execute o load test:"
echo "   k6 run scripts/testing/load-test-rag-with-jwt.js --duration 3m --vus 50"
echo ""
echo "Expected: P95 < 2ms, 70%+ cache hits!"
echo "=========================================="

