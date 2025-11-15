---
title: "Claude Commands Overview"
slug: /tools/ai/claude-commands-ready
sidebar_position: 2
description: "Summary of the custom Claude CLI commands available for TradingSystem."
tags:
  - ai
  - claude
  - automation
owner: ArchitectureGuild
lastReviewed: '2025-11-02'
---
# Comandos Claude Code - Prontos para Uso! 🚀

**Data**: 2025-11-02
**Status**: ✅ Completo

---

## 📦 Comandos Criados

Criei **7 comandos customizados** do Claude Code para verificação de qualidade de código:

```
.claude/commands/
├── README.md              # 📚 Índice completo de todos os comandos
├── quality-check.md       # ⭐ Verificação completa (PRINCIPAL)
├── lint.md                # 🔍 ESLint
├── type-check.md          # 📘 TypeScript
├── test.md                # 🧪 Testes
├── format.md              # ✨ Prettier
├── audit.md               # 🔒 Security
└── build.md               # 🏗️  Build
```

---

## ⚡ Comandos Principais

### 1. `/quality-check` ⭐ **RECOMENDADO**

**Verificação completa de qualidade de código**

```bash
# Uso básico
/quality-check

# Com auto-fix
/quality-check --fix

# Análise completa
/quality-check --full

# Com relatório HTML
/quality-check --full --format html
```

**O que verifica**:
- ✅ ESLint (0 errors)
- ✅ TypeScript (0 type errors)
- ✅ Tests + Coverage (≥80%)
- ✅ Security (0 high/critical)
- ✅ Docker Health
- ✅ Bundle Size (--full)
- ✅ Code Duplication (--full)
- ✅ Dead Code (--full)

**Saída esperada**:
```
==========================================
Code Quality Check - TradingSystem
==========================================

[SUCCESS] ✅ ESLint passed (0 errors)
[SUCCESS] ✅ TypeScript check passed (0 type errors)
[SUCCESS] ✅ All tests passed
[INFO] Coverage: 82.5%
[SUCCESS] ✅ No high/critical vulnerabilities
[SUCCESS] ✅ All containers healthy

==========================================
Summary
==========================================
Total Checks: 7
Passed: 7 ✅
Warnings: 0 ⚠️
Failed: 0 ❌
```

---

### 2. `/lint`

**ESLint para JavaScript/TypeScript**

```bash
# Verificar
/lint

# Auto-fix
/lint --fix

# Backend
/lint backend

# Arquivo específico
/lint --file src/App.tsx
```

**Corrige**:
- `no-unused-vars` - Variáveis não usadas
- `no-console` - console.log em produção
- `eqeqeq` - == vs ===
- `semi` - Semicolons

---

### 3. `/type-check`

**Verificação de tipos TypeScript**

```bash
# Verificar
/type-check

# Com cores
/type-check --pretty

# Watch mode
/type-check --watch

# Arquivo específico
/type-check --file src/App.tsx
```

**Detecta**:
- TS2345 - Tipo de argumento incorreto
- TS2322 - Tipo incompatível
- TS2339 - Propriedade não existe
- TS7006 - Implicit any

---

### 4. `/test`

**Testes unitários com Vitest**

```bash
# Executar testes
/test

# Com coverage
/test --coverage

# Watch mode
/test --watch

# Arquivo específico
/test --file DocsPage

# Apenas testes que falharam
/test --only-failed
```

**Métricas**:
- Statements: ≥80%
- Branches: ≥75%
- Functions: ≥80%
- Lines: ≥80%

---

### 5. `/format`

**Formatação com Prettier**

```bash
# Formatar frontend
/format

# Apenas verificar
/format --check

# Diretório específico
/format src/components/

# Apenas staged files
/format --staged
```

**Formata**:
- JavaScript/TypeScript
- JSON, CSS, HTML
- Markdown

---

### 6. `/audit`

**Security audit**

