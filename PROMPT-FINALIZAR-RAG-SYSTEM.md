# 🎯 Prompt: Finalizar Sistema RAG - TradingSystem

## 📋 Contexto

Sistema RAG local (Qdrant + Ollama + LlamaIndex) está 85% completo:
- ✅ Ingestion pipeline funcionando
- ✅ Collections management implementado
- ✅ Auto-indexação (file watcher) ativa
- ✅ Logs persistentes configurados
- ✅ GPU RTX 5090 otimizada
- ❌ **FALTA:** Interface de query/busca funcional

**Objetivo:** Implementar query UI completa e integrada ao dashboard.

---

## 🎯 Workflow de Implementação

### **Fase 1: Diagnóstico do Sistema RAG (15-20 min)**

#### 1.1. Code Review - Query Components Existentes
```bash
# Revisar componentes de busca já criados
/code-review frontend/dashboard/src/components/pages/DocsHybridSearchPage.tsx
```

**O que analisar:**
- ✅ Estado atual da implementação
- ✅ Integrações com backend (fetch calls)
- ✅ Hooks customizados (`useHybridSearch`)
- ✅ Gestão de estado (loading, errors, results)
- ❌ Bugs críticos ou code smells
- ❌ Problemas de performance (re-renders)

**Output esperado:**
```
📁 outputs/workflow-rag-query/01-code-review-DocsHybridSearchPage.md
├── ✅ Funcionalidades já implementadas
├── ❌ Funcionalidades faltantes
├── 🐛 Bugs identificados
├── 🔧 Refatorações necessárias
└── 📊 Complexidade (linhas, funções, hooks)
```

---

#### 1.2. Backend Routes Audit
```bash
# Verificar endpoints RAG disponíveis
grep -r "router\.(get|post).*rag" tools/rag-services/src/routes/ -A 5
```

**Validar existência de:**
- ✅ `GET /api/v1/rag/collections` (listar coleções)
- ✅ `POST /api/v1/rag/collections/:name/ingest` (ingestão)
- ❓ `POST /api/v1/rag/query` ou `/api/v1/rag/search` (QUERY - faltante?)
- ❓ `GET /api/v1/rag/collections/:name/search` (busca por coleção)

**Output esperado:**
```
📁 outputs/workflow-rag-query/02-backend-routes-audit.md
├── ✅ Endpoints implementados
├── ❌ Endpoints faltantes
├── 🔗 Integração com LlamaIndex
└── 📝 OpenAPI spec atualizado (se aplicável)
```

---

#### 1.3. LlamaIndex Query Service Health Check
```bash
# Verificar se serviço de query está rodando
curl http://localhost:8202/health
curl http://localhost:8202/api/v1/rag/query -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"test","collection":"documentation"}'
```

**Validar:**
- ✅ Container `rag-llamaindex-query` está UP
- ✅ Ollama embeddings funcionando
- ✅ Qdrant acessível
- ✅ Query endpoint responde

**Output esperado:**
```
📁 outputs/workflow-rag-query/03-llamaindex-query-health.md
├── ✅ Service status
├── ✅ Dependencies check (Ollama, Qdrant)
├── 🧪 Test query results
└── ⚠️  Issues encontrados (se houver)
```

---

### **Fase 2: Implementação Backend (20-30 min)**

#### 2.1. Criar Endpoint de Query (se não existir)
```typescript
// tools/rag-services/src/routes/query.ts

/**
 * POST /api/v1/rag/query
 * Semantic search across collections
 */
router.post('/query', async (req, res) => {
  const { query, collections, limit = 10, threshold = 0.7 } = req.body;
  
  // Validações
  if (!query) {
    return sendError(res, 'QUERY_REQUIRED', 'Query text is required', 400);
  }

  // Call LlamaIndex query service
  const response = await axios.post(
    `${LLAMAINDEX_QUERY_URL}/api/v1/rag/query`,
    { query, collection_name: collections, top_k: limit, score_threshold: threshold }
  );

  // Return results with metadata
  return sendSuccess(res, {
    query,
    results: response.data.results,
    totalResults: response.data.total,
    collections: collections || 'all',
  });
});
```

