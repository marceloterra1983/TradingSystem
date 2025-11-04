#!/bin/bash
# Pre-Flight Check - Validação de Ambiente antes do Workflow
# Verifica comandos, agentes, scripts, recursos computacionais
# Data: 2025-11-02

set -u

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Contadores
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Função para log de resultado
check_result() {
    local status=$1
    local check_name=$2
    local message=$3
    
    ((TOTAL_CHECKS++))
    
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $check_name"
            echo "  └─ $message"
            ((PASSED_CHECKS++))
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $check_name"
            echo "  └─ $message"
            ((FAILED_CHECKS++))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $check_name"
            echo "  └─ $message"
            ((WARNING_CHECKS++))
            ;;
    esac
}

echo "=================================================="
echo "       Pre-Flight Check - Workflow Auditoria"
echo "=================================================="
echo ""

# 1. COMANDOS CUSTOMIZADOS
echo -e "${BLUE}=== 1. Comandos Customizados ===${NC}"

# Verificar diretório de comandos
if [ -d ".claude/commands" ]; then
    CMD_COUNT=$(find .claude/commands -name "*.md" | wc -l)
    check_result "PASS" "Diretório de comandos" "Encontrado com $CMD_COUNT comandos"
else
    check_result "FAIL" "Diretório de comandos" ".claude/commands não existe"
fi

# Comandos críticos
CRITICAL_COMMANDS=(
    "quality-check"
    "architecture-review"
    "code-review"
    "security-audit"
    "performance-audit"
    "test-coverage"
    "docs-maintenance"
    "workflow-orchestrator"
)

for cmd in "${CRITICAL_COMMANDS[@]}"; do
    if [ -f ".claude/commands/${cmd}.md" ]; then
        check_result "PASS" "Comando /$cmd" "Comando existe"
    else
        check_result "FAIL" "Comando /$cmd" "Comando não encontrado"
    fi
done

# 2. AGENTES ESPECIALIZADOS
echo ""
echo -e "${BLUE}=== 2. Agentes Especializados ===${NC}"

CRITICAL_AGENTS=(
    "sql-pro"
    "test-engineer"
    "architecture-modernizer"
    "docker-health-optimizer"
)

for agent in "${CRITICAL_AGENTS[@]}"; do
    if [ -f ".claude/agents/${agent}.md" ]; then
        check_result "PASS" "Agente @$agent" "Agente existe"
    else
        check_result "WARN" "Agente @$agent" "Agente não encontrado (pode executar manualmente)"
    fi
done

# 3. SCRIPTS DE MANUTENÇÃO
echo ""
echo -e "${BLUE}=== 3. Scripts de Manutenção ===${NC}"

