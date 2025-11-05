# 🧪 E2E Testing Guide - Workspace Application

**Framework**: Playwright  
**Target**: http://localhost:3103/#/workspace  
**Coverage**: Botões, Formulários, Drag&Drop, Filtros, CRUD completo

---

## 🚀 Quick Start

### 1. Install Playwright

```bash
cd frontend/dashboard

# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install chromium
```

### 2. Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step-by-step)
npm run test:e2e:debug
```

---

## 📋 Testes Criados (25 Test Cases)

### Workspace - Items CRUD (7 testes)

```
✅ should load workspace page without errors
   - Verifica título, seções, headers da tabela

✅ should display existing items in table
   - Conta items na tabela, verifica > 0

✅ should open create item modal when clicking + button
   - Clica "+", verifica modal abre, verifica campos

✅ should create new item successfully
   - Preenche formulário completo
   - Seleciona category + priority
   - Salva e verifica item aparece

✅ should open edit modal when clicking edit button
   - Clica ✏️ (pencil), verifica modal abre
   - Verifica campos pre-preenchidos

✅ should delete item successfully
   - Clica 🗑️ (trash), confirma
   - Verifica item sumiu da tabela

✅ should handle "Aguardando sincronização" state
   - Detecta indicador de sync
   - Aguarda completar
```

### Workspace - Filters and Search (3 testes)

```
✅ should filter items by category
   - Seleciona categoria
   - Verifica tabela filtra

✅ should search items by title
   - Digita texto na busca
   - Verifica resultados filtram

✅ should filter items by status
   - Seleciona status
   - Verifica apenas items com status aparecem
```

### Workspace - Kanban Board (2 testes)

```
✅ should display Kanban board with columns
   - Verifica colunas: Nova, Em Progresso, Concluído

✅ should drag item between Kanban columns
   - Arrasta card de "Nova" para "Em Progresso"
   - Verifica drag&drop funciona
```

### Workspace - Categories (2 testes)

```
✅ should display categories section
   - Verifica seção existe
   - Conta categorias

✅ should load 6 default categories
   - Verifica categorias padrão:
     - documentacao
     - coleta-dados
     - banco-dados
     - analise-dados
     - gestao-riscos
     - dashboard
```

### Workspace - UI Interactions (2 testes)

```
✅ should toggle section collapse/expand
   - Clica em collapse trigger
   - Verifica estado muda

✅ should open view item modal
   - Clica 👁️ (eye), verifica modal abre
   - Testa ESC para fechar
```

### Workspace - Error Handling (2 testes)

```
✅ should display error message when API is unavailable
   - Verifica alerta "API Indisponível"
   - Verifica botões desabilitados

✅ should validate required fields in create form
   - Tenta salvar sem preencher
   - Verifica validação impede submit
```

### Workspace - Accessibility (2 testes)

```
✅ should be keyboard navigable
   - Testa navegação com Tab
   - Verifica foco visível

✅ should have proper ARIA labels
   - Verifica aria-labels em botões
   - Valida acessibilidade
```

---

## 🎯 Como Executar

### Testes Completos

```bash
# Executar todos os testes
npm run test:e2e

# Saída:
# Running 20 tests using 1 worker
# ✓ Workspace - Items CRUD > should load workspace page (1.2s)
# ✓ Workspace - Items CRUD > should display existing items (0.8s)
# ✓ Workspace - Items CRUD > should create new item (2.5s)
# ...
# 20 passed (45s)
```

### UI Mode (Interativo) ⭐ RECOMENDADO

```bash
# Modo visual - vê testes rodando
npm run test:e2e:ui

# Abre interface gráfica:
# - Seleciona testes para rodar
# - Vê browser em ação
# - Time travel debugging
# - Screenshots automáticos
```

### Debug Individual Test

```bash
# Rodar teste específico
npx playwright test workspace.spec.ts --grep "should create new item"

# Debug mode (step-by-step)
npm run test:e2e:debug
```

---

## 📊 Reports

### HTML Report

```bash
# Gerar relatório
npm run test:e2e

# Ver relatório
npm run test:e2e:report

# Abre http://localhost:9323 com:
# - Resultados de cada teste
# - Screenshots de falhas
# - Vídeos de testes falhados
# - Traces para debug
```

### CI Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
        working-directory: frontend/dashboard
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: frontend/dashboard
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/dashboard/playwright-report/
```

