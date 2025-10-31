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

### Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network: rag-net                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │  documentation-api   │  │  llamaindex-query    │         │
│  │  (Node.js/Express)   │  │  (Python/FastAPI)    │         │
│  │  Port: 3401          │  │  Port: 8202          │         │
│  │  - Routes            │  │  - Query Engine      │         │
│  │  - RAG Proxy         │  │  - Search            │         │
│  │  - Status            │  │  - GPU Management    │         │
│  └──────────────────────┘  └──────────────────────┘         │
│           ↓                          ↓                        │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ llamaindex-ingestion │  │      qdrant          │         │
│  │  (Python/FastAPI)    │  │  (Vector Database)   │         │
│  │  Port: 8201          │  │  Port: 6333          │         │
│  │  - Document Ingest   │  │  - Vector Storage    │         │
│  │  - Chunk Processing  │  │  - Collections       │         │
│  └──────────────────────┘  └──────────────────────┘         │
│           ↓                                                   │
│  ┌──────────────────────┐                                    │
│  │       ollama         │                                    │
│  │  (LLM Runtime)       │                                    │
│  │  Port: 11434         │                                    │
│  │  - Model Serving     │                                    │
│  │  - Embeddings        │                                    │
│  └──────────────────────┘                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Containers Detalhados

#### 1. documentation-api Container

**Propósito**: API Gateway para RAG system

```yaml
Service: documentation-api
Image: tradingsystem/documentation-api:latest
Base: node:20-alpine
Port: 3401
Network: rag-net
```

**Features**:
- Routes: `/api/v1/rag/*`
- Services: CollectionService, RagProxyService
- Dependencies: JWT auth, error handling
- Health Check: GET /api/health
- Restart Policy: unless-stopped

**Environment Variables**:
```env
# Service Configuration
NODE_ENV=production
PORT=3401
LOG_LEVEL=info

# RAG Services
LLAMAINDEX_QUERY_URL=http://llamaindex-query:8202
LLAMAINDEX_INGESTION_URL=http://llamaindex-ingestion:8201
QDRANT_URL=http://qdrant:6333

# Security
JWT_SECRET_KEY=${JWT_SECRET_KEY}
JWT_ALGORITHM=HS256

# Performance
RAG_TIMEOUT_MS=30000
STATUS_CACHE_TTL_MS=30000
```

**Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY backend/shared ./backend/shared
COPY backend/api/documentation-api ./backend/api/documentation-api

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3401/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Non-root user
USER node

EXPOSE 3401

CMD ["node", "backend/api/documentation-api/src/server.js"]
```

#### 2. llamaindex-query Container

**Propósito**: Query e busca semântica

```yaml
Service: llamaindex-query
Image: tradingsystem/llamaindex-query:latest
Base: python:3.11-slim
Port: 8202
Network: rag-net
GPU: optional (--gpus all)
```

**Features**:
- FastAPI endpoints: /query, /search, /health
- Vector search via Qdrant
- LLM integration via Ollama
- GPU scheduling and management
- Response caching

**Environment Variables**:
```env
# Service Configuration
PYTHONUNBUFFERED=1
PORT=8202
LOG_LEVEL=info

# Vector Database
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_COLLECTION=documentation__nomic

# LLM Configuration
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama3.2:3b
EMBEDDING_MODEL=mxbai-embed-large
EMBEDDING_DIM=384

# GPU Configuration
GPU_ENABLED=true
GPU_MAX_CONCURRENCY=2
GPU_COOLDOWN_SECONDS=5

# Performance
QUERY_TIMEOUT_SECONDS=30
CACHE_TTL_SECONDS=300
```

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY tools/llamaindex/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY tools/llamaindex/query_service ./query_service
COPY tools/llamaindex/shared ./shared

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8202/health || exit 1

# Non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8202

CMD ["uvicorn", "query_service.main:app", "--host", "0.0.0.0", "--port", "8202"]
```

#### 3. llamaindex-ingestion Container

**Propósito**: Ingestão e processamento de documentos

```yaml
Service: llamaindex-ingestion
Image: tradingsystem/llamaindex-ingestion:latest
Base: python:3.11-slim
Port: 8201
Network: rag-net
Volumes:
  - ./docs/content:/data/docs:ro
```

**Features**:
- Document ingestion: /ingest/directory
- Chunk processing and optimization
- Collection management
- Multi-format support (MD, MDX, PDF, TXT)

