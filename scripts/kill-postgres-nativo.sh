#!/bin/bash
# Mata PostgreSQL nativo que está usando porta 5432

echo "🔧 Parando PostgreSQL nativo..."
echo ""

# Verificar o que está rodando
echo "Processos PostgreSQL:"
ps aux | grep -i postgres | grep -v grep

echo ""
echo "Porta 5432:"
lsof -i:5432 2>/dev/null || echo "   Nenhum processo encontrado"

echo ""
echo "Parando PostgreSQL..."

# Tentar parar via systemctl
sudo systemctl stop postgresql 2>/dev/null && echo "   ✅ PostgreSQL stopped via systemctl" ||

#Tentar parar via service
sudo service postgresql stop 2>/dev/null && echo "   ✅ PostgreSQL stopped via service" ||
 
# Matar processo diretamente
sudo killall -9 postgres 2>/dev/null && echo "   ✅ PostgreSQL killed" ||

echo "   ✅ Nenhum PostgreSQL rodando"

echo ""
echo "Verificando porta 5432 novamente..."
sleep 2
if lsof -i:5432 >/dev/null 2>&1; then
    echo "   ⚠️  Porta ainda ocupada"
    PIDS=$(lsof -ti:5432 | tr '\n' ' ')
    if [ -n "$PIDS" ]; then
        echo "   Matando PIDs: $PIDS"
        kill -9 $PIDS 2>/dev/null || true
    else
        echo "   Tentando com fuser..."
        fuser -k 5432/tcp 2>/dev/null || true
    fi
    sleep 1
else
    echo "   ✅ Porta 5432 livre!"
fi

# Verificação final
sleep 1
if lsof -i:5432 >/dev/null 2>&1; then
    echo ""
    echo "   ⚠️  AVISO: Porta 5432 AINDA ocupada"
    echo "   Execute manualmente:"
    echo "   sudo fuser -k 5432/tcp"
else
    echo ""
    echo "   ✅ ✅ ✅ PORTA 5432 LIVRE!"
fi

