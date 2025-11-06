---
title: Code Quality Checklist
sidebar_position: 5
description: Comandos e ferramentas para verificação de qualidade, limpeza e eficiência do código
tags: [development, quality, linting, testing]
domain: development
type: guide
summary: Comandos e ferramentas para verificação de qualidade, limpeza e eficiência do código
status: active
owner: ToolingGuild
lastReviewed: "2025-11-02"
last_review: "2025-11-02"
---

# Code Quality Checklist

Guia completo de comandos para verificar qualidade, limpeza e eficiência do código no TradingSystem.

---

## 🎯 Quick Start - Verificação Completa

### Script All-in-One (Recomendado)

```bash
# Executar verificação completa de qualidade
bash scripts/maintenance/code-quality-check.sh

# Ou com auto-fix
bash scripts/maintenance/code-quality-check.sh --fix
```

### Verificação Manual Rápida

```bash
# Frontend (Dashboard)
cd frontend/dashboard
npm run lint              # Linting
npm run type-check        # TypeScript
npm test                  # Testes
npm run build             # Build test

# Backend (APIs)
cd backend/api/workspace
npm run lint
npm test
```

---

## 📋 Verificação por Categoria

### 1. Linting (Qualidade de Código)

#### Frontend (React/TypeScript)

```bash
cd frontend/dashboard

# ESLint - Detectar problemas
npm run lint

# ESLint - Auto-fix (corrige automaticamente)
npm run lint:fix

# Verificar arquivo específico
npx eslint src/components/pages/DocsHybridSearchPage.tsx

# Mostrar regras violadas
npx eslint src/ --format stylish

# Gerar relatório JSON
npx eslint src/ --format json --output-file eslint-report.json
```

#### Backend (Node.js/Express)

```bash
cd backend/api/workspace  # ou qualquer API

# ESLint
npm run lint

# Auto-fix
npm run lint:fix

# Verificar arquivo específico
npx eslint src/routes/workspace.js
```

**Regras Importantes**:
- `no-console` - Evitar console.log em produção
- `no-unused-vars` - Variáveis não utilizadas
- `eqeqeq` - Usar `===` ao invés de `==`
- `no-var` - Usar `const`/`let` ao invés de `var`

---

### 2. TypeScript Type Checking

```bash
cd frontend/dashboard

# Verificação de tipos (sem emitir arquivos)
npx tsc --noEmit

# Verificação com detalhes
npx tsc --noEmit --pretty

# Verificar arquivo específico
npx tsc --noEmit src/components/pages/DocsHybridSearchPage.tsx

# Gerar relatório de erros
npx tsc --noEmit 2>&1 | tee typescript-errors.log
```

**Erros Comuns**:
- `TS2345` - Tipo de argumento incorreto
- `TS2322` - Tipo incompatível na atribuição
- `TS2339` - Propriedade não existe no tipo
- `TS7006` - Parâmetro implicitamente `any`

---

### 3. Formatação de Código

#### Prettier (JavaScript/TypeScript)

```bash
cd frontend/dashboard

# Verificar formatação (sem modificar)
npx prettier --check src/

# Formatar todos os arquivos
npx prettier --write src/

# Formatar arquivo específico
npx prettier --write src/components/pages/DocsHybridSearchPage.tsx

# Verificar apenas arquivos modificados (Git)
npx prettier --check $(git diff --name-only --diff-filter=ACMR "*.ts" "*.tsx" "*.js" "*.jsx")
```

#### EditorConfig

```bash
# Verificar se .editorconfig existe
cat .editorconfig

# Aplicar configurações (via plugin IDE)
# VSCode: instalar extensão "EditorConfig for VS Code"
```

---

### 4. Testes

#### Unit Tests (Vitest)

```bash
cd frontend/dashboard

# Executar todos os testes
npm test

# Executar com coverage
npm run test:coverage

# Executar testes específicos
npm test DocsHybridSearchPage

# Watch mode (re-executar ao salvar)
npm test -- --watch

# Apenas testes que falharam
npm test -- --only-failed

# Ver relatório de coverage
npm run test:coverage
open coverage/index.html  # ou xdg-open no Linux
```

**Métricas de Coverage**:
- **Statements**: % de linhas executadas
- **Branches**: % de condições (if/else) testadas
- **Functions**: % de funções chamadas
- **Lines**: % de linhas cobertas

**Target**: 80% de cobertura em componentes críticos

#### Integration Tests

```bash
# Backend API tests
cd backend/api/workspace
npm test

# E2E tests (quando disponível)
cd frontend/dashboard
npm run test:e2e
```

---

### 5. Bundle Analysis (Eficiência)

#### Vite Bundle Analyzer

```bash
cd frontend/dashboard

# Build com análise de bundle
npm run build

# Gerar relatório interativo
npx vite-bundle-visualizer

# Ver tamanho dos chunks
ls -lh dist/assets/

# Análise detalhada
npx vite-bundle-visualizer --open
```

