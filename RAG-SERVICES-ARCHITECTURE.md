# RAG Services - Arquitetura Completa

## 📋 Visão Geral

O sistema RAG (Retrieval-Augmented Generation) do TradingSystem é composto por **6 containers Docker** organizados em uma arquitetura de microserviços, responsáveis por processamento de documentação, busca semântica, embeddings e gerenciamento de coleções.

## 🏗️ Arquitetura de Containers

### Stack RAG (docker-compose.rag.yml)

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAG SERVICES STACK                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │   Ollama    │────▶│  LlamaIndex  │────▶│  LlamaIndex  │     │
│  │   (GPU)     │     │  Ingestion   │     │    Query     │     │
│  │  Port 11434 │     │  Port 8201   │     │  Port 8202   │     │
│  └─────────────┘     └──────────────┘     └──────────────┘     │
│         │                     │                     │            │
│         │                     ▼                     │            │
│         │            ┌──────────────┐              │            │
│         └───────────▶│   Qdrant     │◀─────────────┘            │
│                      │  Vector DB   │                           │
│                      │  Port 6333   │                           │
│                      └──────────────┘                           │
│                              ▲                                   │
│         ┌────────────────────┴────────────────────┐            │
│         │                                          │            │
│  ┌──────────────┐                    ┌────────────────────┐   │
│  │ RAG Service  │                    │ RAG Collections    │   │
│  │ (Doc API)    │                    │    Service         │   │
│  │ Port 3402    │                    │   Port 3403        │   │
│  └──────────────┘                    └────────────────────┘   │
│         │                                          │            │
│         └──────────────────┬───────────────────────┘            │
│                            │                                    │
│                            ▼                                    │
│                   ┌──────────────┐                             │
│                   │  Dashboard   │                             │
│                   │  Port 3103   │                             │
│                   └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🐳 Containers Detalhados

### 1. **rag-ollama** (Ollama - Modelos LLM/Embeddings)

**Imagem**: `ollama/ollama:latest`
**Container**: `rag-ollama`
**Porta Externa**: `11434`
**Recursos**:
- GPU: NVIDIA (todas as GPUs disponíveis)
- Memory: 8GB limit
- CPU: 4 cores

**Função**:
- Hospeda modelos de LLM e embeddings localmente
- Fornece API para geração de embeddings vetoriais
- Suporta múltiplos modelos simultaneamente

**Modelos Configurados**:
```bash
# Embeddings
- nomic-embed-text:latest (768 dim, 8192 ctx)
- mxbai-embed-large:latest (384 dim, 512 ctx)
- embeddinggemma:latest (768 dim, 2048 ctx)

# LLM
- llama3.1 (geração de respostas)
- llama3.2:3b (respostas rápidas)
```

**Environment Variables**:
```env
OLLAMA_PORT=11434
NVIDIA_VISIBLE_DEVICES=all
NVIDIA_DRIVER_CAPABILITIES=compute,utility
```

**Volumes**:
- `ollama_models:/root/.ollama` (persistência de modelos)

**Health Check**:
```bash
pgrep ollama || exit 1
```

---

### 2. **rag-llamaindex-ingest** (LlamaIndex Ingestion Service)

**Imagem**: `img-rag-llamaindex-ingest:latest` (build custom)
**Container**: `rag-llamaindex-ingest`
**Porta Externa**: `8201` → Porta Interna: `8000`
**Recursos**:
- Memory: 4GB limit
- CPU: 2 cores

**Função**:
- Processa e indexa documentos
- Gera embeddings usando Ollama
- Armazena vetores no Qdrant
- Suporta múltiplos formatos (MD, MDX, TXT, PDF, DOCX)

**Build**:
```dockerfile
Context: tools/llamaindex
Dockerfile: Dockerfile.ingestion
```

**Environment Variables**:
```env
LLAMAINDEX_INGESTION_PORT=8201
QDRANT_HOST=data-qdrant
QDRANT_PORT=6333
QDRANT_COLLECTION=documentation__nomic
OLLAMA_BASE_URL=http://rag-ollama:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_MODEL=llama3.1
JWT_SECRET_KEY=dev-secret
JWT_ALGORITHM=HS256
```

**Volumes**:
```yaml
- ../../docs:/data/docs:ro                # Documentação Docusaurus
- ../../:/data/tradingsystem:ro           # Todo o projeto (read-only)
```

