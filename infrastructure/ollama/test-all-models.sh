#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     TESTE COMPARATIVO - 4 MODELOS OLLAMA                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

QUESTION="Explique em uma frase o que é trading algorítmico"

echo "📝 Pergunta: $QUESTION"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Teste modelo por modelo
for MODEL in "llama3.2" "gpt-oss:20b" "gemma2:27b" "gpt-oss:120b"; do
    echo "🤖 Modelo: $MODEL"
    echo "─────────────────────────────────────────────────────────"
    
    START=$(date +%s%N)
    
    RESPONSE=$(curl -s http://localhost:11434/api/generate -d "{
        \"model\": \"$MODEL\",
        \"prompt\": \"$QUESTION\",
        \"stream\": false
    }" | jq -r '.response')
    
    END=$(date +%s%N)
    DURATION=$(( (END - START) / 1000000 ))
    
    echo "⏱️  Tempo: ${DURATION}ms"
    echo "💬 Resposta:"
    echo "$RESPONSE" | fold -s -w 60
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo ""
done

echo "✅ Teste concluído!"
echo ""
echo "📊 Resumo dos Modelos:"
docker exec ollama ollama list

echo ""
echo "🎯 Uso de GPU:"
nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader








