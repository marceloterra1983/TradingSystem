# Teste: Workflow de Indexação Manual

**Data**: 2025-11-01  
**Objetivo**: Validar separação entre Criar e Indexar  

---

## 🧪 Teste 1: Criar Coleção SEM Indexação Automática

```bash
# Criar coleção de teste
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_manual_index",
    "description": "Teste de indexação manual",
    "directory": "/data/tradingsystem/docs/content",
    "embeddingModel": "nomic-embed-text",
    "chunkSize": 512,
    "chunkOverlap": 50,
    "fileTypes": ["md", "mdx"],
    "recursive": true,
    "enabled": true,
    "autoUpdate": false
  }'

# OU com modelo Gemma Embedding
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_manual_index_gemma",
    "description": "Teste de indexação manual com Gemma",
    "directory": "/data/tradingsystem/docs/content",
    "embeddingModel": "embeddinggemma",
    "chunkSize": 512,
    "chunkOverlap": 50,
    "fileTypes": ["md", "mdx"],
    "recursive": true,
    "enabled": true,
    "autoUpdate": false
  }'
```

### Resultado Esperado ✅

```json
{
  "success": true,
  "data": {
    "collection": {
      "name": "test_manual_index",
      "status": "empty"
    },
    "message": "Collection created successfully"
  },
  "meta": {
    "timestamp": "...",
    "duration": "~2s"  // ✅ Rápido!
  }
}
```

### Verificar Status

```bash
# Deve estar VAZIA (0 chunks)
curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index | jq '{
  name: .data.name,
  status: .data.stats.status,
  chunks: .data.stats.chunkCount,
  files: .data.stats.indexedFiles
}'
```

**Esperado:**
```json
{
  "name": "test_manual_index",
  "status": "empty",
  "chunks": 0,
  "files": 0
}
```

---

## 🧪 Teste 2: Indexar Manualmente

```bash
# Disparar indexação via botão/API
curl -X POST http://localhost:3403/api/v1/rag/collections/test_manual_index/ingest \
  -H "Content-Type: application/json"
```

### Resultado Esperado ✅

```json
{
  "success": true,
  "data": {
    "message": "Ingestion job created",
    "job": {
      "id": "...",
      "status": "processing",
      "collection": "test_manual_index"
    }
  }
}
```

### Acompanhar Progresso

```bash
# Executar a cada 5 segundos
watch -n 5 'curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index | jq .data.stats.chunkCount'

# Resultado (atualiza em tempo real):
# 0 → 50 → 150 → 300 → 450 → ... → 1,234 ✅
```

---

## 🧪 Teste 3: Criar Múltiplas Configs Rapidamente

```bash
# Cenário: Testar diferentes chunk sizes e modelos de embedding

# 1. Criar 3 coleções com nomic-embed-text (6 segundos total!)
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_chunk256", "chunkSize": 256, "directory": "/data/tradingsystem/docs/content", "embeddingModel": "nomic-embed-text", "fileTypes": ["md","mdx"], "recursive": true}'

curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_chunk512", "chunkSize": 512, "directory": "/data/tradingsystem/docs/content", "embeddingModel": "nomic-embed-text", "fileTypes": ["md","mdx"], "recursive": true}'

curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_chunk1024", "chunkSize": 1024, "directory": "/data/tradingsystem/docs/content", "embeddingModel": "nomic-embed-text", "fileTypes": ["md","mdx"], "recursive": true}'

# 2. Criar 3 coleções com embeddinggemma (comparação)
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_chunk256_gemma", "chunkSize": 256, "directory": "/data/tradingsystem/docs/content", "embeddingModel": "embeddinggemma", "fileTypes": ["md","mdx"], "recursive": true}'

curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_chunk512_gemma", "chunkSize": 512, "directory": "/data/tradingsystem/docs/content", "embeddingModel": "embeddinggemma", "fileTypes": ["md","mdx"], "recursive": true}'

curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_chunk1024_gemma", "chunkSize": 1024, "directory": "/data/tradingsystem/docs/content", "embeddingModel": "embeddinggemma", "fileTypes": ["md","mdx"], "recursive": true}'

# 3. Verificar todas criadas (vazias)
curl -s http://localhost:3403/api/v1/rag/collections | jq '.data.collections[] | {name, chunks: .stats.chunkCount}'

# Esperado:
# docs_chunk256:       0 chunks
# docs_chunk512:       0 chunks
# docs_chunk1024:      0 chunks
# docs_chunk256_gemma: 0 chunks
# docs_chunk512_gemma: 0 chunks
# docs_chunk1024_gemma: 0 chunks

# 4. Indexar apenas uma de cada modelo para comparação
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_chunk512/ingest
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_chunk512_gemma/ingest

# 5. Se funcionar bem, indexar as outras (opcional)
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_chunk256/ingest
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_chunk1024/ingest
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_chunk256_gemma/ingest
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_chunk1024_gemma/ingest
```