**Endpoints**:
- `POST /ingest` - Ingestão de documentos
- `GET /health` - Health check
- `POST /collections/{name}/ingest` - Ingestão por coleção

**Health Check**:
```bash
curl -f http://localhost:8000/health
```

**Dependências**:
- `rag-ollama` (healthy)

---

### 3. **rag-llamaindex-query** (LlamaIndex Query Service)

**Imagem**: `img-rag-llamaindex-query:latest` (build custom)
**Container**: `rag-llamaindex-query`
**Porta Externa**: `8202` → Porta Interna: `8000`
**Recursos**:
- Memory: 4GB limit
- CPU: 2 cores

**Função**:
- Executa queries semânticas
- Gera respostas com contexto RAG
- Usa embeddings para similaridade vetorial
- Retorna documentos relevantes + resposta gerada

**Build**:
```dockerfile
Context: tools/llamaindex
Dockerfile: Dockerfile.query
```

**Environment Variables**:
```env
LLAMAINDEX_QUERY_PORT=8202
QDRANT_HOST=data-qdrant
QDRANT_PORT=6333
QDRANT_COLLECTION=documentation__nomic
OLLAMA_BASE_URL=http://rag-ollama:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_MODEL=llama3.1
OLLAMA_REQUEST_TIMEOUT=300.0
JWT_SECRET_KEY=dev-secret
JWT_ALGORITHM=HS256
```

**Endpoints**:
- `POST /query` - Query com RAG
- `POST /search` - Busca semântica (sem LLM)
- `GET /health` - Health check

**Health Check**:
```bash
curl -f http://localhost:8000/health
```

**Dependências**:
- `rag-ollama` (healthy)

---

### 4. **rag-service** (Documentation API - RAG Proxy)

**Imagem**: `img-rag-service:latest` (build custom)
**Container**: `rag-service`
**Porta Externa**: `3402` → Porta Interna: `3000`
**Recursos**: Default (sem limites explícitos)

**Função**:
- **Proxy reverso** para LlamaIndex services
- Centraliza autenticação (JWT server-side)
- Agrega status de todos os serviços RAG
- Gerencia cache de status (30s TTL)
- Fornece endpoints unificados para frontend

**Build**:
```dockerfile
Context: ../.. (project root)
Dockerfile: backend/api/documentation-api/Dockerfile
```

**Source Code**:
```
backend/api/documentation-api/
├── src/
│   ├── routes/
│   │   ├── rag-proxy.js        # Proxy para LlamaIndex
│   │   ├── rag-status.js       # Status agregado
│   │   └── rag-collections.js  # CRUD de coleções (proxy para rag-collections-service)
│   ├── services/
│   │   └── markdownSearchService.js
│   └── server.js
└── Dockerfile
```

**Environment Variables**:
```env
DOCUMENTATION_API_PORT=3402
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
LLAMAINDEX_QUERY_URL=http://rag-llamaindex-query:8000
LLAMAINDEX_INGESTION_URL=http://rag-llamaindex-ingest:8000
QDRANT_URL=http://data-qdrant:6333
QDRANT_COLLECTION=documentation__nomic
OLLAMA_BASE_URL=http://rag-ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
RAG_TIMEOUT_MS=30000
STATUS_CACHE_TTL_MS=30000
JWT_SECRET_KEY=dev-secret
JWT_ALGORITHM=HS256
```

**Endpoints**:
```javascript
// RAG Proxy (mints JWT server-side)
POST   /api/v1/rag/query          // Query com RAG
POST   /api/v1/rag/search         // Busca semântica
POST   /api/v1/rag/ingest         // Trigger ingestion

// Status (agregado)
GET    /api/v1/rag/status         // Status de todos os serviços
GET    /api/v1/rag/status/health  // Health check

// Collections (proxy para rag-collections-service)
GET    /api/v1/rag/collections
POST   /api/v1/rag/collections
GET    /api/v1/rag/collections/:name
PUT    /api/v1/rag/collections/:name
DELETE /api/v1/rag/collections/:name
POST   /api/v1/rag/collections/:name/ingest

// Models
GET    /api/v1/rag/models
GET    /api/v1/rag/models/:name
```

**Health Check**:
```javascript
require('http').get('http://localhost:3000/api/v1/rag/status/health', ...)
```

**Dependências**:
- `rag-llamaindex-query` (healthy)
- `rag-llamaindex-ingest` (healthy)

