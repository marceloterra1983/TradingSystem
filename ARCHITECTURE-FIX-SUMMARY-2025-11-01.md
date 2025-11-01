# Correção de Arquitetura: Porta 3401 → 3402

**Data**: 2025-11-01  
**Status**: ✅ **RESOLVIDO**  
**Gravidade**: Alta (Conflito de Arquitetura)  

---

## 🔍 Problema Original

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /api/v1/rag/status not found"
  }
}
```

### Causa Raiz

O frontend estava configurado para acessar **porta 3401** (código obsoleto), mas a **arquitetura correta** usa a stack Docker RAG na **porta 3402**.

---

## 🎯 Solução Implementada

### 1. Stack Docker RAG (Arquitetura Correta)

```yaml
# tools/compose/docker-compose.rag.yml
services:
  rag-service:           # Porta 3402 - Documentation API + RAG
  rag-collections-service:  # Porta 3403 - Collections Manager
  rag-llamaindex-query:     # Porta 8202 - Query Engine
  rag-llamaindex-ingest:    # Porta 8201 - Ingestion Service
  rag-ollama:              # Porta 11434 - Embeddings Model
  rag-redis:               # Porta 6380 - Cache
```

### 2. Arquivos Corrigidos (8 arquivos)

#### Frontend Dashboard

1. **vite.config.ts**
   - Proxy: `3401` → `3402`
   - Comentário: "DocsAPI" → "RAG Service"

2. **src/config/api.ts**
   - `docsApiUrl`: `3401` → `3402`
   - Documentação atualizada

3. **src/hooks/llamaIndex/useLlamaIndexStatus.ts**
   - Mensagem de erro: "porta 3401" → "porta 3402"

4. **src/services/documentationService.ts**
   - Comentários atualizados para `3402`

5. **src/components/pages/APIViewerPage.tsx**
   - `port: '3401'` → `port: '3402'`

6. **src/components/pages/ConnectionsPageNew.tsx**
   - Nome: "Documentation API" → "RAG Service"
   - Porta: `3401` → `3402`

7. **src/components/pages/launcher/DockerContainersSection.tsx**
   - `ports: ['3401']` → `ports: ['3402']`

8. **src/hooks/llamaIndex/__tests__/useLlamaIndexStatus.test.ts**
   - Teste: "porta 3401" → "porta 3402"

---

## ✅ Validação

### Antes (❌ Falha)

```bash
curl http://localhost:3401/api/v1/rag/status
# Connection refused (serviço não rodando)
```

### Depois (✅ Sucesso)

```bash
curl http://localhost:3402/api/v1/rag/status
```

```json
{
  "timestamp": "2025-11-01T05:20:07.900Z",
  "requestedCollection": "documentation",
  "services": {
    "query": {
      "ok": true,
      "status": 200,
      "message": "healthy",
      "collection": "documentation"
    },
    "ingestion": {
      "ok": true,
      "status": 200,
      "message": "healthy"
    }
  },
  "qdrant": {
    "collection": "documentation",
    "ok": true,
    "status": 200,
    "count": 4116
  }
}
```

---

## 🏗️ Arquitetura Final

### Port Mapping

| Porta | Serviço | Tipo | Container |
|-------|---------|------|-----------|
| **3400** | Documentation Hub | NGINX + Docusaurus | `docs-hub` |
| **3402** | RAG Service | Express + RAG/LlamaIndex | `rag-service` |
| **3403** | Collections Service | Express + Qdrant | `rag-collections-service` |
| **8201** | LlamaIndex Ingestion | FastAPI + Python | `rag-llamaindex-ingest` |
| **8202** | LlamaIndex Query | FastAPI + Python | `rag-llamaindex-query` |
| **11434** | Ollama | LLM + Embeddings | `rag-ollama` |
| **6333** | Qdrant | Vector Database | `data-qdrant` |
| **6380** | Redis | Cache | `rag-redis` |

### Data Flow

```
Frontend (port 3103)
    ↓
Vite Proxy (/api/docs → http://localhost:3402)
    ↓
RAG Service (port 3402)
    ↓
├── LlamaIndex Query (port 8202)
├── LlamaIndex Ingest (port 8201)
├── Qdrant (port 6333)
└── Ollama (port 11434)
```

---

## 🚀 Como Usar (Correto)

### Iniciar Stack RAG

```bash
cd /home/marce/Projetos/TradingSystem

# Opção 1: Stack RAG isolada
docker compose -f tools/compose/docker-compose.rag.yml up -d

# Opção 2: Startup universal (recomendado)
bash scripts/start-all-services.sh
```

### Verificar Saúde

```bash
# Health check
curl http://localhost:3402/api/v1/rag/status/health | jq .

# Collections
curl http://localhost:3402/api/v1/rag/collections | jq .

# Query test
curl -X POST http://localhost:3402/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Como funciona o sistema?"}' | jq .
```

---

## 📊 Impacto

### Benefícios

✅ **Arquitetura Consistente**: Docker stack em vez de processos manuais  
✅ **RAG Funcional**: LlamaIndex + Ollama + Qdrant integrados  
✅ **Melhor Performance**: Redis cache + embedding reutilizado  
✅ **Escalabilidade**: Containers orquestrados com health checks  
✅ **Monitoramento**: Logs centralizados e métricas Prometheus  

### Serviços Afetados

- ✅ Frontend Dashboard - Proxy atualizado
- ✅ RAG Service - Porta correta (3402)
- ✅ Health Checks - URLs atualizadas
- ✅ API Viewer - Specs atualizadas
- ✅ Connections Page - Serviços corretos
- ✅ Docker Containers Section - Portas corretas

---

## ⚠️ DEPRECATED (Não Use Mais)

```bash
# ❌ OBSOLETO - CÓDIGO ANTIGO
cd backend/api/documentation-api
npm run dev  # Porta 3401 (standalone)
```

**Motivo**: Este é código legado que não integra com a stack RAG. Use sempre a stack Docker.

---

## 📚 Documentação Adicional

- **[PORT-3401-TO-3402-MIGRATION.md](PORT-3401-TO-3402-MIGRATION.md)** - Detalhes da migração
- **[RAG-SERVICES-ARCHITECTURE.md](RAG-SERVICES-ARCHITECTURE.md)** - Arquitetura completa
- **[docker-compose.rag.yml](tools/compose/docker-compose.rag.yml)** - Stack definition
- **[CLAUDE.md](CLAUDE.md)** - Project instructions

---

## 🎯 Próximos Passos

1. ✅ **Frontend atualizado** - Porta 3402
2. ✅ **Stack RAG rodando** - Todos os serviços healthy
3. ✅ **Health checks funcionando** - Status 200
4. ⏳ **Atualizar documentação legada** - Arquivos .md com porta 3401
5. ⏳ **Validar testes E2E** - Após rebuild do frontend

---

**Resolução**: ✅ **COMPLETO**  
**Próxima Ação**: Rebuild frontend para aplicar mudanças de configuração  
**Responsável**: Desenvolvedor  
**Revisão**: 2025-11-01  

