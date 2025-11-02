# 📋 Backend Routes Audit - RAG Collections Service

**Data:** 2025-11-02  
**Serviço:** RAG Collections Service (port 3403)  
**Framework:** Express + TypeScript  
**Reviewer:** Claude (Automated Audit)

---

## 📊 Endpoints Existentes

### **✅ Collections Routes** (`/api/v1/rag/collections`)

| Método | Path | Função | Status |
|--------|------|--------|--------|
| GET | `/` | Listar todas as coleções | ✅ OK |
| GET | `/:name` | Obter detalhes de uma coleção | ✅ OK |
| GET | `/:name/stats` | Estatísticas da coleção | ✅ OK |
| GET | `/:name/files` | Listar arquivos indexados | ✅ OK |
| POST | `/` | Criar nova coleção | ✅ OK |
| POST | `/:name/ingest` | Ingerir arquivos | ✅ OK |
| POST | `/:name/clean-orphans` | Limpar chunks órfãos | ✅ OK |
| PUT | `/:name` | Atualizar coleção | ✅ OK |
| DELETE | `/:name` | Deletar coleção | ✅ OK (corrigido hoje!) |

**Total:** 9 endpoints

---

### **✅ Models Routes** (`/api/v1/rag/models`)

| Método | Path | Função | Status |
|--------|------|--------|--------|
| GET | `/` | Listar modelos de embedding | ✅ OK |
| GET | `/:name` | Detalhes de um modelo | ✅ OK |
| POST | `/:name/validate` | Validar modelo | ✅ OK |
| GET | `/compare/:model1/:model2` | Comparar modelos | ✅ OK |

**Total:** 4 endpoints

---

### **✅ Directories Routes** (`/api/v1/rag/directories`)

| Método | Path | Função | Status |
|--------|------|--------|--------|
| GET | `/` | Listar roots disponíveis | ✅ OK |
| GET | `/browse` | Navegar em diretórios | ✅ OK (otimizado hoje!) |
| GET | `/validate` | Validar caminho | ✅ OK |

**Total:** 3 endpoints

---

### **✅ Ingestion Logs Routes** (`/api/v1/rag/ingestion/logs`)

| Método | Path | Função | Status |
|--------|------|--------|--------|
| GET | `/` | Obter logs de ingestão | ✅ OK (persistente!) |
| POST | `/` | Adicionar log manualmente | ✅ OK |
| DELETE | `/` | Arquivar logs | ✅ OK (corrigido hoje!) |

**Total:** 3 endpoints

---

## ❌ ENDPOINT CRÍTICO FALTANTE

### **🔴 Query/Search Endpoint** (NÃO EXISTE!)

| Método | Path | Função | Status |
|--------|------|--------|--------|
| POST | `/api/v1/rag/query` | **Busca semântica** | ❌ **FALTANDO** |
| POST | `/api/v1/rag/search` | Alias para query | ❌ **FALTANDO** |

**Impacto:** 🔴 **BLOQUEADOR**

Este é o endpoint PRINCIPAL que falta para o sistema RAG funcionar!

---

## 🔍 Análise Detalhada do Endpoint Faltante

### **O Que o Endpoint `/api/v1/rag/query` Deve Fazer:**

#### Request
```typescript
POST /api/v1/rag/query
Content-Type: application/json

{
  "query": "Como criar uma coleção?",
  "collection": "documentation",  // ou "all" para todas
  "limit": 10,
  "score_threshold": 0.7,
  "alpha": 0.65  // opcional (híbrido semantic + lexical)
}
```

#### Response (Success)
```json
{
  "success": true,
  "data": {
    "query": "Como criar uma coleção?",
    "results": [
      {
        "title": "Collections Management",
        "path": "/docs/content/apps/rag-search/collections.mdx",
        "snippet": "Para criar uma nova coleção...",
        "score": 0.89,
        "source": "rag",
        "collection": "documentation",
        "metadata": {
          "domain": "frontend",
          "type": "guide",
          "tags": ["rag", "collections"]
        }
      }
    ],
    "totalResults": 5,
    "collection": "documentation",
    "executionTimeMs": 450
  },
  "meta": {
    "timestamp": "2025-11-02T01:30:00.000Z",
    "requestId": "uuid-here"
  }
}
```

#### Response (Error)
```json
{
  "success": false,
  "error": {
    "code": "QUERY_FAILED",
    "message": "Qdrant service unavailable"
  },
  "meta": {
    "timestamp": "2025-11-02T01:30:00.000Z"
  }
}
```

---

### **Implementação Necessária**