---

### 5. **rag-collections-service** (RAG Collections Manager)

**Imagem**: `img-rag-collections-service:latest` (build custom)
**Container**: `rag-collections-service`
**Porta Externa**: `3403` → Porta Interna: `3402`
**Recursos**:
- Memory: 2GB limit
- CPU: 1 core

**Função**:
- **Gerenciamento de coleções RAG** (CRUD completo)
- **File watcher** (detecta mudanças em diretórios)
- **Auto-ingestion** (quando autoUpdate=true)
- **Validação de modelos** Ollama
- **Estatísticas detalhadas** (arquivos, chunks, órfãos)

**Build**:
```dockerfile
Context: tools/rag-services
Dockerfile: Dockerfile
```

**Source Code** (TypeScript):
```
tools/rag-services/src/
├── config/
│   └── cors.ts
├── middleware/
│   ├── errorHandler.ts
│   ├── responseWrapper.ts
│   └── validation.ts
├── routes/
│   ├── collections.ts      # CRUD de coleções
│   ├── directories.ts      # Listagem de diretórios
│   └── models.ts           # Modelos disponíveis
├── services/
│   ├── collectionManager.ts   # Lógica de negócio
│   ├── fileWatcher.ts         # Observa mudanças em arquivos
│   └── ingestionService.ts    # Integração com LlamaIndex
├── utils/
│   └── logger.ts
└── server.ts
```

**Environment Variables**:
```env
RAG_COLLECTIONS_PORT=3403
NODE_ENV=production
PORT=3402
HOST=0.0.0.0
LOG_LEVEL=info
FRONTEND_URL=http://localhost:3103
LLAMAINDEX_INGESTION_URL=http://rag-llamaindex-ingest:8000
QDRANT_URL=http://data-qdrant:6333
OLLAMA_EMBEDDINGS_URL=http://rag-ollama:11434
FILE_WATCHER_ENABLED=true
FILE_WATCHER_DEBOUNCE_MS=5000
COLLECTIONS_CONFIG_PATH=/app/collections-config.json
INTER_SERVICE_SECRET=dev-secret
JWT_SECRET_KEY=dev-secret
INGESTION_TIMEOUT_MS=300000
```

**Volumes**:
```yaml
- ../rag-services/collections-config.json:/app/collections-config.json:ro
- ../../docs:/data/docs:ro
```

**Collections Config** (`collections-config.json`):
```json
{
  "collections": [
    {
      "name": "tradingsystem-docs",
      "description": "TradingSystem complete documentation",
      "directory": "/data/docs/content",
      "embeddingModel": "nomic-embed-text",
      "chunkSize": 512,
      "chunkOverlap": 128,
      "fileTypes": [".md", ".mdx", ".txt"],
      "recursive": true,
      "enabled": true,
      "autoUpdate": true
    }
  ]
}
```

**Endpoints**:
```typescript
// Collections CRUD
GET    /api/v1/rag/collections              // List all
POST   /api/v1/rag/collections              // Create
GET    /api/v1/rag/collections/:name        // Get one
PUT    /api/v1/rag/collections/:name        // Update
DELETE /api/v1/rag/collections/:name        // Delete
POST   /api/v1/rag/collections/:name/ingest // Trigger ingestion
GET    /api/v1/rag/collections/:name/stats  // Statistics

// Models
GET    /api/v1/rag/models                   // List available
GET    /api/v1/rag/models/:name             // Get model info
POST   /api/v1/rag/models/:name/validate    // Validate model

// Directories
GET    /api/v1/rag/directories              // List available dirs

// Health
GET    /health
```

**Response Format** (Standardized):
```typescript
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "nomic-embed-text",
        "dimensions": 384,
        "description": "Fast and efficient embedding model",
        "isDefault": true,
        "capabilities": ["semantic-search", "classification"],
        "performance": "fast",
        "useCase": "General purpose documentation",
        "available": true
      }
    ],
    "total": 2,
    "available": 2,
    "default": "nomic-embed-text"
  },
  "meta": {
    "timestamp": "2025-10-31T...",
    "requestId": "uuid",
    "version": "v1"
  }
}
```

**Health Check**:
```javascript
require('http').get('http://127.0.0.1:3402/health', ...)
```

**Dependências**:
- `rag-llamaindex-ingest` (healthy)

---

