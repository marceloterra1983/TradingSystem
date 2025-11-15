---
title: "RAG Services Refactor Plan"
slug: /tools/rag/refactor-plan-rag-services
sidebar_position: 8
description: "Breakdown of the work required to split and stabilise LlamaIndexPage."
tags:
  - rag
  - frontend
  - refactor
owner: ArchitectureGuild
lastReviewed: '2025-11-02'
---
# 🔄 Plano de Refatoração: RAG Services Page

**URL:** http://localhost:3103/#/rag-services
**Componente Principal:** `LlamaIndexPage.tsx` (1655 linhas)
**Status:** 🔴 Necessita refatoração urgente

---

## 📊 Análise Pré-Refatoração

### Problemas Identificados

#### 1. **Arquivo Monolítico (1655 linhas)**
- **Componente Principal:** `LlamaIndexPage.tsx`
- **Problema:** Viola princípio de responsabilidade única
- **Impacto:** Difícil manutenção, testes complexos, merge conflicts frequentes

#### 2. **Múltiplas Responsabilidades**
O componente faz TUDO:
- Gerenciamento de estado de saúde
- Configuração de modo (proxy/direct/auto)
- Exibição de status
- Formulário de ingestão
- Query tool
- Collections management (já extraído ✅)
- Endpoint banner
- Dialogs de configuração

#### 3. **Lógica de Negócio Misturada com UI**
- Health checks dentro do componente
- Validações de URL inline
- Manipulação de localStorage espalhada
- Regras de negócio hardcoded

#### 4. **Estado Complexo**
- Múltiplos `useState` inter-relacionados
- Efeitos colaterais não controlados
- Race conditions em health checks
- Auto-refresh sem cleanup adequado

#### 5. **Código Duplicado**
- Resolução de URLs repetida
- Validação de modelos duplicada
- Health check logic espalhada

---

## 🎯 Objetivos da Refatoração

### Curto Prazo
1. ✅ Extrair `CollectionsManagementCard` (FEITO)
2. Extrair componentes menores e focados
3. Criar hooks customizados para lógica reutilizável
4. Separar lógica de negócio da apresentação

### Médio Prazo
1. Implementar testes unitários para cada componente
2. Adicionar testes de integração
3. Melhorar performance com memoization
4. Adicionar error boundaries

### Longo Prazo
1. Migrar para Context API ou Zustand para estado global
2. Implementar lazy loading de componentes
3. Adicionar analytics e monitoramento
4. Criar storybook para componentes

---

## 🏗️ Estratégia de Refatoração

### Fase 1: Extração de Componentes (1-2 horas)

#### 1.1. Extrair `RAGHealthStatusCard`
**Responsabilidade:** Exibir status de saúde e métricas

**Arquivos:**
```
src/components/pages/RAGHealthStatusCard.tsx (novo)
src/hooks/llamaIndex/useRAGHealth.ts (novo)
```

**Conteúdo:**
- Health check visual
- Badge de status
- Métricas de performance
- Auto-refresh de saúde

#### 1.2. Extrair `RAGModeSelector`
**Responsabilidade:** Gerenciar modo de conexão (proxy/direct/auto)

**Arquivos:**
```
src/components/pages/RAGModeSelector.tsx (novo)
src/hooks/llamaIndex/useRAGMode.ts (novo)
```

**Conteúdo:**
- Seletor de modo
- Validação de modo
- Persistência em localStorage
- Sugestão de mudança de modo

#### 1.3. Extrair `RAGIngestionForm`
**Responsabilidade:** Formulário de ingestão de documentos

**Arquivos:**
```
src/components/pages/RAGIngestionForm.tsx (novo)
src/hooks/llamaIndex/useIngestion.ts (novo)
```

**Conteúdo:**
- Formulário de ingestão
- Validação de inputs
- Seleção de modelo e chunk size
- Progress tracking

#### 1.4. Extrair `RAGEndpointBanner`
**Responsabilidade:** Banner informativo de endpoints

