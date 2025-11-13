#!/usr/bin/env bash
#
# Fix Docker port binding issues in WSL2
# This script restarts Docker Desktop from Windows side
#
# Usage:
#   bash scripts/docker/fix-docker-ports-wsl2.sh
#

set -e

echo "🔍 Diagnóstico do problema de portas Docker no WSL2"
echo ""

# Check if we're in WSL2
if ! grep -qi microsoft /proc/version; then
    echo "❌ Este script é para WSL2 apenas"
    exit 1
fi

echo "📊 Status atual:"
echo ""

echo "1. Containers rodando:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(api-gateway|telegram-gateway)" || echo "   Nenhum gateway encontrado"
echo ""

echo "2. Portas mapeadas do api-gateway:"
docker port api-gateway 2>/dev/null || echo "   Container não encontrado"
echo ""

echo "3. Processos escutando nas portas 9082 e 9083:"
lsof -i :9082 2>/dev/null || echo "   Porta 9082: NENHUM PROCESSO ❌"
lsof -i :9083 2>/dev/null || echo "   Porta 9083: NENHUM PROCESSO ❌"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 SOLUÇÃO: Docker Desktop no WSL2"
echo ""
echo "O Docker Desktop gerencia o daemon Docker pelo Windows, não pelo WSL2."
echo "Para resolver o problema de port binding, você precisa:"
echo ""
echo "OPÇÃO 1 - Restart do Docker Desktop (RECOMENDADO):"
echo "  1. Abra o Docker Desktop no Windows"
echo "  2. Clique com botão direito no ícone da bandeja do Docker"
echo "  3. Selecione 'Restart Docker Desktop'"
echo "  4. Aguarde o Docker reiniciar (ícone ficará verde)"
echo ""
echo "OPÇÃO 2 - Via PowerShell (Windows Admin):"
echo "  1. Abra PowerShell como Administrador no Windows"
echo "  2. Execute:"
echo "     Stop-Process -Name 'Docker Desktop' -Force"
echo "     Start-Process 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'"
echo ""
echo "OPÇÃO 3 - Via WSL2 (script automático):"
echo "  1. Execute este comando:"
echo "     powershell.exe -Command \"Stop-Process -Name 'Docker Desktop' -Force; Start-Sleep 3; Start-Process 'C:\\\\Program Files\\\\Docker\\\\Docker\\\\Docker Desktop.exe'\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Deseja executar OPÇÃO 3 automaticamente? (s/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🔄 Reiniciando Docker Desktop via PowerShell..."

    # Stop Docker Desktop
    powershell.exe -Command "Stop-Process -Name 'Docker Desktop' -Force" 2>/dev/null || echo "   Docker Desktop já estava parado"

    echo "⏳ Aguardando 5 segundos..."
    sleep 5

    # Start Docker Desktop
    powershell.exe -Command "Start-Process 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'" 2>/dev/null

    echo "⏳ Aguardando Docker Desktop inicializar (30 segundos)..."
    echo "   Você verá o ícone do Docker na bandeja do Windows quando estiver pronto"

    for i in {30..1}; do
        echo -ne "   $i segundos restantes...\r"
        sleep 1
    done
    echo ""

    echo "✅ Docker Desktop reiniciado!"
    echo ""
    echo "🔍 Verificando se Docker está respondendo..."

    if docker info &>/dev/null; then
        echo "✅ Docker está funcionando!"
        echo ""
        echo "Próximos passos:"
        echo "1. Recriar o API Gateway:"
        echo "   docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d --force-recreate"
        echo ""
        echo "2. Aguardar 5 segundos e testar:"
        echo "   sleep 5 && curl http://localhost:9082/"
    else
        echo "⚠️  Docker ainda não está pronto. Aguarde mais alguns segundos e tente novamente."
        echo "   Execute: docker info"
    fi
else
    echo "ℹ️  Por favor, reinicie o Docker Desktop manualmente usando uma das opções acima."
fi

echo ""