---

## 🧪 Teste 4: Deletar Coleção Vazia (Sem Desperdício)

```bash
# Cenário: Criou com diretório errado

# 1. Criar
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_errada", "directory": "/data/wrong", ...}'

# 2. Perceber erro (ANTES de indexar!)
curl -s http://localhost:3403/api/v1/rag/collections/docs_errada | jq .

# 3. Deletar rapidamente (sem perder 15 minutos de indexação)
curl -X DELETE http://localhost:3403/api/v1/rag/collections/docs_errada

# ✅ Vantagem: Economizou 15 minutos!
```

---

## 📊 Comparação: Antes vs Depois

### Cenário: Criar 3 Coleções para Testar Configs

#### ❌ Antes (Indexação Automática)

```
Tempo:
  Criar coleção 1 → 15min (aguardar indexação)
  Criar coleção 2 → 15min (aguardar indexação)
  Criar coleção 3 → 15min (aguardar indexação)
  Total: 45 minutos 😴

Problemas:
  - Se errar config, já perdeu 15min
  - Não pode testar rapidamente
  - Consome recursos sem confirmação
```

#### ✅ Depois (Indexação Manual)

```
Tempo:
  Criar coleção 1 → 2s ⚡
  Criar coleção 2 → 2s ⚡
  Criar coleção 3 → 2s ⚡
  Total criação: 6 segundos 🚀

  Indexar apenas a melhor config → 15min
  Total: 15 minutos (vs 45min antes)

Vantagens:
  ✅ Cria todas rapidamente
  ✅ Revisa configs
  ✅ Indexa só a que faz sentido
  ✅ Economia de 30 minutos!
```

---

## 🎯 Interface do Usuário

### Tabela de Coleções (Com Botão Indexar)

```
┌─────────────────┬──────────┬────────┬──────────────────────┐
│ Nome            │ Status   │ Chunks │ Ações                │
├─────────────────┼──────────┼────────┼──────────────────────┤
│ docs_md         │ ⚪ empty │      0 │ [✏️] [📋] [▶️] [🗑️]  │
│ backend_code    │ ✅ ready │  1,234 │ [✏️] [📋] [🔄] [🗑️]  │
└─────────────────┴──────────┴────────┴──────────────────────┘

Legenda:
✏️ = Editar
📋 = Clonar
▶️ = Indexar (primeira vez)
🔄 = Re-indexar (atualizar)
🗑️ = Deletar
```

### Estados Possíveis

| Status | Visual | Chunks | Botão Mostrado | Tooltip |
|--------|--------|--------|----------------|---------|
| **empty** | ⚪ | 0 | ▶️ Play | "Executar ingestão" |
| **indexing** | 🔄 | Aumentando | 🔄 Spin | "Ingestão em andamento..." |
| **ready** | ✅ | > 0 | 🔄 Refresh | "Re-indexar coleção" |
| **partial** | ⚠️ | > 0 | 🔄 Refresh | "Completar indexação" |
| **error** | ❌ | - | 🔄 Refresh | "Tentar novamente" |

---

## 🚀 Fluxo Completo No Navegador

### Criar Coleção