**Targets**:
- Bundle total: < 500KB (gzipped)
- Chunk inicial: < 200KB
- Lazy chunks: < 100KB cada

#### Webpack Bundle Analyzer (se usar Webpack)

```bash
# Instalar (dev dependency)
npm install --save-dev webpack-bundle-analyzer

# Gerar relatório
npx webpack-bundle-analyzer dist/stats.json
```

---

### 6. Performance Analysis

#### Lighthouse (Frontend)

```bash
# Instalar Lighthouse CLI
npm install -g lighthouse

# Executar análise (com servidor rodando)
lighthouse http://localhost:3103 --view

# Análise específica (apenas performance)
lighthouse http://localhost:3103 --only-categories=performance --view

# Gerar relatório JSON
lighthouse http://localhost:3103 --output json --output-path lighthouse-report.json

# Análise em headless mode
lighthouse http://localhost:3103 --chrome-flags="--headless" --view
```

**Métricas Importantes**:
- **FCP** (First Contentful Paint): < 1.8s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TBT** (Total Blocking Time): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1

#### Load Testing (Backend)

```bash
# Instalar autocannon (load testing)
npm install -g autocannon

# Teste de carga básico
autocannon http://localhost:3500/api/status

# Teste com 100 conexões por 30 segundos
autocannon -c 100 -d 30 http://localhost:3500/api/status

# Teste de POST
autocannon -m POST -H "Content-Type: application/json" -b '{"test": true}' http://localhost:3200/api/items
```

---

### 7. Security Audit

#### npm audit (Vulnerabilidades)

```bash
cd frontend/dashboard

# Verificar vulnerabilidades
npm audit

# Ver detalhes
npm audit --audit-level=moderate

# Auto-fix (cuidado: pode quebrar dependências)
npm audit fix

# Apenas reportar, não corrigir
npm audit --dry-run

# Gerar relatório JSON
npm audit --json > audit-report.json
```

**Níveis de Severidade**:
- `critical` - Corrigir imediatamente
- `high` - Corrigir em 7 dias
- `moderate` - Revisar e planejar correção
- `low` - Monitorar

#### Snyk (Alternativa mais robusta)

```bash
# Instalar Snyk CLI
npm install -g snyk

# Autenticar
snyk auth

# Testar projeto
cd frontend/dashboard
snyk test

# Monitorar continuamente
snyk monitor

# Gerar relatório HTML
snyk test --json | snyk-to-html -o snyk-report.html
```

---

### 8. Code Duplication (DRY)

#### jscpd (JavaScript Copy/Paste Detector)

```bash
# Instalar
npm install -g jscpd

# Executar análise
cd frontend/dashboard
jscpd src/

# Com threshold customizado (falhar se duplicação > 5%)
jscpd src/ --threshold 5

# Gerar relatório HTML
jscpd src/ --format html --output ./jscpd-report

# Ignorar arquivos de teste
jscpd src/ --ignore "**/*.spec.ts,**/*.test.ts"
```

---

### 9. Complexity Analysis (Complexidade Ciclomática)

#### ESLint Complexity Rules

```bash
cd frontend/dashboard

# Verificar complexidade com limite 10
npx eslint src/ --rule 'complexity: [error, 10]'

# Verificar profundidade de nested blocks
npx eslint src/ --rule 'max-depth: [error, 4]'

# Verificar tamanho de funções (max 50 linhas)
npx eslint src/ --rule 'max-lines-per-function: [error, 50]'
```

#### plato (Análise de complexidade)

```bash
# Instalar
npm install -g plato

# Gerar relatório
plato -r -d complexity-report src/

# Abrir relatório
open complexity-report/index.html
```

---

### 10. Dead Code Detection

#### ts-prune (TypeScript)

```bash
cd frontend/dashboard

# Instalar
npm install --save-dev ts-prune

# Detectar exports não utilizados
npx ts-prune

# Excluir arquivos de teste
npx ts-prune --ignore "*.spec.ts|*.test.ts"

# Gerar relatório
npx ts-prune > unused-exports.log
```

#### depcheck (Dependências não utilizadas)

```bash
cd frontend/dashboard

# Instalar
npm install -g depcheck

# Verificar dependências não utilizadas
depcheck

# Com detalhes
depcheck --json

# Ignorar dependências específicas
depcheck --ignores="@types/*,vitest"
```

---

### 11. Git Hooks (Pre-commit Quality Gates)

#### Husky + lint-staged

```bash
cd frontend/dashboard

# Instalar
npm install --save-dev husky lint-staged

# Inicializar husky
npx husky init

# Adicionar pre-commit hook
echo "npx lint-staged" > .husky/pre-commit

# Configurar lint-staged (package.json)
# {
#   "lint-staged": {
#     "*.{ts,tsx}": [
#       "eslint --fix",
#       "prettier --write",
#       "vitest related --run"
#     ]
#   }
# }
```

