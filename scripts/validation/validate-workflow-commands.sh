#!/bin/bash
# Script de Validação de Comandos do Workflow de Auditoria
# Valida todos os comandos customizados propostos no WORKFLOW-AUDITORIA-COMPLETA-V2.md
# Data: 2025-11-02

set -u

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TOTAL_COMMANDS=0
VALID_COMMANDS=0
INVALID_COMMANDS=0
WARNING_COMMANDS=0

# Diretório do projeto
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMMANDS_DIR="$PROJECT_ROOT/.claude/commands"
OUTPUT_FILE="$PROJECT_ROOT/outputs/workflow-validation-$(date +%Y%m%d-%H%M%S).md"

# Criar diretório de outputs se não existir
mkdir -p "$PROJECT_ROOT/outputs"

# Função para log
log_result() {
    local status=$1
    local command=$2
    local message=$3
    local severity=${4:-""}
    
    case $status in
        "VALID")
            echo -e "${GREEN}✅ VALID${NC}: $command"
            echo "  └─ $message"
            echo "- ✅ **VALID**: \`$command\` - $message" >> "$OUTPUT_FILE"
            ((VALID_COMMANDS++))
            ;;
        "INVALID")
            echo -e "${RED}❌ INVALID${NC}: $command"
            echo "  └─ $message"
            echo "- ❌ **INVALID**: \`$command\` - $message" >> "$OUTPUT_FILE"
            ((INVALID_COMMANDS++))
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  WARNING${NC}: $command"
            echo "  └─ $message"
            echo "- ⚠️  **WARNING**: \`$command\` - $message (Severity: $severity)" >> "$OUTPUT_FILE"
            ((WARNING_COMMANDS++))
            ;;
    esac
    ((TOTAL_COMMANDS++))
}

# Inicializar arquivo de output
cat > "$OUTPUT_FILE" << EOF
# Validação de Comandos - Workflow de Auditoria v2.0

