# Bundle Size Optimization Plan

**Data**: 2025-11-06
**Análise**: Dashboard Bundle Size Analysis

## 📊 Situação Atual

### Chunks Fora do Budget

| Chunk | Atual (gzip) | Budget | Excesso | % Total |
|-------|--------------|--------|---------|---------|
| **agents-catalog** | 204.69 KB | 100 KB | +104.69 KB | 25.4% |
| **vendor** | 186.89 KB | 180 KB | +6.89 KB | 23.2% |

### Chunks Dentro do Budget ✅

- commands-catalog: 83.83 KB (budget: 100 KB)
- charts-vendor: 80.03 KB (budget: 100 KB)  
- react-vendor: 40.03 KB (budget: 100 KB)
- ui-radix: 20.41 KB (budget: 25 KB)
- Outros: Todos abaixo do budget

**Total Bundle**: ~806 KB gzipped (budget total: 400 KB)

---

## 🎯 Estratégias de Otimização

### 1. **agents-catalog** (-104 KB necessário)

**Problema**: Catálogo de 106 agentes carregado eagerly

**Soluções**:

#### A. Lazy Loading do Catálogo ⭐ (Recomendado)
```typescript
// Carregar apenas quando a página de Agentes for acessada
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
```
**Impacto**: -200 KB no bundle inicial

#### B. Virtualização da Lista
```typescript
// Renderizar apenas os items visíveis (react-window)
import { FixedSizeList } from 'react-window';
```
**Impacto**: -50 KB de DOM rendering

#### C. Dividir Catálogo por Domínio
```typescript
// agents-frontend.json, agents-backend.json, etc
// Carregar apenas o necessário
const catalog = await import(`./agents-${domain}.json`);
```
**Impacto**: -150 KB (carrega ~20% do catálogo por vez)

---

### 2. **vendor** (-7 KB necessário)

**Problema**: Vendor chunk genérico com dependências não tree-shaked

**Soluções**:

#### A. Análise de Dependências Não Utilizadas
```bash
npx depcheck
```

#### B. Tree-shaking de Lucide Icons
```typescript
// ❌ Importação genérica
import { AlertCircle } from 'lucide-react';

// ✅ Importação específica
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
```
**Impacto**: -10 KB

#### C. Remover date-fns não utilizadas
```typescript
// Verificar quais funções são realmente usadas
import { format, parseISO } from 'date-fns';
// vs importar todo o pacote
```

---

## 🚀 Plano de Implementação

### Fase 1: Quick Wins (1-2h)

**Meta**: Reduzir vendor chunk em 10 KB

- [ ] Executar `npx depcheck` e remover dependências não usadas
- [ ] Otimizar importações de `lucide-react` (importações específicas)
- [ ] Tree-shake `date-fns` (usar apenas funções necessárias)

**Resultado Esperado**: vendor 176 KB (dentro do budget de 180 KB)

---

### Fase 2: Lazy Loading do Catálogo (2-3h)

**Meta**: Reduzir agents-catalog de 205 KB → 0 KB no bundle inicial

- [ ] Mover `AgentsPage` para lazy loading
- [ ] Implementar skeleton loader durante carregamento
- [ ] Testar performance de carregamento

**Resultado Esperado**: -200 KB no bundle inicial

---

### Fase 3: Code Splitting Avançado (4-6h)

**Meta**: Dividir catálogo de agentes por domínio

- [ ] Criar `scripts/split-agents-catalog.mjs`
- [ ] Gerar arquivos por domínio (frontend, backend, etc.)
- [ ] Atualizar `AgentsPage` para carregar apenas domínio necessário
- [ ] Adicionar filtros de domínio no UI

**Resultado Esperado**: -150 KB adicional (carrega 20-30% do catálogo)

---

## 📈 Resultado Final Projetado

| Métrica | Atual | Meta | Melhoria |
|---------|-------|------|----------|
| Bundle Inicial | ~806 KB | ~450 KB | **-44%** |
| agents-catalog | 205 KB | 0 KB (lazy) | **-100%** |
| vendor | 187 KB | 176 KB | **-6%** |
| Total após lazy | 806 KB | 626 KB | **-22%** |

---

## ⏱️ Estimativa

- **Fase 1** (Quick Wins): 1-2h → -10 KB
- **Fase 2** (Lazy Loading): 2-3h → -200 KB  
- **Fase 3** (Splitting): 4-6h → -150 KB adicional

**Total**: 7-11 horas de dev time

---

## ✅ Validação

```bash
# Após cada fase
npm run analyze:bundle

# Validar que não quebrou funcionalidade
npm run test
npm run test:e2e
```

---

## 📝 Notas

- **Prioridade 1**: Lazy loading do catálogo (maior impacto)
- **Prioridade 2**: Otimizar vendor chunk (quick win)
- **Prioridade 3**: Code splitting avançado (nice to have)

**Recomendação**: Implementar Fase 1 + Fase 2 para atingir meta de 400 KB.

