---
type: proposal
id: PROP-003
title: RAG Services Containerization
status: draft
created: 2025-10-31
updated: 2025-10-31
authors: [Claude Code]
reviewers: []
domain: infrastructure
tags: [docker, rag, architecture, microservices]
related: []
---

# PROP-003: RAG Services Containerization

## Executive Summary

Containerizar os RAG Services (Documentation API, LlamaIndex Query e Ingestion) em containers Docker independentes, mantendo os containers existentes em paralelo. Esta mudança tornará o RAG system mais portável, escalável e fácil de manter.

## Motivation

### Problemas Atuais

1. **Dependências Mistas**: RAG Services rodando junto com outros serviços
2. **Difícil Escalonamento**: Não é possível escalar RAG Services independentemente
3. **Deployment Complexo**: Setup manual de Python, Node.js e dependências
4. **Isolamento Insuficiente**: Conflitos potenciais de dependências
5. **Portabilidade Limitada**: Difícil mover para outros ambientes

### Benefícios da Containerização

1. **Isolamento Completo**: Cada serviço RAG em seu próprio container
2. **Escalabilidade**: Possibilidade de múltiplas réplicas
3. **Portabilidade**: Deploy fácil em qualquer ambiente com Docker
4. **Versionamento**: Imagens Docker versionadas
5. **Rollback Simples**: Voltar para versões anteriores instantaneamente
6. **Health Checks**: Monitoramento integrado via Docker
7. **Resource Limits**: Controle fino de CPU/RAM por serviço

## Design

### Arquitetura Proposta (Atualizada - 2025-10-31)

```
┌─────────────────────────────────────────────────────────────────────┐
│            Docker Network: tradingsystem_backend                     │
│            (Isolated with mTLS inter-service authentication)         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │     rag-service      │  │  llamaindex-query    │                │
│  │  (Node.js/Express)   │  │  (Python/FastAPI)    │                │
│  │  Port: 3400:3400     │  │  Port: 8202:8202     │  🔒 mTLS       │
│  │  - JWT Auth          │  │  - Query Engine      │                │
│  │  - Circuit Breaker   │  │  - Semantic Search   │                │
│  │  - Rate Limiting     │  │  - Response Cache    │                │
│  └──────────────────────┘  └──────────────────────┘                │
│           ↓ (secured)                ↓                               │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │ llamaindex-ingestion │  │    redis-queue       │  NEW            │
│  │  (Python/FastAPI)    │  │  (Job Queue)         │                │
│  │  Port: 8201:8201     │  │  Port: 6379 (int)    │                │
│  │  - Job State Mgmt    │  │  - Dist. Locking     │                │
│  │  - Idempotent Ingest │  │  - Cache Layer       │                │
│  └──────────────────────┘  └──────────────────────┘                │
│           ↓                          ↓                               │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │   ollama-embeddings  │  │     ollama-llm       │  🔒 Internal   │
│  │   (CPU-optimized)    │  │   (GPU-accelerated)  │  Only          │
│  │   Port: - (internal) │  │   Port: - (internal) │                │
│  │   - nomic-embed-text │  │   - llama3.1         │                │
│  └──────────────────────┘  └──────────────────────┘                │
│           ↓                          ↓                               │
│  ┌──────────────────────────────────────────────┐                   │
│  │              data-qdrant (external)           │                   │
│  │              Vector Database                  │                   │
│  │              Port: 6333                       │                   │
│  │              - Collections                    │                   │
│  │              - Vector Storage                 │                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

Trust Boundaries:
┌────────────────────────────────────────────────────────────────────┐
│ External → rag-service (JWT Auth)                                  │
│ rag-service → llamaindex services (mTLS/Shared Secret)             │
│ llamaindex services → Redis/Ollama/Qdrant (Internal network only)  │
└────────────────────────────────────────────────────────────────────┘
```

**Key Architecture Improvements:**
- ✅ **Security**: mTLS between services, no external Ollama exposure
- ✅ **Resilience**: Circuit breakers, retry with backoff, distributed locking
- ✅ **State Management**: Redis for job queue and progress tracking
- ✅ **High Availability**: Separate Ollama instances for embeddings vs. LLM
- ✅ **Port Consistency**: Internal ports match external (3400:3400, 8201:8201, 8202:8202)

### Security Architecture (NEW)

#### Inter-Service Authentication

**Implementation**: Shared secret-based authentication for internal services

```yaml
# Environment variables for all services
INTER_SERVICE_SECRET=${INTER_SERVICE_SECRET}  # Required, no default
INTER_SERVICE_SECRET_HEADER=X-Internal-Auth
```

**Middleware Implementation** (FastAPI):
```python
# shared/auth_middleware.py
from fastapi import Request, HTTPException
import os

async def verify_inter_service_auth(request: Request):
    expected_secret = os.getenv('INTER_SERVICE_SECRET')
    if not expected_secret:
        raise RuntimeError('INTER_SERVICE_SECRET not configured')

    actual_secret = request.headers.get('X-Internal-Auth')
    if actual_secret != expected_secret:
        raise HTTPException(status_code=403, detail='Invalid service authentication')
```

