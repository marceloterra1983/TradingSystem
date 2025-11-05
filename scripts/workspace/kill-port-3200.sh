#!/bin/bash
#
# Kill process using port 3200
# Requires sudo
#

echo "Verificando porta 3200..."
echo ""

# Find PID using port 3200
PORT_PID=$(lsof -ti :3200 2>/dev/null)

if [ -z "$PORT_PID" ]; then
    echo "✓ Porta 3200 está livre"
    exit 0
fi

echo "⚠️  Processo encontrado na porta 3200: PID $PORT_PID"
echo ""

# Show process details
ps -p $PORT_PID -o pid,comm,args 2>/dev/null || echo "Não foi possível obter detalhes do processo"

echo ""
echo "Matando processo..."
kill -9 $PORT_PID 2>/dev/null

sleep 2

# Verify
if lsof -ti :3200 >/dev/null 2>&1; then
    echo "❌ Processo ainda está rodando"
    exit 1
else
    echo "✓ Porta 3200 liberada"
    exit 0
fi

