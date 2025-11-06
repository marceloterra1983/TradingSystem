---
title: "Code Quality Commands"
sidebar_position: 2
description: "Reference for linting, type checking, testing, and security audit scripts."
tags:
  - development
  - quality
  - scripts
owner: ToolingGuild
lastReviewed: '2025-11-02'
---
# Code Quality Commands - Quick Reference 🚀

**Comandos essenciais para verificação de qualidade, limpeza e eficiência do código**

---

## ⚡ Quick Start

```bash
# Verificação completa automatizada (RECOMENDADO)
bash scripts/maintenance/code-quality-check.sh

# Com auto-fix
bash scripts/maintenance/code-quality-check.sh --fix

# Análise completa (incluindo testes lentos)
bash scripts/maintenance/code-quality-check.sh --full

# Gerar relatório HTML
bash scripts/maintenance/code-quality-check.sh --full --format html
```

---

## 📋 Verificações Essenciais (Frontend)

### 1. Linting (ESLint)

```bash
cd frontend/dashboard

# Verificar
npm run lint

# Auto-fix
npm run lint:fix

# Arquivo específico
npx eslint src/components/pages/DocsHybridSearchPage.tsx
```

### 2. TypeScript

```bash
cd frontend/dashboard

# Verificar tipos
npx tsc --noEmit

# Com detalhes
npx tsc --noEmit --pretty
```

### 3. Testes

```bash
cd frontend/dashboard

# Executar testes
npm test

# Com coverage
npm run test:coverage

# Testes específicos
npm test DocsHybridSearchPage

# Watch mode
npm test -- --watch
```

### 4. Formatação (Prettier)

```bash
cd frontend/dashboard

# Verificar
npx prettier --check src/

# Formatar
npx prettier --write src/

# Arquivo específico
npx prettier --write src/components/pages/DocsHybridSearchPage.tsx
```

### 5. Security Audit

```bash
cd frontend/dashboard

# Verificar vulnerabilidades
npm audit

# Auto-fix (cuidado!)
npm audit fix

# Apenas high/critical
npm audit --audit-level=high
```

---

## 🔍 Análises Avançadas (Opcionais)

### Bundle Size

```bash
cd frontend/dashboard

# Build
npm run build

# Ver tamanho
ls -lh dist/assets/

# Análise interativa (se instalado)
npx vite-bundle-visualizer
```

### Code Duplication

```bash
# Instalar (global)
npm install -g jscpd

cd frontend/dashboard

# Verificar duplicação
jscpd src/

# Com threshold
jscpd src/ --threshold 5

# Relatório HTML
jscpd src/ --format html --output ./jscpd-report
```

### Dead Code

```bash
cd frontend/dashboard

# Unused exports
npx ts-prune

# Ignorar testes
npx ts-prune --ignore "*.spec.ts|*.test.ts"

# Dependências não utilizadas
npx depcheck
```

### Performance (Lighthouse)

```bash
# Instalar (global)
npm install -g lighthouse

# Análise (com servidor rodando em localhost:3103)
lighthouse http://localhost:3103 --view

# Apenas performance
lighthouse http://localhost:3103 --only-categories=performance --view
```

---

## 🐳 Docker Health

```bash
# Ver containers rodando
docker ps

# Ver logs
docker logs rag-service --tail 100

# Métricas de recursos
docker stats --no-stream

# Containers com problemas
docker ps -a --filter "status=exited"

# Health check específico
docker inspect rag-service | jq '.[0].State.Health'
```

---

## 🔧 Backend APIs

```bash
cd backend/api/workspace  # ou qualquer API

# Linting
npm run lint

# Auto-fix
npm run lint:fix

# Testes
npm test

# Security
npm audit
```

---

## ✅ Pre-Commit Checklist

```bash
# Execute ANTES de commitar

cd frontend/dashboard

# 1. Auto-fix lint
npm run lint:fix

# 2. Format
npx prettier --write src/

# 3. Type check
npx tsc --noEmit

# 4. Tests
npm test

# 5. Build test
npm run build
```

---

## 🚀 Pre-Deploy Checklist

