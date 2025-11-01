# Issue: Conflito de Dimensões de Vetores

**Data**: 2025-11-01  
**Status**: ⚠️ **IDENTIFICADO**  
**Prioridade**: Alta  
**Tipo**: Configuração de Modelos  

---

## 🔍 Problema Identificado

Ao tentar indexar uma coleção criada com `nomic-embed-text`, ocorre erro:

```
Vector dimension error: expected dim: 384, got 768
```

### Causa Raiz

**Desalinhamento de dimensões:**

1. **Coleção no Qdrant**: `documentation` → **768 dimensões**
2. **Modelo Configurado**: `nomic-embed-text` → **384 dimensões**

---

## 📊 Situação Atual

### Modelos Disponíveis

```bash
curl http://localhost:3403/api/v1/rag/models | jq '.data.models[]'
```

**Resultado:**
```json
{
  "name": "nomic-embed-text",
  "dimensions": 384
},
{
  "name": "mxbai-embed-large",
  "dimensions": 1024
}
```

### Coleção Existente no Qdrant

```bash
curl http://localhost:6333/collections/documentation | jq .result.config.params.vectors
```

**Resultado:**
```json
{
  "size": 768,  // ⚠️ PROBLEMA!
  "distance": "Cosine"
}
```

### Problema

A coleção `documentation` foi criada com um modelo de **768 dimensões** (provavelmente `mxbai-embed-large` em versão antiga ou outro modelo).

Agora tentamos usar `nomic-embed-text` (384 dims) → **Conflito!**

---

## 🎯 Soluções Possíveis

### Solução 1: ✅ **Usar Modelo Compatível (Recomendada)**

Descobrir qual modelo tem 768 dimensões e usar ele:

```bash
# Verificar modelos disponíveis no Ollama
curl http://localhost:11434/api/tags | jq '.models[] | {name, size}'

# Procurar modelo com 768 dims
# Possibilidades:
# - all-minilm (768 dims) - Modelo comum
# - instructor-large (768 dims)
# - gte-large (1024 dims) - não é esse
```

### Solução 2: ⚠️ **Recriar Coleção Existente**

Deletar a coleção `documentation` antiga e recriar com modelo correto:

```bash
# ATENÇÃO: Perde todos os vetores!
curl -X DELETE http://localhost:6333/collections/documentation

# Recriar com nomic-embed-text (384 dims)
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{
    "name": "documentation",
    "embeddingModel": "nomic-embed-text",
    ...
  }'
```

### Solução 3: ✅ **Usar Nomes Diferentes**

Criar novas coleções com nomes únicos:

```bash
# Coleções separadas por modelo
documentation_nomic     # nomic-embed-text (384 dims)
documentation_mxbai     # mxbai-embed-large (1024 dims)
documentation_minilm    # all-minilm (768 dims) - se disponível
```

---

## 🔧 Solução Imediata: Identificar Modelo de 768 Dims

```bash
# 1. Listar modelos instalados no Ollama
docker exec rag-ollama ollama list

# 2. Verificar dimensões
docker exec rag-ollama ollama show all-minilm:latest --modelfile | grep -i embed

# 3. Ou testar criando coleção com nome único
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{
    "name": "docs_nomic_384",
    "directory": "/data/tradingsystem/docs/content/api",
    "embeddingModel": "nomic-embed-text",
    ...
  }'

# 4. Indexar (deve funcionar se nome for único)
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_nomic_384/ingest
```

---

## 📋 Checklist de Troubleshooting

- [x] ✅ Criar coleção funciona (2s)
- [x] ✅ Coleção criada VAZIA (0 chunks) - Separação funciona!
- [x] ❌ Indexação manual falha por dimensões
- [ ] ⏳ Identificar modelo correto de 768 dims
- [ ] ⏳ Ou usar nomes de coleção únicos
- [ ] ⏳ Ou recriar coleção existente

---

## 🎯 Próximos Passos

### Opção A: Usar Nome Único (Mais Seguro)

```bash
# Criar com nome diferente (evita conflito)
Nome: docs_md_nomic_384
Modelo: nomic-embed-text (384 dims)
Diretório: /data/tradingsystem/docs/content

# Indexar
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_md_nomic_384/ingest
```

### Opção B: Instalar/Usar Modelo de 768 Dims

```bash
# Descobrir qual modelo usar
docker exec rag-ollama ollama list

# Se tiver all-minilm:
Nome: docs_md_minilm
Modelo: all-minilm (768 dims)
```

### Opção C: Recriar Collection "documentation"

```bash
# ATENÇÃO: Perde dados!
curl -X DELETE http://localhost:6333/collections/documentation

# Recriar com 384 dims
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "documentation", "embeddingModel": "nomic-embed-text", ...}'
```

---

## ✅ O Importante: Separação Funciona!

Apesar do erro de dimensões, confirmamos que:

✅ **Criar coleção**: Instantâneo (2s)  
✅ **Coleção vazia**: 0 chunks, 0 vectors  
✅ **Indexação separada**: Endpoint `/ingest` existe  
✅ **Botão no frontend**: Já implementado (RefreshCw icon)  

O erro é **outro problema** (dimensões), não da separação Criar/Indexar.

---

**Status**: ⚠️ **Novo Issue Encontrado (Dimensões)**  
**Workaround**: Usar nomes únicos de coleção  
**Próxima Ação**: Resolver conflito de dimensões  