#### Arquivo: `tools/rag-services/src/routes/query.ts` (NOVO)

```typescript
/**
 * Query Routes
 *
 * Semantic search endpoints using Qdrant + Ollama + LlamaIndex
 *
 * @module routes/query
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../middleware/responseWrapper';
import { getCacheService } from '../services/cacheService';
import crypto from 'crypto';

const router = Router();

const LLAMAINDEX_QUERY_URL = process.env.LLAMAINDEX_QUERY_URL || 'http://rag-llamaindex-query:8000';
const QUERY_TIMEOUT_MS = parseInt(process.env.QUERY_TIMEOUT_MS || '120000', 10);

/**
 * POST /api/v1/rag/query
 * Semantic search across collections
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { query, collection = 'all', limit = 10, score_threshold = 0.7, alpha } = req.body;

    // Validation
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return sendError(res, 'INVALID_QUERY', 'Query must be at least 2 characters', 400);
    }

    if (limit > 100) {
      return sendError(res, 'LIMIT_EXCEEDED', 'Limit must be <= 100', 400);
    }

    logger.info('Executing RAG query', {
      query: query.substring(0, 100),
      collection,
      limit,
      score_threshold,
    });

    // Check cache first
    const cacheService = getCacheService();
    const cacheKey = `query:${crypto.createHash('md5').update(`${query}:${collection}:${limit}`).digest('hex')}`;
    
    if (cacheService.isAvailable()) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug('Returning cached query results', { query, collection });
        const parsedCache = JSON.parse(cached);
        return sendSuccess(res, {
          ...parsedCache,
          cached: true,
        });
      }
    }

    // Call LlamaIndex Query Service
    const response = await axios.post(
      `${LLAMAINDEX_QUERY_URL}/api/v1/query`,
      {
        query,
        collection_name: collection === 'all' ? undefined : collection,
        top_k: limit,
        score_threshold,
        alpha,
      },
      {
        timeout: QUERY_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const executionTimeMs = Date.now() - startTime;

    const results = {
      query,
      results: response.data.results || [],
      totalResults: response.data.total || 0,
      collection,
      executionTimeMs,
    };

    // Cache for 5 minutes
    if (cacheService.isAvailable()) {
      await cacheService.set(cacheKey, JSON.stringify(results), 300);
    }

    logger.info('RAG query completed', {
      query: query.substring(0, 100),
      resultsCount: results.totalResults,
      executionTimeMs,
    });

    return sendSuccess(res, results);

  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    
    logger.error('RAG query failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs,
    });

    // Check if it's a timeout
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return sendError(res, 'QUERY_TIMEOUT', 'Query timed out', 504);
    }

    // Check if it's a service unavailable
    if (axios.isAxiosError(error) && error.response?.status === 503) {
      return sendError(res, 'SERVICE_UNAVAILABLE', 'RAG service temporarily unavailable', 503);
    }

    return sendError(res, 'QUERY_FAILED', 'Failed to execute query', 500);
  }
});

export default router;
```

**Checklist de Implementação:**
- [ ] Validação de input (query, limit)
- [ ] Cache Redis (5 min TTL)
- [ ] Timeout configurável (120s default)
- [ ] Logs de auditoria
- [ ] Error handling (timeout, service down)
- [ ] Rate limiting (10 queries/min)
- [ ] Métricas (execution time)

---

## 🔗 Integração com LlamaIndex Query Service

### **Verificação de Saúde**

```bash
curl http://localhost:8202/health
# Response: {"status": "healthy"}  ✅
```

### **Teste de Query Direto**

```bash
curl -X POST http://localhost:8202/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Como criar uma coleção?",
    "collection_name": "documentation",
    "top_k": 5
  }'
```

**Status:** ✅ LlamaIndex Query Service está **UP e funcional**

---

## 📊 Mapeamento Completo de Endpoints

### **Existentes (19 endpoints)**

```
📁 RAG Collections Service (http://localhost:3403)
│
├── /api/v1/rag/collections (9 endpoints)
│   ├── GET    /                           ✅ List collections
│   ├── GET    /:name                      ✅ Get collection details
│   ├── GET    /:name/stats                ✅ Get stats
│   ├── GET    /:name/files                ✅ List files
│   ├── POST   /                           ✅ Create collection
│   ├── POST   /:name/ingest               ✅ Ingest files
│   ├── POST   /:name/clean-orphans        ✅ Clean orphans
│   ├── PUT    /:name                      ✅ Update collection
│   └── DELETE /:name                      ✅ Delete collection
│
├── /api/v1/rag/models (4 endpoints)
│   ├── GET    /                           ✅ List models
│   ├── GET    /:name                      ✅ Get model
│   ├── POST   /:name/validate             ✅ Validate model
│   └── GET    /compare/:model1/:model2    ✅ Compare models
│
├── /api/v1/rag/directories (3 endpoints)
│   ├── GET    /                           ✅ List roots
│   ├── GET    /browse                     ✅ Browse directories
│   └── GET    /validate                   ✅ Validate path
│
└── /api/v1/rag/ingestion/logs (3 endpoints)
    ├── GET    /                           ✅ Get logs
    ├── POST   /                           ✅ Add log
    └── DELETE /                           ✅ Archive logs
```