REQUIRED_SCRIPTS=(
    "scripts/maintenance/code-quality-check.sh"
    "scripts/validation/validate-workflow-commands.sh"
    "scripts/workflow/consolidate-phase.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            check_result "PASS" "$(basename $script)" "Script existe e é executável"
        else
            check_result "WARN" "$(basename $script)" "Script existe mas não é executável (chmod +x)"
        fi
    else
        check_result "FAIL" "$(basename $script)" "Script não encontrado"
    fi
done

# 4. TEMPLATES
echo ""
echo -e "${BLUE}=== 4. Templates de Outputs ===${NC}"

if [ -d "templates/workflow" ]; then
    TEMPLATE_COUNT=$(find templates/workflow -name "*.md" | wc -l)
    if [ $TEMPLATE_COUNT -ge 6 ]; then
        check_result "PASS" "Templates de workflow" "$TEMPLATE_COUNT templates encontrados"
    else
        check_result "WARN" "Templates de workflow" "Apenas $TEMPLATE_COUNT templates (esperado: 6+)"
    fi
else
    check_result "FAIL" "Diretório de templates" "templates/workflow não existe"
fi

# 5. FERRAMENTAS NECESSÁRIAS
echo ""
echo -e "${BLUE}=== 5. Ferramentas e Dependências ===${NC}"

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_result "PASS" "Node.js" "Versão $NODE_VERSION instalada"
else
    check_result "FAIL" "Node.js" "Node.js não encontrado"
fi

# npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_result "PASS" "npm" "Versão $NPM_VERSION instalada"
else
    check_result "FAIL" "npm" "npm não encontrado"
fi

# Docker
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        CONTAINERS=$(docker ps -q | wc -l)
        check_result "PASS" "Docker" "$CONTAINERS containers rodando"
    else
        check_result "WARN" "Docker" "Docker instalado mas daemon não está rodando"
    fi
else
    check_result "WARN" "Docker" "Docker não encontrado (opcional para workflow)"
fi

# Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    check_result "PASS" "Git" "Versão $GIT_VERSION instalada"
else
    check_result "FAIL" "Git" "Git não encontrado"
fi

# jq (para parsing JSON)
if command -v jq &> /dev/null; then
    check_result "PASS" "jq" "JSON processor disponível"
else
    check_result "WARN" "jq" "jq não encontrado (recomendado para parsing JSON)"
fi

# 6. RECURSOS COMPUTACIONAIS
echo ""
echo -e "${BLUE}=== 6. Recursos Computacionais ===${NC}"

# Memória RAM
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_GB=$(awk "BEGIN {printf \"%.1f\", $TOTAL_RAM_KB/1024/1024}")

if (( $(awk "BEGIN {print ($TOTAL_RAM_GB >= 16)}") )); then
    check_result "PASS" "Memória RAM" "${TOTAL_RAM_GB}GB disponível (≥16GB)"
elif (( $(awk "BEGIN {print ($TOTAL_RAM_GB >= 8)}") )); then
    check_result "WARN" "Memória RAM" "${TOTAL_RAM_GB}GB disponível (mínimo: 16GB, recomendado: 32GB)"
else
    check_result "FAIL" "Memória RAM" "${TOTAL_RAM_GB}GB insuficiente (mínimo: 8GB, recomendado: 16GB+)"
fi

# CPU cores
CPU_CORES=$(nproc)

if [ $CPU_CORES -ge 8 ]; then
    check_result "PASS" "CPU Cores" "$CPU_CORES cores disponíveis (≥8)"
elif [ $CPU_CORES -ge 4 ]; then
    check_result "WARN" "CPU Cores" "$CPU_CORES cores (mínimo: 4, recomendado: 8+)"
else
    check_result "FAIL" "CPU Cores" "$CPU_CORES cores insuficientes (mínimo: 4)"
fi

# Espaço em disco
DISK_AVAIL=$(df -h . | awk 'NR==2 {print $4}')
DISK_AVAIL_GB=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')

if [ $DISK_AVAIL_GB -ge 20 ]; then
    check_result "PASS" "Espaço em disco" "${DISK_AVAIL} disponível (≥20GB)"
elif [ $DISK_AVAIL_GB -ge 10 ]; then
    check_result "WARN" "Espaço em disco" "${DISK_AVAIL} disponível (mínimo: 10GB, recomendado: 20GB+)"
else
    check_result "FAIL" "Espaço em disco" "${DISK_AVAIL} insuficiente (mínimo: 10GB)"
fi

# Tipo de disco (SSD recomendado)
DISK_TYPE=$(lsblk -d -o name,rota | grep -v "NAME" | head -1 | awk '{print $2}')
if [ "$DISK_TYPE" = "0" ]; then
    check_result "PASS" "Tipo de disco" "SSD detectado (rotational=0)"
else
    check_result "WARN" "Tipo de disco" "HDD detectado (SSD recomendado para performance)"
fi

# 7. ACESSO A RECURSOS
echo ""
echo -e "${BLUE}=== 7. Acesso a Recursos ===${NC}"

# Acesso ao diretório de outputs
if [ -d "outputs" ]; then
    if [ -w "outputs" ]; then
        check_result "PASS" "Diretório outputs/" "Existe e tem permissão de escrita"
    else
        check_result "FAIL" "Diretório outputs/" "Existe mas sem permissão de escrita"
    fi
else
    mkdir -p outputs
    check_result "WARN" "Diretório outputs/" "Criado automaticamente"
fi

# Acesso ao diretório de templates
if [ -d "templates/workflow" ]; then
    check_result "PASS" "Diretório templates/" "Templates de workflow disponíveis"
else
    check_result "FAIL" "Diretório templates/" "templates/workflow não existe"
fi

# Verificar se há node_modules
if [ -d "frontend/dashboard/node_modules" ]; then
    check_result "PASS" "Frontend node_modules" "Dependências instaladas"
else
    check_result "WARN" "Frontend node_modules" "Dependências não instaladas (run: npm install)"
fi

if [ -d "docs/node_modules" ]; then
    check_result "PASS" "Docs node_modules" "Dependências instaladas"
else
    check_result "WARN" "Docs node_modules" "Dependências não instaladas (run: npm install)"
fi

# 8. SERVIÇOS RODANDO
echo ""
echo -e "${BLUE}=== 8. Serviços e Containers ===${NC}"

# Verificar se health-check-all.sh existe e executar
if [ -f "scripts/maintenance/health-check-all.sh" ]; then
    SERVICES_UP=$(bash scripts/maintenance/health-check-all.sh 2>/dev/null | grep -c "UP" || echo "0")
    if [ $SERVICES_UP -ge 5 ]; then
        check_result "PASS" "Serviços críticos" "$SERVICES_UP serviços UP"
    elif [ $SERVICES_UP -ge 3 ]; then
        check_result "WARN" "Serviços críticos" "Apenas $SERVICES_UP serviços UP (esperado: 5+)"
    else
        check_result "WARN" "Serviços críticos" "$SERVICES_UP serviços UP (executar: start)"
    fi
else
    check_result "WARN" "Health check script" "Script não encontrado, pulando verificação"
fi

# Docker containers
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    CONTAINERS_RUNNING=$(docker ps -q | wc -l)
    CONTAINERS_HEALTHY=$(docker ps --filter "health=healthy" -q | wc -l)
    
    if [ $CONTAINERS_RUNNING -gt 0 ]; then
        HEALTH_RATIO=$(awk "BEGIN {printf \"%.0f\", $CONTAINERS_HEALTHY*100/$CONTAINERS_RUNNING}")
        if [ $HEALTH_RATIO -ge 90 ]; then
            check_result "PASS" "Docker containers" "$CONTAINERS_HEALTHY/$CONTAINERS_RUNNING healthy (${HEALTH_RATIO}%)"
        else
            check_result "WARN" "Docker containers" "$CONTAINERS_HEALTHY/$CONTAINERS_RUNNING healthy (${HEALTH_RATIO}%) - esperado: ≥90%"
        fi
    else
        check_result "WARN" "Docker containers" "Nenhum container rodando"
    fi
fi

# 9. CONFIGURAÇÃO DE AMBIENTE
echo ""
echo -e "${BLUE}=== 9. Configuração ===${NC}"

# .env file
if [ -f ".env" ]; then
    check_result "PASS" ".env file" "Arquivo de configuração existe"
else
    check_result "WARN" ".env file" ".env não encontrado (usar .env.example)"
fi

# Git clean
GIT_STATUS=$(git status --porcelain 2>/dev/null | wc -l)
if [ $GIT_STATUS -eq 0 ]; then
    check_result "PASS" "Git working tree" "Limpo (0 arquivos modificados)"
else
    check_result "WARN" "Git working tree" "$GIT_STATUS arquivos modificados (considerar commit antes)"
fi

# Branch atual
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    check_result "WARN" "Git branch" "Em branch principal ($CURRENT_BRANCH) - considerar criar branch de auditoria"
else
    check_result "PASS" "Git branch" "Branch: $CURRENT_BRANCH"
fi

# 10. REQUISITOS DE TEMPO
echo ""
echo -e "${BLUE}=== 10. Planejamento ===${NC}"

# Verificar calendário (dias úteis disponíveis)
CURRENT_DATE=$(date +%Y-%m-%d)
CURRENT_DAY=$(date +%u)  # 1=Monday, 7=Sunday

if [ $CURRENT_DAY -le 5 ]; then
    check_result "PASS" "Dia da semana" "$(date +%A) - dia útil"
else
    check_result "WARN" "Dia da semana" "$(date +%A) - final de semana (considerar iniciar segunda-feira)"
fi

# Verificar se é fim/início de mês (muitas reuniões)
DAY_OF_MONTH=$(date +%d)
if [ $DAY_OF_MONTH -le 5 ] || [ $DAY_OF_MONTH -ge 26 ]; then
    check_result "WARN" "Período do mês" "Dia $DAY_OF_MONTH - início/fim de mês pode ter muitas reuniões"
else
    check_result "PASS" "Período do mês" "Dia $DAY_OF_MONTH - período tranquilo"
fi

# 11. RESUMO E DECISÃO
echo ""
echo "=================================================="
echo "              RESUMO PRE-FLIGHT CHECK"
echo "=================================================="
echo -e "Total de Verificações: $TOTAL_CHECKS"
echo -e "${GREEN}✅ Passed:            $PASSED_CHECKS${NC} ($(awk "BEGIN {printf \"%.1f\", $PASSED_CHECKS*100/$TOTAL_CHECKS}")%)"
echo -e "${YELLOW}⚠️  Warnings:          $WARNING_CHECKS${NC} ($(awk "BEGIN {printf \"%.1f\", $WARNING_CHECKS*100/$TOTAL_CHECKS}")%)"
echo -e "${RED}❌ Failed:            $FAILED_CHECKS${NC} ($(awk "BEGIN {printf \"%.1f\", $FAILED_CHECKS*100/$TOTAL_CHECKS}")%)"
echo ""