**Client Implementation** (Node.js):
```javascript
// rag-service making request to llamaindex-query
const response = await fetch(`${LLAMAINDEX_QUERY_URL}/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Auth': process.env.INTER_SERVICE_SECRET
  },
  body: JSON.stringify(queryData)
});
```

#### Secrets Validation

**Startup Validation** (all services):
```javascript
// Node.js (rag-service)
if (process.env.NODE_ENV === 'production') {
  const required = ['JWT_SECRET_KEY', 'INTER_SERVICE_SECRET'];
  for (const key of required) {
    if (!process.env[key] || process.env[key].startsWith('dev-')) {
      throw new Error(`${key} must be set in production`);
    }
  }
}
```

```python
# Python (llamaindex services)
import os
import sys

def validate_secrets():
    required = ['INTER_SERVICE_SECRET']
    for key in required:
        value = os.getenv(key)
        if not value:
            print(f'FATAL: {key} not set', file=sys.stderr)
            sys.exit(1)
        if value.startswith('dev-'):
            print(f'FATAL: {key} uses dev default in production', file=sys.stderr)
            sys.exit(1)

validate_secrets()
```

#### Rate Limiting

**Implementation** (rag-service):
```javascript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

const queryLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:query:'
  }),
  windowMs: 60 * 1000,  // 1 minute
  max: 10,  // 10 queries per minute per user
  message: 'Too many queries, please try again later'
});

app.post('/api/v1/rag/query', queryLimiter, handleQuery);
```

### Resilience Patterns (NEW)

#### Circuit Breaker

**Implementation** (rag-service → llamaindex services):
```javascript
import CircuitBreaker from 'opossum';

