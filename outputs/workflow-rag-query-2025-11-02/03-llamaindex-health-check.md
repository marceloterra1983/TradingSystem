# 🏥 Health Check: LlamaIndex Query Service

**Data:** 2025-11-02  
**Serviço:** LlamaIndex Query Service  
**Port:** 8202  
**Container:** `rag-llamaindex-query`

---

## 📊 Status Geral

| Componente | Status | Detalhes |
|------------|--------|----------|
| **Container** | ✅ UP | Running (healthy) |
| **Health Endpoint** | ✅ OK | `/health` responde |
| **Qdrant Connection** | ✅ OK | 51,940 vetores na coleção `documentation__nomic` |
| **Ollama Connection** | ✅ OK | Modelos disponíveis |
| **GPU** | ✅ OK | RTX 5090 (5GB/32GB used) |
| **Query Endpoint** | ⚠️ **PARCIAL** | `/query` existe mas falha em execução |

---

## 🔍 Descobertas do Health Check

### 1. **Endpoints Disponíveis** (via OpenAPI /docs)

```
http://localhost:8202/
├── GET  /health          ✅ Status: healthy
├── POST /query           ⚠️  Requer JWT + Falha com LLM
├── POST /search          ❌ Method not allowed  
└── GET  /gpu/policy      ✅ GPU policy config
```

**Swagger UI:** http://localhost:8202/docs ✅

---

### 2. **Health Endpoint Response**

```json
{
  "collection": "documentation__nomic",
  "configuredCollection": "documentation__nomic",
  "activeCollection": "documentation__nomic",
  "status": "healthy",
  "collectionExists": true,
  "vectors": 51940,
  "fallbackApplied": false
}
```

**Análise:**
- ✅ Coleção `documentation__nomic` ativa
- ✅ **51,940 vetores indexados** (dados disponíveis!)
- ✅ Sem fallback (coleção configurada existe)
- ✅ Qdrant connection funcionando

---

### 3. **Query Endpoint Problem**

#### Request Teste
```bash
curl -X POST http://localhost:8202/query \
  -H "Authorization: Bearer <JWT>" \
  -d '{"query":"test","top_k":3}'
```

#### Response
```json
{
  "detail": "Error processing query: llama runner process has terminated: signal: killed (status code: 500)"
}
```

**Diagnóstico:**
- ⚠️ Endpoint **aceita autenticação** (JWT validado)
- ❌ **Falha ao executar query** (LLM process killed)
- 🔍 **Causa provável:** Ollama está tentando carregar LLM (llama3.1:latest - 4GB) para geração de resposta, mas:
  - Modelo muito grande ou memória insuficiente
  - Ou configuração incorreta (query não precisa de LLM, só embedding!)

**Para Busca Vetorial Simples:**
- ✅ **Só precisa:** Embedding model (nomic-embed-text) →  Qdrant search
- ❌ **NÃO precisa:** LLM (llama3.1) para geração de texto

---

### 4. **Qdrant Status**

```bash
curl http://localhost:6333/collections/documentation__nomic
```

**Response:**
```json
{
  "result": {
    "points_count": 51940,
    "vectors_count": 0,
    "indexed_vectors_count": 51940,
    "status": "green"
  }
}
```

**Análise:**
- ✅ **51,940 documentos indexados** na coleção `documentation__nomic`
- ✅ Status: green (saudável)
- ✅ Pronto para queries!

---

### 5. **Ollama Status**

```bash
curl http://localhost:11434/api/tags
```

**Modelos Disponíveis:**
- `nomic-embed-text:latest` (embedding - 0GB RAM)
- `mxbai-embed-large:latest` (embedding - 0GB RAM)
- `llama3.1:latest` (LLM - 4GB RAM) ← Causando problema
- `embeddinggemma:latest` (embedding)

**GPU:**
- Model: NVIDIA GeForce RTX 5090
- Utilization: 0% (idle)
- Memory: 5,492 MB / 32,607 MB (17%)

---

## 🐛 Problema Identificado

### **Root Cause: LLM Não Necessário para Busca Vetorial**