### 6. **data-qdrant** (Vector Database)

**Imagem**: `qdrant/qdrant:latest`
**Container**: `data-qdrant`
**Portas Externas**:
- `6333` (HTTP API)
- `6334` (gRPC)

**Recursos**:
- Memory: 2GB limit
- CPU: 2 cores

**Função**:
- Armazena vetores de embeddings
- Executa buscas por similaridade
- Gerencia múltiplas coleções
- Persiste snapshots

**Environment Variables**:
```env
QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334
QDRANT_ALLOW_RECOVERY=true
QDRANT_ENABLE_TLS=false
QDRANT_LOG_LEVEL=INFO
```

**Collections**:
```python
# Current collections
- documentation__nomic     # 768 dimensions (nomic-embed-text)
- documentation__mxbai     # 384 dimensions (mxbai-embed-large)
- docs_index_mxbai         # Fallback collection
```

**Health Check**:
```bash
grep -q '18BD' /proc/net/tcp  # Port 6333 in hex
```

**Web UI**:
- `http://localhost:6333/dashboard`

---

## 🔄 Fluxo de Dados

### 1. Ingestion Flow (Indexação)

```
┌─────────────┐
│  Dashboard  │ POST /api/v1/rag/collections/{name}/ingest
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ RAG Collections  │ Valida coleção, busca arquivos
│    Service       │
│   (Port 3403)    │
└──────┬───────────┘
       │ POST /ingest with files
       ▼
┌──────────────────┐
│   LlamaIndex     │ 1. Lê arquivos
│   Ingestion      │ 2. Chunking (512 tokens, 128 overlap)
│   (Port 8201)    │ 3. Gera embeddings via Ollama
└──────┬───────────┘
       │
       ├──────────────────────┐
       │                      │
       ▼                      ▼
┌──────────────┐      ┌──────────────┐
│    Ollama    │      │   Qdrant     │
│ (Port 11434) │      │ (Port 6333)  │
│              │      │              │
│ Embedding    │      │ Store vectors│
│ Generation   │───▶  │ with metadata│
└──────────────┘      └──────────────┘
```

**Steps**:
1. User clicks "Executar Ingestão" no dashboard
2. Dashboard calls `POST /api/v1/rag/collections/{name}/ingest` (port 3403)
3. RAG Collections Service:
   - Validates collection exists
   - Scans directory for files matching `fileTypes`
   - Filters by `recursive` setting
4. Calls LlamaIndex Ingestion Service with file list
5. LlamaIndex Ingestion:
   - Reads files from volume `/data/docs`
   - Splits into chunks (chunkSize/chunkOverlap)
   - Generates embeddings via Ollama
   - Stores vectors in Qdrant with metadata:
     ```json
     {
       "id": "uuid",
       "vector": [0.123, 0.456, ...],
       "payload": {
         "file_path": "/data/docs/content/api/overview.mdx",
         "collection": "tradingsystem-docs",
         "chunk_index": 0,
         "text": "# API Overview\n...",
         "metadata": { "title": "API Overview", "tags": ["api"] }
       }
     }
     ```

---

### 2. Query Flow (Busca Semântica)

```
┌─────────────┐
│  Dashboard  │ POST /api/v1/rag/query
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│   RAG Service    │ Mints JWT (server-side)
│  (Port 3402)     │
└──────┬───────────┘
       │ POST /query with JWT
       ▼
┌──────────────────┐
│   LlamaIndex     │ 1. Gera embedding da query
│     Query        │ 2. Busca no Qdrant (top-k)
│   (Port 8202)    │ 3. Gera resposta com LLM
└──────┬───────────┘
       │
       ├──────────────────────┐
       │                      │
       ▼                      ▼
┌──────────────┐      ┌──────────────┐
│    Ollama    │      │   Qdrant     │
│ (Port 11434) │      │ (Port 6333)  │
│              │      │              │
│ 1. Embedding │      │ Vector search│
│ 2. LLM Gen   │◀─────│ Returns docs │
└──────────────┘      └──────────────┘
       │
       │ Response
       ▼
┌──────────────────┐
│   RAG Service    │ Returns to dashboard
│  (Port 3402)     │
└──────┬───────────┘
       │
       ▼
┌─────────────┐
│  Dashboard  │ Displays answer + sources
└─────────────┘
```

