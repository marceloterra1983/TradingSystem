# 🚀 Multi-Collection RAG Architecture - Implementação Completa

**Data**: 2025-10-31  
**Status**: ✅ Implementado (Requer reiniciar serviços)

---

## 📊 O Que Foi Implementado

### ✅ 1. Configuração de Coleções

**Arquivo**: `tools/llamaindex/collection-config.json`

Define 3 coleções para os 3 modelos de embedding disponíveis:

| Coleção | Modelo | Dimensões | Tamanho | Uso |
|---------|--------|-----------|---------|-----|
| **documentation__nomic** | nomic-embed-text | 768 | 274 MB | Propósito geral (PADRÃO) |
| **documentation__mxbai** | mxbai-embed-large | 384 | 669 MB | Retrieval rápido |
| **documentation__gemma** | embeddinggemma | 768 | 621 MB | Alta qualidade |

### ✅ 2. Gerenciador de Configuração (Python)

**Arquivo**: `tools/llamaindex/shared/collection_config.py`

- Classe `CollectionConfigManager` para gerenciar coleções
- Suporte a aliases (ex: `documentation` → `documentation__nomic`)
- Resolução automática de modelo correto por coleção
- API para consultar coleções e modelos disponíveis

### ✅ 3. Novos Endpoints da API

**Arquivo**: `backend/api/documentation-api/src/routes/rag-collections.js`

#### GET /api/v1/rag/collections
Lista todas as coleções configuradas + status no Qdrant

**Resposta**:
```json
{
  "success": true,
  "defaultCollection": "documentation__nomic",
  "collections": [
    {
      "name": "documentation__nomic",
      "displayName": "Documentation (Nomic Embed)",
      "embeddingModel": "nomic-embed-text",
      "dimensions": 768,
      "exists": true,
      "count": 1250,
      "status": "ready"
    }
  ]
}
```

#### GET /api/v1/rag/collections/models
Lista modelos de embedding disponíveis no Ollama

#### POST /api/v1/rag/collections/:collectionName/create
Cria nova coleção no Qdrant

### ✅ 4. Script de Ingestão Multi-Coleção

**Arquivo**: `scripts/rag/ingest-multi-collections.sh`

Automatiza a criação e ingestão de múltiplas coleções:

```bash
# Ingerir em todas as coleções
bash scripts/rag/ingest-multi-collections.sh

# Ingerir em coleções específicas
bash scripts/rag/ingest-multi-collections.sh documentation__nomic,documentation__mxbai
```

**Features**:
- ✅ Verifica se coleção existe
- ✅ Cria coleção com dimensões corretas
- ✅ Aciona ingestão com modelo correto
- ✅ Reporta progresso e resultados

### ✅ 5. Atualizações no Código Backend

**Arquivos atualizados**:
- `backend/api/documentation-api/src/routes/rag-status.js`
  - `QDRANT_COLLECTION` default → `documentation__nomic`
  - Aliases atualizados para mapear para `documentation__nomic`
  
- `tools/compose/docker-compose.rag.yml`
  - `QDRANT_COLLECTION` default → `documentation__nomic`
  
- `tools/llamaindex/query_service/main.py`
  - `CONFIGURED_QDRANT_COLLECTION` → `documentation__nomic`
  - `LEGACY_COLLECTION_PREFERENCE` → `["documentation__nomic", "documentation", "docs_index"]`
  
- `tools/llamaindex/ingestion_service/main.py`
  - `QDRANT_COLLECTION` default → `documentation__nomic`

- `backend/api/documentation-api/src/server.js`
  - Registrado route `/api/v1/rag/collections`

### ✅ 6. Documentação

**Arquivo**: `docs/content/tools/rag/multi-collection-architecture.mdx`

Documentação completa da arquitetura multi-coleção incluindo:
- Visão geral de modelos
- Endpoints da API
- Scripts de ingestão
- Comparação de modelos
- Troubleshooting

---

## 🔧 Como Usar

### 1. Reiniciar Serviços (OBRIGATÓRIO)

```bash
# Reiniciar serviços RAG
docker compose -f tools/compose/docker-compose.rag.yml restart

# Reiniciar Documentation API
docker compose -f tools/compose/docker-compose.docs.yml restart documentation-api
```

### 2. Atualizar .env (se necessário)

Se o seu `.env` ainda tem `QDRANT_COLLECTION=documentation`, atualize:

```bash
# Executar script de atualização
bash /tmp/update-qdrant-collection.sh
```

Ou edite manualmente:
```bash
QDRANT_COLLECTION=documentation__nomic
```

### 3. Listar Coleções Disponíveis

```bash
curl http://localhost:3401/api/v1/rag/collections | jq '.'
```

### 4. Verificar Modelos no Ollama

```bash
curl http://localhost:3401/api/v1/rag/collections/models | jq '.'
```

### 5. Criar e Popular Coleções

```bash
# Criar todas as 3 coleções
bash scripts/rag/ingest-multi-collections.sh

# Ou criar apenas uma específica
bash scripts/rag/ingest-multi-collections.sh documentation__mxbai
```

### 6. Query em Coleção Específica

```bash
# Busca semântica em coleção específica
curl "http://localhost:3401/api/v1/rag/search?query=Docker&collection=documentation__mxbai"

# Query com LLM em coleção específica
curl -X POST http://localhost:3401/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is Docker?",
    "collection": "documentation__gemma"
  }'
```

---

## 📊 Estado Atual do Sistema

### Coleções no Qdrant

```bash
# Verificar
curl -s http://localhost:6333/collections | jq '.result.collections'
```

**Resultado esperado**: `[]` (vazio - precisa criar)

### Modelos no Ollama