**Arquivos:**
```
src/components/pages/RAGEndpointBanner.tsx (novo)
```

**Conteúdo:**
- Informação de endpoints
- Links para Swagger
- Status de conectividade

#### 1.5. Extrair `RAGConfigDialog`
**Responsabilidade:** Dialogs de configuração

**Arquivos:**
```
src/components/pages/RAGConfigDialog.tsx (novo)
```

**Conteúdo:**
- Dialog de sugestão de proxy
- Dialog de configuração avançada

### Fase 2: Criação de Hooks Customizados (2-3 horas)

#### 2.1. `useRAGHealth`
**Responsabilidade:** Gerenciar health checks e status

```typescript
interface UseRAGHealthReturn {
  isHealthy: boolean;
  lastCheck: Date | null;
  error: string | null;
  refreshHealth: () => Promise<void>;
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}

function useRAGHealth(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}): UseRAGHealthReturn
```

#### 2.2. `useRAGMode`
**Responsabilidade:** Gerenciar modo de conexão

```typescript
interface UseRAGModeReturn {
  mode: ServiceMode;
  setMode: (mode: ServiceMode) => void;
  availableModes: ServiceMode[];
  recommendedMode: ServiceMode | null;
}

function useRAGMode(): UseRAGModeReturn
```

#### 2.3. `useIngestion`
**Responsabilidade:** Gerenciar processo de ingestão

```typescript
interface UseIngestionReturn {
  ingest: (params: IngestionParams) => Promise<void>;
  isIngesting: boolean;
  progress: number;
  error: string | null;
  result: IngestionResult | null;
}

function useIngestion(): UseIngestionReturn
```

#### 2.4. `useEndpointResolver`
**Responsabilidade:** Resolver URLs de endpoints

```typescript
interface UseEndpointResolverReturn {
  queryUrl: string;
  qdrantUrl: string;
  ingestionUrl: string;
  resolveUrl: (type: 'query' | 'qdrant' | 'ingestion') => string;
}

function useEndpointResolver(): UseEndpointResolverReturn
```

### Fase 3: Separação de Lógica de Negócio (1-2 horas)

#### 3.1. Criar `ragService.ts`
**Responsabilidade:** Encapsular chamadas de API

```typescript
class RAGService {
  checkHealth(): Promise<HealthResponse>;
  ingestDocuments(params: IngestionParams): Promise<IngestionResult>;
  getCollectionStats(collection: string): Promise<CollectionStats>;
}
```

#### 3.2. Criar `ragConfig.ts`
**Responsabilidade:** Configurações centralizadas

```typescript
export const RAG_CONFIG = {
  DEFAULT_QUERY_URL: 'http://localhost:8202',
  DEFAULT_QDRANT_URL: 'http://localhost:6333',
  DEFAULT_MODELS: {...},
  CHUNK_SIZES: {...},
  HEALTH_CHECK_INTERVAL: 30000,
  AUTO_REFRESH_INTERVAL: 15000,
};
```

#### 3.3. Criar `ragValidators.ts`
**Responsabilidade:** Validações reutilizáveis

```typescript
export function validateChunkSize(model: string, chunkSize: number): boolean;
export function validateUrl(url: string): boolean;
export function validateCollectionName(name: string): boolean;
```

### Fase 4: Melhorias de Performance (1 hora)

#### 4.1. Memoization
```typescript
const memoizedHealthCheck = useMemo(() => checkHealth(), [dependencies]);
const MemoizedCard = React.memo(RAGHealthStatusCard);
```

#### 4.2. Lazy Loading
```typescript
const CollectionsManagementCard = lazy(() => import('./CollectionsManagementCard'));
const RAGQueryTool = lazy(() => import('./RAGQueryTool'));
```

#### 4.3. Debouncing
```typescript
const debouncedHealthCheck = useDebouncedCallback(checkHealth, 1000);
```

### Fase 5: Testes (2-3 horas)