```
1. Abrir página de Collections
2. Clicar "Nova Coleção"
3. Preencher:
   Nome: docs_md_projeto
   Descrição: Documentação Markdown do TradingSystem
   Diretório: /data/tradingsystem/docs/content
   Modelo: nomic-embed-text (ou embeddinggemma, mxbai-embed-large)
4. Clicar "Criar"
   └─ ✅ Modal fecha em 2s
   └─ ✅ Coleção aparece na tabela
```

### Revisar Antes de Indexar

```
Tabela mostra:
  docs_md_projeto
  Status: ⚪ empty
  Chunks: 0
  
Revisar:
  ✅ Nome correto?
  ✅ Diretório certo?
  ✅ Modelo adequado?
  
Se algo errado:
  → Clicar ✏️ Editar
  → Ou clicar 🗑️ Deletar
  
Se tudo OK:
  → Prosseguir para indexação ↓
```

### Indexar Documentos

```
Ações:
  1. Clicar botão ▶️ "Executar ingestão"
  2. Ver mudança visual:
     Status: ⚪ empty → 🔄 indexing
     Chunks: 0 → 50 → 150 → 450...
  3. Aguardar conclusão (5-30min)
  4. Ver resultado:
     Status: 🔄 indexing → ✅ ready
     Chunks: 1,234 (final)
```

---

## 🧪 Teste 5: Comparar Modelos de Embedding

### Modelos Disponíveis

| Modelo | Dimensões | Melhor Para | Performance |
|--------|-----------|-------------|-------------|
| **nomic-embed-text** | 768 | Texto geral, documentação técnica | Rápido |
| **embeddinggemma** | 768 | Contexto longo, raciocínio profundo | Médio |
| **mxbai-embed-large** | 1024 | Alta precisão, busca semântica | Médio |

### Workflow de Comparação

```bash
# 1. Criar coleções com mesmo diretório e configs, mas modelos diferentes
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{
    "name": "docs_nomic",
    "directory": "/data/tradingsystem/docs/content",
    "embeddingModel": "nomic-embed-text",
    "chunkSize": 512,
    "fileTypes": ["md","mdx"],
    "recursive": true
  }'

curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{
    "name": "docs_gemma",
    "directory": "/data/tradingsystem/docs/content",
    "embeddingModel": "embeddinggemma",
    "chunkSize": 512,
    "fileTypes": ["md","mdx"],
    "recursive": true
  }'

curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{
    "name": "docs_mxbai",
    "directory": "/data/tradingsystem/docs/content",
    "embeddingModel": "mxbai-embed-large",
    "chunkSize": 512,
    "fileTypes": ["md","mdx"],
    "recursive": true
  }'

# 2. Indexar todas (em paralelo se possível)
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_nomic/ingest &
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_gemma/ingest &
curl -X POST http://localhost:3403/api/v1/rag/collections/docs_mxbai/ingest &
wait

# 3. Comparar qualidade das buscas
# Testar mesma query em todas as coleções
QUERY="Como configurar o RAG system?"

curl -s "http://localhost:3403/api/v1/rag/collections/docs_nomic/search?query=$QUERY&limit=5" | jq '.data.results[].score'
curl -s "http://localhost:3403/api/v1/rag/collections/docs_gemma/search?query=$QUERY&limit=5" | jq '.data.results[].score'
curl -s "http://localhost:3403/api/v1/rag/collections/docs_mxbai/search?query=$QUERY&limit=5" | jq '.data.results[].score'

# 4. Analisar métricas
curl -s http://localhost:3403/api/v1/rag/collections/docs_nomic | jq '.data.stats.indexTime'
curl -s http://localhost:3403/api/v1/rag/collections/docs_gemma | jq '.data.stats.indexTime'
curl -s http://localhost:3403/api/v1/rag/collections/docs_mxbai | jq '.data.stats.indexTime'
```

### Métricas de Comparação

