#!/bin/bash
# Workflow Executor - Helper Script
# Facilita execução dos workflows de auditoria
# Data: 2025-11-02

set -u

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Banner
echo "=================================================="
echo "        Workflow Auditoria - Executor"
echo "=================================================="
echo ""

# Mostrar opções se sem argumentos
if [ $# -eq 0 ]; then
    echo "Usage: $0 <workflow-type> [options]"
    echo ""
    echo "Workflow Types:"
    echo "  simplified   - Quick wins (13-17h, 2-3 dias)"
    echo "  full         - Análise completa (65-72h, 9 dias)"
    echo "  incremental  - Entregas faseadas (80-88h, 6 semanas)"
    echo "  phase1       - Apenas Fase 1 (4-5h, piloto)"
    echo ""
    echo "Options:"
    echo "  --skip-preflight    Skip pre-flight check"
    echo "  --output-dir <dir>  Custom output directory"
    echo ""
    echo "Examples:"
    echo "  $0 simplified"
    echo "  $0 full --output-dir outputs/audit-2025-11-15"
    echo "  $0 phase1"
    echo ""
    exit 0
fi

WORKFLOW_TYPE=$1
shift

# Opções
SKIP_PREFLIGHT=false
OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-preflight)
            SKIP_PREFLIGHT=true
            shift
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Default output dir
if [ -z "$OUTPUT_DIR" ]; then
    case $WORKFLOW_TYPE in
        simplified)
            OUTPUT_DIR="outputs/quick-audit-$(date +%Y-%m-%d)"
            ;;
        full|incremental)
            OUTPUT_DIR="outputs/workflow-auditoria-$(date +%Y-%m-%d)"
            ;;
        phase1)
            OUTPUT_DIR="outputs/phase1-pilot-$(date +%Y-%m-%d)"
            ;;
    esac
fi

echo -e "${BLUE}Workflow Type:${NC} $WORKFLOW_TYPE"
echo -e "${BLUE}Output Directory:${NC} $OUTPUT_DIR"
echo ""

# Pre-flight check (unless skipped)
if [ "$SKIP_PREFLIGHT" = false ]; then
    echo -e "${YELLOW}Running pre-flight check...${NC}"
    if bash scripts/workflow/pre-flight-check.sh; then
        echo -e "${GREEN}✅ Pre-flight check passed${NC}"
        echo ""
    else
        echo -e "${RED}❌ Pre-flight check failed${NC}"
        echo "Fix issues above before proceeding."
        echo "Or run with --skip-preflight to bypass (not recommended)"
        exit 1
    fi
fi

# Criar output directory
echo -e "${BLUE}Creating output directory...${NC}"
mkdir -p "$OUTPUT_DIR"
echo -e "${GREEN}✅ Created: $OUTPUT_DIR${NC}"
echo ""