```bash
# Verificar vulnerabilidades
/audit

# Apenas high/critical
/audit --level high

# Auto-fix (CUIDADO!)
/audit --fix

# Todos os projetos
/audit all
```

**Severidades**:
- Critical: Fix < 24h
- High: Fix < 7 dias
- Moderate: Fix < 30 dias
- Low: Monitorar

---

### 7. `/build`

**Build de produção**

```bash
# Build
/build

# Clean + build
/build --clean

# Com análise de bundle
/build --analyze

# Watch mode (dev)
/build --watch
```

**Targets**:
- Initial JS: < 200KB
- Total (gzip): < 300KB
- Lazy chunks: < 100KB

---

## 🎯 Workflows Recomendados

### Pre-Commit (antes de commitar)

```bash
# Opção 1: Comando único (RECOMENDADO)
/quality-check --fix

# Opção 2: Manual
/lint --fix
/format
/type-check
/test
```

---

### Pre-Deploy (antes de fazer deploy)

```bash
# Verificação completa
/quality-check --full

# Health check
/health-check all

# Security
/audit --level high

# Build
/build --analyze
```

---

### Debug (investigar problemas)

```bash
# Status geral
/health-check all

# Logs
/docker-compose logs rag

# Verificar tipos
/type-check

# Executar testes
/test
```

---

## 📊 Tabela de Referência Rápida

| Comando | Descrição | Tempo | Auto-Fix |
|---------|-----------|-------|----------|
| `/quality-check` | Verificação completa | ~2min | ✅ --fix |
| `/quality-check --full` | Análise profunda | ~5min | ✅ --fix |
| `/lint` | ESLint | ~10s | ✅ --fix |
| `/type-check` | TypeScript | ~15s | ❌ |
| `/test` | Testes | ~30s | ❌ |
| `/test --coverage` | Testes + Coverage | ~45s | ❌ |
| `/format` | Prettier | ~5s | ✅ auto |
| `/audit` | Security | ~5s | ⚠️  --fix |
| `/build` | Production build | ~30s | ❌ |

---

## 🚀 Como Usar no Claude Code

### Executar Comando

No Claude Code CLI ou chat:

```bash
# Sintaxe
/command-name [args]

# Exemplo
/quality-check --fix
```

### Ver Ajuda de um Comando

```bash
# Abrir arquivo do comando
cat .claude/commands/quality-check.md

# Ou no Claude Code
/help quality-check
```

### Listar Todos os Comandos

```bash
# Ver índice completo
cat .claude/commands/README.md

# Ou
ls -la .claude/commands/
```

---

## 📋 Checklists

### ✅ Pre-Commit Checklist

- [ ] `/lint --fix` - Auto-fix linting
- [ ] `/format` - Format code
- [ ] `/type-check` - Verify types
- [ ] `/test` - Run tests
- [ ] `/build` - Verify build

**Ou simplesmente**: `/quality-check --fix`

---

### ✅ Pre-Deploy Checklist

- [ ] `/quality-check --full` - Análise completa
- [ ] `/health-check all` - Todos os serviços OK
- [ ] `/audit --level high` - Sem vulnerabilidades
- [ ] `/build --analyze` - Bundle size OK
- [ ] `/test --coverage` - Coverage ≥80%

---

## 🎓 Exemplos de Uso

### Exemplo 1: Verificação Rápida

```bash
# Antes de commitar
/quality-check --fix

# Saída
[SUCCESS] ✅ All quality checks passed!
```

---

### Exemplo 2: Debug de Erro TypeScript

```bash
# Verificar tipos
/type-check --pretty

# Saída
src/App.tsx:42:5 - error TS2322: Type 'string' is not assignable to type 'number'.

42     age: "30"
       ~~~
```

---

### Exemplo 3: Análise de Bundle Grande

```bash
# Build com análise
/build --analyze

# Saída
Bundle Analysis:
dist/assets/index-ABC123.js - 456 KB  ⚠️  TOO LARGE
dist/assets/vendor-XYZ789.js - 234 KB

Recommendations:
- Implement code splitting
- Use dynamic imports
- Remove unused dependencies
```