**Data:** $(date +"%Y-%m-%d %H:%M:%S")
**Script:** \`scripts/validation/validate-workflow-commands.sh\`

---

## Resumo Executivo

Este relatório valida todos os comandos customizados propostos no \`WORKFLOW-AUDITORIA-COMPLETA-V2.md\` contra os comandos realmente disponíveis no projeto.

---

## Resultados por Fase

EOF

# Função para verificar se comando existe
command_exists() {
    local cmd=$1
    [ -f "$COMMANDS_DIR/${cmd}.md" ]
}

# Função para verificar flags documentadas
check_flags() {
    local cmd=$1
    shift
    local flags=("$@")
    local cmd_file="$COMMANDS_DIR/${cmd}.md"
    
    if [ ! -f "$cmd_file" ]; then
        return 1
    fi
    
    local all_flags_valid=true
    for flag in "${flags[@]}"; do
        if ! grep -q -- "$flag" "$cmd_file" 2>/dev/null; then
            all_flags_valid=false
            break
        fi
    done
    
    $all_flags_valid
}

echo "=================================================="
echo "  Validação de Comandos - Workflow Auditoria v2.0"
echo "=================================================="
echo ""
echo "Diretório de comandos: $COMMANDS_DIR"
echo "Output: $OUTPUT_FILE"
echo ""

# FASE 1: Inventário e Diagnóstico
echo "" >> "$OUTPUT_FILE"
echo "### FASE 1: Inventário e Diagnóstico" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo -e "${BLUE}=== FASE 1: Inventário e Diagnóstico ===${NC}"

# /quality-check --full --format json
if command_exists "quality-check"; then
    if check_flags "quality-check" "--full" "--format"; then
        log_result "VALID" "/quality-check --full --format json" "Comando e flags documentados"
    else
        log_result "WARNING" "/quality-check --full --format json" "Comando existe mas flags não totalmente documentadas" "LOW"
    fi
else
    log_result "INVALID" "/quality-check --full --format json" "Comando não encontrado"
fi

# /audit all --json
if command_exists "audit"; then
    if check_flags "audit" "--json"; then
        log_result "VALID" "/audit all --json" "Comando e flags documentados"
    else
        log_result "INVALID" "/audit all --json" "Comando existe mas não aceita parâmetros 'all --json'. Use 'npm audit --json'"
    fi
else
    log_result "INVALID" "/audit all --json" "Comando não encontrado"
fi

# health-check-all.sh (script bash, não comando customizado)
if [ -f "$PROJECT_ROOT/scripts/maintenance/health-check-all.sh" ]; then
    log_result "VALID" "bash scripts/maintenance/health-check-all.sh --format json" "Script shell existe"
else
    log_result "WARNING" "bash scripts/maintenance/health-check-all.sh" "Script não encontrado no caminho esperado" "MEDIUM"
fi

# FASE 2: Análise Arquitetural
echo "" >> "$OUTPUT_FILE"
echo "### FASE 2: Análise Arquitetural" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo ""
echo -e "${BLUE}=== FASE 2: Análise Arquitetural ===${NC}"

# /architecture-review --full
if command_exists "architecture-review"; then
    if check_flags "architecture-review" "--full"; then
        log_result "VALID" "/architecture-review --full" "Comando e flag documentados"
    else
        log_result "WARNING" "/architecture-review --full" "Flag '--full' não documentada. Flags disponíveis: --modules, --patterns, --dependencies, --security" "MEDIUM"
    fi
else
    log_result "INVALID" "/architecture-review --full" "Comando não encontrado"
fi

# /architecture-review backend --dependencies
if command_exists "architecture-review"; then
    log_result "WARNING" "/architecture-review backend --dependencies" "Sintaxe 'backend --dependencies' não documentada explicitamente" "LOW"
else
    log_result "INVALID" "/architecture-review backend --dependencies" "Comando não encontrado"
fi

# /architecture-review frontend --modules
if command_exists "architecture-review"; then
    log_result "WARNING" "/architecture-review frontend --modules" "Sintaxe 'frontend --modules' não documentada explicitamente" "LOW"
else
    log_result "INVALID" "/architecture-review frontend --modules" "Comando não encontrado"
fi

# /ultra-think
if command_exists "ultra-think"; then
    log_result "VALID" "/ultra-think" "Comando existe e funciona conforme proposto"
else
    log_result "INVALID" "/ultra-think" "Comando não encontrado"
fi

# /create-architecture-documentation --full-suite
if command_exists "create-architecture-documentation"; then
    if check_flags "create-architecture-documentation" "--full-suite"; then
        log_result "VALID" "/create-architecture-documentation --full-suite" "Comando e flag documentados"
    else
        log_result "WARNING" "/create-architecture-documentation --full-suite" "Flag '--full-suite' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/create-architecture-documentation" "Comando não encontrado"
fi

# FASE 3: Revisão de Código
echo "" >> "$OUTPUT_FILE"
echo "### FASE 3: Revisão de Código" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo ""
echo -e "${BLUE}=== FASE 3: Revisão de Código ===${NC}"

# /code-review backend --full
if command_exists "code-review"; then
    log_result "WARNING" "/code-review backend --full" "Sintaxe não documentada. Formato esperado: [file-path] | [commit-hash] | --full" "MEDIUM"
else
    log_result "INVALID" "/code-review backend --full" "Comando não encontrado"
fi

# /code-review frontend --full
if command_exists "code-review"; then
    log_result "WARNING" "/code-review frontend --full" "Sintaxe não documentada. Formato esperado: [file-path] | [commit-hash] | --full" "MEDIUM"
else
    log_result "INVALID" "/code-review frontend --full" "Comando não encontrado"
fi

# /security-audit --full
if command_exists "security-audit"; then
    if check_flags "security-audit" "--full"; then
        log_result "VALID" "/security-audit --full" "Comando e flag documentados"
    else
        log_result "WARNING" "/security-audit --full" "Flag '--full' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/security-audit --full" "Comando não encontrado"
fi

# /type-check all --pretty
if command_exists "type-check"; then
    log_result "WARNING" "/type-check all --pretty" "Sintaxe não documentada. Formato esperado: [frontend|backend] [--pretty] [--watch]" "LOW"
else
    log_result "INVALID" "/type-check all --pretty" "Comando não encontrado"
fi

# /lint all
if command_exists "lint"; then
    if check_flags "lint" "all"; then
        log_result "VALID" "/lint all" "Comando aceita parâmetro 'all'"
    else
        log_result "WARNING" "/lint all" "Parâmetro 'all' não explicitamente documentado" "LOW"
    fi
else
    log_result "INVALID" "/lint all" "Comando não encontrado"
fi

# /format --check
if command_exists "format"; then
    if check_flags "format" "--check"; then
        log_result "VALID" "/format --check" "Comando e flag documentados"
    else
        log_result "WARNING" "/format --check" "Flag '--check' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/format --check" "Comando não encontrado"
fi

# /explain-code
if command_exists "explain-code"; then
    log_result "VALID" "/explain-code" "Comando existe"
else
    log_result "INVALID" "/explain-code" "Comando não encontrado"
fi

# /refactor-code
if command_exists "refactor-code"; then
    log_result "VALID" "/refactor-code" "Comando existe"
else
    log_result "INVALID" "/refactor-code" "Comando não encontrado"
fi

# FASE 4: Auditoria de Dados
echo "" >> "$OUTPUT_FILE"
echo "### FASE 4: Auditoria de Dados" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo ""
echo -e "${BLUE}=== FASE 4: Auditoria de Dados ===${NC}"

# /design-database-schema --analyze-current
if command_exists "design-database-schema"; then
    if check_flags "design-database-schema" "--analyze-current"; then
        log_result "VALID" "/design-database-schema --analyze-current" "Comando e flag documentados"
    else
        log_result "WARNING" "/design-database-schema --analyze-current" "Flag '--analyze-current' não documentada" "MEDIUM"
    fi
else
    log_result "INVALID" "/design-database-schema --analyze-current" "Comando não encontrado"
fi

# /optimize-database-performance --postgresql
if command_exists "optimize-database-performance"; then
    if check_flags "optimize-database-performance" "--postgresql"; then
        log_result "VALID" "/optimize-database-performance --postgresql" "Comando e flag documentados"
    else
        log_result "WARNING" "/optimize-database-performance --postgresql" "Flag '--postgresql' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/optimize-database-performance --postgresql" "Comando não encontrado"
fi

# /implement-caching-strategy --application --database
if command_exists "implement-caching-strategy"; then
    if check_flags "implement-caching-strategy" "--application" "--database"; then
        log_result "VALID" "/implement-caching-strategy --application --database" "Comando e flags documentados"
    else
        log_result "WARNING" "/implement-caching-strategy --application --database" "Flags não documentadas" "LOW"
    fi
else
    log_result "INVALID" "/implement-caching-strategy --application --database" "Comando não encontrado"
fi

# /create-database-migrations --plan
if command_exists "create-database-migrations"; then
    if check_flags "create-database-migrations" "--plan"; then
        log_result "VALID" "/create-database-migrations --plan" "Comando e flag documentados"
    else
        log_result "WARNING" "/create-database-migrations --plan" "Flag '--plan' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/create-database-migrations --plan" "Comando não encontrado"
fi

# FASE 5: Testes e Qualidade
echo "" >> "$OUTPUT_FILE"
echo "### FASE 5: Testes e Qualidade" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo ""
echo -e "${BLUE}=== FASE 5: Testes e Qualidade ===${NC}"

# /test-coverage --detailed
if command_exists "test-coverage"; then
    if check_flags "test-coverage" "--detailed"; then
        log_result "VALID" "/test-coverage --detailed" "Comando e flag documentados"
    else
        log_result "WARNING" "/test-coverage --detailed" "Flag '--detailed' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/test-coverage --detailed" "Comando não encontrado"
fi

# /test all --coverage
if command_exists "test"; then
    log_result "WARNING" "/test all --coverage" "Sintaxe não explicitamente documentada" "LOW"
else
    log_result "INVALID" "/test all --coverage" "Comando não encontrado"
fi

# /generate-tests
if command_exists "generate-tests"; then
    log_result "VALID" "/generate-tests" "Comando existe (sintaxe genérica, precisa especificar módulos)"
else
    log_result "INVALID" "/generate-tests" "Comando não encontrado"
fi

# /add-mutation-testing --javascript
if command_exists "add-mutation-testing"; then
    if check_flags "add-mutation-testing" "--javascript"; then
        log_result "VALID" "/add-mutation-testing --javascript" "Comando e flag documentados"
    else
        log_result "WARNING" "/add-mutation-testing --javascript" "Flag '--javascript' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/add-mutation-testing --javascript" "Comando não encontrado"
fi

# /add-property-based-testing --javascript
if command_exists "add-property-based-testing"; then
    if check_flags "add-property-based-testing" "--javascript"; then
        log_result "VALID" "/add-property-based-testing --javascript" "Comando e flag documentados"
    else
        log_result "WARNING" "/add-property-based-testing --javascript" "Flag '--javascript' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/add-property-based-testing --javascript" "Comando não encontrado"
fi

# /e2e-setup --playwright
if command_exists "e2e-setup"; then
    if check_flags "e2e-setup" "--playwright"; then
        log_result "VALID" "/e2e-setup --playwright" "Comando e flag documentados"
    else
        log_result "WARNING" "/e2e-setup --playwright" "Flag '--playwright' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/e2e-setup --playwright" "Comando não encontrado"
fi

# /setup-load-testing --stress
if command_exists "setup-load-testing"; then
    if check_flags "setup-load-testing" "--stress"; then
        log_result "VALID" "/setup-load-testing --stress" "Comando e flag documentados"
    else
        log_result "WARNING" "/setup-load-testing --stress" "Flag '--stress' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/setup-load-testing --stress" "Comando não encontrado"
fi

# /setup-comprehensive-testing --full-stack
if command_exists "setup-comprehensive-testing"; then
    if check_flags "setup-comprehensive-testing" "--full-stack"; then
        log_result "VALID" "/setup-comprehensive-testing --full-stack" "Comando e flag documentados"
    else
        log_result "WARNING" "/setup-comprehensive-testing --full-stack" "Flag '--full-stack' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/setup-comprehensive-testing --full-stack" "Comando não encontrado"
fi

# FASE 6: Performance
echo "" >> "$OUTPUT_FILE"
echo "### FASE 6: Performance" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo ""
echo -e "${BLUE}=== FASE 6: Performance ===${NC}"

# /performance-audit --full
if command_exists "performance-audit"; then
    if check_flags "performance-audit" "--full"; then
        log_result "VALID" "/performance-audit --full" "Comando e flag documentados"
    else
        log_result "WARNING" "/performance-audit --full" "Flag '--full' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/performance-audit --full" "Comando não encontrado"
fi

# /performance-audit --frontend
if command_exists "performance-audit"; then
    if check_flags "performance-audit" "--frontend"; then
        log_result "VALID" "/performance-audit --frontend" "Comando e flag documentados"
    else
        log_result "WARNING" "/performance-audit --frontend" "Flag '--frontend' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/performance-audit --frontend" "Comando não encontrado"
fi

# /performance-audit --backend
if command_exists "performance-audit"; then
    if check_flags "performance-audit" "--backend"; then
        log_result "VALID" "/performance-audit --backend" "Comando e flag documentados"
    else
        log_result "WARNING" "/performance-audit --backend" "Flag '--backend' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/performance-audit --backend" "Comando não encontrado"
fi

# FASE 7: Documentação
echo "" >> "$OUTPUT_FILE"
echo "### FASE 7: Documentação" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo ""
echo -e "${BLUE}=== FASE 7: Documentação ===${NC}"

# /docs-maintenance --comprehensive
if command_exists "docs-maintenance"; then
    if check_flags "docs-maintenance" "--comprehensive"; then
        log_result "VALID" "/docs-maintenance --comprehensive" "Comando e flag documentados"
    else
        log_result "WARNING" "/docs-maintenance --comprehensive" "Flag '--comprehensive' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/docs-maintenance --comprehensive" "Comando não encontrado"
fi

# /update-docs --comprehensive
if command_exists "update-docs"; then
    if check_flags "update-docs" "--comprehensive"; then
        log_result "VALID" "/update-docs --comprehensive" "Comando e flag documentados"
    else
        log_result "WARNING" "/update-docs --comprehensive" "Flag '--comprehensive' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/update-docs --comprehensive" "Comando não encontrado"
fi

# /create-onboarding-guide --comprehensive
if command_exists "create-onboarding-guide"; then
    if check_flags "create-onboarding-guide" "--comprehensive"; then
        log_result "VALID" "/create-onboarding-guide --comprehensive" "Comando e flag documentados"
    else
        log_result "WARNING" "/create-onboarding-guide --comprehensive" "Flag '--comprehensive' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/create-onboarding-guide --comprehensive" "Comando não encontrado"
fi

# /troubleshooting-guide --comprehensive
if command_exists "troubleshooting-guide"; then
    if check_flags "troubleshooting-guide" "--comprehensive"; then
        log_result "VALID" "/troubleshooting-guide --comprehensive" "Comando e flag documentados"
    else
        log_result "WARNING" "/troubleshooting-guide --comprehensive" "Flag '--comprehensive' não documentada" "LOW"
    fi
else
    log_result "INVALID" "/troubleshooting-guide --comprehensive" "Comando não encontrado"
fi

# FASE 8: Consolidação
echo "" >> "$OUTPUT_FILE"
echo "### FASE 8: Consolidação e Roadmap" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo ""
echo -e "${BLUE}=== FASE 8: Consolidação e Roadmap ===${NC}"

# /workflow-orchestrator
if command_exists "workflow-orchestrator"; then
    log_result "VALID" "/workflow-orchestrator" "Comando existe (sintaxe 'create auditoria-follow-up' não validada)"
else
    log_result "INVALID" "/workflow-orchestrator create auditoria-follow-up" "Comando não encontrado"
fi

# /todo
if command_exists "todo"; then
    log_result "VALID" "/todo" "Comando existe"
else
    log_result "INVALID" "/todo" "Comando não encontrado"
fi

# Resumo Final
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## Resumo Final" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "| Métrica | Valor |" >> "$OUTPUT_FILE"
echo "|---------|-------|" >> "$OUTPUT_FILE"
# Calcular porcentagens
VALID_PCT=$(awk "BEGIN {printf \"%.1f\", ($VALID_COMMANDS*100/$TOTAL_COMMANDS)}")
WARNING_PCT=$(awk "BEGIN {printf \"%.1f\", ($WARNING_COMMANDS*100/$TOTAL_COMMANDS)}")
INVALID_PCT=$(awk "BEGIN {printf \"%.1f\", ($INVALID_COMMANDS*100/$TOTAL_COMMANDS)}")

echo "| **Total de Comandos** | $TOTAL_COMMANDS |" >> "$OUTPUT_FILE"
echo "| **✅ Válidos** | $VALID_COMMANDS ($VALID_PCT%) |" >> "$OUTPUT_FILE"
echo "| **⚠️  Warnings** | $WARNING_COMMANDS ($WARNING_PCT%) |" >> "$OUTPUT_FILE"
echo "| **❌ Inválidos** | $INVALID_COMMANDS ($INVALID_PCT%) |" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Score de viabilidade
VIABILITY_SCORE=$(awk "BEGIN {printf \"%.1f\", (($VALID_COMMANDS + $WARNING_COMMANDS*0.5)*100/$TOTAL_COMMANDS)}")
echo "### Score de Viabilidade: $VIABILITY_SCORE/100" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if (( $(awk "BEGIN {print ($VIABILITY_SCORE >= 80)}") )); then
    echo "**Status:** ✅ EXECUTÁVEL (com ajustes menores)" >> "$OUTPUT_FILE"
    STATUS_MSG="✅ EXECUTÁVEL (com ajustes menores)"
elif (( $(awk "BEGIN {print ($VIABILITY_SCORE >= 60)}") )); then
    echo "**Status:** ⚠️ PARCIALMENTE EXECUTÁVEL (requer ajustes significativos)" >> "$OUTPUT_FILE"
    STATUS_MSG="⚠️ PARCIALMENTE EXECUTÁVEL (requer ajustes significativos)"
else
    echo "**Status:** ❌ NÃO EXECUTÁVEL (muitos comandos faltando ou incompatíveis)" >> "$OUTPUT_FILE"
    STATUS_MSG="❌ NÃO EXECUTÁVEL (muitos comandos faltando ou incompatíveis)"
fi

echo ""
echo "=================================================="
echo "                  RESUMO FINAL"
echo "=================================================="
echo -e "Total de Comandos:   $TOTAL_COMMANDS"
echo -e "${GREEN}✅ Válidos:          $VALID_COMMANDS${NC} ($VALID_PCT%)"
echo -e "${YELLOW}⚠️  Warnings:         $WARNING_COMMANDS${NC} ($WARNING_PCT%)"
echo -e "${RED}❌ Inválidos:        $INVALID_COMMANDS${NC} ($INVALID_PCT%)"
echo ""
echo "Score de Viabilidade: $VIABILITY_SCORE/100"
echo "$STATUS_MSG"
echo ""
echo "Relatório completo salvo em:"
echo "  $OUTPUT_FILE"
echo "=================================================="

