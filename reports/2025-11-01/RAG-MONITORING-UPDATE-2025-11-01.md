# Atualização de Monitoramento RAG - 2025-11-01

**Status**: ✅ **COMPLETO**  
**Tipo**: Feature Enhancement  
**Escopo**: Backend + Frontend

---

## 📋 Resumo Executivo

Adicionado monitoramento completo de **todos os containers RAG** na "Visão Geral RAG" do Dashboard, expandindo de 3 para 6 serviços monitorados.

---

## 🎯 Problema Identificado

A "Visão Geral RAG" no Dashboard (`LlamaIndexPage.tsx`) mostrava apenas **3 serviços**:
- ✅ Query Service (rag-llamaindex-query)
- ✅ Ingestion Service (rag-llamaindex-ingest)
- ✅ Qdrant Vector DB (data-qdrant)

**Containers faltantes:**
- ❌ Ollama LLM (rag-ollama)
- ❌ Redis Cache (rag-redis)
- ❌ Collections Service (rag-collections-service)

---

## ✅ Solução Implementada

### 1. **Backend** (`backend/api/documentation-api/src/services/CollectionService.js`)

#### **Configuração de URLs dos novos serviços**:
```javascript
// Linha 27-29
this.ollamaBaseUrl = (config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://rag-ollama:11434').replace(/\/+$/, '');
this.redisUrl = (config.redisUrl || process.env.REDIS_URL || 'redis://rag-redis:6379');
this.collectionsServiceUrl = (config.collectionsServiceUrl || process.env.COLLECTIONS_SERVICE_URL || 'http://rag-collections-service:3402').replace(/\/+$/, '');
```

#### **Health checks expandidos** (`getHealth()` método):
```javascript
// Linha 118-124
const [queryHealth, ingestionHealth, ollamaHealth, redisHealth, collectionsHealth] = await Promise.allSettled([
  this._fetchJson(`${this.queryBaseUrl}/health`),
  this._fetchJson(`${this.ingestionBaseUrl}/health`),
  this._fetchJson(`${this.ollamaBaseUrl}/api/tags`), // Ollama não tem /health, usa /api/tags
  this._checkRedisHealth(),
  this._fetchJson(`${this.collectionsServiceUrl}/health`),
]);
```

#### **Resposta estendida**:
```javascript
services: {
  query: { ok, status, message, collection },
  ingestion: { ok, status, message },
  ollama: { ok, status, message: "4 modelo(s)" },
  redis: { ok, status, message: "connected" },
  collections: { ok, status, message },
}
```

---

### 2. **Frontend** (`frontend/dashboard/src/`)

#### **Interface TypeScript** (`hooks/llamaIndex/useRagManager.ts`):
```typescript
export interface RagStatusResponse {
  timestamp: string;
  requestedCollection?: string;
  services: {
    query: RagStatusServiceInfo;
    ingestion: RagStatusServiceInfo;
    ollama: RagStatusServiceInfo;        // ✅ NOVO
    redis: RagStatusServiceInfo;         // ✅ NOVO
    collections: RagStatusServiceInfo;   // ✅ NOVO
  };
  qdrant: {
    collection: string;
    // ...
  };
}
```

#### **Componente de Visualização** (`components/pages/LlamaIndexPage.tsx`):

**Ícones adicionados**:
```typescript
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Database, Zap, Search, Server, Layers } from 'lucide-react';
```

**Cards de monitoramento** (agora 6 serviços):
```typescript
const services = useMemo(() => {
  if (!status) return [];
  return [
    { id: 'query', label: 'Query Service', icon: Zap, ... },
    { id: 'ingestion', label: 'Ingestion Service', icon: Database, ... },
    { id: 'ollama', label: 'Ollama LLM', icon: Server, ... },          // ✅ NOVO
    { id: 'redis', label: 'Redis Cache', icon: Layers, ... },          // ✅ NOVO
    { id: 'collections', label: 'Collections Service', icon: Database, ... }, // ✅ NOVO
    { id: 'qdrant', label: 'Qdrant Vector DB', icon: Search, ... },
  ];
}, [status]);
```

**Layout responsivo ajustado**:
```typescript
// Grid adaptativo para 6 cards
<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
```

---

### 3. **Docker** (`backend/api/documentation-api/Dockerfile`)

**Fix de paths para build context correto**:
```dockerfile
# ANTES (errado - paths absolutos)
COPY backend/api/documentation-api/package*.json ./
COPY backend/shared /shared
COPY backend/api/documentation-api .

# DEPOIS (correto - relativo ao build context)
COPY api/documentation-api/package*.json ./
COPY shared /shared
COPY api/documentation-api .
```

---

## 🧪 Testes Realizados