```bash
# Execute ANTES de fazer deploy

# 1. Qualidade completa
bash scripts/maintenance/code-quality-check.sh --full

# 2. Health check
bash scripts/maintenance/health-check-all.sh

# 3. Security audit
cd frontend/dashboard && npm audit --audit-level=high

# 4. Build verification
cd frontend/dashboard && npm run build

# 5. Performance check (opcional)
lighthouse http://localhost:3103 --view
```

---

## 📊 Comandos por Categoria

### Qualidade de Código

| Comando | Descrição | Tempo |
|---------|-----------|-------|
| `npm run lint` | ESLint | ~10s |
| `npx tsc --noEmit` | TypeScript | ~15s |
| `npm test` | Testes | ~30s |
| `npm run test:coverage` | Testes + Coverage | ~45s |

### Segurança

| Comando | Descrição | Tempo |
|---------|-----------|-------|
| `npm audit` | Vulnerabilidades | ~5s |
| `npm audit --audit-level=high` | High/Critical apenas | ~5s |
| `snyk test` | Snyk scan | ~20s |

### Performance

| Comando | Descrição | Tempo |
|---------|-----------|-------|
| `npm run build` | Build production | ~30s |
| `lighthouse http://localhost:3103` | Performance audit | ~45s |
| `docker stats --no-stream` | Container metrics | ~2s |

### Limpeza

| Comando | Descrição | Tempo |
|---------|-----------|-------|
| `jscpd src/` | Code duplication | ~20s |
| `npx ts-prune` | Dead code | ~10s |
| `depcheck` | Unused deps | ~5s |

---

## 🎯 Targets de Qualidade

### Frontend (Dashboard)

- ✅ **ESLint**: 0 errors
- ✅ **TypeScript**: 0 type errors
- ✅ **Test Coverage**: ≥ 80%
- ✅ **Bundle Size**: < 500KB (gzipped)
- ✅ **Lighthouse**: ≥ 90
- ✅ **Security**: 0 high/critical
- ✅ **Duplication**: < 5%

### Backend (APIs)

- ✅ **ESLint**: 0 errors
- ✅ **Test Coverage**: ≥ 70%
- ✅ **Response Time (p95)**: < 200ms
- ✅ **Security**: 0 high/critical

---

## 🛠️ Ferramentas Necessárias

### Instaladas no Projeto

```bash
cd frontend/dashboard
npm install  # Instala: eslint, typescript, vitest, prettier
```

### Globais (Opcionais)

```bash
# Code duplication
npm install -g jscpd

# Performance
npm install -g lighthouse

# Load testing
npm install -g autocannon

# Security
npm install -g snyk
```

---

## 📖 Documentação Completa

**Ver guia completo**: [Code Quality Checklist](../../development/code-quality-checklist)

Inclui:
- ✅ 12 categorias de verificação
- ✅ Comandos detalhados com exemplos
- ✅ Integração CI/CD
- ✅ VSCode setup
- ✅ Métricas recomendadas

---

## 🚨 Troubleshooting

### "npm run lint" falha

```bash
# Reinstalar dependências
cd frontend/dashboard
rm -rf node_modules package-lock.json
npm install
```

### "npx tsc" muito lento

```bash
# Usar incremental mode
npx tsc --noEmit --incremental
```

### "npm test" timeout

```bash
# Aumentar timeout
npm test -- --testTimeout=10000
```

### Bundle muito grande

```bash
# Analisar bundle
npm run build
npx vite-bundle-visualizer

# Implementar code splitting
# Ver: docs/content/frontend/guidelines/performance.mdx
```

---

## 🔗 Links Úteis

- **CLAUDE.md** (arquivo na raiz) - Instruções do projeto
- [Code Quality Checklist](../../development/code-quality-checklist) - Guia completo
- `scripts/workflows/README.md` - Workflows automatizados
- `scripts/maintenance/health-check-all.sh` - Verificação de serviços

---

**Última Atualização**: 2025-11-02
**Versão**: 1.0.0

---

## 💡 Dica Final

**Para verificação rápida antes de commit:**

```bash
# One-liner completo
cd frontend/dashboard && \
npm run lint:fix && \
npx prettier --write src/ && \
npx tsc --noEmit && \
npm test && \
echo "✅ Ready to commit!"
```

**Para verificação completa antes de deploy:**

```bash
# Usar o script automatizado
bash scripts/maintenance/code-quality-check.sh --full --format html
```