O LlamaIndex Query Service está configurado para usar **LLM** (llama3.1) para:
- Geração de respostas (Q&A mode)
- Reranking de resultados
- Summarization

**Mas para busca vetorial simples, só precisamos:**
1. Embedding do query (via Ollama - nomic-embed-text)
2. Similarity search no Qdrant
3. Retornar top-k resultados

**Configuração Atual (Problemática):**
```yaml
# docker-compose.rag.yml
environment:
  - OLLAMA_MODEL=llama3.1  # ← Tentando usar LLM pesado!
```

---

## 💡 Soluções Propostas

### **Opção A: Usar Apenas Embedding (Recomendado para MVP)** ⭐

Configurar LlamaIndex para **vector search puro** (sem LLM):

```python
# tools/llamaindex/query_service/main.py (ajustar)

# NÃO usar LLM para query
# query_engine = index.as_query_engine(llm=ollama_llm)  ← REMOVER

# Usar apenas retriever (vector search puro)
retriever = index.as_retriever(
    similarity_top_k=top_k,
    vector_store_query_mode="default"
)

results = retriever.retrieve(query)
```

**Vantagens:**
- ✅ Performance muito melhor (sem carregar LLM)
- ✅ Menos memória (só embedding - ~200MB)
- ✅ Latência < 1s
- ✅ GPU foca em embeddings

**Desvantagens:**
- ❌ Sem geração de respostas (só retorna chunks)
- ❌ Sem reranking com LLM

---

### **Opção B: Usar LLM Menor (llama3.2:3b)**

Trocar `llama3.1:latest` (7GB) por `llama3.2:3b` (2GB):

```yaml
environment:
  - OLLAMA_MODEL=llama3.2:3b  # Modelo menor
```

**Vantagens:**
- ✅ Geração de respostas
- ✅ Reranking com LLM
- ✅ Cabe na memória

**Desvantagens:**
- ⚠️ Ainda usa ~2GB RAM
- ⚠️ Latência maior (~2-3s)

---

### **Opção C: Criar Endpoint Separado (Híbrido)**

Ter dois endpoints:

1. `POST /query/vector` → Busca vetorial pura (rápida, sem LLM)
2. `POST /query/qa` → Q&A com LLM (lenta, com geração)

**Frontend escolhe qual usar.**

---

## 🎯 Recomendação

### **Para MVP: Opção A (Vector Search Puro)** ⭐

**Por quê:**
1. **Performance:** < 1s por query
2. **Simplicidade:** Menos configuração
3. **Recursos:** Não precisa LLM pesado
4. **MVP suficiente:** Retornar chunks relevantes já resolve 80% dos casos

**Depois (v2):** Adicionar LLM para Q&A avançado

---

## ✅ Checklist de Correção

### Opção A (Recomendada)
- [ ] Atualizar código Python do LlamaIndex Query Service
- [ ] Remover uso de LLM em queries
- [ ] Usar apenas `retriever.retrieve()`
- [ ] Testar performance (< 1s)
- [ ] Rebuild container

### Opção B (Alternativa)
- [ ] Pull modelo menor: `docker exec rag-ollama ollama pull llama3.2:3b`
- [ ] Atualizar `OLLAMA_MODEL` em docker-compose
- [ ] Restart container
- [ ] Testar memória

---

## 📋 Status Final do Health Check

### ✅ Funcionando
- Container UP e healthy
- Qdrant com 51,940 vetores
- Ollama com modelos de embedding
- GPU RTX 5090 disponível
- Swagger UI acessível

### ⚠️ Issues
- Query endpoint falha com LLM
- LLM process killed (OOM ou config)
- Sem endpoint de busca simples (só vector)

### 🔧 Ação Necessária
- Configurar para vector search puro OU
- Usar LLM menor OU
- Criar endpoint sem LLM

---

**Status:** ✅ Health Check Completo  
**Problema:** LLM causando falha em queries  
**Solução:** Vector search puro (sem LLM)  
**Próximo:** Fase 2 - Implementação Backend  
**Tempo Gasto:** 10 minutos