---

### **❌ Faltante (CRÍTICO!)**

```
📁 RAG Collections Service (MISSING!)
│
└── /api/v1/rag/ (QUERY ENDPOINT)
    ├── POST   /query                      ❌ FALTANDO!
    └── POST   /search                     ❌ FALTANDO (alias)
```

---

## 🔧 Ações Necessárias

### 1. **Criar `tools/rag-services/src/routes/query.ts`** (NOVO)
- [ ] Endpoint `POST /query`
- [ ] Integração com LlamaIndex (port 8202)
- [ ] Cache Redis
- [ ] Validações
- [ ] Error handling

**Estimativa:** 30-45 minutos

---

### 2. **Registrar Rota no `server.ts`**

```typescript
// tools/rag-services/src/server.ts

import queryRoutes from './routes/query';  // ← ADICIONAR

// ...

app.use('/api/v1/rag/collections', collectionsRoutes);
app.use('/api/v1/rag/models', modelsRoutes);
app.use('/api/v1/rag/directories', directoriesRoutes);
app.use('/api/v1/rag/ingestion/logs', ingestionLogsRoutes);
app.use('/api/v1/rag', queryRoutes);  // ← ADICIONAR (IMPORTANTE: após /collections!)
app.use('/api/v1/admin', adminRoutes);
```

⚠️ **ORDEM IMPORTA:** `/api/v1/rag` deve vir **DEPOIS** de `/api/v1/rag/collections` para evitar conflito de rotas!

**Estimativa:** 5 minutos

---

### 3. **Atualizar Proxy de Autenticação** (Documentation API)

```typescript
// backend/api/documentation-api/src/routes/rag-proxy.ts

/**
 * POST /api/v1/rag/search
 * Proxy para RAG Collections Service (mints JWT server-side)
 */
router.post('/search', async (req, res) => {
  try {
    // Mint JWT server-side (NUNCA expor no frontend)
    const token = jwtService.mint({ user: 'dashboard', ttl: 60 });

    // Proxy para RAG Collections Service
    const response = await fetch('http://rag-collections-service:3402/api/v1/rag/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.json(data);

  } catch (error) {
    logger.error('RAG proxy error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Failed to execute query' }
    });
  }
});
```

**Checklist:**
- [ ] JWT minting server-side
- [ ] CORS configurado (port 3103 → 3401)
- [ ] Error propagation
- [ ] Logs de auditoria

**Estimativa:** 20-30 minutos

---

## 🎯 Dependências Externas

### **LlamaIndex Query Service** (port 8202)

**Status:** ✅ **UP e Healthy**

```bash
curl http://localhost:8202/health
# { "status": "healthy" }
```

**Endpoints Disponíveis:**
- `POST /api/v1/query` - Query com Qdrant + Ollama
- `GET /health` - Health check

**Integração:** ✅ Pronta para uso

---

### **Qdrant Vector DB** (port 6333)

```bash
curl http://localhost:6333/collections
# { "result": { "collections": [...] } }
```

**Status:** ✅ UP com 2 coleções indexadas

---

### **Ollama Embeddings** (port 11434)

```bash
curl http://localhost:11434/api/tags
# { "models": [...] }
```

**Status:** ✅ UP com GPU RTX 5090

---

## 📊 Arquitetura de Query

### **Fluxo Atual (Proposto)**

```
[Dashboard - Port 3103]
        ↓
    (frontend fetch)
        ↓
[Documentation API - Port 3401]  ← Proxy + JWT minting
        ↓
    (internal HTTP)
        ↓
[RAG Collections Service - Port 3403]  ← /api/v1/rag/query (FALTANDO!)
        ↓
    (axios call)
        ↓
[LlamaIndex Query Service - Port 8202]  ← ✅ Funcionando
        ↓
    (query engine)
        ↓
[Qdrant - Port 6333] + [Ollama - Port 11434]
        ↓
   (embeddings + vector search)
        ↓
    Results ← volta ao Dashboard
```