**Steps**:
1. User types query in dashboard
2. Dashboard calls `POST /api/v1/rag/query` (port 3402)
3. RAG Service (Documentation API):
   - Mints JWT token server-side
   - Forwards to LlamaIndex Query Service
4. LlamaIndex Query:
   - Generates query embedding via Ollama
   - Searches Qdrant for similar vectors (top-k=5)
   - Receives relevant chunks
   - Builds context prompt with retrieved docs
   - Calls Ollama LLM for answer generation
5. Returns response:
   ```json
   {
     "answer": "The API is organized into...",
     "sources": [
       {
         "file_path": "/data/docs/content/api/overview.mdx",
         "chunk": "# API Overview\n...",
         "score": 0.87
       }
     ],
     "model": "llama3.1",
     "embedding_model": "nomic-embed-text"
   }
   ```

---

### 3. Status Monitoring Flow

```
┌─────────────┐
│  Dashboard  │ GET /api/v1/rag/status (every 15s)
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│   RAG Service    │ Aggregates status from all services
│  (Port 3402)     │ (cached 30s)
└──────┬───────────┘
       │
       ├────────────┬────────────┬────────────┐
       │            │            │            │
       ▼            ▼            ▼            ▼
┌──────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  Query   │  │ Ingest  │  │ Qdrant  │  │ Ollama  │
│  Service │  │ Service │  │   DB    │  │   LLM   │
└──────────┘  └─────────┘  └─────────┘  └─────────┘
```

**Response**:
```json
{
  "timestamp": "2025-10-31T...",
  "requestedCollection": "tradingsystem-docs",
  "services": {
    "query": {
      "ok": true,
      "status": 200,
      "message": "Query service operational"
    },
    "ingestion": {
      "ok": true,
      "status": 200,
      "message": "Ingestion service operational"
    }
  },
  "qdrant": {
    "collection": "documentation__nomic",
    "activeCollection": "tradingsystem-docs",
    "ok": true,
    "status": 200,
    "count": 1247
  },
  "collections": [
    {
      "name": "tradingsystem-docs",
      "count": 1247,
      "embeddingModel": "nomic-embed-text"
    }
  ]
}
```

---

## 🌐 Network Architecture

### Docker Network: `tradingsystem_backend`

**Type**: External bridge network
**Created by**: `docker network create tradingsystem_backend`

**Connected Containers**:
```yaml
RAG Stack:
  - rag-ollama
  - rag-llamaindex-ingest
  - rag-llamaindex-query
  - rag-service
  - rag-collections-service

Database Stack:
  - data-qdrant
  - data-timescale
  - data-questdb
  - data-postgres-langgraph

Documentation Stack:
  - docs-hub (NGINX + Docusaurus)
```

**Internal DNS Resolution**:
```bash
# Services can communicate using container names
curl http://rag-ollama:11434/api/tags
curl http://data-qdrant:6333/collections
curl http://rag-llamaindex-query:8000/health
```

---

## 💾 Volumes

### Persistent Volumes

```yaml
ollama_models:
  driver: local
  location: /var/lib/docker/volumes/ollama_models/_data
  size: ~15GB (depends on models)
  contains:
    - nomic-embed-text (274MB)
    - mxbai-embed-large (669MB)
    - embeddinggemma (621MB)
    - llama3.1 (~4.7GB)
    - llama3.2:3b (~2GB)

timescaledb-data:
  driver: local
  contains: PostgreSQL database files
```

### Read-Only Mounts

```yaml
Documentation:
  source: ../../docs
  target: /data/docs:ro
  used_by:
    - rag-llamaindex-ingest
    - rag-collections-service

Collections Config:
  source: tools/rag-services/collections-config.json
  target: /app/collections-config.json:ro
  used_by:
    - rag-collections-service

Project Root:
  source: ../../
  target: /data/tradingsystem:ro
  used_by:
    - rag-llamaindex-ingest
```

---

## 🔒 Security & Authentication

### JWT Authentication