**Checklist:**
- [ ] Validação de input (query obrigatório)
- [ ] Timeout configurável (120s default)
- [ ] Logs de auditoria (quem buscou o quê)
- [ ] Cache de resultados (Redis - 5 min)
- [ ] Error handling (LlamaIndex down, Ollama timeout)
- [ ] Rate limiting (max 10 queries/min por usuário)

**Output:**
```
📁 tools/rag-services/src/routes/query.ts (novo arquivo)
📁 outputs/workflow-rag-query/04-backend-query-implementation.md
```

---

#### 2.2. Integrar com Proxy de Autenticação
```typescript
// backend/api/documentation-api/src/routes/rag-proxy.ts

/**
 * POST /api/v1/rag/search
 * Proxy para RAG Collections Service (mints JWT server-side)
 */
router.post('/search', async (req, res) => {
  // Mint JWT server-side (NUNCA expor no frontend)
  const token = jwtService.mint({ user: 'dashboard', ttl: 60 });

  // Proxy request
  const response = await fetch('http://rag-collections-service:3402/api/v1/rag/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });

  return res.json(await response.json());
});
```

**Checklist:**
- [ ] JWT minting server-side (segurança)
- [ ] CORS configurado para frontend (port 3103)
- [ ] Logs de queries (auditoria)
- [ ] Error propagation (erros do backend chegam ao frontend)

**Output:**
```
📁 backend/api/documentation-api/src/routes/rag-proxy.ts (atualizado)
📁 outputs/workflow-rag-query/05-proxy-auth-implementation.md
```

---

### **Fase 3: Implementação Frontend (30-40 min)**

#### 3.1. Implementar Hook `useRagQuery`
```typescript
// frontend/dashboard/src/hooks/llamaIndex/useRagQuery.ts

export function useRagQuery() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string, options?: SearchOptions) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...options }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data.data.results);
      } else {
        setError(data.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
}
```

**Checklist:**
- [ ] Debounce (500ms para queries em tempo real)
- [ ] AbortController (cancelar buscas anteriores)
- [ ] Cache local (evitar buscas duplicadas)
- [ ] Loading states (skeleton UI)
- [ ] Error boundaries (falhas graceful)

**Output:**
```
📁 frontend/dashboard/src/hooks/llamaIndex/useRagQuery.ts (novo)
📁 outputs/workflow-rag-query/06-frontend-hook-implementation.md
```

---

#### 3.2. Atualizar `DocsHybridSearchPage.tsx`
```typescript
// frontend/dashboard/src/components/pages/DocsHybridSearchPage.tsx

export function DocsHybridSearchPage() {
  const { results, loading, error, search } = useRagQuery();
  const [query, setQuery] = useState('');
  const [selectedCollections, setSelectedCollections] = useState<string[]>(['all']);

  const handleSearch = async () => {
    await search(query, {
      collections: selectedCollections,
      limit: 20,
      threshold: 0.7,
    });
  };

  return (
    <div className="p-6">
      {/* Search Bar */}
      <SearchBar 
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        loading={loading}
      />

      {/* Filters */}
      <SearchFilters
        collections={availableCollections}
        selected={selectedCollections}
        onChange={setSelectedCollections}
      />

      {/* Results */}
      {loading && <SearchSkeleton />}
      {error && <ErrorMessage error={error} />}
      {results.length > 0 && <SearchResults results={results} />}
    </div>
  );
}
```

**Checklist:**
- [ ] Search bar com autocomplete (queries recentes)
- [ ] Filtros por coleção (multi-select)
- [ ] Resultados com score de relevância
- [ ] Highlighting de termos buscados
- [ ] Preview inline de documentos
- [ ] Paginação (se > 20 resultados)
- [ ] Export results (JSON/CSV)

**Output:**
```
📁 frontend/dashboard/src/components/pages/DocsHybridSearchPage.tsx (atualizado)
📁 outputs/workflow-rag-query/07-frontend-ui-implementation.md
```

---

### **Fase 4: Testes e Validação (20-30 min)**

#### 4.1. Generate Tests End-to-End
```bash
/generate-tests frontend/dashboard/src/components/pages/DocsHybridSearchPage.tsx \
  --include-integration \
  --include-e2e
```

**Casos de teste:**
- ✅ Busca retorna resultados
- ✅ Filtro por coleção funciona
- ✅ Loading states corretos
- ✅ Error handling (backend down, timeout)
- ✅ Cache de resultados
- ✅ Cancelamento de busca (AbortController)