#### 5.1. Testes Unitários
```
src/__tests__/hooks/useRAGHealth.test.ts
src/__tests__/hooks/useRAGMode.test.ts
src/__tests__/hooks/useCollections.test.ts
src/__tests__/components/RAGHealthStatusCard.test.tsx
src/__tests__/components/RAGModeSelector.test.tsx
```

#### 5.2. Testes de Integração
```
src/__tests__/integration/RAGServicesPage.test.tsx
```

#### 5.3. Testes E2E (Cypress/Playwright)
```
cypress/e2e/rag-services.cy.ts
```

---

## 📁 Nova Estrutura de Arquivos

```
frontend/dashboard/src/
├── components/
│   └── pages/
│       ├── rag/                           # Novo diretório para RAG
│       │   ├── LlamaIndexPage.tsx         # ✅ Simplificado (100-200 linhas)
│       │   ├── RAGHealthStatusCard.tsx    # Novo
│       │   ├── RAGModeSelector.tsx        # Novo
│       │   ├── RAGIngestionForm.tsx       # Novo
│       │   ├── RAGEndpointBanner.tsx      # Novo
│       │   ├── RAGConfigDialog.tsx        # Novo
│       │   ├── CollectionsManagementCard.tsx  # ✅ Já existe
│       │   ├── CollectionsTable.tsx       # ✅ Já existe
│       │   ├── CollectionFormDialog.tsx   # ✅ Já existe
│       │   ├── DirectorySelector.tsx      # ✅ Já existe
│       │   ├── EmbeddingModelSelector.tsx # ✅ Já existe
│       │   ├── LlamaIndexQueryTool.tsx    # Mover para cá
│       │   └── LlamaIndexIngestionStatusCard.tsx  # Mover para cá
│       └── ... (outros componentes)
├── hooks/
│   └── llamaIndex/                        # Hooks RAG
│       ├── useRAGHealth.ts                # Novo
│       ├── useRAGMode.ts                  # Novo
│       ├── useIngestion.ts                # Novo
│       ├── useEndpointResolver.ts         # Novo
│       ├── useCollections.ts              # ✅ Já existe (corrigido)
│       └── useModels.ts                   # Novo (extrair de useCollections)
├── services/
│   ├── ragService.ts                      # Novo
│   ├── collectionsService.ts              # ✅ Já existe
│   └── llamaIndexService.ts               # ✅ Já existe (refatorar)
├── config/
│   └── ragConfig.ts                       # Novo
├── utils/
│   └── ragValidators.ts                   # Novo
└── __tests__/
    ├── hooks/
    │   └── llamaIndex/
    │       ├── useRAGHealth.test.ts
    │       ├── useRAGMode.test.ts
    │       └── useCollections.test.ts
    └── components/
        └── pages/
            └── rag/
                ├── RAGHealthStatusCard.test.tsx
                └── CollectionsManagementCard.test.tsx
```

---

## 🔧 Detalhes de Implementação

### LlamaIndexPage Refatorado (Exemplo)

```typescript
/**
 * LlamaIndexPage - Main RAG Services Page
 *
 * Simplified orchestration of RAG components
 */
export function LlamaIndexPage(): JSX.Element {
  return (
    <CustomizablePageLayout>
      <Suspense fallback={<LoadingSpinner />}>
        {/* Health Status Section */}
        <RAGHealthStatusCard />

        {/* Ingestion Section */}
        <RAGIngestionForm />

        {/* Collections Management Section */}
        <CollectionsManagementCard />

        {/* Query Tool Section */}
        <LlamaIndexQueryTool />

        {/* Endpoint Info Banner */}
        <RAGEndpointBanner />

        {/* Configuration Dialogs */}
        <RAGConfigDialog />
      </Suspense>
    </CustomizablePageLayout>
  );
}
```

**Resultado:** ~100 linhas em vez de 1655!

---

## ✅ Benefícios da Refatoração

### Manutenibilidade
- ✅ Componentes pequenos e focados (50-200 linhas cada)
- ✅ Responsabilidades claras
- ✅ Fácil de entender e modificar

