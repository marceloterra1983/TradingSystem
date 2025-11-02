# ✅ Correção: Tabela de Coleções Mostrando Chunks Corretos

**Data**: 2025-10-31  
**Status**: ✅ Corrigido

---

## 🔍 Problema Identificado

A tabela de coleções estava mostrando valores incorretos:

| Coleção | Mostrava | Deveria Mostrar | Diferença |
|---------|----------|-----------------|-----------|
| `documentation__nomic` | 218 | **6,344** | ❌ Mostrava docs ao invés de chunks |
| `documentation__gemma` | 0 | **1,064** | ❌ Não aparecia |
| `documentation__mxbai` | 0 | **0** | ✅ Correto |

**Causa**: A coluna "Chunks" estava usando `docIndexed` (documentos únicos = 218) ao invés de `qdrant.count` (chunks totais = 6,344).

---

## ✅ Correções Aplicadas

### 1. **Adicionado campo `chunks` ao `CollectionDocumentStats`**

**Arquivo**: `frontend/dashboard/src/components/pages/LlamaIndexIngestionStatusCard.tsx`

```typescript
export interface CollectionDocumentStats {
  total: number | null;
  indexed: number | null;
  missing: number | null;
  orphans: number | null;
  chunks: number | null; // ← NOVO: Total chunks in Qdrant
}
```

### 2. **Atualizado `fetchCollectionDocs` para incluir chunks**

**Arquivo**: `frontend/dashboard/src/components/pages/LlamaIndexPage.tsx` (linhas 487-492)

```typescript
// Add Qdrant chunks count to documentation stats
const docsWithChunks = {
  ...json.documentation,
  chunks: json.qdrant?.count ?? null  // ← NOVO: Inclui chunks do Qdrant
};
upsertCollectionDocStats(collectionName, docsWithChunks);
```

### 3. **Atualizado `useEffect` para incluir chunks**

**Arquivo**: `frontend/dashboard/src/components/pages/LlamaIndexPage.tsx` (linhas 505-510)

```typescript
// Add Qdrant chunks count to documentation stats
const docsWithChunks = docs ? {
  ...docs,
  chunks: statusData?.qdrant?.count ?? null  // ← NOVO: Inclui chunks do status
} : null;
upsertCollectionDocStats(collectionName, docsWithChunks);
```

### 4. **Atualizado `upsertCollectionDocStats` para armazenar chunks**

**Arquivo**: `frontend/dashboard/src/components/pages/LlamaIndexPage.tsx` (linhas 409-463)

```typescript
const chunks =
  docs && typeof (docs as any).chunks === 'number' ? (docs as any).chunks : null;

// ...

const resolvedChunks =
  resetApplied
    ? 0
    : chunks != null
      ? chunks
      : existing?.chunks ?? null;

const next: CollectionDocumentStats = {
  total: resolvedTotal,
  indexed: resolvedIndexed,
  missing: resolvedMissing,
  orphans: resolvedOrphans,
  chunks: resolvedChunks,  // ← NOVO: Armazena chunks
};
```

### 5. **Atualizado display da tabela para usar chunks**

**Arquivo**: `frontend/dashboard/src/components/pages/LlamaIndexIngestionStatusCard.tsx` (linha 406)

```typescript
// ANTES:
const displayChunks = docIndexed;  // ❌ Mostrava 218

// DEPOIS:
const displayChunks = docOverview?.chunks ?? option.count ?? docIndexed;
// ✅ Usa chunks do Qdrant (6,344) primeiro, depois fallback
```

---

## 📊 Valores Corretos Agora Exibidos

### Endpoint `/api/v1/rag/status` Retorna

| Campo | Valor | Descrição |
|-------|-------|-----------|
| `qdrant.count` | **6,344** | Total de chunks no Qdrant |
| `documentation.totalDocuments` | 218 | Total de arquivos .md/.mdx |
| `documentation.indexedDocuments` | 218 | Documentos únicos indexados |
| `documentation.indexedUniqueDocuments` | 218 | Documentos únicos (deduplicated) |

### Diferença: Documentos vs Chunks

```
218 documentos × ~29 chunks/documento = 6,344 chunks

Explicação:
- Cada documento .md/.mdx é DIVIDIDO em múltiplos chunks
- Chunks são segmentos menores para melhor retrieval
- Um documento de 1000 palavras pode gerar 30-40 chunks
```

---

## 📊 Tabela Atualizada - Valores Esperados

### Coleção: `documentation__nomic`

| Campo | Valor | Descrição |
|-------|-------|-----------|
| **Chunks** | **6,344** | ✅ Total de chunks no Qdrant |
| Órfãos | 0 | Chunks sem arquivo de origem |
| Doc. Total | 218 | Total de arquivos .md/.mdx |
| Indexados | 218 | Documentos únicos indexados |
| Pendentes | 0 | Documentos faltando |

### Coleção: `documentation__gemma`

| Campo | Valor | Descrição |
|-------|-------|-----------|
| **Chunks** | **1,064** | ✅ Total de chunks no Qdrant |
| Órfãos | 0 | Chunks sem arquivo de origem |
| Doc. Total | 218 | Total de arquivos .md/.mdx |
| Indexados | 218 | Documentos únicos indexados |
| Pendentes | 0 | Documentos faltando |

### Coleção: `documentation__mxbai`

| Campo | Valor | Descrição |
|-------|-------|-----------|
| **Chunks** | **0** | ✅ Coleção vazia (criada mas não ingerida) |
| Órfãos | 0 | — |
| Doc. Total | 0 | — |
| Indexados | 0 | — |
| Pendentes | 0 | — |