# Calcular score
SCORE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_CHECKS + $WARNING_CHECKS*0.5)*100/$TOTAL_CHECKS}")
echo "Pre-Flight Score: $SCORE/100"
echo ""

# Decisão final
if (( $(awk "BEGIN {print ($SCORE >= 85)}") )); then
    echo -e "${GREEN}${BOLD}✅ READY TO GO${NC}"
    echo "Ambiente está pronto para executar o workflow."
    echo ""
    echo "Próximos passos:"
    echo "  1. Criar diretório de output:"
    echo "     mkdir -p outputs/workflow-auditoria-$(date +%Y-%m-%d)"
    echo ""
    echo "  2. Iniciar Fase 1:"
    echo "     /quality-check --full --format json"
    echo ""
    DECISION="GO"
    EXIT_CODE=0
elif (( $(awk "BEGIN {print ($SCORE >= 70)}") )); then
    echo -e "${YELLOW}${BOLD}⚠️  CONDITIONAL GO${NC}"
    echo "Ambiente tem alguns problemas mas pode executar com atenção."
    echo ""
    echo "Ações recomendadas antes de iniciar:"
    if [ $WARNING_CHECKS -gt 0 ]; then
        echo "  - Resolver $WARNING_CHECKS warnings (opcional mas recomendado)"
    fi
    echo "  - Revisar checks que falharam acima"
    echo "  - Considerar executar apenas Fase 1 (piloto) primeiro"
    echo ""
    DECISION="CONDITIONAL"
    EXIT_CODE=0