### Testabilidade
- ✅ Testes unitários simples por componente
- ✅ Mocks fáceis de criar
- ✅ Cobertura de testes aumentada

### Performance
- ✅ Lazy loading de componentes
- ✅ Memoization estratégica
- ✅ Re-renders minimizados

### Reusabilidade
- ✅ Hooks podem ser usados em outros lugares
- ✅ Componentes reutilizáveis
- ✅ Lógica de negócio centralizada

### Desenvolvimento
- ✅ Menos merge conflicts
- ✅ Desenvolvimento paralelo facilitado
- ✅ Onboarding de novos devs mais rápido

---

## 📋 Checklist de Execução

### Preparação
- [ ] Criar branch: `git checkout -b refactor/rag-services-page`
- [ ] Garantir que testes atuais passam
- [ ] Fazer backup do código atual
- [ ] Documentar comportamento atual

### Fase 1: Extração de Componentes
- [ ] Extrair `RAGHealthStatusCard`
- [ ] Extrair `RAGModeSelector`
- [ ] Extrair `RAGIngestionForm`
- [ ] Extrair `RAGEndpointBanner`
- [ ] Extrair `RAGConfigDialog`
- [ ] Testar cada extração individualmente

### Fase 2: Criação de Hooks
- [ ] Criar `useRAGHealth`
- [ ] Criar `useRAGMode`
- [ ] Criar `useIngestion`
- [ ] Criar `useEndpointResolver`
- [ ] Refatorar `useCollections` (já corrigido ✅)
- [ ] Testar cada hook

### Fase 3: Separação de Lógica
- [ ] Criar `ragService.ts`
- [ ] Criar `ragConfig.ts`
- [ ] Criar `ragValidators.ts`
- [ ] Migrar lógica para serviços

### Fase 4: Melhorias de Performance
- [ ] Adicionar memoization
- [ ] Implementar lazy loading
- [ ] Adicionar debouncing onde necessário

### Fase 5: Testes
- [ ] Escrever testes unitários para hooks
- [ ] Escrever testes para componentes
- [ ] Escrever testes de integração
- [ ] Garantir 80%+ de cobertura

### Finalização
- [ ] Atualizar documentação
- [ ] Code review interno
- [ ] Testar em ambiente de dev
- [ ] Criar PR com descrição detalhada

---

## ⏱️ Estimativa de Tempo

| Fase | Tempo Estimado | Prioridade |
|------|---------------|------------|
| Fase 1: Extração de Componentes | 2-3 horas | 🔴 Alta |
| Fase 2: Criação de Hooks | 2-3 horas | 🔴 Alta |
| Fase 3: Separação de Lógica | 1-2 horas | 🟡 Média |
| Fase 4: Performance | 1 hora | 🟢 Baixa |
| Fase 5: Testes | 2-3 horas | 🔴 Alta |
| **Total** | **8-12 horas** | **1-2 dias** |

---

## 🚧 Riscos e Mitigações

### Risco 1: Quebrar funcionalidade existente
**Mitigação:**
- Fazer mudanças incrementais
- Testar após cada extração
- Manter comportamento externo idêntico

### Risco 2: Aumentar bundle size
**Mitigação:**
- Usar lazy loading
- Code splitting agressivo
- Monitorar bundle analyzer

### Risco 3: Introduzir novos bugs
**Mitigação:**
- Testes abrangentes
- Code review rigoroso
- Rollout gradual

### Risco 4: Perda de performance
**Mitigação:**
- Benchmark antes/depois
- Memoization estratégica
- Profiling de componentes

---

## 🎯 Próximos Passos Imediatos

1. **Aprovar o plano de refatoração**
2. **Criar branch de refatoração**
3. **Começar pela Fase 1** (extração de componentes)
4. **Fazer commits incrementais**
5. **Testar continuamente**

**Deseja que eu comece a refatoração agora?**

Posso começar extraindo o primeiro componente (`RAGHealthStatusCard`) como prova de conceito.
