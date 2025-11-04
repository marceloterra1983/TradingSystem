#!/bin/bash
# Kill process using port 4005 (TP Capital API)

PORT=${1:-4005}

echo "🔍 Verificando processos na porta $PORT..."

PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
  echo "✅ Porta $PORT está livre"
  exit 0
fi

echo "⚠️  Porta $PORT em uso pelo processo $PID"
echo "🔪 Matando processo..."

kill -9 $PID 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Processo $PID encerrado com sucesso"
else
  echo "❌ Falha ao encerrar processo $PID"
  exit 1
fi

exit 0




