**Output:**
```
📁 frontend/dashboard/src/components/pages/__tests__/
├── DocsHybridSearchPage.test.tsx (unit tests)
├── useRagQuery.test.ts (hook tests)
└── integration/
    └── rag-search-flow.test.tsx (E2E)

📁 outputs/workflow-rag-query/08-test-generation-report.md
```

---

#### 4.2. Executar Testes
```bash
cd frontend/dashboard
npm run test -- DocsHybridSearchPage.test.tsx
npm run test:integration -- rag-search-flow.test.tsx
```

**Validação:**
- ✅ 100% dos testes passam
- ✅ Coverage > 80%
- ✅ Sem warnings de console
- ✅ Performance < 200ms por query

**Output:**
```
📁 outputs/workflow-rag-query/09-test-results.md
├── Coverage report (HTML)
├── Performance benchmarks
└── Issues encontrados (se houver)
```

---

#### 4.3. Teste Manual (Smoke Test)
```bash
# 1. Iniciar serviços
cd /home/marce/Projetos/TradingSystem
docker compose -f tools/compose/docker-compose.rag.yml up -d

# 2. Acessar dashboard
# http://localhost:3103

# 3. Testar queries
curl -X POST http://localhost:3403/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Como funciona a ingestão?","collection":"documentation","limit":5}'
```

**Validar:**
- ✅ Busca retorna resultados relevantes
- ✅ Scores de relevância corretos (> 0.7)
- ✅ Highlighting funciona
- ✅ Performance < 2s por query
- ✅ GPU sendo usada (nvidia-smi)

**Output:**
```
📁 outputs/workflow-rag-query/10-smoke-test-results.md
```

---

### **Fase 5: Otimizações Finais (15-20 min)**

#### 5.1. Performance Audit - Query Flow
```bash
/performance-audit --focus query-flow
```

**Analisar:**
- Tempo de resposta (objetivo: < 1s)
- Uso de GPU (nvidia-smi durante queries)
- Cache hit rate (Redis)
- Re-renders desnecessários (React DevTools)
- Bundle size (lazy load markdown preview)

**Output:**
```
📁 outputs/workflow-rag-query/11-performance-audit-query.md
├── Latency breakdown (embedding, search, ranking)
├── GPU utilization (%)
├── Cache effectiveness
└── Quick wins identificados
```

---

#### 5.2. Optimize Query Performance
```bash
# Se performance < objetivo
/optimize-code frontend/dashboard/src/hooks/llamaIndex/useRagQuery.ts \
  --focus debounce,cache,abort-controller
```

**Otimizações:**
- [ ] Debounce (500ms) para search-as-you-type
- [ ] AbortController para cancelar queries anteriores
- [ ] Cache local (Map<query, results>)
- [ ] Prefetch de coleções populares
- [ ] Lazy load de markdown preview
- [ ] Virtual scrolling (se > 50 resultados)

**Output:**
```
📁 frontend/dashboard/src/hooks/llamaIndex/useRagQuery.ts (otimizado)
📁 outputs/workflow-rag-query/12-optimization-report.md
```

---

### **Fase 6: Integração e Documentação (10-15 min)**

#### 6.1. Integrar ao Menu do Dashboard
```typescript
// frontend/dashboard/src/App.tsx (ou similar)

// Adicionar rota
<Route path="/docs/search" element={<DocsHybridSearchPage />} />

// Adicionar ao menu
<NavLink to="/docs/search">
  <Search className="h-4 w-4" />
  Busca RAG
</NavLink>
```

**Output:**
```
📁 frontend/dashboard/src/App.tsx (atualizado)
```

---

#### 6.2. Criar Documentação de Uso
```markdown
# docs/content/apps/rag-search/usage.mdx

---
title: Busca RAG - Guia de Uso
tags: [rag, search, documentation]
domain: frontend
type: guide
status: active
---

## Como Usar

1. Acesse: http://localhost:3103/docs/search
2. Digite sua query: "Como funciona a ingestão?"
3. Selecione coleções (ou deixe "all")
4. Clique em "Buscar"
5. Veja resultados ordenados por relevância

## Filtros Disponíveis

- **Coleções**: documentation, workspace, tradingsystem
- **Score mínimo**: 0.7 (padrão)
- **Limite de resultados**: 10, 20, 50

## Dicas de Uso

- Use perguntas completas: "Como criar uma coleção?"
- Seja específico: "Workspace API authentication"
- Use termos técnicos: "Qdrant indexing"
```