---

### 12. Docker Container Health

```bash
# Verificar logs de containers
docker logs rag-service --tail 100

# Verificar métricas de recursos
docker stats --no-stream

# Inspecionar container
docker inspect rag-service | jq '.[0].State'

# Verificar saúde (health check)
docker inspect rag-service | jq '.[0].State.Health'

# Listar containers com problemas
docker ps -a --filter "status=exited"
```

---

## 🚀 Workflow Completo de Verificação

### Pre-Commit (Antes de Commitar)

```bash
# 1. Linting
npm run lint:fix

# 2. Formatação
npx prettier --write src/

# 3. Type check
npx tsc --noEmit

# 4. Testes
npm test

# 5. Build test
npm run build
```

### Pre-Deploy (Antes de Deploy)

```bash
# 1. Qualidade de código
npm run lint
npm run type-check

# 2. Testes com coverage
npm run test:coverage

# 3. Security audit
npm audit
snyk test

# 4. Bundle analysis
npm run build
npx vite-bundle-visualizer

# 5. Performance check
lighthouse http://localhost:3103 --view

# 6. Verificar dependências não utilizadas
depcheck

# 7. Verificar duplicação de código
jscpd src/
```

### Post-Deploy (Após Deploy)

```bash
# 1. Health checks
bash scripts/maintenance/health-check-all.sh

# 2. API validation
curl http://localhost:3500/api/status | jq
curl http://localhost:3401/api/health | jq

# 3. Load testing
autocannon -c 50 -d 10 http://localhost:3500/api/status

# 4. Verificar logs
docker logs rag-service --tail 50 | grep -i error
docker logs workspace --tail 50 | grep -i error
```

---

## 📊 Relatórios Automatizados

### Script de Qualidade Completo

Criar `scripts/maintenance/code-quality-check.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Starting Code Quality Check..."

# Frontend
cd frontend/dashboard
echo "📦 Frontend Analysis..."

# Linting
echo "  ✓ ESLint..."
npm run lint --silent || echo "  ⚠️  Linting issues found"

# Type check
echo "  ✓ TypeScript..."
npx tsc --noEmit || echo "  ⚠️  Type errors found"

# Tests
echo "  ✓ Tests..."
npm test --silent || echo "  ⚠️  Test failures"

# Security
echo "  ✓ Security audit..."
npm audit --audit-level=high || echo "  ⚠️  Vulnerabilities found"

# Dead code
echo "  ✓ Unused exports..."
npx ts-prune | grep -v "used in module" || echo "  ✓ No unused exports"

# Duplication
echo "  ✓ Code duplication..."
jscpd src/ --threshold 10 || echo "  ⚠️  High code duplication"

echo "✅ Code Quality Check Complete!"
```

### CI/CD Integration

```yaml
# .github/workflows/code-quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd frontend/dashboard
          npm ci

      - name: Lint
        run: |
          cd frontend/dashboard
          npm run lint

      - name: Type Check
        run: |
          cd frontend/dashboard
          npx tsc --noEmit

      - name: Tests
        run: |
          cd frontend/dashboard
          npm run test:coverage

      - name: Security Audit
        run: |
          cd frontend/dashboard
          npm audit --audit-level=high

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/dashboard/coverage/coverage-final.json
```

---

## 🎯 Métricas de Qualidade Recomendadas

### Frontend (Dashboard)

| Métrica | Target | Crítico |
|---------|--------|---------|
| **ESLint Errors** | 0 | 0 |
| **TypeScript Errors** | 0 | 0 |
| **Test Coverage** | ≥ 80% | ≥ 60% |
| **Bundle Size** | < 500KB | < 800KB |
| **Lighthouse Score** | ≥ 90 | ≥ 70 |
| **Security Issues (High/Critical)** | 0 | 0 |
| **Code Duplication** | < 5% | < 10% |
| **Cyclomatic Complexity** | < 10 | < 20 |

### Backend (APIs)

| Métrica | Target | Crítico |
|---------|--------|---------|
| **ESLint Errors** | 0 | 0 |
| **Test Coverage** | ≥ 70% | ≥ 50% |
| **Response Time (p95)** | < 200ms | < 500ms |
| **Security Issues** | 0 | 0 |
| **Memory Leaks** | None | None |

---

## 🔧 Ferramentas Recomendadas (IDE)

### VSCode Extensions

```bash
# Instalar via CLI
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension orta.vscode-jest
code --install-extension streetsidesoftware.code-spell-checker
code --install-extension sonarsource.sonarlint-vscode
```

### VSCode Settings (.vscode/settings.json)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 📚 Referências

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Testing Strategy](../reference/testing-strategy.mdx) - Project testing guidelines

---

**Última Atualização**: 2025-11-02
**Versão**: 1.0.0
