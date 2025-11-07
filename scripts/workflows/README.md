# Workflow Scripts

Este diretório contém scripts de workflow genéricos e reutilizáveis para documentar e executar processos no TradingSystem.

## 📋 Scripts Disponíveis

### 1. `workflow-template.sh` - Template Genérico

**Script principal e reutilizável** para qualquer tipo de workflow no projeto.

#### Uso Básico

```bash
# Sintaxe
bash scripts/workflows/workflow-template.sh [workflow-name] [workflow-type]

# Exemplos
bash scripts/workflows/workflow-template.sh "fix-search-bug" "bugfix"
bash scripts/workflows/workflow-template.sh "add-telegram-bot" "feature"
bash scripts/workflows/workflow-template.sh "deploy-production" "deployment"
bash scripts/workflows/workflow-template.sh "performance-test" "testing"
bash scripts/workflows/workflow-template.sh "code-review" "analysis"
```

#### Tipos de Workflow Suportados

| Tipo | Descrição | Exemplo de Uso |
|------|-----------|----------------|
| `bugfix` | Correção de bugs | Documentar fixes aplicados, código alterado, testes |
| `feature` | Nova funcionalidade | Implementação de features, APIs, componentes |
| `deployment` | Deploy de serviços | Validação pré-deploy, health checks, rollback |
| `testing` | Testes e validação | Execução de testes, relatórios de cobertura |
| `analysis` | Análise de código | Code review, refactoring, performance analysis |
| `general` | Workflow genérico | Qualquer outro tipo de workflow |

#### Saída Gerada

Cada execução cria um diretório em `outputs/workflow-{name}-{date}/`:

```
outputs/workflow-fix-search-bug-2025-11-02/
├── WORKFLOW-REPORT.md    # Relatório completo do workflow
└── INDEX.md              # Índice de navegação rápida
```

---

## 🎯 Seções do Workflow

O template possui **8 seções modulares** que podem ser ativadas/desativadas:

### 1. Environment Check ✅
- **Quando usar**: Sempre (recomendado)
- **O que verifica**:
  - Data/hora, usuário, hostname, OS
  - Git branch atual
  - Versões: Node.js, Docker, npm
- **Configuração**: `ENABLED_SECTIONS["ENVIRONMENT_CHECK"]=true`

### 2. Service Health Check ✅
- **Quando usar**: Workflows que dependem de serviços rodando
- **O que verifica**:
  - Dashboard (3103)
  - Documentation Hub (3400)
  - APIs (3401, 4005, etc.)
- **Configuração**:
  ```bash
  SERVICES=(
      "dashboard:3103"
      "docs-hub:3400"
      "documentation-api:3401"
  )
  ```

### 3. Database Check ✅
- **Quando usar**: Workflows que acessam banco de dados
- **O que verifica**:
  - Conexões TimescaleDB, QuestDB, Redis
  - Status dos containers de banco
- **Configuração**: Customizar função `check_databases()`

### 4. API Validation ✅
- **Quando usar**: Workflows que validam APIs
- **O que verifica**:
  - HTTP status codes (200, 500, etc.)
  - Response times
  - Endpoints críticos
- **Configuração**:
  ```bash
  declare -A API_ENDPOINTS=(
      ["Documentation API"]="http://localhost:3401/api/health"
  )
  ```

### 5. Code Changes Summary ✅
- **Quando usar**: Workflows que modificam código
- **O que documenta**:
  - Arquivos modificados com contagem de linhas
  - Diff do Git
  - Arquivos criados/deletados
- **Configuração**:
  ```bash
  CODE_FILES=(
      "frontend/dashboard/src/components/pages/DocsHybridSearchPage.tsx"
      "tools/compose/docker-compose.rag.yml"
  )
  ```

### 6. Testing ✅
- **Quando usar**: Workflows que executam testes
- **O que executa**:
  - Unit tests (`npm run test`)
  - Integration tests
  - E2E tests
  - Coverage reports
- **Configuração**: Customizar função `run_tests()`