```bash
# Verificar
curl -s http://localhost:11434/api/tags | jq -r '.models[] | select(.name | contains("embed")) | .name'
```

**Resultado atual**:
- ✅ embeddinggemma:latest
- ✅ nomic-embed-text:latest
- ✅ mxbai-embed-large:latest

---

## 🎯 Próximos Passos

### Imediato (Agora)

1. ✅ **Reiniciar serviços**:
```bash
docker compose -f tools/compose/docker-compose.rag.yml restart
docker compose -f tools/compose/docker-compose.docs.yml restart documentation-api
```

2. ✅ **Testar endpoints**:
```bash
# Listar coleções
curl http://localhost:3401/api/v1/rag/collections | jq '.'

# Listar modelos
curl http://localhost:3401/api/v1/rag/collections/models | jq '.'
```

3. ✅ **Criar coleções**:
```bash
bash scripts/rag/ingest-multi-collections.sh
```

### Curto Prazo (Próximas Horas)

4. ⏳ **Monitorar ingestão**:
```bash
docker logs rag-llamaindex-ingest -f
```

5. ⏳ **Verificar contagem de documentos**:
```bash
for col in documentation__nomic documentation__mxbai documentation__gemma; do
  echo "Collection: $col"
  curl -s -X POST "http://localhost:6333/collections/$col/points/count" \
    -H "Content-Type: application/json" \
    -d '{"exact": true}' | jq '.result.count'
  echo ""
done
```

6. ⏳ **Testar queries em diferentes coleções**:
```bash
# Comparar resultados
for col in documentation__nomic documentation__mxbai documentation__gemma; do
  echo "=== Testing $col ==="
  curl -s "http://localhost:3401/api/v1/rag/search?query=Docker&collection=$col&max_results=3" | jq '.[].content' | head -5
  echo ""
done
```

### Médio Prazo (Próximos Dias)

7. 🔮 **Atualizar frontend** para incluir seletor de coleção
8. 🔮 **Comparação lado-a-lado** de resultados no Dashboard
9. 🔮 **Métricas de qualidade** por coleção (relevance score médio)
10. 🔮 **Auto-seleção inteligente** de coleção baseado no tipo de query

---

## 🐛 Troubleshooting

### Endpoint retorna 404

**Problema**: `/api/v1/rag/collections` retorna 404

**Solução**: Reiniciar o Documentation API
```bash
docker compose -f tools/compose/docker-compose.docs.yml restart documentation-api
docker logs documentation-api -f
```

### Coleção não reconhecida

**Problema**: Query retorna "Collection not found"

**Solução**: Verificar se coleção existe no Qdrant
```bash
curl http://localhost:6333/collections | jq '.result.collections[].name'
```

Se não existir, criar:
```bash
bash scripts/rag/ingest-multi-collections.sh documentation__nomic
```

### Ingestão falha

**Problema**: Script de ingestão retorna erro

**Solução**:
```bash
# Ver logs do ingestion service
docker logs rag-llamaindex-ingest -f

# Verificar se Ollama tem o modelo
curl http://localhost:11434/api/tags | jq -r '.models[] | select(.name | contains("embed")) | .name'
```

---

## 📁 Arquivos Criados/Modificados

### Arquivos Criados

1. ✅ `tools/llamaindex/collection-config.json` - Configuração de coleções
2. ✅ `tools/llamaindex/shared/collection_config.py` - Gerenciador Python
3. ✅ `backend/api/documentation-api/src/routes/rag-collections.js` - Endpoints
4. ✅ `scripts/rag/ingest-multi-collections.sh` - Script de ingestão
5. ✅ `docs/content/tools/rag/multi-collection-architecture.mdx` - Documentação
6. ✅ `MULTI-COLLECTION-SUMMARY.md` - Este arquivo

### Arquivos Modificados

1. ✅ `backend/api/documentation-api/src/routes/rag-status.js`
2. ✅ `backend/api/documentation-api/src/server.js`
3. ✅ `tools/compose/docker-compose.rag.yml`
4. ✅ `tools/llamaindex/query_service/main.py`
5. ✅ `tools/llamaindex/ingestion_service/main.py`

---

## 🎉 Benefícios da Nova Arquitetura

### ✅ Flexibilidade
- Escolha o modelo ideal para cada caso de uso
- Fácil adicionar novos modelos/coleções

### ✅ Performance
- Use `mxbai` (384d) para queries rápidas
- Use `nomic` (768d) para equilíbrio
- Use `gemma` (768d) para máxima qualidade

### ✅ Comparação
- Compare resultados entre modelos
- Benchmark de qualidade
- Métricas de relevance

### ✅ Escalabilidade
- Suporte a múltiplas fontes (docs, código, etc.)
- Fácil expansão para novas coleções
- Configuração centralizada

---

## 📞 Comandos Rápidos

```bash
# Health check completo
curl http://localhost:3401/api/v1/rag/collections | jq '.'

# Listar modelos Ollama
curl http://localhost:3401/api/v1/rag/collections/models | jq '.'

# Criar todas as coleções
bash scripts/rag/ingest-multi-collections.sh

# Query em coleção específica
curl "http://localhost:3401/api/v1/rag/search?query=seu_termo&collection=documentation__nomic"

# Monitorar logs
docker logs rag-llamaindex-ingest -f
docker logs rag-llamaindex-query -f
docker logs documentation-api -f

# Ver coleções no Qdrant
curl http://localhost:6333/collections | jq '.'

# Contar documentos em coleção
curl -X POST "http://localhost:6333/collections/documentation__nomic/points/count" \
  -d '{"exact": true}' | jq '.result.count'
```

---

**🚀 Sistema pronto para suportar múltiplas coleções com diferentes modelos de embedding!**

**Próximo passo**: Reiniciar serviços e criar as coleções! 🎯