**Output:**
```
📁 docs/content/apps/rag-search/usage.mdx (novo)
📁 outputs/workflow-rag-query/13-documentation.md
```

---

## 📊 Checklist de Completude

### Backend (RAG Collections Service)
- [ ] Endpoint `POST /api/v1/rag/query` implementado
- [ ] Integração com LlamaIndex query service
- [ ] JWT authentication (server-side minting)
- [ ] Cache de resultados (Redis - 5 min TTL)
- [ ] Logs de auditoria (quem buscou o quê)
- [ ] Rate limiting (10 queries/min)
- [ ] Timeout configurável (120s)
- [ ] Error handling completo

### Frontend (Dashboard)
- [ ] Hook `useRagQuery` implementado
- [ ] `DocsHybridSearchPage` funcional
- [ ] Search bar com debounce
- [ ] Filtros por coleção (multi-select)
- [ ] Resultados com scores
- [ ] Highlighting de termos
- [ ] Preview inline de docs
- [ ] Loading states (skeleton)
- [ ] Error boundaries
- [ ] Paginação (se > 20 resultados)

### Integração
- [ ] Rota adicionada ao App.tsx
- [ ] Menu do dashboard atualizado
- [ ] Proxy de autenticação configurado
- [ ] CORS permitido (3103 → 3403)

### Testes
- [ ] Unit tests (hooks, components)
- [ ] Integration tests (query flow)
- [ ] E2E smoke test (manual)
- [ ] Coverage > 80%
- [ ] Performance < 2s por query

### Documentação
- [ ] Guia de uso (docs/content/apps/rag-search/)
- [ ] API spec atualizado (OpenAPI)
- [ ] README com exemplos de queries

---

## 🔀 Execução Paralela (Otimização de Tempo)

### Comandos Paralelos (Economiza 15-20 min)

```bash
# Terminal 1: Code Review Frontend
/code-review frontend/dashboard/src/components/pages/DocsHybridSearchPage.tsx &

# Terminal 2: Backend Routes Audit
grep -r "router\.(get|post).*rag" tools/rag-services/src/routes/ -A 5 > outputs/workflow-rag-query/backend-routes.txt &

# Terminal 3: Health Check LlamaIndex
curl http://localhost:8202/health | jq '.' > outputs/workflow-rag-query/health-check.json &

# Aguardar todos
wait
```

**Economiza:** ~15 minutos (30 min → 15 min)

---

## 🎬 Sequência de Execução Recomendada

### **Opção 1: Sequencial Seguro (90-120 min)**

```bash
# 1. Diagnóstico (20 min)
/code-review DocsHybridSearchPage.tsx
grep -r "router.*rag" tools/rag-services/src/routes/
curl http://localhost:8202/health

# 2. Backend Implementation (30 min)
# Criar tools/rag-services/src/routes/query.ts
# Atualizar backend/api/documentation-api/src/routes/rag-proxy.ts

# 3. Frontend Implementation (40 min)
# Criar useRagQuery hook
# Atualizar DocsHybridSearchPage.tsx
# Adicionar ao menu

# 4. Testes (20 min)
/generate-tests DocsHybridSearchPage.tsx
npm run test
curl -X POST .../query (smoke test)

# 5. Otimizações (15 min)
/performance-audit --focus query-flow
/optimize-code useRagQuery.ts

# 6. Documentação (10 min)
# Criar docs/content/apps/rag-search/usage.mdx
```

**Total:** 90-120 minutos → **Sistema RAG 100% funcional!**

---

### **Opção 2: Paralelo Agressivo (60-80 min)**

```bash
# Fase 1: Diagnóstico Paralelo (8 min)
(/code-review DocsHybridSearchPage.tsx &)
(grep -r "router.*rag" tools/rag-services/src/routes/ &)
(curl http://localhost:8202/health &)
wait

# Fase 2 + 3: Backend e Frontend em Paralelo (35 min)
# Dev 1: Backend (query.ts, proxy)
# Dev 2: Frontend (useRagQuery, DocsHybridSearchPage)
# Merge após 35 min

# Fase 4: Testes (15 min)
npm run test && curl smoke tests

# Fase 5: Otimizações (10 min)
/optimize-code useRagQuery.ts

# Fase 6: Docs (5 min)
```