**Environment Variables**:
```env
# Service Configuration
PYTHONUNBUFFERED=1
PORT=8201
LOG_LEVEL=info

# Data Paths
DOCS_DIR=/data/docs
COLLECTIONS_CONFIG=/app/collection-config.json

# Vector Database
QDRANT_HOST=qdrant
QDRANT_PORT=6333

# LLM Configuration
OLLAMA_HOST=http://ollama:11434
EMBEDDING_MODEL=mxbai-embed-large
EMBEDDING_DIM=384

# Processing Configuration
CHUNK_SIZE=512
CHUNK_OVERLAP=50
MAX_WORKERS=4
```

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY tools/llamaindex/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY tools/llamaindex/ingestion_service ./ingestion_service
COPY tools/llamaindex/shared ./shared
COPY tools/llamaindex/collection-config.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8201/health || exit 1

# Non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8201

CMD ["uvicorn", "ingestion_service.main:app", "--host", "0.0.0.0", "--port", "8201"]
```

#### 4. qdrant Container

**Propósito**: Vector database

```yaml
Service: qdrant
Image: qdrant/qdrant:v1.7.4
Port: 6333, 6334 (gRPC)
Network: rag-net
Volumes:
  - qdrant-data:/qdrant/storage
```

**Configuration**:
```yaml
log_level: INFO
storage:
  storage_path: /qdrant/storage
  snapshots_path: /qdrant/snapshots
service:
  http_port: 6333
  grpc_port: 6334
  max_request_size_mb: 32
  enable_cors: true
```

#### 5. ollama Container

**Propósito**: LLM runtime

```yaml
Service: ollama
Image: ollama/ollama:latest
Port: 11434
Network: rag-net
GPU: optional (--gpus all)
Volumes:
  - ollama-data:/root/.ollama
```

### Docker Compose Configuration

**Arquivo**: `tools/compose/docker-compose.rag.yml`

```yaml
version: '3.8'

name: tradingsystem-rag

networks:
  rag-net:
    name: rag-net
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16

volumes:
  qdrant-data:
    name: rag-qdrant-data
  ollama-data:
    name: rag-ollama-data

services:
  # Vector Database
  qdrant:
    image: qdrant/qdrant:v1.7.4
    container_name: rag-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    networks:
      rag-net:
        ipv4_address: 172.25.0.10
    volumes:
      - qdrant-data:/qdrant/storage
      - ./qdrant-config.yaml:/qdrant/config/production.yaml:ro
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334
      - QDRANT__LOG_LEVEL=INFO
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  # LLM Runtime
  ollama:
    image: ollama/ollama:latest
    container_name: rag-ollama
    ports:
      - "11434:11434"
    networks:
      rag-net:
        ipv4_address: 172.25.0.11
    volumes:
      - ollama-data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
      - OLLAMA_ORIGINS=*
    # Uncomment for GPU support
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    restart: unless-stopped

  # Ingestion Service
  llamaindex-ingestion:
    build:
      context: ../../
      dockerfile: tools/llamaindex/Dockerfile.ingestion
    image: tradingsystem/llamaindex-ingestion:latest
    container_name: rag-ingestion
    ports:
      - "8201:8201"
    networks:
      rag-net:
        ipv4_address: 172.25.0.20
    volumes:
      - ../../docs/content:/data/docs:ro
      - ./collection-config.json:/app/collection-config.json:ro
    environment:
      - PYTHONUNBUFFERED=1
      - PORT=8201
      - LOG_LEVEL=info
      - DOCS_DIR=/data/docs
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
      - OLLAMA_HOST=http://ollama:11434
      - EMBEDDING_MODEL=mxbai-embed-large
      - EMBEDDING_DIM=384
      - CHUNK_SIZE=512
      - CHUNK_OVERLAP=50
      - MAX_WORKERS=4
    depends_on:
      qdrant:
        condition: service_healthy
      ollama:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8201/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    restart: unless-stopped

  # Query Service
  llamaindex-query:
    build:
      context: ../../
      dockerfile: tools/llamaindex/Dockerfile.query
    image: tradingsystem/llamaindex-query:latest
    container_name: rag-query
    ports:
      - "8202:8202"
    networks:
      rag-net:
        ipv4_address: 172.25.0.21
    environment:
      - PYTHONUNBUFFERED=1
      - PORT=8202
      - LOG_LEVEL=info
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
      - QDRANT_COLLECTION=documentation__nomic
      - OLLAMA_HOST=http://ollama:11434
      - OLLAMA_MODEL=llama3.2:3b
      - EMBEDDING_MODEL=mxbai-embed-large
      - EMBEDDING_DIM=384
      - GPU_ENABLED=true
      - GPU_MAX_CONCURRENCY=2
      - GPU_COOLDOWN_SECONDS=5
      - QUERY_TIMEOUT_SECONDS=30
      - CACHE_TTL_SECONDS=300
    depends_on:
      qdrant:
        condition: service_healthy
      ollama:
        condition: service_healthy
    # Uncomment for GPU support
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8202/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    restart: unless-stopped

  # Documentation API
  documentation-api:
    build:
      context: ../../
      dockerfile: backend/api/documentation-api/Dockerfile
    image: tradingsystem/documentation-api:latest
    container_name: rag-documentation-api
    ports:
      - "3401:3401"
    networks:
      rag-net:
        ipv4_address: 172.25.0.30
    environment:
      - NODE_ENV=production
      - PORT=3401
      - LOG_LEVEL=info
      - LLAMAINDEX_QUERY_URL=http://llamaindex-query:8202
      - LLAMAINDEX_INGESTION_URL=http://llamaindex-ingestion:8201
      - QDRANT_URL=http://qdrant:6333
      - QDRANT_COLLECTION=documentation__nomic
      - JWT_SECRET_KEY=${JWT_SECRET_KEY:-dev-secret}
      - JWT_ALGORITHM=HS256
      - RAG_TIMEOUT_MS=30000
      - STATUS_CACHE_TTL_MS=30000
    depends_on:
      llamaindex-query:
        condition: service_healthy
      llamaindex-ingestion:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3401/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    restart: unless-stopped
