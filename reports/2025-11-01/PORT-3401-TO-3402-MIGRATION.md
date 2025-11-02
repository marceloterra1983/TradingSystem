# Migração: Porta 3401 → 3402 (RAG Service)

**Data**: 2025-11-01  
**Status**: ✅ Completo  
**Tipo**: Correção de Arquitetura

---

## 📋 Problema Identificado

O projeto tinha **código obsoleto** rodando manualmente em `backend/api/documentation-api` na porta **3401**, enquanto a **arquitetura correta** usa a stack Docker RAG Services na porta **3402**.

### Conflito de Arquitetura

❌ **Código Obsoleto (REMOVIDO)**:
```bash
cd backend/api/documentation-api
npm run dev  # Porta 3401 (standalone)
```

✅ **Arquitetura Correta (Docker Stack)**:
```yaml
# tools/compose/docker-compose.rag.yml
services:
  rag-service:
    container_name: rag-service
    ports:
      - "3402:3000"  # Documentation API + RAG
    depends_on:
      - rag-llamaindex-query
      - rag-llamaindex-ingest
      - rag-ollama
      - rag-redis
```

---

## 🎯 Solução Aplicada

### 1. Stack RAG Completa (Porta 3402)

```bash
# Iniciar stack RAG
docker compose -f tools/compose/docker-compose.rag.yml up -d

# Serviços ativos:
✅ rag-service (porta 3402) - Documentation API + RAG
✅ rag-collections-service (porta 3403)
✅ rag-llamaindex-query (porta 8202)
✅ rag-llamaindex-ingest (porta 8201)
✅ rag-ollama (porta 11434)
✅ rag-redis (porta 6380)
✅ data-qdrant (porta 6333)
```

### 2. Arquivos Corrigidos

#### Frontend

- ✅ `frontend/dashboard/vite.config.ts` - Proxy 3401 → 3402
- ✅ `frontend/dashboard/src/config/api.ts` - docsApiUrl 3401 → 3402
- ✅ `frontend/dashboard/src/hooks/llamaIndex/useLlamaIndexStatus.ts` - Mensagens de erro
- ✅ `frontend/dashboard/src/services/documentationService.ts` - Comentários
- ✅ `frontend/dashboard/src/components/pages/APIViewerPage.tsx` - Port config
- ✅ `frontend/dashboard/src/components/pages/ConnectionsPageNew.tsx` - Service description
- ✅ `frontend/dashboard/src/components/pages/launcher/DockerContainersSection.tsx` - Container ports
- ✅ `frontend/dashboard/src/hooks/llamaIndex/__tests__/useLlamaIndexStatus.test.ts` - Tests

---

## 🔗 Endpoints Corretos

### RAG Service (Porta 3402)

```bash
# Health Check
curl http://localhost:3402/api/v1/rag/status/health

# Status Completo
curl http://localhost:3402/api/v1/rag/status

# Collections
curl http://localhost:3402/api/v1/rag/collections

# Query (via proxy)
curl -X POST http://localhost:3402/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Como funciona o sistema de trading?"}'

# Search
curl http://localhost:3402/api/v1/rag/search?q=trading&max_results=5
```

### Collections Service (Porta 3403)

```bash
# List collections
curl http://localhost:3403/api/v1/rag/collections

# Collection stats
curl http://localhost:3403/api/v1/rag/collections/documentation__nomic
```

---

## 📊 Comparação: Antes vs Depois

| Aspecto | ❌ Antes (Porta 3401) | ✅ Depois (Porta 3402) |
|---------|----------------------|------------------------|
| **Serviço** | documentation-api standalone | rag-service (Docker stack) |
| **Arquitetura** | Processo Node.js manual | Container orquestrado |
| **Dependências** | Isolado | Integrado (LlamaIndex, Ollama, Redis, Qdrant) |
| **RAG** | Não funcional | Totalmente funcional |
| **Health Check** | Básico | Completo com dependências |
| **Cache** | Sem Redis | Redis integrado |
| **Embeddings** | Não disponível | Ollama + nomic-embed-text |
| **Query Engine** | Não disponível | LlamaIndex Query Service |
| **Ingestion** | Manual | LlamaIndex Ingestion Service |

---

## ✅ Validação

```bash
# 1. Verificar stack RAG
docker compose -f tools/compose/docker-compose.rag.yml ps

# 2. Testar health check
curl -s http://localhost:3402/api/v1/rag/status/health | jq .

# 3. Verificar collections
curl -s http://localhost:3402/api/v1/rag/collections | jq '.collections[]'

# 4. Testar query
curl -X POST http://localhost:3402/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Explique a arquitetura do sistema"}' | jq .

# Resultado esperado:
# ✅ services.query.ok: true
# ✅ services.ingestion.ok: true
# ✅ qdrant.ok: true
# ✅ qdrant.collection: "documentation"
# ✅ qdrant.count: 4116 (ou mais)
```

---

## 🔄 Como Iniciar (Correto)

### Opção 1: Comando Universal

```bash
cd /home/marce/Projetos/TradingSystem
bash scripts/start-all-services.sh

# Ou se os aliases estão configurados:
start
```

### Opção 2: Stack RAG Específica

```bash
cd /home/marce/Projetos/TradingSystem

# Iniciar stack RAG
docker compose -f tools/compose/docker-compose.rag.yml up -d

# Aguardar inicialização (30-60s)
watch -n 2 'docker compose -f tools/compose/docker-compose.rag.yml ps'

# Verificar health
curl http://localhost:3402/api/v1/rag/status/health
```

---

## 📚 Documentação Relacionada

- **[RAG-SERVICES-ARCHITECTURE.md](RAG-SERVICES-ARCHITECTURE.md)** - Arquitetura completa
- **[docker-compose.rag.yml](tools/compose/docker-compose.rag.yml)** - Definição da stack
- **[CLAUDE.md](CLAUDE.md)** - Instruções gerais do projeto

---

## ⚠️ DEPRECATED: Não Use Mais

```bash
# ❌ OBSOLETO - NÃO USAR!
cd backend/api/documentation-api
npm run dev  # Porta 3401

# ✅ USE ISTO EM VEZ:
docker compose -f tools/compose/docker-compose.rag.yml up -d
```

---

## 📝 Notas Adicionais

1. **Port Mapping**:
   - `3400` - Documentation Hub (NGINX + Docusaurus estático)
   - `3402` - RAG Service (Documentation API + RAG/LlamaIndex)
   - `3403` - RAG Collections Service

2. **Dependências**:
   - Network: `tradingsystem_backend` (deve existir)
   - Volume: `ollama_models` (para modelos LLM)
   - Volume: `rag_redis_data` (para cache)

3. **Ambiente**:
   - Todas as variáveis de ambiente vêm do `.env` raiz
   - JWT secrets são gerados automaticamente
   - CORS configurado para `http://localhost:3103`

---

**Autor**: Claude (Anthropic)  
**Revisão**: 2025-11-01  
**Status**: ✅ Production Ready