---

### Exemplo 4: Security Audit

```bash
# Verificar vulnerabilidades
/audit --level high

# Saída
found 2 high severity vulnerabilities

Package: lodash
Severity: high
Recommendation: Update to v4.17.21
```

---

## 🔧 Configuração Adicional

### VSCode Extensions

```bash
# Instalar extensões recomendadas
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
```

### Git Hooks (Husky)

```bash
cd frontend/dashboard

# Instalar
npm install --save-dev husky lint-staged

# Inicializar
npx husky init

# Adicionar pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

`package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ]
  }
}
```

---

## 📚 Documentação Completa

### Guias

1. **[Code Quality Checklist](../../development/code-quality-checklist.md)** (3,600 linhas)
   - 12 categorias de verificação
   - 100+ comandos detalhados
   - Integração CI/CD
   - Métricas recomendadas

2. **[Code Quality Commands](../development/code-quality-commands.md)** (250 linhas)
   - Comandos mais usados
   - Checklists
   - Troubleshooting

3. **.claude/commands/README.md** (20+ comandos)
   - Todos os comandos customizados
   - Workflows recomendados
   - Como criar novos comandos

### Scripts

- **scripts/maintenance/code-quality-check.sh** - Script automatizado
- **scripts/workflows/workflow-template.sh** - Template de workflow

---

## 🎯 Métricas de Qualidade

### Frontend (Dashboard)

| Métrica | Target | Status |
|---------|--------|--------|
| ESLint Errors | 0 | ✅ |
| TypeScript Errors | 0 | ✅ |
| Test Coverage | ≥ 80% | 🎯 |
| Bundle Size | < 500KB | ✅ |
| Lighthouse Score | ≥ 90 | 🎯 |
| Security (High/Critical) | 0 | ✅ |
| Code Duplication | < 5% | ✅ |

### Backend (APIs)

| Métrica | Target | Status |
|---------|--------|--------|
| ESLint Errors | 0 | ✅ |
| Test Coverage | ≥ 70% | 🎯 |
| Response Time (p95) | < 200ms | ✅ |
| Security Issues | 0 | ✅ |

---

## 💡 Dicas Finais

### 1. Use `/quality-check` Regularmente

```bash
# Antes de cada commit
/quality-check --fix

# Antes de cada deploy
/quality-check --full
```

### 2. Configure Auto-Format no IDE

VSCode settings:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 3. Monitore Coverage

```bash
# Gerar relatório
/test --coverage

# Abrir no browser
xdg-open frontend/dashboard/coverage/index.html
```

### 4. Analise Bundle Regularmente

```bash
# A cada feature nova
/build --analyze

# Verificar se cresceu muito
du -sh frontend/dashboard/dist/
```

---

## 🔗 Links Úteis

- **CLAUDE.md** (arquivo na raiz) - Instruções do projeto
- `reports/2025-11-02/WORKFLOW-SYSTEM-READY.md` - Workflow System completo
- **Health Checks**: [scripts/maintenance/health-check-all.sh](https://github.com/marceloterra1983/TradingSystem/blob/main/scripts/maintenance/health-check-all.sh)

---

## ✅ Resumo Final

Você agora tem acesso a **7 comandos customizados** do Claude Code:

1. ⭐ `/quality-check` - **Verificação completa** (USE ESTE!)
2. 🔍 `/lint` - ESLint
3. 📘 `/type-check` - TypeScript
4. 🧪 `/test` - Testes
5. ✨ `/format` - Prettier
6. 🔒 `/audit` - Security
7. 🏗️  `/build` - Build

**Workflow Recomendado**:

```bash
# Antes de commitar
/quality-check --fix

# Antes de deploy
/quality-check --full --format html
```

**Tudo pronto para uso! Execute `/quality-check` agora! 🚀**

---

**Data de Criação**: 2025-11-02
**Versão**: 1.0.0
**Status**: ✅ Pronto para Produção
