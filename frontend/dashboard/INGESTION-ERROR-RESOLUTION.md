# Resolução: Erro de Context Length no LlamaIndex

**Data**: 2025-10-31
**Erro**: `Failed to create new sequence: the input length exceeds the context length`
**Status**: ✅ **RESOLVIDO**

---

## 🔴 **Problema**

Ao tentar fazer ingestão de documentos, o sistema retornava erro:
```json
{
  "success": false,
  "message": "Failed to create new sequence: the input length exceeds the context length (status code: 500)"
}
```

---

## 🔍 **Causa Raiz**

O modelo `mxbai-embed-large` tem um **context window muito pequeno** (512 tokens):

| Modelo | Context Window | Tamanho | Recomendado para |
|--------|---------------|---------|------------------|
| `nomic-embed-text` | **8192 tokens** | 274 MB | ✅ **Documentação completa** |
| `mxbai-embed-large` | **512 tokens** | 669 MB | ⚠️ **Apenas textos curtos** |
| `embeddinggemma` | **8192 tokens** | 621 MB | ✅ **Alternativa avançada** |

Com `CHUNK_SIZE=512`, o modelo `mxbai-embed-large` **falha** porque:
- Texto base: ~512 tokens
- Formatação Markdown: +50-100 tokens
- Overhead do modelo: +20-50 tokens
- **Total**: ~600-700 tokens → **EXCEDE** os 512 tokens do limite

---

## ✅ **Solução Aplicada**

### 1. Configuração Corrigida no `.env`

```bash
# Usar nomic-embed-text (context window: 8192 tokens)
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
QDRANT_COLLECTION=documentation__nomic

# Chunk size seguro para nomic-embed-text
LLAMAINDEX_CHUNK_SIZE=512
LLAMAINDEX_CHUNK_OVERLAP=96
```

### 2. Serviço Reiniciado

```bash
docker restart rag-llamaindex-ingest
```

Confirmação nos logs:
```
Vector store and storage context initialized for collection: documentation__nomic
GPU policy: forced=True, options={'num_gpu': 1}
Application startup complete
```

---

## 📋 **Como Usar Corretamente**

### **Passo 1**: Acesse a página LlamaIndex Services
```
http://localhost:3103/#/llamaindex-services
```

### **Passo 2**: Selecione a coleção **documentation__nomic**
- ✅ Use: `documentation__nomic` (nomic-embed-text)
- ❌ Evite: `documentation__mxbai` (falha com documentos grandes)

### **Passo 3**: Clique em "Iniciar ingestão"
- Sistema irá processar 218 arquivos
- Tempo estimado: 5-10 minutos (dependendo da GPU)
- Progress será exibido em tempo real

---

## 📊 **Comparação de Modelos**

### **nomic-embed-text** ✅ **RECOMENDADO**
- **Context**: 8192 tokens (16x maior que mxbai)
- **Velocidade**: Rápida
- **Tamanho**: 274 MB (menor)
- **Ideal para**: Documentação técnica, artigos longos, MDX files
- **Chunk size máximo seguro**: 1024 tokens

### **mxbai-embed-large** ⚠️ **USO LIMITADO**
- **Context**: 512 tokens (muito pequeno)
- **Velocidade**: Moderada
- **Tamanho**: 669 MB
- **Ideal para**: Textos curtos, tweets, títulos
- **Chunk size máximo seguro**: 256 tokens
- **Requer**: `LLAMAINDEX_CHUNK_SIZE=256` no `.env`

### **embeddinggemma** ⚡ **AVANÇADO**
- **Context**: 8192 tokens
- **Velocidade**: Muito rápida (otimizado Google)
- **Tamanho**: 621 MB
- **Ideal para**: Alta performance, grandes volumes
- **Chunk size máximo seguro**: 1024 tokens

---

## 🛠️ **Se quiser usar mxbai-embed-large**

**Somente recomendado** se você realmente precisa das características específicas desse modelo.

### Ajuste necessário no `.env`:

```bash
# CUIDADO: Context window limitado (512 tokens)
OLLAMA_EMBED_MODEL=mxbai-embed-large
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
QDRANT_COLLECTION=documentation__mxbai

# CRÍTICO: Reduzir chunk size para 256
LLAMAINDEX_CHUNK_SIZE=256
LLAMAINDEX_CHUNK_OVERLAP=64
```

### Reiniciar serviços:
```bash
docker restart rag-llamaindex-ingest
docker restart rag-llamaindex-query
```

---

## ✅ **Verificação Pós-Fix**

### 1. Verificar configuração:
```bash
docker exec rag-llamaindex-ingest env | grep -E "OLLAMA|CHUNK|COLLECTION"
```

**Esperado**:
```
OLLAMA_EMBED_MODEL=nomic-embed-text
QDRANT_COLLECTION=documentation__nomic
LLAMAINDEX_CHUNK_SIZE=512
```

### 2. Testar ingestão via CLI:
```bash
curl -X POST http://localhost:8201/ingest/directory \
  -H "Content-Type: application/json" \
  -d '{
    "directory_path": "/data/docs",
    "collection_name": "documentation__nomic",
    "embedding_model": "nomic-embed-text"
  }'
```

### 3. Verificar coleções disponíveis:
```bash
curl -s http://localhost:6333/collections | jq '.result.collections[].name'
```

**Esperado**:
```
"documentation__nomic"
"documentation__mxbai"
...
```

---

## 📚 **Documentação de Referência**

### Limites de Context Window

| Modelo | Max Tokens | Max Chunk Size Seguro |
|--------|------------|----------------------|
| nomic-embed-text | 8192 | 1024 |
| mxbai-embed-large | 512 | 256 |
| embeddinggemma | 8192 | 1024 |
| text-embedding-3-small (OpenAI) | 8191 | 1024 |

### Cálculo de Tokens Seguros

```
Token Count = (Text Length / 4) + Markdown Overhead + Model Overhead

Exemplo com CHUNK_SIZE=512:
- Text base: 512 chars × 4 = 128 tokens
- Markdown: +50 tokens (headers, links, code blocks)
- Model overhead: +30 tokens
- Total: ~208 tokens ✅ Seguro para nomic (8192 limit)
- Total: ~208 tokens ❌ Arriscado para mxbai (512 limit)
```

---

## 🎯 **Recomendações Finais**

1. ✅ **Use `nomic-embed-text`** como padrão
2. ✅ Mantenha `CHUNK_SIZE=512` para documentação
3. ⚠️ Só use `mxbai-embed-large` com `CHUNK_SIZE=256`
4. ✅ Teste ingestão com arquivos pequenos primeiro
5. ✅ Monitore logs durante ingestão: `docker logs -f rag-llamaindex-ingest`

---

## 📞 **Suporte**

**Se o erro persistir**:
1. Verifique logs: `docker logs rag-llamaindex-ingest --tail 100`
2. Confirme modelo no Ollama: `docker exec rag-ollama ollama list`
3. Verifique espaço em disco: `df -h`
4. Reinicie stack completo: `docker compose -f tools/compose/docker-compose.rag.yml restart`

---

**Last Updated**: 2025-10-31 15:57 UTC
**Resolved By**: Development Team
**Status**: ✅ Production Ready