**Server-Side Token Minting**:
```javascript
// RAG Service (Documentation API) mints tokens
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { sub: 'dashboard' },
  process.env.JWT_SECRET_KEY,
  { algorithm: 'HS256', expiresIn: '1h' }
);

// Forward to LlamaIndex services
fetch('http://rag-llamaindex-query:8000/query', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Frontend Never Sees JWT**:
```typescript
// Dashboard calls proxy endpoint
const response = await fetch('http://localhost:3402/api/v1/rag/query', {
  method: 'POST',
  body: JSON.stringify({ query: 'How does RAG work?' })
});
// RAG Service handles JWT internally
```

### CORS Configuration

```typescript
// rag-collections-service (Port 3403)
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3103',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};
```

---

## 📊 Port Mapping Summary

| Service                  | Container Port | Host Port | Protocol | Purpose                    |
|--------------------------|----------------|-----------|----------|----------------------------|
| rag-ollama               | 11434          | 11434     | HTTP     | LLM/Embeddings API         |
| rag-llamaindex-ingest    | 8000           | 8201      | HTTP     | Document ingestion         |
| rag-llamaindex-query     | 8000           | 8202      | HTTP     | Query/Search               |
| rag-service              | 3000           | 3402      | HTTP     | RAG proxy (legacy format)  |
| rag-collections-service  | 3402           | 3403      | HTTP     | Collections CRUD (new API) |
| data-qdrant (HTTP)       | 6333           | 6333      | HTTP     | Vector DB API              |
| data-qdrant (gRPC)       | 6334           | 6334      | gRPC     | Vector DB gRPC             |

---

## 🚀 Startup Sequence

### Dependency Chain

```
1. data-qdrant (no dependencies)
   ↓
2. rag-ollama (no dependencies)
   ↓ (wait healthy)
3. rag-llamaindex-ingest + rag-llamaindex-query
   ↓ (wait healthy)
4. rag-service + rag-collections-service
   ↓
5. Dashboard can now connect
```

### Health Check Timings

```yaml
rag-ollama:
  start_period: 30s
  interval: 30s
  timeout: 10s

rag-llamaindex-ingest:
  start_period: 40s
  interval: 30s
  timeout: 10s
  depends_on: [ollama:healthy]

rag-llamaindex-query:
  start_period: 40s
  interval: 30s
  timeout: 10s
  depends_on: [ollama:healthy]

rag-service:
  start_period: 40s
  interval: 30s
  timeout: 10s
  depends_on: [llamaindex-query:healthy, llamaindex-ingest:healthy]

rag-collections-service:
  start_period: 15s
  interval: 30s
  timeout: 10s
  depends_on: [llamaindex-ingest:healthy]
```

### Startup Commands

```bash
# Start entire RAG stack
cd tools/compose
docker compose -f docker-compose.rag.yml up -d

# Check startup progress
docker compose -f docker-compose.rag.yml ps

# View logs
docker compose -f docker-compose.rag.yml logs -f

# Wait for all services to be healthy
watch -n 2 'docker ps --format "table {{.Names}}\t{{.Status}}" | grep rag-'
```

---

## 🔍 Troubleshooting

### Check Container Health

```bash
# All RAG containers
docker ps --filter "name=rag-" --format "table {{.Names}}\t{{.Status}}"

# Specific service logs
docker logs rag-collections-service --tail 100 -f
docker logs rag-llamaindex-ingest --tail 100 -f
docker logs rag-service --tail 100 -f

# Check Ollama models
docker exec rag-ollama ollama list

# Check Qdrant collections
curl http://localhost:6333/collections | jq
```

### Test Endpoints

```bash
# Models available (Port 3403 - NEW API)
curl -s http://localhost:3403/api/v1/rag/models | jq '.data.models[] | .name'

# Models available (Port 3402 - LEGACY API)
curl -s http://localhost:3402/api/v1/rag/models | jq '.models[] | .name'

# Collections
curl -s http://localhost:3403/api/v1/rag/collections | jq '.data.collections[] | .name'

# Status
curl -s http://localhost:3402/api/v1/rag/status | jq '.services'

# Health checks
curl http://localhost:8201/health  # Ingestion
curl http://localhost:8202/health  # Query
curl http://localhost:3402/api/v1/rag/status/health  # RAG Service
curl http://localhost:3403/health  # Collections Service
```

### Common Issues

**Issue 1: Models not loading in dropdown**
```bash
# Check if port 3403 is responding
curl http://localhost:3403/api/v1/rag/models

# Verify environment variable
grep VITE_API_BASE_URL frontend/dashboard/.env

# Should be: VITE_API_BASE_URL=http://localhost:3403
```

**Issue 2: Ingestion fails**
```bash
# Check LlamaIndex Ingestion logs
docker logs rag-llamaindex-ingest --tail 50