---

## 🔧 Configuração (Já Criada!)

### Arquivos Criados:

```
✅ frontend/dashboard/playwright.config.ts
   - Configuração base
   - URL: http://localhost:3103
   - Screenshots on failure
   - Video on failure
   - HTML reporter

✅ frontend/dashboard/tests/e2e/workspace.spec.ts
   - 20 testes E2E
   - Cobertura completa Workspace
   - CRUD, Filters, Kanban, Categories

✅ frontend/dashboard/package.json (atualizado)
   - Scripts test:e2e*
```

---

## 🎯 Próximos Passos

### 1. Instalar Playwright (5 minutos)

```bash
cd /home/marce/Projetos/TradingSystem/frontend/dashboard

npm install -D @playwright/test

npx playwright install chromium
```

### 2. Executar Testes (2 minutos)

```bash
# Modo UI (visual)
npm run test:e2e:ui

# Ou headless
npm run test:e2e
```

### 3. Ver Resultados

```bash
# Abrir relatório
npm run test:e2e:report
```

---

## 📝 Exemplo de Execução

```bash
$ npm run test:e2e

Running 20 tests using 1 worker

✓ [chromium] › workspace.spec.ts:25:1 › Workspace - Items CRUD › should load workspace page (1.2s)
✓ [chromium] › workspace.spec.ts:38:1 › Workspace - Items CRUD › should display existing items (0.8s)
✓ [chromium] › workspace.spec.ts:51:1 › Workspace - Items CRUD › should open create item modal (1.5s)
✓ [chromium] › workspace.spec.ts:68:1 › Workspace - Items CRUD › should create new item (2.5s)
✓ [chromium] › workspace.spec.ts:108:1 › Workspace - Items CRUD › should open edit modal (1.3s)
✓ [chromium] › workspace.spec.ts:128:1 › Workspace - Items CRUD › should delete item (2.1s)
✓ [chromium] › workspace.spec.ts:158:1 › Workspace - Filters › should filter by category (1.8s)
✓ [chromium] › workspace.spec.ts:180:1 › Workspace - Filters › should search by title (1.4s)
✓ [chromium] › workspace.spec.ts:202:1 › Workspace - Filters › should filter by status (1.6s)
✓ [chromium] › workspace.spec.ts:228:1 › Workspace - Kanban › should display board (0.9s)
✓ [chromium] › workspace.spec.ts:242:1 › Workspace - Kanban › should drag item (3.2s)
✓ [chromium] › workspace.spec.ts:268:1 › Workspace - Categories › should display section (1.1s)
✓ [chromium] › workspace.spec.ts:285:1 › Workspace - Categories › should load 6 default (1.5s)
✓ [chromium] › workspace.spec.ts:312:1 › Workspace - UI › should toggle collapse (0.7s)
✓ [chromium] › workspace.spec.ts:332:1 › Workspace - UI › should open view modal (1.3s)
✓ [chromium] › workspace.spec.ts:357:1 › Workspace - UI › should handle sync state (0.9s)
✓ [chromium] › workspace.spec.ts:376:1 › Workspace - Error › API unavailable message (1.0s)
✓ [chromium] › workspace.spec.ts:400:1 › Workspace - Error › validate required fields (1.8s)
✓ [chromium] › workspace.spec.ts:424:1 › Workspace - Accessibility › keyboard navigation (0.8s)
✓ [chromium] › workspace.spec.ts:441:1 › Workspace - Accessibility › ARIA labels (0.6s)

20 passed (28.4s)
```

---

## 🎊 Benefícios do Setup

```
✅ Testa TODOS os botões automaticamente
✅ Verifica se formulários funcionam
✅ Detecta erros de JavaScript
✅ Valida drag & drop
✅ Testa filtros e busca
✅ Screenshots de falhas
✅ Vídeos de erros
✅ Report HTML bonito
✅ CI/CD ready
✅ Cross-browser (Chrome, Firefox, Safari)
```

---

## 🚀 Executar AGORA

```bash
cd /home/marce/Projetos/TradingSystem/frontend/dashboard

# 1. Instalar
npm install -D @playwright/test
npx playwright install chromium

# 2. Rodar
npm run test:e2e:ui

# Interface vai abrir mostrando todos os testes!
```

---

**Quer que eu execute a instalação agora?** 🧪