### 7. Performance Metrics ✅
- **Quando usar**: Workflows que medem performance
- **O que coleta**:
  - Docker container stats (CPU, RAM)
  - Disk usage
  - Response times
  - Bundle sizes
- **Configuração**: Customizar função `collect_performance_metrics()`

### 8. Documentation Generation ✅
- **Quando usar**: Sempre (recomendado)
- **O que gera**:
  - Lista de arquivos modificados
  - Links para documentação relacionada
  - Sumário do workflow
- **Configuração**: Automático via Git

---

## 🔧 Customização

### Exemplo: Workflow de Bugfix

```bash
#!/bin/bash
# custom-bugfix-workflow.sh

# Importar template
source scripts/workflows/workflow-template.sh

# Configuração específica
WORKFLOW_NAME="fix-search-results-disappearing"
WORKFLOW_TYPE="bugfix"

# Habilitar apenas seções relevantes
ENABLED_SECTIONS=(
    ["ENVIRONMENT_CHECK"]=true
    ["SERVICE_HEALTH"]=true
    ["API_VALIDATION"]=true
    ["CODE_CHANGES"]=true
    ["TESTING"]=true
    ["PERFORMANCE_METRICS"]=false  # Não necessário para bugfix
    ["DATABASE_CHECK"]=false
    ["DOCUMENTATION"]=true
)

# Arquivos modificados no bugfix
CODE_FILES=(
    "frontend/dashboard/src/components/pages/DocsHybridSearchPage.tsx"
    "tools/compose/docker-compose.rag.yml"
    "BUGFIX-SUMMARY.md"
)

# APIs críticas para validar
declare -A API_ENDPOINTS=(
    ["RAG Service"]="http://localhost:8201/health"
    ["Documentation API"]="http://localhost:3401/api/health"
)

# Executar workflow
main
```

### Exemplo: Workflow de Deploy

```bash
#!/bin/bash
# custom-deployment-workflow.sh

source scripts/workflows/workflow-template.sh

WORKFLOW_NAME="deploy-tp-capital-production"
WORKFLOW_TYPE="deployment"

ENABLED_SECTIONS=(
    ["ENVIRONMENT_CHECK"]=true
    ["SERVICE_HEALTH"]=true
    ["DATABASE_CHECK"]=true
    ["API_VALIDATION"]=true
    ["CODE_CHANGES"]=false
    ["TESTING"]=true
    ["PERFORMANCE_METRICS"]=true
    ["DOCUMENTATION"]=true
)

SERVICES=(
    "tp-capital:4005"
    "telegram-gateway:3201"
    "workspace:3200"
)

# Executar pre-deploy checks
main
```

### Exemplo: Workflow de Feature

```bash
#!/bin/bash
# custom-feature-workflow.sh

source scripts/workflows/workflow-template.sh

WORKFLOW_NAME="implement-telegram-bot"
WORKFLOW_TYPE="feature"

ENABLED_SECTIONS=(
    ["ENVIRONMENT_CHECK"]=true
    ["SERVICE_HEALTH"]=true
    ["CODE_CHANGES"]=true
    ["TESTING"]=true
    ["DOCUMENTATION"]=true
    ["API_VALIDATION"]=false
    ["DATABASE_CHECK"]=false
    ["PERFORMANCE_METRICS"]=false
)

CODE_FILES=(
    "apps/tp-capital/src/telegramBot.js"
    "apps/tp-capital/src/messageHandler.js"
    "docs/content/apps/tp-capital/features/telegram-bot.mdx"
)

main
```

---

## 📝 Estrutura do Relatório Gerado

