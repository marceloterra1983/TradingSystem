#!/usr/bin/env bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  TP Capital - Diagnóstico Completo                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar se Dashboard está rodando
echo "━━━ 1. Dashboard Status ━━━"
if lsof -ti:3103 >/dev/null 2>&1; then
    PID=$(lsof -ti:3103)
    echo "✓ Dashboard está rodando (PID: $PID)"
    ps -p $PID -o %cpu,%mem,cmd | tail -1
else
    echo "✗ Dashboard NÃO está rodando"
fi
echo ""

# 2. Verificar logs do Dashboard
echo "━━━ 2. Dashboard Logs (últimas 30 linhas) ━━━"
if [ -f /tmp/tradingsystem-logs/dashboard.log ]; then
    tail -30 /tmp/tradingsystem-logs/dashboard.log
else
    echo "✗ Arquivo de log não encontrado"
fi
echo ""

# 3. Verificar erros de compilação
echo "━━━ 3. Erros de Compilação Vite ━━━"
if [ -f /tmp/tradingsystem-logs/dashboard.log ]; then
    grep -i "error\|failed\|cannot\|syntax" /tmp/tradingsystem-logs/dashboard.log | tail -10
    if [ $? -ne 0 ]; then
        echo "✓ Nenhum erro encontrado"
    fi
else
    echo "✗ Log não disponível"
fi
echo ""

# 4. Verificar TP Capital backend
echo "━━━ 4. TP Capital Backend Status ━━━"
if lsof -ti:3201 >/dev/null 2>&1; then
    PID=$(lsof -ti:3201)
    echo "✓ TP Capital está rodando (PID: $PID)"
    echo "   Testando endpoint /health..."
    curl -s http://localhost:3201/health | head -3 || echo "✗ Não responde"
else
    echo "✗ TP Capital NÃO está rodando"
fi
echo ""

# 5. Verificar Workspace API
echo "━━━ 5. Workspace API Status ━━━"
if lsof -ti:3200 >/dev/null 2>&1; then
    PID=$(lsof -ti:3200)
    echo "✓ Workspace API está rodando (PID: $PID)"
    curl -s http://localhost:3200/health | head -3 || echo "✗ Não responde"
else
    echo "✗ Workspace API NÃO está rodando"
fi
echo ""

# 6. Status de todas as portas
echo "━━━ 6. Status de Todas as Portas ━━━"
declare -A SERVICES=(
    [3103]="Dashboard"
    [3200]="Workspace API"
    [3201]="TP Capital"
    [3400]="Documentation"
    [3500]="Service Launcher"
    [3600]="Firecrawl"
    [3700]="WebScraper"
)

for port in "${!SERVICES[@]}"; do
    if lsof -ti:$port >/dev/null 2>&1; then
        printf "Port %s %-20s ✓ RUNNING\n" "$port" "(${SERVICES[$port]})"
    else
        printf "Port %s %-20s ✗ DOWN\n" "$port" "(${SERVICES[$port]})"
    fi
done | sort -n
echo ""

# 7. Verificar se há processo zombie
echo "━━━ 7. Processos Zombie ━━━"
ps aux | grep -E "defunct|<defunct>" | grep -v grep || echo "✓ Nenhum processo zombie"
echo ""

# 8. Uso de memória e CPU
echo "━━━ 8. Uso de Recursos ━━━"
free -h | grep -E "Mem:|Swap:"
echo ""
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1"%"}'
echo ""

# 9. Último erro no log do Dashboard
echo "━━━ 9. Último Erro no Dashboard Log ━━━"
if [ -f /tmp/tradingsystem-logs/dashboard.log ]; then
    grep -i "error" /tmp/tradingsystem-logs/dashboard.log | tail -5 || echo "✓ Nenhum erro recente"
else
    echo "✗ Log não disponível"
fi
echo ""

# 10. Recomendações
echo "━━━ 10. Recomendações ━━━"
DASHBOARD_UP=$(lsof -ti:3103 >/dev/null 2>&1 && echo "1" || echo "0")
TP_CAPITAL_UP=$(lsof -ti:3201 >/dev/null 2>&1 && echo "1" || echo "0")

if [ "$DASHBOARD_UP" = "0" ]; then
    echo "⚠  Dashboard está DOWN - Execute:"
    echo "   cd frontend/dashboard && npm run dev"
fi

if [ "$TP_CAPITAL_UP" = "0" ]; then
    echo "⚠  TP Capital está DOWN - Execute:"
    echo "   cd apps/tp-capital && PORT=3201 npm run dev"
fi

if [ "$DASHBOARD_UP" = "1" ] && [ "$TP_CAPITAL_UP" = "1" ]; then
    echo "✓ Todos os serviços principais estão rodando!"
    echo "   Se o frontend não carrega, limpe o cache do navegador:"
    echo "   Ctrl+Shift+Delete → Clear cached files → Ctrl+Shift+R"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Diagnóstico Completo!                                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