---

## 🔄 Fluxo de Dados Atualizado

```
1. Frontend chama: /api/v1/rag/status?collection=documentation__nomic
   ↓
2. Backend retorna:
   {
     qdrant: { count: 6344 },           ← Chunks totais
     documentation: {
       totalDocuments: 218,
       indexedDocuments: 218           ← Documentos únicos
     }
   }
   ↓
3. fetchCollectionDocs() adiciona chunks:
   docsWithChunks = {
     ...documentation,
     chunks: 6344                       ← NOVO campo
   }
   ↓
4. upsertCollectionDocStats() armazena:
   collectionDocStats[collection] = {
     total: 218,
     indexed: 218,
     chunks: 6344                       ← NOVO campo
   }
   ↓
5. Tabela renderiza:
   displayChunks = docOverview.chunks  ← Usa 6,344
   <td>{formatDocValue(6344)}</td>     ← Exibe "6,344"
```

---

## 🎯 Como Verificar no Dashboard

### 1. Recarregar a Página

```bash
# Hard reload para limpar cache
Ctrl + Shift + R   (Chrome/Edge)
Ctrl + F5          (Firefox)
```

### 2. Navegar para LlamaIndex Services

```
http://localhost:3103/#/llamaindex-services
```

### 3. Localizar a Tabela de Coleções

Procure pela seção com header **"Coleções"** ou **"Ingestão e saúde"**.

A tabela deve mostrar:

```
┌──────────────────────┬──────────────┬────────┬─────────┐
│ COLEÇÃO              │ MODELO       │ CHUNKS │ ÓRFÃOS  │
├──────────────────────┼──────────────┼────────┼─────────┤
│ documentation__nomic │ nomic-embed- │ 6,344  │    0    │
│                      │ text         │        │         │
├──────────────────────┼──────────────┼────────┼─────────┤
│ documentation__mxbai │ mxbai-embed- │    0   │    0    │
│                      │ large        │        │         │
├──────────────────────┼──────────────┼────────┼─────────┤
│ documentation__gemma │ embeddinggemma│ 1,064 │    0    │
│                      │              │        │         │
└──────────────────────┴──────────────┴────────┴─────────┘
```

### 4. Verificar a Nova Seção "Coleções e Modelos"

Esta seção (criada com `CollectionsTable.tsx`) também deve mostrar os chunks corretos.

---

## 🧪 Testes da API

```bash
# 1. Verificar chunks de todas as coleções
curl -s http://localhost:3401/api/v1/rag/collections | jq '.collections[] | {name, chunks: .count}'

# Resultado esperado:
# documentation__nomic:  6,344 chunks
# documentation__mxbai:  0 chunks
# documentation__gemma:  1,064 chunks

# 2. Verificar status individual
curl -s "http://localhost:3401/api/v1/rag/status?collection=documentation__nomic" | jq '.qdrant.count'
# Resultado: 6344

# 3. Verificar no Qdrant diretamente
curl -s -X POST http://localhost:6333/collections/documentation__nomic/points/count \
  -H "Content-Type: application/json" \
  -d '{"exact": true}' | jq '.result.count'
# Resultado: 6344
```

---

## 🐛 Se Ainda Não Aparece Corretamente

### 1. Limpar Estado do React

```javascript
// No console do browser (F12)
localStorage.clear();
location.reload(true);
```

### 2. Verificar Network Tab

```
F12 → Network → Filter: /api/v1/rag/

Verifique se as chamadas retornam:
- /api/v1/rag/status?collection=documentation__nomic
  Response: qdrant.count = 6344 ✅

- /api/v1/rag/collections  
  Response: collections[0].count = 6344 ✅
```

### 3. Verificar Console Errors

```
F12 → Console

Não deve ter erros relacionados a CollectionDocumentStats
```

---

## 📁 Arquivos Modificados

### 1. Types
- ✅ `LlamaIndexIngestionStatusCard.tsx` - Adicionado campo `chunks` ao interface

### 2. Data Fetching
- ✅ `LlamaIndexPage.tsx` - `fetchCollectionDocs()` agora inclui `qdrant.count` como `chunks`
- ✅ `LlamaIndexPage.tsx` - `useEffect` inclui chunks do `statusData.qdrant.count`
- ✅ `LlamaIndexPage.tsx` - `upsertCollectionDocStats()` armazena campo `chunks`

### 3. Display
- ✅ `LlamaIndexIngestionStatusCard.tsx` - `displayChunks` usa `docOverview.chunks` primeiro

---

## ✅ Resumo da Correção

### Antes ❌
```typescript
displayChunks = docIndexed  // 218 documentos únicos
```

### Depois ✅
```typescript
displayChunks = docOverview.chunks   // 6,344 chunks do Qdrant
             || option.count          // Fallback para count direto
             || docIndexed            // Fallback final para documentos
```

---

## 🎉 Resultado Final Esperado

A tabela agora mostrará:

```
COLEÇÃO                  MODELO              CHUNKS
─────────────────────────────────────────────────────
documentation__nomic     nomic-embed-text     6,344  ✅
documentation__mxbai     mxbai-embed-large        0  ✅
documentation__gemma     embeddinggemma       1,064  ✅
```

**Total de Chunks**: 7,408 across all collections

---

**🚀 Recarregue o Dashboard para ver os valores corretos!**

```bash
# No browser:
http://localhost:3103/#/llamaindex-services
# Pressione: Ctrl + Shift + R (hard reload)
```

