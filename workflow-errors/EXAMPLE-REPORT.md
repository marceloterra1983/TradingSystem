# 🚨 GitHub Actions - Relatório de Erros

**Gerado em:** 2025-01-08 14:30:52
**Repositório:** marceloterra/TradingSystem
**Total de Falhas Analisadas:** 3

---

## 📊 Resumo Executivo

| Workflow | Branch | Data | Status |
|----------|--------|------|--------|
| Code Quality | main | 2025-01-08T14:25:30Z | ❌ Failed |
| Bundle Size Check | feature/optimize | 2025-01-08T13:15:20Z | ❌ Failed |
| Automated Tests | PR#42 | 2025-01-08T12:05:10Z | ❌ Failed |

---

## 🔍 Detalhes dos Erros

### 🔴 Code Quality

**Run ID:** `1234567890`
**Branch:** `main`
**Commit:** `abc1234`
**Data:** 2025-01-08T14:25:30Z
**URL:** [1234567890](https://github.com/marceloterra/TradingSystem/actions/runs/1234567890)

#### 📋 Logs de Erro:

```
frontend/dashboard/src/components/catalog/AgentsCatalogView.tsx
  45:23  error  'useAgentsData' is not defined  no-undef
  45:23  error  Cannot find name 'useAgentsData'  TS2304

frontend/dashboard/src/hooks/useAgentsDataOptimized.ts
  12:5   error  Unexpected console statement  no-console

✖ 3 problems (3 errors, 0 warnings)
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 1234567890 --log

# Re-executar workflow
gh run rerun 1234567890

# Abrir no browser
gh run view 1234567890 --web
```

#### 💡 Possíveis Soluções:

- Executar linting: `npm run lint -- --fix`
- Verificar TypeScript: `npm run type-check`
- Formatar código: `npm run format`

---

### 🔴 Bundle Size Check

**Run ID:** `1234567891`
**Branch:** `feature/optimize`
**Commit:** `def5678`
**Data:** 2025-01-08T13:15:20Z
**URL:** [1234567891](https://github.com/marceloterra/TradingSystem/actions/runs/1234567891)

#### 📋 Logs de Erro:

```
❌ Bundle size check failed!

agents-catalog: 1262 KB / 50 KB (exceeded by 1212 KB!)
  ⚠️ CRITICAL: This chunk is 25x over budget
  💡 Optimization: Implement lazy loading with metadata-only approach

vendor: 700 KB / 650 KB (exceeded by 50 KB!)
  ⚠️ WARNING: Approaching limit
  💡 Optimization: Review unused dependencies

Total bundle: 2.1 MB / 1 MB (exceeded by 1.1 MB!)

Run 'npm run check:bundle:size' to see details
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 1234567891 --log

# Re-executar workflow
gh run rerun 1234567891

# Abrir no browser
gh run view 1234567891 --web
```

#### 💡 Possíveis Soluções:

- Verificar tamanho: `npm run check:bundle:size`
- Analisar bundle: `npm run analyze:bundle`
- Ver otimizações: `cat BUNDLE-OPTIMIZATION.md`

---

### 🔴 Automated Tests

**Run ID:** `1234567892`
**Branch:** `PR#42`
**Commit:** `ghi9012`
**Data:** 2025-01-08T12:05:10Z
**URL:** [1234567892](https://github.com/marceloterra/TradingSystem/actions/runs/1234567892)

#### 📋 Logs de Erro:

```
FAIL src/components/catalog/AgentsCatalogView.test.tsx
  ● AgentsCatalogView › should render agent list

    expect(received).toHaveLength(expected)

    Expected length: 10
    Received length: 0
    Received array:  []

      at Object.<anonymous> (src/components/catalog/AgentsCatalogView.test.tsx:45:23)

FAIL src/hooks/useAgentsDataOptimized.test.ts
  ● useAgentsDataOptimized › should load metadata

    TypeError: Cannot read properties of undefined (reading 'AI_AGENTS_METADATA')

      at useAgentsDataOptimized (src/hooks/useAgentsDataOptimized.ts:12:5)

Test Suites: 2 failed, 3 passed, 5 total
Tests:       2 failed, 15 passed, 17 total
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 1234567892 --log

# Re-executar workflow
gh run rerun 1234567892

# Abrir no browser
gh run view 1234567892 --web
```

#### 💡 Possíveis Soluções:

- Executar testes: `npm run test -- --verbose`
- Verificar coverage: `npm run test -- --coverage`
- Executar testes específicos: `npm run test -- --testPathPattern=<file>`

---

## 📚 Recursos Úteis

- **Workflows README**: `.github/workflows/README.md`
- **Bundle Optimization**: `frontend/dashboard/BUNDLE-OPTIMIZATION.md`
- **Environment Guide**: `docs/content/tools/security-config/env.mdx`
- **Proxy Best Practices**: `docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md`

## 🛠️ Scripts de Diagnóstico

```bash
# Monitorar workflows em tempo real
bash scripts/github/monitor-workflows.sh 30

# Ver status atual
bash scripts/github/check-workflows.sh status

# Listar apenas falhas
bash scripts/github/check-workflows.sh failures

# Download de artifacts
bash scripts/github/check-workflows.sh download <run-id>
```

## 🔄 Fluxo de Correção Recomendado

1. **Identificar** - Ler este relatório
2. **Reproduzir** - Executar comandos localmente
3. **Corrigir** - Aplicar soluções sugeridas
4. **Validar** - Rodar testes antes de commit
5. **Commit** - Fazer push das correções
6. **Verificar** - Acompanhar novo workflow

---

**Gerado por:** `scripts/github/collect-workflow-errors.sh`
**Próxima coleta:** Execute novamente o script para atualizar