# Verify Ollama has models
docker exec rag-ollama ollama list

# Check Qdrant is accessible
curl http://localhost:6333/health
```

**Issue 3: GPU not detected**
```bash
# Check NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi

# Check Ollama GPU usage
docker exec rag-ollama nvidia-smi
```

---

## 📈 Resource Usage

### Expected Memory Consumption

```
rag-ollama:              4-8GB  (depends on model loaded)
rag-llamaindex-ingest:   1-2GB  (during ingestion)
rag-llamaindex-query:    1-2GB  (during query)
rag-service:             200MB  (idle)
rag-collections-service: 150MB  (idle)
data-qdrant:             500MB-1GB (depends on collection size)

Total: ~8-15GB
```

### Disk Usage

```
Ollama models:     ~15GB
Qdrant vectors:    ~500MB (1000 documents)
Docker images:     ~10GB
Logs:              ~100MB/day

Total: ~25-30GB
```

---

## 🎯 Environment Variables Reference

### Critical Variables

```bash
# Frontend
VITE_API_BASE_URL=http://localhost:3403          # RAG Collections Service (NEW)
VITE_RAG_COLLECTIONS_URL=http://localhost:3403   # Same endpoint

# RAG Services
OLLAMA_BASE_URL=http://rag-ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_MODEL=llama3.1
QDRANT_URL=http://data-qdrant:6333
QDRANT_COLLECTION=documentation__nomic

# Ports
OLLAMA_PORT=11434
LLAMAINDEX_INGESTION_PORT=8201
LLAMAINDEX_QUERY_PORT=8202
DOCUMENTATION_API_PORT=3402
RAG_COLLECTIONS_PORT=3403
QDRANT_PORT=6333

# Security
JWT_SECRET_KEY=dev-secret
JWT_ALGORITHM=HS256
INTER_SERVICE_SECRET=dev-secret

# Chunking
LLAMAINDEX_CHUNK_SIZE=256
LLAMAINDEX_CHUNK_OVERLAP=64
```

---

## 📚 API Documentation

### RAG Collections Service (Port 3403) - **CURRENT STANDARD**

**Base URL**: `http://localhost:3403/api/v1/rag`

**Response Format** (Standardized):
```typescript
{
  "success": boolean,
  "data": T,
  "meta": {
    "timestamp": string,
    "requestId": string,
    "version": string
  },
  "error"?: {
    "code": string,
    "message": string,
    "details"?: any
  }
}
```

### RAG Service (Port 3402) - **LEGACY**

**Base URL**: `http://localhost:3402/api/v1/rag`

**Response Format** (Legacy):
```typescript
{
  "success": boolean,
  "models": Array,
  "configured": Array,
  "totalAvailable": number
}
```

---

## 🔄 Migration Notes

### Port 3402 → 3403 Migration (2025-10-31)

**Reason**: Standardize API responses and separate concerns

**Changes**:
- ✅ Port 3403 uses new standardized response format
- ✅ Port 3403 has enhanced collections management
- ✅ Port 3403 has detailed statistics (files, chunks, orphans)
- ✅ Frontend now uses port 3403 exclusively

**Migration Complete**: Both ports operational during transition

---

## 📝 Summary

O sistema RAG Services é uma **arquitetura de microserviços completa** com:

- ✅ **6 containers especializados** (Ollama, LlamaIndex x2, RAG Service x2, Qdrant)
- ✅ **Separação clara de responsabilidades** (embeddings, ingestão, query, proxy, collections)
- ✅ **Escalabilidade horizontal** (cada serviço pode escalar independentemente)
- ✅ **Health checks robustos** (30s intervals, cascade dependencies)
- ✅ **Segurança server-side** (JWT minted no backend)
- ✅ **Resource limits** (CPU/Memory controlados)
- ✅ **Monitoramento integrado** (status agregado com cache)
- ✅ **GPU acceleration** (Ollama com NVIDIA)
- ✅ **Persistent storage** (volumes para modelos e dados)
- ✅ **Network isolation** (bridge network dedicada)

**Endpoints Principais**:
- **Dashboard** → `http://localhost:3403/api/v1/rag/*` (Collections CRUD + Models)
- **Query/Search** → `http://localhost:3402/api/v1/rag/query` (Proxy com JWT)
- **Status** → `http://localhost:3402/api/v1/rag/status` (Agregado com cache)