```
Resultados Esperados:
┌─────────────────┬──────────────┬─────────────┬──────────────┐
│ Modelo          │ Tempo Index  │ Avg Score   │ Relevância   │
├─────────────────┼──────────────┼─────────────┼──────────────┤
│ nomic-embed     │ ~12 min      │ 0.72        │ Boa          │
│ embeddinggemma  │ ~15 min      │ 0.78        │ Muito Boa    │
│ mxbai-embed     │ ~18 min      │ 0.81        │ Excelente    │
└─────────────────┴──────────────┴─────────────┴──────────────┘

Trade-offs:
- nomic-embed-text: ⚡ Mais rápido, 📊 bom para volume alto
- embeddinggemma: ⚖️ Balanceado, 🎯 melhor contexto
- mxbai-embed-large: 🎖️ Melhor qualidade, ⏱️ mais lento
```

---

## ✅ Benefícios Resumidos

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Criar coleção** | 5-30 min | 2s ⚡ |
| **Feedback** | Tudo junto | Separado e claro |
| **Controle** | ❌ Nenhum | ✅ Total |
| **Testar configs** | Lento | Rápido |
| **Corrigir erros** | Difícil | Fácil |
| **UX** | Confuso | Claro |

---

## 🎯 Recomendações por Caso de Uso

### Escolha do Modelo de Embedding

| Caso de Uso | Modelo Recomendado | Razão |
|-------------|-------------------|--------|
| **Documentação técnica geral** | `nomic-embed-text` | Rápido, eficiente, bom equilíbrio |
| **Documentação com contexto complexo** | `embeddinggemma` | Melhor raciocínio, contexto longo |
| **Busca de alta precisão (produção)** | `mxbai-embed-large` | Melhor qualidade de resultados |
| **Prototipagem/testes rápidos** | `nomic-embed-text` | Indexação mais rápida |
| **Base de conhecimento crítica** | `mxbai-embed-large` | Máxima qualidade semântica |

### Estratégia de Migração

```bash
# 1. Começar com nomic-embed-text (validação inicial)
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_v1", "embeddingModel": "nomic-embed-text", ...}'

# 2. Testar embeddinggemma (melhor contexto)
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_v2_gemma", "embeddingModel": "embeddinggemma", ...}'

# 3. Comparar resultados de busca (queries reais)
# Se embeddinggemma for ~10-15% melhor → migrar
# Se diferença < 5% → manter nomic-embed-text (mais rápido)

# 4. Para produção final, testar mxbai-embed-large
curl -X POST http://localhost:3403/api/v1/rag/collections \
  -d '{"name": "docs_prod", "embeddingModel": "mxbai-embed-large", ...}'
```

### Configurações Recomendadas

```json
{
  "desenvolvimento": {
    "embeddingModel": "nomic-embed-text",
    "chunkSize": 512,
    "reason": "Iteração rápida"
  },
  "homologação": {
    "embeddingModel": "embeddinggemma",
    "chunkSize": 512,
    "reason": "Testes de qualidade"
  },
  "produção": {
    "embeddingModel": "mxbai-embed-large",
    "chunkSize": 512,
    "reason": "Máxima qualidade"
  }
}
```

---

## 📁 Teste 6: Verificar Arquivos Indexados

### ✅ Endpoint Implementado

```
GET /api/v1/rag/collections/:name/files
```

**Status**: ✅ Implementado em `tools/rag-services/src/routes/collections.ts`

### Obter Lista de Arquivos da Coleção

```bash
# Listar todos os arquivos processados com detalhes
curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index/files | jq '.data.files[] | {
  path: .path,
  size: .sizeBytes,
  chunks: .chunkCount,
  status: .status
}'

# Versão completa com resumo
curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index/files | jq '.'
```