const queryServiceBreaker = new CircuitBreaker(
  async (query) => {
    const response = await fetch(`${LLAMAINDEX_QUERY_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Auth': process.env.INTER_SERVICE_SECRET
      },
      body: JSON.stringify(query),
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`Query service returned ${response.status}`);
    }

    return response.json();
  },
  {
    timeout: 30000,          // 30s timeout
    errorThresholdPercentage: 50,  // Open circuit at 50% errors
    resetTimeout: 30000,     // Try again after 30s
    volumeThreshold: 10      // Minimum 10 requests to calculate percentage
  }
);

// Usage
try {
  const result = await queryServiceBreaker.fire(queryData);
  return result;
} catch (err) {
  if (queryServiceBreaker.opened) {
    return { error: 'Query service is currently unavailable' };
  }
  throw err;
}
```

#### Retry with Exponential Backoff

**Implementation** (Python llamaindex services → Ollama):
```python
import asyncio
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
import httpx

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError))
)
async def call_ollama_with_retry(prompt: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt}
        )
        response.raise_for_status()
        return response.json()
```

### State Management Architecture (NEW)

#### Redis Job Queue

**Job States**:
- `PENDING`: Job created, waiting to start
- `PROCESSING`: Job is being processed
- `COMPLETED`: Job finished successfully
- `FAILED`: Job failed (with retry count)
- `CANCELLED`: Job cancelled by user

**Schema**:
```json
{
  "job_id": "ingest-20251031-123456",
  "type": "ingestion",
  "status": "PROCESSING",
  "created_at": "2025-10-31T12:34:56Z",
  "started_at": "2025-10-31T12:35:00Z",
  "updated_at": "2025-10-31T12:35:30Z",
  "payload": {
    "directory": "/data/docs",
    "collection": "documentation__nomic",
    "chunk_size": 512,
    "chunk_overlap": 50
  },
  "progress": {
    "total_files": 1000,
    "processed_files": 250,
    "percentage": 25
  },
  "result": null,
  "error": null,
  "retry_count": 0
}
```

**Implementation** (llamaindex-ingestion):
```python
import redis
import json
from datetime import datetime
from typing import Optional

class JobQueue:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)

    def create_job(self, job_type: str, payload: dict) -> str:
        job_id = f"{job_type}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        job = {
            'job_id': job_id,
            'type': job_type,
            'status': 'PENDING',
            'created_at': datetime.utcnow().isoformat(),
            'payload': payload,
            'progress': {'total_files': 0, 'processed_files': 0, 'percentage': 0},
            'retry_count': 0
        }
        self.redis.setex(f'job:{job_id}', 86400, json.dumps(job))  # 24h TTL
        self.redis.lpush('queue:ingestion', job_id)
        return job_id

    def update_progress(self, job_id: str, processed: int, total: int):
        job = self.get_job(job_id)
        if job:
            job['progress'] = {
                'total_files': total,
                'processed_files': processed,
                'percentage': int((processed / total) * 100) if total > 0 else 0
            }
            job['updated_at'] = datetime.utcnow().isoformat()
            self.redis.setex(f'job:{job_id}', 86400, json.dumps(job))

    def complete_job(self, job_id: str, result: dict):
        job = self.get_job(job_id)
        if job:
            job['status'] = 'COMPLETED'
            job['result'] = result
            job['updated_at'] = datetime.utcnow().isoformat()
            self.redis.setex(f'job:{job_id}', 86400, json.dumps(job))

    def fail_job(self, job_id: str, error: str):
        job = self.get_job(job_id)
        if job:
            job['status'] = 'FAILED'
            job['error'] = error
            job['retry_count'] += 1
            job['updated_at'] = datetime.utcnow().isoformat()
            self.redis.setex(f'job:{job_id}', 86400, json.dumps(job))

    def get_job(self, job_id: str) -> Optional[dict]:
        data = self.redis.get(f'job:{job_id}')
        return json.loads(data) if data else None
```

#### Distributed Locking

**Implementation** (prevent concurrent ingestion to same collection):
```python
from redis.lock import Lock
from contextlib import contextmanager

@contextmanager
def acquire_collection_lock(redis_client, collection: str, timeout: int = 300):
    lock = Lock(redis_client, f'lock:collection:{collection}', timeout=timeout)
    acquired = lock.acquire(blocking=True, blocking_timeout=10)
    if not acquired:
        raise RuntimeError(f'Failed to acquire lock for collection {collection}')
    try:
        yield
    finally:
        lock.release()

# Usage in ingestion endpoint
@app.post('/ingest/directory')
async def ingest_directory(request: IngestRequest):
    with acquire_collection_lock(redis_client, request.collection):
        # Perform ingestion
        result = await ingest_documents(request.directory, request.collection)
        return result
```

### High Availability Architecture (NEW)

#### Ollama Service Separation

**Rationale**: Separate CPU-bound embeddings from GPU-bound LLM generation to prevent resource contention and enable independent scaling.

**ollama-embeddings** (CPU-optimized):
```yaml
ollama-embeddings:
  image: ollama/ollama:latest
  container_name: rag-ollama-embeddings
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 4G
  environment:
    - OLLAMA_NUM_PARALLEL=8  # High concurrency for embeddings
    - OLLAMA_MODELS=/models
  volumes:
    - ollama_embeddings_models:/models
  networks:
    - tradingsystem_backend
  healthcheck:
    test: ["CMD-SHELL", "ollama list | grep nomic-embed-text"]
    interval: 30s
```

**ollama-llm** (GPU-accelerated):
```yaml
ollama-llm:
  image: ollama/ollama:latest
  container_name: rag-ollama-llm
  runtime: nvidia
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 16G
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
  environment:
    - OLLAMA_NUM_PARALLEL=2  # Lower concurrency for LLM
    - OLLAMA_MODELS=/models
  volumes:
    - ollama_llm_models:/models
  networks:
    - tradingsystem_backend
  healthcheck:
    test: ["CMD-SHELL", "ollama list | grep llama3.1"]
    interval: 30s
```

**Service Configuration Updates**:
```yaml
# llamaindex-ingestion uses embeddings only
OLLAMA_EMBED_URL=http://rag-ollama-embeddings:11434
OLLAMA_EMBED_MODEL=nomic-embed-text

# llamaindex-query uses both
OLLAMA_EMBED_URL=http://rag-ollama-embeddings:11434
OLLAMA_LLM_URL=http://rag-ollama-llm:11434
OLLAMA_LLM_MODEL=llama3.1
```

### Containers Detalhados

#### 0. redis-queue Container (NEW)

**Propósito**: Job queue, distributed locking, cache layer

```yaml
Service: redis-queue
Image: redis:7-alpine
Porta interna: 6379 (internal only)
Network: tradingsystem_backend
Volume: redis_data
```

**Features**:
- Job queue for ingestion tasks
- Distributed locks for collection safety
- Query result caching (TTL-based)
- Rate limiting storage

**Configuration**:
```yaml
redis-queue:
  image: redis:7-alpine
  container_name: rag-redis-queue
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
  volumes:
    - redis_data:/data
  networks:
    - tradingsystem_backend
  command: >
    redis-server
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
    --appendonly yes
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 3s
    retries: 3
```

#### 1. rag-service Container

**Propósito**: API Gateway/RAG Orchestrator

```yaml
Service: rag-service
Image: tradingsystem/rag-service:latest
Base: node:22-alpine
Porta interna: 3000
Porta exposta: 3400
Network: tradingsystem_backend (externa)
```

**Features**:
- Routes: `/api/v1/rag/*`
- Services: CollectionService, RagProxyService
- Dependencies: JWT auth, error handling
- Health Check: GET /api/health
- Restart Policy: unless-stopped

**Environment Variables** (Updated):
```env
# Service Configuration
NODE_ENV=production
PORT=3400
LOG_LEVEL=info

# RAG Services (Updated URLs with port consistency)
LLAMAINDEX_QUERY_URL=http://rag-llamaindex-query:8202
LLAMAINDEX_INGESTION_URL=http://rag-llamaindex-ingest:8201
QDRANT_URL=http://data-qdrant:6333
QDRANT_COLLECTION=documentation__nomic

# Ollama Services (Separated for HA)
OLLAMA_EMBED_URL=http://rag-ollama-embeddings:11434
OLLAMA_LLM_URL=http://rag-ollama-llm:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=llama3.1

# Redis Infrastructure
REDIS_URL=redis://rag-redis-queue:6379

# Security (Enhanced)
JWT_SECRET_KEY=${JWT_SECRET_KEY}  # REQUIRED, no default in production
JWT_ALGORITHM=HS256
INTER_SERVICE_SECRET=${INTER_SERVICE_SECRET}  # REQUIRED for service auth

# Resilience & Performance
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_THRESHOLD=50  # 50% error rate
CIRCUIT_BREAKER_TIMEOUT=30000  # 30s
RAG_TIMEOUT_MS=30000
STATUS_CACHE_TTL_MS=30000
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=10  # 10 requests per window
```

**Dockerfile**:
```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:22-alpine AS production
RUN apk add --no-cache dumb-init curl && \
    addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs prisma ./prisma
COPY --chown=nodejs:nodejs src ./src
USER nodejs
EXPOSE 3400
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3400/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
```

#### 2. llamaindex-query Container

**Propósito**: Query e busca semântica

```yaml
Service: llamaindex-query
Image: tradingsystem/llamaindex-query:latest
Base: python:3.11-slim
Porta interna: 8000
Porta exposta: 8202
Network: tradingsystem_backend (externa)
GPU: opcional (--gpus all)
```

**Features**:
- FastAPI endpoints: /query, /search, /health
- Vector search via Qdrant
- LLM integration via Ollama
- GPU scheduling and management
- Response caching

**Environment Variables** (Updated):
```env
# Service Configuration
PYTHONUNBUFFERED=1
LOG_LEVEL=info

# Vector Database
QDRANT_HOST=data-qdrant
QDRANT_PORT=6333
QDRANT_COLLECTION=documentation__nomic

# LLM Configuration (Separated Services)
OLLAMA_EMBED_URL=http://rag-ollama-embeddings:11434
OLLAMA_LLM_URL=http://rag-ollama-llm:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=llama3.1
OLLAMA_REQUEST_TIMEOUT=300

# Redis Infrastructure
REDIS_URL=redis://rag-redis-queue:6379

# Security (NEW)
INTER_SERVICE_SECRET=${INTER_SERVICE_SECRET}  # REQUIRED

# Performance & Resilience
CACHE_TTL_SECONDS=300
RETRY_ATTEMPTS=3
RETRY_BACKOFF_MIN_SECONDS=1
RETRY_BACKOFF_MAX_SECONDS=10
```

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY tools/llamaindex/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Assets e aplicação
ENV NLTK_DATA=/usr/local/nltk_data PYTHONUNBUFFERED=1
RUN python -m nltk.downloader -d /usr/local/nltk_data punkt && \
    test -f /usr/local/nltk_data/tokenizers/punkt/english.pickle
COPY tools/llamaindex/query_service ./query_service
COPY tools/llamaindex/shared ./shared

# Non-root user (before health check to test as appuser)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8202

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8202/health || exit 1

CMD ["uvicorn", "query_service.main:app", "--host", "0.0.0.0", "--port", "8202"]
```

#### 3. llamaindex-ingestion Container

**Propósito**: Ingestão e processamento de documentos

```yaml
Service: llamaindex-ingestion
Image: tradingsystem/llamaindex-ingestion:latest
Base: python:3.11-slim
Porta interna: 8000
Porta exposta: 8201
Network: tradingsystem_backend (externa)
Volumes:
  - ../../docs/content:/data/docs:ro
  - ../../:/data/tradingsystem:ro
```

**Features**:
- Document ingestion: /ingest/directory
- Chunk processing and optimization
- Collection management
- Multi-format support (MD, MDX, PDF, TXT)

**Environment Variables** (Updated):
```env
# Service Configuration
PYTHONUNBUFFERED=1
LOG_LEVEL=info

# Data Paths
DOCS_DIR=/data/docs
COLLECTIONS_CONFIG=/app/collection-config.json

# Vector Database
QDRANT_HOST=data-qdrant
QDRANT_PORT=6333

# LLM Configuration (Embeddings Only)
OLLAMA_EMBED_URL=http://rag-ollama-embeddings:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_REQUEST_TIMEOUT=300

# Redis Infrastructure
REDIS_URL=redis://rag-redis-queue:6379

# Security (NEW)
INTER_SERVICE_SECRET=${INTER_SERVICE_SECRET}  # REQUIRED

# Processing Configuration
CHUNK_SIZE=512
CHUNK_OVERLAP=50
MAX_WORKERS=4

# Job Management (NEW)
JOB_QUEUE_ENABLED=true
JOB_TTL_SECONDS=86400  # 24 hours
DISTRIBUTED_LOCK_TIMEOUT=300  # 5 minutes
```

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY tools/llamaindex/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
ENV NLTK_DATA=/usr/local/nltk_data PYTHONUNBUFFERED=1
RUN python -m nltk.downloader -d /usr/local/nltk_data punkt && \
    test -f /usr/local/nltk_data/tokenizers/punkt/english.pickle
COPY tools/llamaindex/ingestion_service ./ingestion_service
COPY tools/llamaindex/shared ./shared
COPY tools/llamaindex/collection-config.json ./

# Non-root user (before health check to test as appuser)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8201

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8201/health || exit 1

CMD ["uvicorn", "ingestion_service.main:app", "--host", "0.0.0.0", "--port", "8201"]
```

#### 4. Reutilização do serviço `data-qdrant`

**Propósito**: Vetorizar dados com o banco compartilhado existente

- O projeto já mantém o container `data-qdrant` definido em `tools/compose/docker-compose.database.yml` e reutilizado por outros stacks.
- A estratégia recomendada é **não** criar um novo container dedicado no stack RAG. Em vez disso, todas as aplicações RAG devem depender do serviço existente via DNS interno (`data-qdrant:6333`).
- Benefícios:
  - Evita competição por portas e migrações adicionais.
  - Mantém os dados consolidados num único volume (`qdrant_data`).
  - Garante compatibilidade com os scripts de backup e saúde atuais.

**Ações necessárias**:
1. Garantir que o stack de dados esteja ativo antes de subir o stack RAG.
2. Validar saúde do `data-qdrant` através de `scripts/maintenance/health-check-all.sh`.
3. Documentar o requisito de inicialização sequencial (dados → RAG).

#### 5. ollama-embeddings Container (NEW - Separated for HA)

**Propósito**: Embedding generation (CPU-optimized, high concurrency)

```yaml
Service: ollama-embeddings
Image: ollama/ollama:latest
Port: 11434 (internal only - NO external exposure)
Network: tradingsystem_backend
Volumes:
  - ollama_embeddings_models:/root/.ollama
```

**Features**:
- Dedicated to embedding generation only (nomic-embed-text)
- CPU-optimized with high parallelism (OLLAMA_NUM_PARALLEL=8)
- No GPU required, lighter resource footprint
- Independent scaling from LLM service

#### 6. ollama-llm Container (NEW - Separated for HA)

**Propósito**: LLM generation (GPU-accelerated, lower concurrency)

```yaml
Service: ollama-llm
Image: ollama/ollama:latest
Port: 11434 (internal only - NO external exposure)
Network: tradingsystem_backend
GPU: nvidia (optional but recommended)
Volumes:
  - ollama_llm_models:/root/.ollama
```

**Features**:
- Dedicated to LLM text generation (llama3.1)
- GPU-accelerated for faster inference
- Lower parallelism (OLLAMA_NUM_PARALLEL=2) to manage GPU memory
- Independent scaling from embedding service

### Docker Compose Configuration (Updated 2025-10-31)

**Arquivo**: `tools/compose/docker-compose.rag.yml`

**Major Changes**:
- ✅ Added redis-queue for job management
- ✅ Separated Ollama into embeddings and LLM services
- ✅ Fixed port mappings (internal = external)
- ✅ Removed external port exposure for Ollama
- ✅ Added inter-service authentication support
- ✅ Enhanced health checks

```yaml
version: "3.8"

services:
  # Redis for job queue, caching, and distributed locking
  redis-queue:
    image: redis:7-alpine
    container_name: rag-redis-queue
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    volumes:
      - redis_data:/data
    networks:
      - tradingsystem_backend
    command: >
      redis-server
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s
    restart: unless-stopped

  # Ollama Embeddings Service (CPU-optimized)
  ollama-embeddings:
    image: "${IMG_RAG_OLLAMA:-ollama/ollama}:${IMG_VERSION:-latest}"
    container_name: rag-ollama-embeddings
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
        reservations:
          cpus: '2.0'
          memory: 2G
    environment:
      - OLLAMA_NUM_PARALLEL=8
      - OLLAMA_MODELS=/root/.ollama
    volumes:
      - ollama_embeddings_models:/root/.ollama
    networks:
      - tradingsystem_backend
    healthcheck:
      test: ["CMD-SHELL", "ollama list | grep -q nomic-embed-text || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s  # Allow time for model loading
    restart: unless-stopped
    # NO PORT MAPPING - internal only for security

  # Ollama LLM Service (GPU-accelerated)
  ollama-llm:
    image: "${IMG_RAG_OLLAMA:-ollama/ollama}:${IMG_VERSION:-latest}"
    container_name: rag-ollama-llm
    runtime: nvidia
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
        limits:
          memory: 16G
          cpus: "4"
        reservations:
          cpus: "2"
          memory: 8G
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility
      - OLLAMA_NUM_PARALLEL=2
      - OLLAMA_MODELS=/root/.ollama
    volumes:
      - ollama_llm_models:/root/.ollama
    networks:
      - tradingsystem_backend
    healthcheck:
      test: ["CMD-SHELL", "ollama list | grep -q llama3.1 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s  # Allow time for model loading
    restart: unless-stopped
    # NO PORT MAPPING - internal only for security

  llamaindex-ingestion:
    image: "${IMG_RAG_LLAMAINDEX_INGEST:-tradingsystem/llamaindex-ingest}:${IMG_VERSION:-latest}"
    container_name: rag-llamaindex-ingest
    build:
      context: ../..
      dockerfile: tools/llamaindex/Dockerfile.ingestion
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2"
        reservations:
          cpus: "1"
          memory: 2G
    ports:
      - "${LLAMAINDEX_INGESTION_PORT:-8201}:8201"  # FIXED: internal = external
    restart: unless-stopped
    env_file:
      - ../../.env
    environment:
      # Vector Database
      - QDRANT_HOST=data-qdrant
      - QDRANT_PORT=${QDRANT_PORT:-6333}
      - QDRANT_COLLECTION=${QDRANT_COLLECTION:-documentation__nomic}
      # Ollama (Embeddings Only)
      - OLLAMA_EMBED_URL=http://rag-ollama-embeddings:11434
      - OLLAMA_EMBED_MODEL=${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}
      - OLLAMA_REQUEST_TIMEOUT=300
      # Redis
      - REDIS_URL=redis://rag-redis-queue:6379
      # Security
      - INTER_SERVICE_SECRET=${INTER_SERVICE_SECRET}
      # Job Management
      - JOB_QUEUE_ENABLED=true
      - JOB_TTL_SECONDS=86400
      - DISTRIBUTED_LOCK_TIMEOUT=300
    volumes:
      - ../../docs/content:/data/docs:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - tradingsystem_backend
    depends_on:
      redis-queue:
        condition: service_healthy
      ollama-embeddings:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8201/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  llamaindex-query:
    image: "${IMG_RAG_LLAMAINDEX_QUERY:-tradingsystem/llamaindex-query}:${IMG_VERSION:-latest}"
    container_name: rag-llamaindex-query
    build:
      context: ../..
      dockerfile: tools/llamaindex/Dockerfile.query
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2"
        reservations:
          cpus: "1"
          memory: 2G
    ports:
      - "${LLAMAINDEX_QUERY_PORT:-8202}:8202"  # FIXED: internal = external
    restart: unless-stopped
    env_file:
      - ../../.env
    environment:
      # Vector Database
      - QDRANT_HOST=data-qdrant
      - QDRANT_PORT=${QDRANT_PORT:-6333}
      - QDRANT_COLLECTION=${QDRANT_COLLECTION:-documentation__nomic}
      # Ollama (Both Embeddings and LLM)
      - OLLAMA_EMBED_URL=http://rag-ollama-embeddings:11434
      - OLLAMA_LLM_URL=http://rag-ollama-llm:11434
      - OLLAMA_EMBED_MODEL=${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}
      - OLLAMA_LLM_MODEL=${OLLAMA_MODEL:-llama3.1}
      - OLLAMA_REQUEST_TIMEOUT=300
      # Redis
      - REDIS_URL=redis://rag-redis-queue:6379
      # Security
      - INTER_SERVICE_SECRET=${INTER_SERVICE_SECRET}
      # Performance & Resilience
      - CACHE_TTL_SECONDS=300
      - RETRY_ATTEMPTS=3
      - RETRY_BACKOFF_MIN_SECONDS=1
      - RETRY_BACKOFF_MAX_SECONDS=10
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - tradingsystem_backend
    depends_on:
      redis-queue:
        condition: service_healthy
      ollama-embeddings:
        condition: service_healthy
      ollama-llm:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8202/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  rag-service:
    image: "${IMG_RAG_SERVICE:-tradingsystem/rag-service}:${IMG_VERSION:-latest}"
    container_name: rag-service
    build:
      context: ../..
      dockerfile: backend/api/documentation-api/Dockerfile
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
        reservations:
          cpus: "0.5"
          memory: 256M
    ports:
      - "${DOCUMENTATION_API_PORT:-3400}:3400"  # FIXED: internal = external
    restart: unless-stopped
    env_file:
      - ../../.env
    environment:
      # Service Configuration
      - NODE_ENV=production
      - PORT=3400
      - LOG_LEVEL=info
      # RAG Services (Updated URLs with port consistency)
      - LLAMAINDEX_QUERY_URL=http://rag-llamaindex-query:8202
      - LLAMAINDEX_INGESTION_URL=http://rag-llamaindex-ingest:8201
      - QDRANT_URL=http://data-qdrant:6333
      - QDRANT_COLLECTION=${QDRANT_COLLECTION:-documentation__nomic}
      # Ollama Services (Separated for HA)
      - OLLAMA_EMBED_URL=http://rag-ollama-embeddings:11434
      - OLLAMA_LLM_URL=http://rag-ollama-llm:11434
      - OLLAMA_EMBEDDING_MODEL=${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}
      - OLLAMA_LLM_MODEL=${OLLAMA_MODEL:-llama3.1}
      # Redis Infrastructure
      - REDIS_URL=redis://rag-redis-queue:6379
      # Security (Enhanced)
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - JWT_ALGORITHM=HS256
      - INTER_SERVICE_SECRET=${INTER_SERVICE_SECRET}
      # Resilience & Performance
      - CIRCUIT_BREAKER_ENABLED=true
      - CIRCUIT_BREAKER_THRESHOLD=50
      - CIRCUIT_BREAKER_TIMEOUT=30000
      - RAG_TIMEOUT_MS=30000
      - STATUS_CACHE_TTL_MS=30000
      - RATE_LIMIT_WINDOW_MS=60000
      - RATE_LIMIT_MAX_REQUESTS=10
    networks:
      - tradingsystem_backend
    depends_on:
      redis-queue:
        condition: service_healthy
      llamaindex-query:
        condition: service_healthy
      llamaindex-ingestion:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3400/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  tradingsystem_backend:
    external: true

volumes:
  redis_data:
    driver: local
  ollama_embeddings_models:
    driver: local
  ollama_llm_models:
    driver: local
```

> **Padrões de saúde e segurança**  
> - Todos os serviços carregam variáveis via `../../.env`, cumprindo a diretriz central do projeto.  
> - As imagens devem ser versionadas (substituir `latest` por tags específicas durante a implementação).  
> - Saúde integrada via `healthcheck`, com tempos alinhados às recomendações do agente docker-health-optimizer.

### Avaliação docker-health-optimizer (2025-10-31)

- **Estado Geral**: Saudável — todos os serviços definem health checks, usam usuários não-root e dependem do `.env` raiz.
- **Redes/Portas**: Apenas `rag-service` e `ollama` expõem portas para o host; query/ingestion permanecem internos na `tradingsystem_backend`.
- **Volumes**: Persistência apenas para `ollama_models`; Qdrant reutiliza stack externo (`data-qdrant`), evitando conflito de volumes.
- **Segurança**: Variáveis sensíveis carregadas do `.env`; imagens base atualizadas (`node:22-alpine`, `python:3.11-slim`).
- **Recomendações**: Definir tags imutáveis em `${IMG_VERSION}` e `${IMG_RAG_*}` antes do deploy; executar `docker compose config` e `scripts/maintenance/health-check-all.sh` como verificação contínua.

**Tags de imagem sugeridas**:
- `IMG_RAG_OLLAMA=ollama/ollama`
- `IMG_RAG_LLAMAINDEX_INGEST=tradingsystem/llamaindex-ingest`
- `IMG_RAG_LLAMAINDEX_QUERY=tradingsystem/llamaindex-query`
- `IMG_RAG_SERVICE=tradingsystem/rag-service`
- `IMG_VERSION` apontando para uma tag imutável (ex.: `2025.10.31`)

### Resource Limits

```yaml
services:
  rag-service:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  llamaindex-query:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

  llamaindex-ingestion:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

  qdrant:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  ollama:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '2.0'
          memory: 4G
```

## Implementation Plan

### Phase 1: Auditoria dos Dockerfiles existentes (Semana 1)

**Tasks**:
1. Revisar `backend/api/documentation-api/Dockerfile` (rag-service) para confirmar exposição interna (3000), healthcheck e uso de `dumb-init`.
2. Validar `tools/llamaindex/Dockerfile.query` e `Dockerfile.ingestion` (dependências, usuários não-root, bibliotecas NLTK, libmagic).
3. Criar/ajustar `.dockerignore` para cada serviço reduzindo contexto de build.
4. Medir tamanho das imagens e aplicar otimizações (multi-stage, limpeza de cache) mantendo meta <500 MB.
5. Rodar `docker build` via `scripts/docker/build-rag-images.sh` (novo script opcional) garantindo consistência.

**Deliverables**:
- Dockerfiles auditados e documentados.
- Checklist de conformidade com o agente docker-health-optimizer (usuarios não root, healthcheck, env central).
- Relatório de tamanho das imagens com oportunidades de redução.

### Phase 2: Ajustes no Docker Compose (Semana 1)

**Tasks**:
1. Atualizar `tools/compose/docker-compose.rag.yml` conforme snippet acima, removendo dependência de rede dedicada e reutilizando `tradingsystem_backend`.
2. Garantir que todos os serviços usam `env_file: ../../.env` (diretriz obrigatória).
3. Definir variáveis `IMG_*` com versões específicas (substituir `latest` por tags internas).
4. Integrar checagens de saúde com `scripts/maintenance/health-check-all.sh` e documentar instruções de uso.
5. Validar configuração com o agente docker-health-optimizer (camada de segurança, limites de recursos, restart).

**Deliverables**:
- Compose atualizado e validado (`yamllint`, `docker compose config`).
- Tabela de versões das imagens (fonte única em `.env` ou `config/docker-images.env`).
- Registro da execução do agente docker-health-optimizer com status **Healthy**.

### Phase 3: Scripts de Operação & Migração (Semana 2)

**Tasks**:
1. Criar scripts em `scripts/docker/rag/` para inicialização, parada, health check, backup e restauração.
2. Documentar sequência de start considerando dependência do `data-qdrant` e do stack de dados.
3. Elaborar plano de rollback (switch rápido para serviços legados).
4. Configurar monitoramento (Prometheus/Grafana) reutilizando dashboards existentes.

**Deliverables**:
```bash
scripts/docker/rag/
├── init.sh                 # Provisiona stack após validar data-qdrant
├── migrate.sh              # Aplica migrações e inicializações necessárias
├── rollback.sh             # Retorna para execução não containerizada
├── health-check.sh         # Usa docker-health-optimizer + health endpoints
└── backup.sh               # Automatiza dumps de volumes (ollama/qdrant)
```

### Phase 4: Testing & Validation (Semana 2)

**Tasks**:
1. Unit tests for containerized services
2. Integration tests
3. Performance benchmarks
4. Load testing
5. Failover testing

**Test Scenarios**:
- Container startup/shutdown
- Service discovery
- Network communication
- Volume persistence
- Health checks
- Auto-restart
- Resource limits

### Phase 5: Documentation & Deployment (Semana 3)

**Tasks**:
1. Update CLAUDE.md
2. Create deployment guide
3. Update architecture diagrams
4. Train team
5. Production deployment

**Documentation**:
- `docs/content/tools/rag/docker-deployment.mdx`
- `docs/content/tools/rag/troubleshooting.mdx`
- `docs/content/diagrams/rag-architecture.puml`

## Operational Considerations

### Startup Sequence

```bash
# 1. Garantir rede compartilhada ativa
docker network inspect tradingsystem_backend >/dev/null 2>&1 || \
  docker network create tradingsystem_backend

# 2. Subir serviços de dados (qdrant incluso)
docker compose -f tools/compose/docker-compose.database.yml up -d data-qdrant

# 3. Subir runtime Ollama
docker compose -f tools/compose/docker-compose.rag.yml up -d ollama

# 4. Carregar modelos necessários
docker exec rag-ollama ollama pull ${OLLAMA_MODEL:-llama3.1}
docker exec rag-ollama ollama pull ${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}

# 5. Subir serviços LlamaIndex
docker compose -f tools/compose/docker-compose.rag.yml up -d llamaindex-ingestion llamaindex-query

# 6. Subir rag-service (gateway RAG)
docker compose -f tools/compose/docker-compose.rag.yml up -d rag-service

# 7. Verificar saúde integrada
docker compose -f tools/compose/docker-compose.rag.yml ps
bash scripts/docker/rag/health-check.sh
```

### Monitoring

**Metrics to Track**:
- Container CPU/Memory usage
- Request latency (p50, p95, p99)
- Error rates
- Query throughput
- Vector database size
- Model loading time

**Tools**:
- Docker stats
- Prometheus + Grafana
- Logs via Docker logging driver
- Health endpoints

### Backup Strategy

```bash
# Backup Qdrant data
docker run --rm \
  -v rag-qdrant-data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine \
  tar -czf /backup/qdrant-$(date +%Y%m%d).tar.gz -C /source .

# Backup Ollama models
docker run --rm \
  -v rag-ollama-data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine \
  tar -czf /backup/ollama-$(date +%Y%m%d).tar.gz -C /source .
```

### Rollback Plan

```bash
# Stop containers
docker compose -f docker-compose.rag.yml down

# Restore previous version
docker compose -f docker-compose.rag.yml pull

# Start services
docker compose -f docker-compose.rag.yml up -d

# Verify health
bash scripts/docker/rag/health-check.sh
```

## Security Considerations

### Network Security
- Utiliza rede compartilhada `tradingsystem_backend` com isolamento por DNS interno
- Sem exposição direta dos serviços internos (ingestion/query) para fora da rede
- Apenas `rag-service` e `ollama` mapeados para portas externas controladas

### Secrets Management
- JWT secrets via environment variables
- No secrets in images
- Use Docker secrets in production

### Container Security
- Non-root users in all containers
- Read-only volumes where possible
- Security scanning (Trivy, Snyk)
- Regular image updates

## Performance Considerations

### Image Optimization
- Multi-stage builds
- Alpine base images where possible
- Layer caching
- .dockerignore files
- Target size: <500MB per image

### Runtime Optimization
- Health check intervals
- Restart policies
- Resource limits
- Shared memory for Ollama
- Connection pooling

## Migration Path

### Backward Compatibility

Durante a migração, **ambos** os sistemas rodarão em paralelo:

1. **Legacy (Non-containerized)**:
   - Continue rodando via npm/python diretamente
   - Usa portas originais

2. **New (Containerized)**:
   - Roda em containers Docker
   - Usa portas alternativas durante transição

### Parallel Operation

```yaml
# Legacy ports (existing)
- Documentation API: 3401 (native)
- LlamaIndex Query: 8202 (native)
- LlamaIndex Ingestion: 8201 (native)

# Portas host (durante migração)
- Documentation API: 3410 → 3400 (após cutover) [mapeado para 3000 interno]
- LlamaIndex Query: 8210 → 8202 (após cutover) [mapeado para 8000 interno]
- LlamaIndex Ingestion: 8211 → 8201 (após cutover) [mapeado para 8000 interno]
```

### Cutover Plan

1. Deploy containers com portas alternativas
2. Testar funcionalidade completa
3. Redirecionar tráfego para containers
4. Monitorar por 24h
5. Desligar serviços legacy
6. Atualizar portas dos containers para portas definitivas

## Success Criteria

### Must Have
- [ ] Quatro containers RAG (ollama, ingestion, query, rag-service) buildam com sucesso
- [ ] Integração comprovada com `data-qdrant` existente
- [ ] Health checks pass
- [ ] Data persists across restarts
- [ ] Performance equivalent to non-containerized
- [ ] Zero downtime deployment possible

### Should Have
- [ ] GPU support for Ollama/Query
- [ ] Automated backups
- [ ] Monitoring dashboards
- [ ] Resource limits configured
- [ ] Documentation complete

### Nice to Have
- [ ] Auto-scaling support
- [ ] Blue-green deployment
- [ ] Kubernetes manifests
- [ ] CI/CD integration

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation | High | Low | Benchmark before/after, optimize |
| Data loss during migration | High | Low | Backup before migration, test restore |
| Container networking issues | Medium | Medium | Test thoroughly, document troubleshooting |
| Increased complexity | Medium | High | Comprehensive documentation, training |
| Resource exhaustion | Medium | Medium | Set limits, monitor, alert |

## Alternatives Considered

### 1. Virtual Machines
- **Pros**: Complete isolation
- **Cons**: Heavy, slow startup, resource intensive
- **Decision**: Rejected - overkill for our needs

### 2. Kubernetes
- **Pros**: Enterprise-grade orchestration
- **Cons**: Complex, overkill for single-node
- **Decision**: Future consideration

### 3. Keep as-is (No containerization)
- **Pros**: No migration work
- **Cons**: Limits scalability, portability
- **Decision**: Rejected - long-term limitations

## References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [FastAPI in Docker](https://fastapi.tiangolo.com/deployment/docker/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Qdrant Docker](https://qdrant.tech/documentation/quick-start/)
- [Ollama Docker](https://hub.docker.com/r/ollama/ollama)

## Appendix

### A. Environment Variables Reference

Complete list in `docs/content/tools/rag/environment-variables.mdx`

### B. Troubleshooting Guide

Common issues and solutions in `docs/content/tools/rag/troubleshooting.mdx`

### C. Performance Benchmarks

Baseline metrics for comparison in `docs/content/tools/rag/benchmarks.mdx`

---

**Next Steps**: Review this proposal and approve to proceed with implementation.
