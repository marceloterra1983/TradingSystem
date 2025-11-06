#!/bin/bash
# Script para liberar a porta 5050 (pgAdmin)
# Necessário rodar com sudo

echo "🔧 Liberando porta 5050 (pgAdmin)..."
echo ""

# Verificar o que está usando
echo "Processos na porta 5050:"
lsof -i:5050 2>/dev/null || echo "   Nenhum processo encontrado com lsof"
echo ""

# Matar processo
PID=$(lsof -ti:5050 2>/dev/null)
if [ -n "$PID" ]; then
    echo "Matando processo PID: $PID"
    kill -9 $PID 2>/dev/null
    echo "   ✅ Processo terminado"
else
    echo "   ✅ Porta já está livre"
fi

echo ""
echo "Verificando novamente:"
if lsof -i:5050 > /dev/null 2>&1; then
    echo "   ⚠️  Porta ainda ocupada"
else
    echo "   ✅ Porta 5050 livre!"
fi