### **Backend API (Endpoint `/api/v1/rag/status`)**

```bash
$ curl -s http://localhost:3401/api/v1/rag/status | jq '{services: .services | keys}'
{
  "services": [
    "collections",
    "ingestion",
    "ollama",
    "query",
    "redis"
  ]
}
```

### **Status detalhado de cada serviço**:
```json
{
  "services": {
    "query": { "ok": true, "status": 200, "message": "healthy", "collection": "documentation__nomic" },
    "ingestion": { "ok": true, "status": 200, "message": "healthy" },
    "ollama": { "ok": true, "status": 200, "message": "4 modelo(s)" },
    "redis": { "ok": true, "status": 200, "message": "connected" },
    "collections": { "ok": true, "status": 200, "message": "healthy" }
  }
}
```

✅ **Todos os 5 serviços retornando `ok: true` e status `200`**

---

## 📊 Resultados

### **Antes** (3 cards):
```
┌─────────────┐ ┌──────────────┐ ┌────────────────┐
│ Query       │ │ Ingestion    │ │ Qdrant Vector  │
│ Service     │ │ Service      │ │ DB             │
└─────────────┘ └──────────────┘ └────────────────┘
```

### **Depois** (6 cards):
```
┌─────────────┐ ┌──────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────────┐
│ Query       │ │ Ingestion    │ │ Ollama    │ │ Redis    │ │ Collections  │ │ Qdrant Vector  │
│ Service     │ │ Service      │ │ LLM       │ │ Cache    │ │ Service      │ │ DB             │
└─────────────┘ └──────────────┘ └───────────┘ └──────────┘ └──────────────┘ └────────────────┘
```

**Layout responsivo**:
- **Mobile** (< 768px): 1 coluna
- **Tablet** (>= 768px): 2 colunas
- **Desktop** (>= 1024px): 3 colunas
- **Wide Screen** (>= 1280px): 6 colunas

---

## 🔧 Arquivos Modificados

### **Backend**
1. **`backend/api/documentation-api/src/services/CollectionService.js`**
   - Adicionado `ollamaBaseUrl`, `redisUrl`, `collectionsServiceUrl` no construtor
   - Atualizado método `getHealth()` para incluir 3 novos serviços
   - Criado método `_checkRedisHealth()` para validação de Redis

2. **`backend/api/documentation-api/Dockerfile`**
   - Corrigido paths de `COPY` para build context relativo

### **Frontend**
3. **`frontend/dashboard/src/hooks/llamaIndex/useRagManager.ts`**
   - Estendida interface `RagStatusResponse.services` com `ollama`, `redis`, `collections`

4. **`frontend/dashboard/src/components/pages/LlamaIndexPage.tsx`**
   - Adicionados ícones `Server` e `Layers` (lucide-react)
   - Expandido array `services` de 3 para 6 serviços
   - Ajustado grid CSS para layout responsivo de 6 colunas

---

## 📦 Deploy

### **Comandos executados**:
```bash
# 1. Corrigir Dockerfile
# (paths ajustados manualmente)

# 2. Rebuild da imagem
docker compose -f tools/compose/docker-compose.docs.yml build docs-api

# 3. Recrear container
docker compose -f tools/compose/docker-compose.docs.yml up -d --force-recreate docs-api

# 4. Verificar logs
docker logs docs-api --tail 30

# 5. Testar endpoint
curl -s http://localhost:3401/api/v1/rag/status | jq '.services'
```

---

## 🎯 Próximos Passos (Opcional)

1. **Adicionar métricas adicionais**:
   - Ollama: Mostrar modelos carregados e memória usada
   - Redis: Mostrar quantidade de chaves e uso de memória
   - Collections: Mostrar número de coleções gerenciadas

2. **Melhorar health checks**:
   - Redis: Implementar PING via cliente Redis real
   - Timeout configurável por serviço
   - Retry logic para serviços temporariamente indisponíveis

3. **Alertas visuais**:
   - Notificação toast quando algum serviço cair
   - Histórico de uptime/downtime
   - Gráfico de latência de health checks

---

## 📚 Documentação Relacionada

- **[docs/content/tools/rag/architecture.mdx](docs/content/tools/rag/architecture.mdx)** - Arquitetura RAG
- **[tools/compose/docker-compose.rag.yml](tools/compose/docker-compose.rag.yml)** - Definição dos containers RAG
- **[backend/api/documentation-api/README.md](backend/api/documentation-api/README.md)** - Documentation API

---

**Implementado por**: Claude (Cursor AI)  
**Data**: 2025-11-01 06:30  
**Containers Monitorados**: 6/6 ✅  
**Health Status**: 100% Healthy ✅

