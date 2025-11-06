# GitHub Actions Debugging - Guia Rápido

Este guia mostra como acessar logs e artefatos de workflows do GitHub Actions localmente.

## 🚀 Setup Inicial (Uma vez)

### Passo 1: Instalar GitHub CLI

```bash
# Instalação automática (recomendado)
bash scripts/setup/install-github-cli.sh

# Ou manual:
# Ubuntu/Debian
sudo apt install gh

# macOS
brew install gh
```

### Passo 2: Autenticar

```bash
gh auth login

# Escolha:
# 1. GitHub.com
# 2. HTTPS
# 3. Login via browser (mais fácil)
```

### Passo 3: Verificar

```bash
gh auth status
# Deve mostrar: ✓ Logged in to github.com
```

## 📋 Comandos Principais

### Ver workflows recentes

```bash
bash scripts/maintenance/check-github-actions.sh list
```

**Output:**
```
📋 Workflows recentes:

STATUS  TITLE                    WORKFLOW           BRANCH  ID        AGE
✓       feat: add search         CI/CD              main    12345678  5m ago
X       fix: tests               Tests              main    12345677  10m ago
```

### Ver apenas workflows que falharam

```bash
bash scripts/maintenance/check-github-actions.sh failed
```

**Output:**
```
❌ Workflows que falharam:

STATUS  TITLE              WORKFLOW  BRANCH  ID        AGE
X       fix: tests         Tests     main    12345677  10m ago
X       chore: lint        CI/CD     main    12345676  20m ago
```

### Baixar logs de um workflow

```bash
# Use o ID da coluna "ID"
bash scripts/maintenance/check-github-actions.sh logs 12345677
```

**Output:**
```
📥 Baixando logs do workflow 12345677...
✅ Logs salvos em: outputs/github-actions/12345677/full.log

Para visualizar:
  less outputs/github-actions/12345677/full.log
  # ou
  code outputs/github-actions/12345677/full.log
```

### Ver detalhes de um workflow

```bash
bash scripts/maintenance/check-github-actions.sh view 12345677
```

**Output:**
```
🔍 Detalhes do workflow 12345677:

✗ feat: fix tests · 12345677
Triggered via push 10 minutes ago

JOBS
✗ test (5m 23s)
  ✓ Set up job
  ✓ Run actions/checkout@v4
  ✓ Set up Node
  ✗ Run tests
    → Error: Test failed
  - Complete job

For more information about a job, try: gh run view --job=<job-id>
View this run on GitHub: https://github.com/marceloterra1983/TradingSystem/actions/runs/12345677
```

### Baixar artefatos (test results, coverage)

```bash
bash scripts/maintenance/check-github-actions.sh download 12345677
```

**Output:**
```
📥 Baixando artefatos do workflow 12345677...
✅ Artefatos salvos em: outputs/github-actions/12345677/artifacts/

total 128K
drwxr-xr-x 2 user user 4.0K Nov  6 12:00 test-results
drwxr-xr-x 2 user user 4.0K Nov  6 12:00 coverage
-rw-r--r-- 1 user user  120K Nov  6 12:00 logs.zip
```

### Monitorar workflow em tempo real

```bash
bash scripts/maintenance/check-github-actions.sh watch
```

## 🔍 Workflow de Debugging

### 1. Identificar falha

```bash
bash scripts/maintenance/check-github-actions.sh failed
```

Pegue o **RUN ID** do workflow que falhou.

### 2. Baixar logs

```bash
bash scripts/maintenance/check-github-actions.sh logs <RUN_ID>
```

### 3. Analisar logs

```bash
# Abrir no editor
code outputs/github-actions/<RUN_ID>/full.log

# Ou procurar por erros
grep -i "error\|failed" outputs/github-actions/<RUN_ID>/full.log

# Com contexto (10 linhas antes e depois)
grep -i -C 10 "error" outputs/github-actions/<RUN_ID>/full.log
```

### 4. Baixar artefatos (se houver)

```bash
bash scripts/maintenance/check-github-actions.sh download <RUN_ID>

# Ver coverage HTML
open outputs/github-actions/<RUN_ID>/artifacts/coverage/index.html

# Ver test results
cat outputs/github-actions/<RUN_ID>/artifacts/test-results/results.json | jq
```

### 5. Reproduzir localmente

```bash
# Se foi erro de teste
npm run test

# Se foi erro de lint
npm run lint

# Se foi erro de build
npm run build

# Simular ambiente do CI
NODE_ENV=test TZ=UTC npm run test
```

### 6. Corrigir e re-testar

```bash
# Fazer correções
# ...

# Testar localmente
npm run test
npm run lint
npm run build

# Commitar
git add .
git commit -m "fix: resolve CI failures"

# Push
git push
```

### 7. Monitorar novo workflow

```bash
bash scripts/maintenance/check-github-actions.sh watch
```

## 🐛 Cenários Comuns

### Teste falhando apenas no CI

**Causa:** Diferenças de ambiente (timezone, locale, NODE_ENV)

**Solução:**
```bash
# Simular ambiente do CI
NODE_ENV=test TZ=UTC npm run test
```

### Erro de timeout

**Logs mostram:**
```
Error: Test timed out after 5000ms
```

**Solução:**
```typescript
it('should load data', async () => {
  // ...
}, { timeout: 10000 }); // 10 segundos
```

### Erro de snapshot

**Logs mostram:**
```
Snapshot mismatch
```

**Solução:**
```bash
# Atualizar snapshots
npm run test -- -u

# Commitar
git add src/**/__snapshots__
git commit -m "test: update snapshots"
```

### Erro de lint

**Solução:**
```bash
npm run lint:fix
git add .
git commit -m "chore: fix lint errors"
```

## 🎯 Comandos Úteis

### Re-executar workflow que falhou

```bash
# Via gh CLI direto
gh run rerun <RUN_ID> --repo marceloterra1983/TradingSystem

# Re-executar apenas jobs que falharam
gh run rerun <RUN_ID> --failed --repo marceloterra1983/TradingSystem
```

### Ver workflows de uma branch específica

```bash
gh run list --repo marceloterra1983/TradingSystem --branch feat/my-feature
```

### Ver workflows de um workflow específico

```bash
gh run list --repo marceloterra1983/TradingSystem --workflow "CI/CD"
```

### Cancelar workflow em execução

```bash
gh run cancel <RUN_ID> --repo marceloterra1983/TradingSystem
```

## 📚 Ajuda

### Script helper

```bash
bash scripts/maintenance/check-github-actions.sh --help
```

### GitHub CLI

```bash
gh run --help
gh run list --help
gh run view --help
gh run download --help
```

## 🔗 Links Úteis

- **GitHub Actions**: https://github.com/marceloterra1983/TradingSystem/actions
- **GitHub CLI Docs**: https://cli.github.com/manual/gh_run
- **Documentação completa**: `docs/content/tools/development/github-actions-debugging.mdx`

---

**Última atualização:** 2025-11-06