# Executar workflow baseado no tipo
case $WORKFLOW_TYPE in
    simplified)
        echo -e "${BOLD}${GREEN}Starting Workflow Simplificado (13-17h)${NC}"
        echo ""
        echo "📚 Guide: outputs/WORKFLOW-SIMPLIFICADO-QUICK-WINS.md"
        echo ""
        echo "Fases:"
        echo "  1. Health Check & Baseline (3-4h)"
        echo "  2. Code & Security Sweep (5-6h)"
        echo "  3. Quick Wins Identification (3-4h)"
        echo "  4. Executive Brief (2-3h)"
        echo ""
        echo "Próximo passo:"
        echo "  cat outputs/WORKFLOW-SIMPLIFICADO-QUICK-WINS.md"
        echo ""
        echo "Ou execute cada fase manualmente:"
        echo ""
        echo "# Fase 1 (paralelo)"
        echo "mkdir -p $OUTPUT_DIR/fase-01-health"
        echo "(
  /quality-check --full --format json > $OUTPUT_DIR/fase-01-health/quality.json 2>&1 &
  bash scripts/maintenance/health-check-all.sh --format json > $OUTPUT_DIR/fase-01-health/health.json 2>&1 &
  wait
)"
        ;;
    
    full)
        echo -e "${BOLD}${GREEN}Starting Workflow Full v3.0 (65-72h)${NC}"
        echo ""
        echo "📚 Guide: outputs/workflow-auditoria-v3-optimized.md"
        echo ""
        echo "Fases (sequência otimizada):"
        echo "  1. Inventário e Diagnóstico (4-5h)"
        echo "  2. Auditoria de Dados (7-8h)"
        echo "  3. Análise Arquitetural (8-9h)"
        echo "  4. Revisão de Código (11-12h)"
        echo "  5. Testes e Qualidade (11-12h)"
        echo "  6. Performance (14-15h)"
        echo "  7. Documentação (10-11h)"
        echo "  8. Consolidação (16-17h)"
        echo ""
        echo "⚠️  Este é um workflow longo (9 dias)."
        echo "Consider executar 'simplified' primeiro para validar ROI."
        echo ""
        echo "Próximo passo:"
        echo "  cat outputs/workflow-auditoria-v3-optimized.md"
        ;;
    
    incremental)
        echo -e "${BOLD}${GREEN}Starting Workflow Incremental (80-88h em 6 semanas)${NC}"
        echo ""
        echo "📚 Guide: outputs/workflow-auditoria-v3-optimized.md (seção Incremental)"
        echo ""
        echo "Sprints:"
        echo "  Sprint 1 (Sem 1-2): Fases 1-3 (19-22h)"
        echo "  Sprint 2 (Sem 3-4): Fases 4-5 (22-24h)"
        echo "  Sprint 3 (Sem 5-6): Fases 6-8 (40-44h)"
        echo ""
        echo "Benefício: Entregas parciais, feedback loops"
        echo ""
        echo "Próximo passo:"
        echo "  cat outputs/workflow-auditoria-v3-optimized.md"
        ;;
    
    phase1)
        echo -e "${BOLD}${GREEN}Starting Phase 1 Only (4-5h)${NC}"
        echo ""
        echo "📚 Executando apenas Fase 1 como piloto"
        echo ""
        echo "Criando estrutura..."
        mkdir -p "$OUTPUT_DIR/fase-01-inventario"
        
        echo ""
        echo "Executando comandos..."
        echo ""
        
        # npm audit
        echo -e "${BLUE}[1/4] npm audit...${NC}"
        npm audit --json > "$OUTPUT_DIR/fase-01-inventario/dependencies-audit.json" 2>&1
        VULNS=$(cat "$OUTPUT_DIR/fase-01-inventario/dependencies-audit.json" | jq '.metadata.vulnerabilities.critical + .metadata.vulnerabilities.high')
        echo "  └─ Vulnerabilities (critical+high): $VULNS"
        
        # Git analysis
        echo -e "${BLUE}[2/4] Git analysis...${NC}"
        git log --oneline --since="30 days ago" --pretty=format:"%h|%an|%s" > "$OUTPUT_DIR/fase-01-inventario/git-analysis.csv"
        COMMITS=$(wc -l < "$OUTPUT_DIR/fase-01-inventario/git-analysis.csv")
        echo "  └─ Commits (30 days): $COMMITS"
        
        # Docker status
        echo -e "${BLUE}[3/4] Docker status...${NC}"
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" > "$OUTPUT_DIR/fase-01-inventario/docker-status.txt" 2>&1
        CONTAINERS=$(docker ps -q | wc -l)
        HEALTHY=$(docker ps --filter "health=healthy" -q | wc -l)
        echo "  └─ Containers: $HEALTHY/$CONTAINERS healthy"
        
        # Code stats
        echo -e "${BLUE}[4/4] Code statistics...${NC}"
        CODE_FILES=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | wc -l)
        echo "  └─ Code files: $CODE_FILES"
        
        echo ""
        echo -e "${GREEN}✅ Phase 1 data collected!${NC}"
        echo ""
        echo "Outputs saved to: $OUTPUT_DIR/fase-01-inventario/"
        echo ""
        echo "Next steps:"
        echo "  1. Review outputs manually"
        echo "  2. Use template: templates/workflow/05-phase-consolidation.md"
        echo "  3. Or run: bash scripts/workflow/consolidate-phase.sh 1 $OUTPUT_DIR/fase-01-inventario"
        ;;
    
    *)
        echo -e "${RED}Unknown workflow type: $WORKFLOW_TYPE${NC}"
        echo "Valid types: simplified, full, incremental, phase1"
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "Output directory: $OUTPUT_DIR"
echo "=================================================="