### Resultado Esperado ✅

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "path": "/data/tradingsystem/docs/content/api/overview.mdx",
        "sizeBytes": 8921,
        "chunkCount": 17,
        "status": "indexed",
        "lastModified": "2025-11-01T10:15:30.000Z"
      },
      {
        "path": "/data/tradingsystem/docs/content/apps/workspace/overview.mdx",
        "sizeBytes": 12458,
        "chunkCount": 24,
        "status": "indexed",
        "lastModified": "2025-11-01T09:45:12.000Z"
      },
      {
        "path": "/data/tradingsystem/docs/content/database/schema.mdx",
        "sizeBytes": 15634,
        "chunkCount": 31,
        "status": "indexed",
        "lastModified": "2025-11-01T11:22:05.000Z"
      }
    ],
    "summary": {
      "totalFiles": 127,
      "totalChunks": 1234,
      "totalSizeBytes": 1847392,
      "totalSizeMB": 1.76,
      "avgChunksPerFile": 10,
      "avgFileSizeKB": 14.2
    }
  },
  "meta": {
    "timestamp": "2025-11-01T12:00:00.000Z",
    "requestId": "uuid-here",
    "version": "v1"
  }
}
```

### Tabela Resumida de Arquivos

```bash
# Gerar tabela formatada com estatísticas
curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index/files | \
  jq -r '.data.files | 
    ["ARQUIVO", "TAMANHO", "CHUNKS", "STATUS"],
    ["-------", "-------", "------", "------"],
    (.[] | [
      (.path | split("/") | .[-1]),
      (.sizeBytes | tostring + " bytes"),
      (.chunkCount | tostring),
      .status
    ]) | @tsv' | column -t -s $'\t'
```

### Resultado Esperado (Tabela Formatada)

```
ARQUIVO                    TAMANHO        CHUNKS  STATUS
-------                    -------        ------  ------
overview.mdx               12458 bytes    24      indexed
api-overview.mdx           8921 bytes     17      indexed
schema.mdx                 15634 bytes    31      indexed
design-system.mdx          6789 bytes     13      indexed
monitoring.mdx             9245 bytes     18      indexed
rag-setup.mdx              11234 bytes    22      indexed
database-migrations.mdx    7892 bytes     15      indexed
frontend-guidelines.mdx    10567 bytes    21      indexed
health-checks.mdx          5432 bytes     10      indexed
...
```

### Estatísticas Agregadas

```bash
# Estatísticas gerais da coleção (já vem calculado pela API!)
curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index/files | jq '.data.summary'
```

### Resultado Esperado (Estatísticas)

```json
{
  "totalFiles": 127,
  "totalChunks": 1234,
  "totalSizeBytes": 1847392,
  "totalSizeMB": 1.76,
  "avgChunksPerFile": 10,
  "avgFileSizeKB": 14.2
}
```

**Vantagem**: A API já retorna as estatísticas calculadas no campo `summary`, sem necessidade de processamento adicional no cliente! ⚡

### Filtrar Arquivos por Status

```bash
# Apenas arquivos indexados com sucesso
curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index/files | \
  jq '.data.files[] | select(.status == "indexed") | .path'

# Arquivos com erro
curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index/files | \
  jq '.data.files[] | select(.status == "error") | {path, error}'

# Arquivos ignorados (não processados)
curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index/files | \
  jq '.data.files[] | select(.status == "skipped") | {path, reason}'
```

### Top 10 Arquivos com Mais Chunks

```bash
curl -s http://localhost:3403/api/v1/rag/collections/test_manual_index/files | \
  jq -r '.data.files | 
    sort_by(.chunkCount) | reverse | 
    .[:10] | 
    ["ARQUIVO", "CHUNKS", "TAMANHO"],
    ["-------", "------", "-------"],
    (.[] | [
      (.path | split("/") | .[-1]),
      (.chunkCount | tostring),
      (.sizeBytes | tostring + " bytes")
    ]) | @tsv' | column -t -s $'\t'