```markdown
# Workflow Report: {workflow-name}

**Type**: {workflow-type}
**Date**: 2025-11-02 14:30:00
**Generated By**: workflow-template.sh

---

## Environment Information
- Date, OS, Git branch, Node.js version...

## Service Health Status
| Service | Port | Status |
|---------|------|--------|
| dashboard | 3103 | ✅ Running |

## API Validation
| API | Endpoint | Status | Response Time |
|-----|----------|--------|---------------|
| RAG Service | http://localhost:8201/health | ✅ 200 | 45ms |

## Code Changes
### frontend/dashboard/src/components/pages/DocsHybridSearchPage.tsx
- Total lines: 1079

## Test Results
✅ All tests passed (23/23)

## Performance Metrics
### Container Resource Usage
- rag-service: CPU 2.5%, RAM 256MB

## Documentation
- Files modified: 3
- Related docs: [link]

---

**Workflow Completed**: 2025-11-02 14:35:00
**Total Duration**: 45 seconds
```

---

## 🚀 Casos de Uso Comuns

### 1. Documentar Correção de Bug

```bash
# Antes de começar
bash scripts/workflows/workflow-template.sh "fix-issue-123" "bugfix"

# Trabalhar no fix...
# Modificar arquivos...
# Testar...

# Depois de concluir
bash scripts/workflows/workflow-template.sh "fix-issue-123-complete" "bugfix"
```

### 2. Validação Pré-Deploy

```bash
# Antes de deploy em produção
bash scripts/workflows/workflow-template.sh "pre-deploy-check" "deployment"

# Verificar relatório
cat outputs/workflow-pre-deploy-check-*/WORKFLOW-REPORT.md

# Se tudo OK, fazer deploy
docker compose up -d
```

### 3. Code Review Automatizado

```bash
# Executar análise antes de PR
bash scripts/workflows/workflow-template.sh "pr-review-456" "analysis"

# Anexar relatório ao PR
gh pr create --body-file outputs/workflow-pr-review-456-*/WORKFLOW-REPORT.md
```

### 4. Testes de Performance

```bash
# Executar antes de mudanças
bash scripts/workflows/workflow-template.sh "perf-baseline" "testing"

# Fazer mudanças...

# Executar depois
bash scripts/workflows/workflow-template.sh "perf-after-optimization" "testing"

# Comparar métricas
diff outputs/workflow-perf-baseline-*/WORKFLOW-REPORT.md \
     outputs/workflow-perf-after-optimization-*/WORKFLOW-REPORT.md
```

---

## 🔍 Debug e Troubleshooting

### Script não executa

```bash
# Verificar permissões
chmod +x scripts/workflows/workflow-template.sh

# Verificar diretório
pwd  # Deve estar em /home/marce/Projetos/TradingSystem

# Executar com bash explícito
bash scripts/workflows/workflow-template.sh "test" "general"
```

### Seção não aparece no relatório

```bash
# Verificar configuração
grep "ENABLED_SECTIONS" scripts/workflows/workflow-template.sh

# Ativar seção manualmente
ENABLED_SECTIONS["CODE_CHANGES"]=true
```

### APIs retornam erro

```bash
# Verificar serviços rodando
bash scripts/maintenance/health-check-all.sh

# Testar endpoints manualmente
curl http://localhost:3500/api/status
curl http://localhost:3401/api/health
```

---

## 📚 Referências

- [CLAUDE.md](../../CLAUDE.md) - Instruções do projeto
- [Health Check Script](../maintenance/health-check-all.sh) - Verificação de serviços
- [Docker Compose](../../tools/compose/) - Configuração de containers
- [Documentation Hub](http://localhost:3400) - Portal de documentação

---

## 🤝 Contribuindo

Para adicionar novas seções ao template:

1. Criar função no formato `section_name()`
2. Adicionar entrada em `ENABLED_SECTIONS`
3. Chamar função em `main()`
4. Documentar neste README

**Exemplo:**

```bash
# Nova seção: Security Audit
security_audit() {
    if [[ "${ENABLED_SECTIONS[SECURITY_AUDIT]}" != "true" ]]; then
        return 0
    fi

    log_info "Running security audit..."

    append_report "## Security Audit"
    append_report ""

    # npm audit, snyk, etc.
    npm audit --json >> "${REPORT_FILE}"

    append_report ""
    log_success "Security audit complete"
}
```

---

**Última Atualização**: 2025-11-02
**Versão**: 1.0.0
**Autor**: TradingSystem Team