elif (( $(awk "BEGIN {print ($SCORE >= 50)}") )); then
    echo -e "${RED}${BOLD}❌ NOT READY - FIX REQUIRED${NC}"
    echo "Ambiente tem problemas significativos que devem ser corrigidos."
    echo ""
    echo "Ações obrigatórias:"
    if [ $FAILED_CHECKS -gt 0 ]; then
        echo "  - Corrigir $FAILED_CHECKS checks que falharam"
    fi
    echo "  - Re-executar pre-flight check após correções"
    echo ""
    DECISION="NO-GO"
    EXIT_CODE=1
else
    echo -e "${RED}${BOLD}❌ CRITICAL ISSUES - CANNOT PROCEED${NC}"
    echo "Ambiente não está pronto para executar workflow."
    echo ""
    echo "Múltiplos problemas críticos identificados."
    echo "Revisar todos os checks acima e corrigir antes de prosseguir."
    echo ""
    DECISION="NO-GO"
    EXIT_CODE=1
fi

# Salvar relatório
OUTPUT_FILE="outputs/pre-flight-check-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p outputs

cat > "$OUTPUT_FILE" << EOF
Pre-Flight Check Report
Date: $(date +"%Y-%m-%d %H:%M:%S")
Score: $SCORE/100
Decision: $DECISION

Checks Summary:
- Total: $TOTAL_CHECKS
- Passed: $PASSED_CHECKS ($(awk "BEGIN {printf \"%.1f\", $PASSED_CHECKS*100/$TOTAL_CHECKS}")%)
- Warnings: $WARNING_CHECKS ($(awk "BEGIN {printf \"%.1f\", $WARNING_CHECKS*100/$TOTAL_CHECKS}")%)
- Failed: $FAILED_CHECKS ($(awk "BEGIN {printf \"%.1f\", $FAILED_CHECKS*100/$TOTAL_CHECKS}")%)

Decision: $DECISION
Exit Code: $EXIT_CODE
EOF

echo "Relatório salvo em: $OUTPUT_FILE"
echo "=================================================="

exit $EXIT_CODE