```

### Resultado Esperado (Top 10)

```
ARQUIVO                         CHUNKS  TAMANHO
-------                         ------  -------
comprehensive-architecture.mdx  87      94521 bytes
database-schema-complete.mdx    63      72384 bytes
api-reference-full.mdx          51      58923 bytes
frontend-component-library.mdx  48      52187 bytes
monitoring-guide.mdx            42      45678 bytes
deployment-procedures.mdx       39      41234 bytes
testing-strategies.mdx          35      38291 bytes
security-best-practices.mdx     33      36543 bytes
performance-optimization.mdx    31      34892 bytes
troubleshooting-guide.mdx       29      32156 bytes
```

---

## 📊 Interface: Tabela de Arquivos da Coleção

### Visualização no Dashboard

```
┌──────────────────────────────────┬──────────┬────────┬──────────┐
│ Arquivo                          │ Tamanho  │ Chunks │ Status   │
├──────────────────────────────────┼──────────┼────────┼──────────┤
│ overview.mdx                     │ 12.5 KB  │ 24     │ ✅       │
│ api-overview.mdx                 │ 8.9 KB   │ 17     │ ✅       │
│ schema.mdx                       │ 15.6 KB  │ 31     │ ✅       │
│ design-system.mdx                │ 6.8 KB   │ 13     │ ✅       │
│ monitoring.mdx                   │ 9.2 KB   │ 18     │ ✅       │
│ corrupted-file.mdx               │ 2.1 KB   │ 0      │ ❌ Error │
│ empty-draft.mdx                  │ 0.5 KB   │ 0      │ ⚪ Skip  │
│ ...                              │ ...      │ ...    │ ...      │
└──────────────────────────────────┴──────────┴────────┴──────────┘

Total: 127 arquivos | 1,234 chunks | 1.8 MB
```

### Estados de Arquivo

| Status | Visual | Significado | Ação |
|--------|--------|-------------|------|
| **indexed** | ✅ | Processado com sucesso | Nenhuma |
| **error** | ❌ | Falha ao processar | Revisar arquivo |
| **skipped** | ⚪ | Ignorado (muito pequeno, vazio) | Normal |
| **processing** | 🔄 | Em processamento | Aguardar |
| **pending** | ⏳ | Na fila | Aguardar |

### Filtros e Ordenação

```
Filtros:
  [ Status: Todos ▼ ] [ Tipo: .mdx ▼ ] [ Min Chunks: 0 ]
  
Ordenação:
  [ Nome ▲ ] [ Tamanho ] [ Chunks ] [ Status ]
  
Busca:
  [ 🔍 Filtrar por nome...                              ]
```

---

## 📚 Documentação Criada

✅ **[MANUAL-INDEXING-WORKFLOW.md](MANUAL-INDEXING-WORKFLOW.md)** - Guia completo do novo workflow

---

**Status**: ✅ **IMPLEMENTADO E PRONTO PARA TESTAR**  
**Container**: ⚠️ **Precisa rebuild** (código atualizado)  
**API**: ✅ Criar != Indexar  
**Frontend**: ✅ Botão "Indexar" já existe  
**Relatórios**: ✅ **Endpoint `/files` implementado!**

---

## 🚀 Como Testar o Novo Endpoint

### 1. Rebuild do Container RAG Backend

```bash
# Parar o container atual
docker compose -f tools/compose/docker-compose.docs.yml down rag-backend

# Rebuild com as mudanças
docker compose -f tools/compose/docker-compose.docs.yml build rag-backend

# Iniciar novamente
docker compose -f tools/compose/docker-compose.docs.yml up -d rag-backend

# Verificar logs
docker logs -f rag-backend
```

### 2. Testar o Endpoint

```bash
# Verificar se está respondendo
curl -s http://localhost:3403/api/v1/rag/collections | jq '.data.collections[].name'

# Escolher uma coleção (exemplo: docs_mxbai)
COLLECTION="docs_mxbai"

# Buscar arquivos indexados
curl -s http://localhost:3403/api/v1/rag/collections/$COLLECTION/files | jq '.data.summary'

# Ver top 10 arquivos com mais chunks
curl -s http://localhost:3403/api/v1/rag/collections/$COLLECTION/files | \
  jq -r '.data.files | sort_by(.chunkCount) | reverse | .[:10] | 
    ["ARQUIVO", "CHUNKS", "TAMANHO (KB)"],
    ["-------", "------", "-------------"],
    (.[] | [
      (.path | split("/") | .[-1]),
      (.chunkCount | tostring),
      ((.sizeBytes / 1024 | floor) | tostring)
    ]) | @tsv' | column -t -s $'\t'
