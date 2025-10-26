#!/bin/bash

# Script para iniciar TP-Capital garantindo que a porta está livre

PORT=4005

echo "🔍 Verificando se porta $PORT está em uso..."

# Encontrar e matar processos na porta
PID=$(lsof -ti :$PORT 2>/dev/null)

if [ ! -z "$PID" ]; then
    echo "⚠️  Porta $PORT está em uso pelo PID $PID"
    echo "🔫 Finalizando processo..."
    kill -9 $PID 2>/dev/null
    sleep 2
fi

# Verificar novamente
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "❌ Não foi possível liberar a porta $PORT"
    exit 1
fi

echo "✅ Porta $PORT está livre"
echo ""
echo "🚀 Iniciando TP-Capital..."
echo ""

# Iniciar o serviço
npm run dev