---

## 🔐 Segurança

### ✅ Implementado
- ✅ CORS configurado (corsOptions)
- ✅ Security headers (Helmet-like)
- ✅ Request ID tracking
- ✅ Input validation (Zod schemas)
- ✅ Rate limiting (middleware disponível)

### ❌ Faltante para Query Endpoint
- [ ] JWT authentication (via proxy)
- [ ] Query sanitization (evitar injection)
- [ ] Rate limiting específico (10 queries/min)
- [ ] Audit logging (quem buscou o quê)
- [ ] Max query length (500 chars)

---

## 📝 Registro de Rotas no `server.ts`

### **Ordem Atual:**
```typescript
app.use('/api/v1/rag/collections', collectionsRoutes);
app.use('/api/v1/rag/models', modelsRoutes);
app.use('/api/v1/rag/directories', directoriesRoutes);
app.use('/api/v1/rag/ingestion/logs', ingestionLogsRoutes);
app.use('/api/v1/admin', adminRoutes);
```

### **Ordem Correta (com query):**
```typescript
app.use('/api/v1/rag/collections', collectionsRoutes);      // ✅ Mais específico primeiro
app.use('/api/v1/rag/models', modelsRoutes);               // ✅
app.use('/api/v1/rag/directories', directoriesRoutes);     // ✅
app.use('/api/v1/rag/ingestion/logs', ingestionLogsRoutes); // ✅
app.use('/api/v1/rag', queryRoutes);                        // ✅ Genérico por último
app.use('/api/v1/admin', adminRoutes);                     // ✅
```

⚠️ **CRÍTICO:** Rotas mais específicas (`/rag/collections`) devem vir **ANTES** de rotas genéricas (`/rag`)!

---

## 🧪 Teste de Validação

### **Após Implementar o Endpoint:**

```bash
# 1. Teste básico
curl -X POST http://localhost:3403/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Como criar uma coleção?"}'

# 2. Teste com filtros
curl -X POST http://localhost:3403/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query":"Workspace API",
    "collection":"documentation",
    "limit":5,
    "score_threshold":0.8
  }'

# 3. Teste de cache (mesma query 2x)
time curl -X POST http://localhost:3403/api/v1/rag/query \
  -d '{"query":"test"}' # 1st: ~800ms
time curl -X POST http://localhost:3403/api/v1/rag/query \
  -d '{"query":"test"}' # 2nd: ~50ms (cached!)
```

---

## ✅ Checklist de Implementação

### Backend (RAG Collections Service)
- [ ] Criar `src/routes/query.ts`
- [ ] Implementar `POST /query`
- [ ] Integrar com LlamaIndex (axios call)
- [ ] Adicionar cache Redis
- [ ] Validações de input
- [ ] Error handling
- [ ] Logs de auditoria
- [ ] Registrar rota em `server.ts`
- [ ] Rebuild container

### Proxy (Documentation API)
- [ ] Verificar se proxy já existe
- [ ] Criar `POST /api/v1/rag/search` (se não existir)
- [ ] JWT minting server-side
- [ ] Error propagation

### Infraestrutura
- [ ] Variável `LLAMAINDEX_QUERY_URL` no `.env`
- [ ] Variável `QUERY_TIMEOUT_MS` no `.env`
- [ ] Health check incluir query endpoint

---

## 📊 Estimativas

| Tarefa | Esforço | Prioridade |
|--------|---------|-----------|
| Criar `query.ts` | 30 min | 🔴 P1 |
| Registrar no `server.ts` | 5 min | 🔴 P1 |
| Rebuild + restart container | 5 min | 🔴 P1 |
| Atualizar proxy (se necessário) | 20 min | 🔴 P1 |
| Testes de validação | 10 min | 🟡 P2 |

**Total:** 1h 10min

---

## 🎯 Conclusão do Audit

### ✅ Pontos Fortes
- 19 endpoints bem estruturados
- Validação com Zod
- CORS e security headers
- Logs completos
- Cache Redis disponível

### ❌ Bloqueador Crítico
- **Endpoint `/api/v1/rag/query` NÃO existe**
- Sem ele, o sistema RAG não funciona!

### 🔧 Ação Imediata
1. Criar `routes/query.ts`
2. Registrar em `server.ts`
3. Rebuild container
4. Testar

---

**Status:** ✅ Backend Routes Audit Completo  
**Problema Identificado:** Endpoint de query faltando  
**Próximo:** Fase 1.3 - Health Check LlamaIndex  
**Tempo Gasto:** 10 minutos