```

### Resource Limits

```yaml
services:
  documentation-api:
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

### Phase 1: Dockerfiles Creation (Week 1)

**Tasks**:
1. Create `backend/api/documentation-api/Dockerfile`
2. Create `tools/llamaindex/Dockerfile.query`
3. Create `tools/llamaindex/Dockerfile.ingestion`
4. Create `.dockerignore` files
5. Test individual image builds

**Deliverables**:
- 3 Dockerfiles
- Build scripts
- Image size optimization (<500MB each)

### Phase 2: Docker Compose Configuration (Week 1)

**Tasks**:
1. Create `docker-compose.rag.yml`
2. Configure networks and volumes
3. Set environment variables
4. Configure health checks
5. Test local deployment

**Deliverables**:
- Complete docker-compose file
- Environment variable template
- Health check scripts

### Phase 3: Migration Scripts (Week 2)

**Tasks**:
1. Create initialization scripts
2. Data migration scripts
3. Rollback procedures
4. Monitoring setup

**Deliverables**:
```bash
scripts/docker/rag/
├── init.sh                 # Initialize RAG stack
├── migrate.sh              # Migrate data
├── rollback.sh             # Rollback to non-containerized
├── health-check.sh         # Health verification
└── backup.sh               # Backup volumes
```

### Phase 4: Testing & Validation (Week 2)

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

### Phase 5: Documentation & Deployment (Week 3)

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
# 1. Start infrastructure (network, volumes)
docker network create rag-net

# 2. Start Qdrant (vector database)
docker compose -f docker-compose.rag.yml up -d qdrant

# 3. Start Ollama (LLM runtime)
docker compose -f docker-compose.rag.yml up -d ollama

# 4. Pull Ollama models
docker exec rag-ollama ollama pull llama3.2:3b
docker exec rag-ollama ollama pull mxbai-embed-large

# 5. Start LlamaIndex services
docker compose -f docker-compose.rag.yml up -d llamaindex-ingestion llamaindex-query

# 6. Start Documentation API
docker compose -f docker-compose.rag.yml up -d documentation-api

# 7. Verify health
docker compose -f docker-compose.rag.yml ps
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
- Isolated Docker network (rag-net)
- No direct external access to internal services
- Only documentation-api exposed externally

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

# Container ports (during migration)
- Documentation API: 3411 (containerized) → 3401 (after cutover)
- LlamaIndex Query: 8212 (containerized) → 8202 (after cutover)
- LlamaIndex Ingestion: 8211 (containerized) → 8201 (after cutover)
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
- [ ] All 5 containers build successfully
- [ ] Services communicate via Docker network
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