```

### 3. Verificar Arquivos com Problemas

```bash
# Arquivos que não existem mais no filesystem (status: "missing")
curl -s http://localhost:3403/api/v1/rag/collections/$COLLECTION/files | \
  jq '.data.files[] | select(.status == "missing") | {path, chunkCount}'
```

---

## 📝 Arquivos Modificados

### Backend (RAG Services)

1. **`tools/rag-services/src/services/collectionManager.ts`**
   - ✅ Adicionado método `getIndexedFiles(collectionName)`
   - Consulta Qdrant via scroll para buscar todos os chunks
   - Agrupa por arquivo e enriquece com metadados do filesystem
   - Retorna lista ordenada com path, tamanho, chunks, status

2. **`tools/rag-services/src/routes/collections.ts`**
   - ✅ Adicionado endpoint `GET /api/v1/rag/collections/:name/files`
   - Retorna lista de arquivos + estatísticas agregadas
   - Calcula totais, médias e conversões automaticamente

### Frontend (Dashboard)

3. **`frontend/dashboard/src/components/pages/collections/CollectionFilesTable.tsx`** (NOVO)
   - ✅ Componente React para exibir tabela de arquivos
   - Mostra path, tamanho, chunks, status, última modificação
   - Cards com estatísticas agregadas (6 métricas)
   - Botões de refresh e fechar
   - Estados de loading e error

4. **`frontend/dashboard/src/components/pages/CollectionsManagementCard.tsx`**
   - ✅ Integrado componente `CollectionFilesTable`
   - Linhas da tabela de coleções agora são clicáveis
   - Ao clicar em uma coleção, exibe tabela de arquivos abaixo
   - Botões de ação não disparam o click da linha (stopPropagation)

---

## 🎨 Como Usar a Interface

### 1. Abrir Dashboard

```bash
# Navegar para a página RAG
http://localhost:3103/llama
```

### 2. Visualizar Coleções

A tabela de coleções mostra:
- Nome e descrição
- Modelo de embedding
- Diretório de origem
- Total de arquivos
- Total de chunks
- Chunks órfãos
- Arquivos pendentes
- Ações (Editar, Clonar, Indexar, Deletar)

### 3. Ver Arquivos de uma Coleção

**Clique em qualquer linha da tabela de coleções** para expandir a tabela de arquivos!

A tabela de arquivos exibe:

**Cards de Estatísticas (6 métricas)**:
- 📁 Total de arquivos
- 🧩 Total de chunks
- 💾 Tamanho total (MB)
- 📊 Média de chunks por arquivo
- 📏 Tamanho médio dos arquivos (KB)
- ✓ Status geral

**Tabela de Arquivos**:
| Coluna | Descrição |
|--------|-----------|
| File | Nome do arquivo (com ícone) |
| Size | Tamanho em bytes/KB/MB |
| Chunks | Quantidade de chunks (badge azul) |
| Status | Badge colorido (✓ Indexed, ⚠ Missing, ✗ Error) |
| Last Modified | Data/hora da última modificação |

**Ações**:
- 🔄 **Refresh**: Atualiza a lista de arquivos
- ✕ **Close**: Fecha a tabela de arquivos

### 4. Fluxo Completo de Uso

```
1. Abrir Dashboard → /llama
2. Ver lista de coleções
3. Clicar em uma coleção → Expande tabela de arquivos
4. Revisar arquivos indexados
5. Ver estatísticas detalhadas
6. Clicar "Close" → Fecha a tabela
7. Clicar em outra coleção → Mostra seus arquivos
```

---

🎯 **Agora você tem controle total:**
1. **Criar** → Instantâneo (2s)
2. **Revisar** → Conferir configurações
3. **Indexar** → Quando quiser (botão ▶️)
4. **Monitorar** → Ver detalhes de cada arquivo processado 📁
5. **Analisar** → Estatísticas agregadas automáticas ⚡
6. **Interface** → Visualização completa no dashboard 🎨