**Total:** 60-80 minutos com execução paralela

---

## 📁 Sistema de Outputs (Rastreabilidade)

```
outputs/workflow-rag-query/
├── 01-code-review-DocsHybridSearchPage.md
├── 02-backend-routes-audit.md
├── 03-llamaindex-query-health.md
├── 04-backend-query-implementation.md
├── 05-proxy-auth-implementation.md
├── 06-frontend-hook-implementation.md
├── 07-frontend-ui-implementation.md
├── 08-test-generation-report.md
├── 09-test-results.md
├── 10-smoke-test-results.md
├── 11-performance-audit-query.md
├── 12-optimization-report.md
└── 13-documentation.md
```

**Cada arquivo contém:**
- ✅ Timestamp de criação
- ✅ Decisões tomadas
- ✅ Código gerado
- ✅ Issues encontrados
- ✅ Next steps

---

## 🎯 Critérios de Sucesso

### Funcionalidade Mínima Viável (MVP)
- [ ] Busca semântica funciona
- [ ] Resultados ordenados por relevância
- [ ] Filtro por coleção funciona
- [ ] Performance < 2s por query
- [ ] UI integrada ao dashboard

### Funcionalidade Completa (Nice-to-Have)
- [ ] Search-as-you-type (debounced)
- [ ] Highlighting de termos
- [ ] Preview inline de docs
- [ ] Histórico de queries
- [ ] Export de resultados
- [ ] Métricas de uso

---

## 🔗 Dependências e Pré-requisitos

### Serviços Necessários
```bash
# Verificar status
docker ps --filter name=rag- --format "table {{.Names}}\t{{.Status}}"

# Esperado:
# rag-ollama              Up (healthy)
# rag-qdrant             Up
# rag-llamaindex-query   Up (healthy)
# rag-collections-service Up (healthy)
```

### Variáveis de Ambiente
```bash
# .env (já deve estar configurado)
QDRANT_URL=http://localhost:6333
OLLAMA_BASE_URL=http://localhost:11434
LLAMAINDEX_QUERY_URL=http://localhost:8202
RAG_COLLECTIONS_URL=http://localhost:3403
```

---

## 🚀 Como Usar Este Prompt

### Para Iniciar o Workflow:

```
@Claude, execute o workflow completo para finalizar o sistema RAG:

1. Inicie pela Fase 1 (Diagnóstico)
2. Para cada fase, aguarde minha aprovação antes de prosseguir
3. Documente todos os outputs em outputs/workflow-rag-query/
4. Ao final, forneça relatório de status completo

Foco: Implementar query/search funcional integrado ao dashboard.
Tempo estimado: 90-120 minutos.
```

---

## 📝 Notas Importantes

### Segurança
- ⚠️ **NUNCA** exponha JWT no frontend (mint server-side)
- ⚠️ Sanitize query input (evitar injection)
- ⚠️ Rate limiting obrigatório

### Performance
- 🎯 Objetivo: < 1s por query (com GPU)
- 🎯 Cache hit rate: > 30%
- 🎯 GPU utilization: > 80% durante embedding

### UX
- ✅ Loading states claros
- ✅ Error messages informativos
- ✅ Empty states (sem resultados)
- ✅ Skeleton UI durante loading

---

## ✅ Status Final Esperado

Ao completar este workflow, você terá:

```
✅ Sistema RAG 100% funcional
✅ Query UI integrada ao dashboard
✅ Busca semântica em múltiplas coleções
✅ Performance otimizada (< 1s)
✅ Testes automatizados (> 80% coverage)
✅ Documentação completa
✅ Logs persistentes
✅ Auditoria de queries
✅ GPU acelerada
✅ 100% on-premise
```

**Você terá um sistema RAG customizado, performático e integrado ao TradingSystem!** 🎉

---

**Criado:** 2025-11-02  
**Contexto:** TradingSystem RAG Implementation  
**Tempo Estimado:** 90-120 minutos  
**Complexidade:** Média-Alta


