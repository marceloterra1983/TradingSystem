# ⚡ Workflows - Quick Reference

**Última atualização:** 2025-11-08

---

## 🎯 Workflows Ativos (13)

### Por Categoria

**Core CI/CD:**
- `ci-core.yml` - ⭐ **PRINCIPAL** - Lint + Type-check + Security config
- `test.yml` - Testes automatizados (Jest, Vitest)
- `build-optimized.yml` - Build com cache multi-layer
- `docker-build.yml` - Container build + Trivy scan
- `security-audit.yml` - NPM audit + Python Safety + TruffleHog
- `docs-validation.yml` - Docusaurus + frontmatter + PlantUML
- `env-validation.yml` - 🛡️ **CRÍTICO** - Validação .env + proxy
- `health-check.yml` - Infrastructure health checks

**Bundle:**
- `bundle-size-check.yml` - Check rápido em PRs
- `bundle-monitoring.yml` - Análise semanal detalhada

**Error Reporting:**
- `always-generate-error-report.yml` - ⭐ Sistema principal + commit
- `pr-error-report.yml` - Relatórios detalhados em PRs

**Auxiliar:**
- `summary.yml` - AI summary de issues

---

## 🚀 Comandos Rápidos

### Ver Status
```bash
# Listar últimas execuções
gh run list --limit 20

# Ver apenas falhas
gh run list --status failure --limit 10

# Ver workflow específico
gh run list --workflow="CI Core Checks" --limit 10
```

### Re-executar
```bash
# Re-run workflow
gh run rerun <run-id>

# Re-run apenas jobs que falharam
gh run rerun <run-id> --failed
```

### Ver Logs
```bash
# Ver logs completos
gh run view <run-id> --log

# Download artifacts
gh run download <run-id>
```

### Gerenciar Workflows
```bash
# Listar workflows ativos
ls -1 .github/workflows/*.yml | wc -l
# Output: 13

# Listar workflows desabilitados
ls -1 .github/workflows/.disabled/*.disabled | wc -l
# Output: 4

# Reativar workflow
mv .github/workflows/.disabled/NOME.yml.disabled .github/workflows/NOME.yml
```

---

## 🔧 Troubleshooting

### Workflow não executa
```bash
# 1. Verificar sintaxe YAML
yamllint .github/workflows/nome-do-workflow.yml

# 2. Ver triggers configurados
grep -A 5 "^on:" .github/workflows/nome-do-workflow.yml

# 3. Verificar permissões
grep -A 5 "^permissions:" .github/workflows/nome-do-workflow.yml
```

### Workflow falha
```bash
# 1. Ver logs do workflow
gh run list --workflow="Nome do Workflow" --limit 5
gh run view <run-id> --log

# 2. Ver relatório de erros (se disponível)
cat workflow-errors/LATEST.md

# 3. Re-executar localmente (se possível)
npm run lint  # Para code-quality
npm run test  # Para tests
npm run build # Para build
```

### Workflow demora muito
```bash
# Ver tempo de execução
gh run view <run-id> --json timing | jq '.timing.started_at, .timing.completed_at'

# Ver jobs paralelos
gh run view <run-id> --json jobs | jq '.jobs[] | {name, status, conclusion}'
```

---

## 📖 Documentação Detalhada

- **[README.md](README.md)** - Visão geral completa
- **[WORKFLOW-SUMMARY.md](WORKFLOW-SUMMARY.md)** - Resumo organizado
- **[WORKFLOW-REVIEW-FINAL.md](WORKFLOW-REVIEW-FINAL.md)** - Revisão detalhada
- **[OPTIMIZATION-COMPLETE.md](OPTIMIZATION-COMPLETE.md)** - Status final
- **[ERROR-REPORT-CONFIG.md](ERROR-REPORT-CONFIG.md)** - Sistema de relatórios

---

## ⚠️ Workflows Críticos (Não Desabilitar)

| Workflow | Motivo |
|----------|--------|
| `ci-core.yml` | Workflow PRINCIPAL - Qualidade de código |
| `env-validation.yml` | Previne "API Indisponível" e outros bugs críticos |
| `test.yml` | Testes automatizados essenciais |
| `always-generate-error-report.yml` | Sistema de error tracking |

---

## 🔄 Fluxo Típico (Pull Request)

```
PR Opened
    ↓
Parallel Execution (6 workflows)
    ├── ci-core.yml (lint + type-check)
    ├── test.yml (tests)
    ├── build-optimized.yml (build)
    ├── docs-validation.yml (docs)
    ├── env-validation.yml (env)
    └── bundle-size-check.yml (bundle)
    ↓
All Pass? → Merge Ready
    ↓
Any Fail? → pr-error-report.yml
    ↓
Post comment with detailed report
```

**Tempo total:** ~6-10 min (parallel)

---

## 📊 Estatísticas

- **Workflows ativos:** 13
- **Workflows desabilitados:** 4 (backup)
- **Redundâncias:** 0
- **CI/CD minutes/mês:** ~720 (-40% vs antes)
- **Tempo médio PR:** ~6-10 min

---

## 💡 Dicas

### Otimizar Cache
```yaml
# Usar cache do GitHub Actions
- uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### Evitar Execuções Paralelas
```yaml
# Adicionar concurrency
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Path Filters
```yaml
# Executar apenas quando certos arquivos mudam
on:
  push:
    paths:
      - 'frontend/**'
      - 'package.json'
```

---

**Última atualização:** 2025-11-08
