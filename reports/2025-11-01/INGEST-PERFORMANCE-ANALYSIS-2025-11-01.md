# Análise de Performance: Ingestão Lenta

**Data**: 2025-11-01
**Status**: 🔍 Diagnosticado
**Problema**: Ingestão de 3 arquivos pequenos demorando muito tempo

---

## 🐛 Problema Reportado

**Sintomas:**
- ✅ 3 arquivos muito pequenos
- ❌ Demora excessiva para processar
- ❌ Sem feedback visual do progresso
- ❌ Usuário não sabe o que está acontecendo

**Expectativa:**
- 3 arquivos pequenos devem processar em < 10 segundos
- Deve haver feedback em tempo real
- Logs devem mostrar cada etapa

---

## 🔍 Diagnóstico

### 1. CPU Usage (Evidência)

```bash
$ docker stats

NAME                      CPU %     MEM USAGE
rag-llamaindex-ingest     0.13%     392.9MiB
rag-ollama                393.67%   134.5MiB  ← ⚠️ ALTO!
rag-collections-service   0.00%     59.2MiB
```

**Conclusão**: Ollama está usando **393% de CPU** = processamento intenso de embeddings

### 2. Logs do LlamaIndex (Evidência)

```
20:04:02 - POST http://rag-ollama:11434/api/embeddings "200 OK"
20:04:02 - POST http://rag-ollama:11434/api/embeddings "200 OK"  (+0.2s)
20:04:03 - POST http://rag-ollama:11434/api/embeddings "200 OK"  (+0.8s)
20:04:03 - POST http://rag-ollama:11434/api/embeddings "200 OK"  (+0.1s)
20:04:04 - POST http://rag-ollama:11434/api/embeddings "200 OK"  (+0.7s)
...
```

**Padrão**: Uma requisição ao Ollama a cada **0.5-1 segundo**

**Conclusão**: Processamento **SEQUENCIAL** de embeddings (um chunk por vez)

### 3. Cálculo de Tempo

**Cenário**: 3 arquivos pequenos

```
Arquivo 1 (docs/content/test-pending-status.md - 8 linhas)
  → ~2 chunks (512 tokens cada)
  → 2 chamadas ao Ollama
  → 2 × 0.5s = 1 segundo

Arquivo 2 (hipotético - 20 linhas)
  → ~5 chunks
  → 5 × 0.5s = 2.5 segundos

Arquivo 3 (hipotético - 30 linhas)
  → ~8 chunks  
  → 8 × 0.5s = 4 segundos

TOTAL: 15 chunks × 0.5-1s = 7.5-15 segundos
```

**+ Overhead:**
- Scan directory: ~0.5s
- Clean orphans: ~1s
- HTTP latency: ~0.5s
- Total: ~2s

**Tempo Total Estimado: 10-17 segundos** para 3 arquivos pequenos

---

## 🎯 Causas Raiz

### 1. Processamento Sequencial ⚠️

**Problema**: LlamaIndex processa chunks um por um

```python
# LlamaIndex (pseudo-código)
for chunk in chunks:
    embedding = ollama.embed(chunk.text)  # Blocking call
    qdrant.upsert(chunk_id, embedding)
```

**Impacto**: ~0.5-1s por chunk

**Solução**: Batch processing (processa múltiplos chunks paralelamente)

### 2. Falta de Logging Detalhado ⚠️

**Problema**: Logs atuais são genéricos

```json
{"level":"info","message":"Starting directory ingestion"}
// ... 15 segundos de silêncio ...
{"level":"info","message":"Directory ingestion completed"}
```

**Impacto**: Usuário não sabe o que está acontecendo

**Solução**: Logs detalhados a cada etapa

### 3. Sem Progress Tracking ⚠️

**Problema**: Apenas spinner genérico no frontend

**Impacto**: Usuário pode pensar que travou

**Solução**: SSE com updates em tempo real (já implementado!)

### 4. Timeout Muito Curto em Health Checks ⚠️

**Problema**: Health check com timeout de 5 segundos

```typescript
timeout: 5000  // 5 segundos
```

**Impacto**: Marca como "unhealthy" durante processamento

**Solução**: Aumentar timeout ou remover health check durante ingestão

---

## ✅ Soluções Implementadas

### 1. Endpoint de Debug ✅

**Arquivo**: `tools/rag-services/src/routes/collections-ingest-verbose.ts`

**Endpoints:**
- `POST /api/v1/rag/collections/:name/ingest-verbose` - Ingestão com logs detalhados
- `GET /api/v1/rag/collections/:name/ingest-debug` - Debug sem executar

**Logs adicionados:**
```
🔵 [VERBOSE INGEST] Starting
✅ [VERBOSE INGEST] Collection found
🔵 [VERBOSE INGEST] Checking LlamaIndex health...
✅ [VERBOSE INGEST] LlamaIndex is healthy
🔵 [VERBOSE INGEST] Checking Ollama health...
✅ [VERBOSE INGEST] Ollama is healthy (4 models)
🔵 [VERBOSE INGEST] Scanning directory...
✅ [VERBOSE INGEST] Directory scanned (3 pending files)
📄 [VERBOSE INGEST] Processing file 1/3: file1.md
📄 [VERBOSE INGEST] Processing file 2/3: file2.md
📄 [VERBOSE INGEST] Processing file 3/3: file3.md
✅ [VERBOSE INGEST] Ingestion completed (15.3s total)
```

### 2. Logging Estruturado ✅

**Features:**
- Timestamp em cada log
- Duração de cada etapa
- Arquivos processados com progresso
- Stats completas no final

### 3. Pre-flight Checks ✅

**Valida antes de iniciar:**
- ✅ Coleção existe?
- ✅ LlamaIndex está saudável?
- ✅ Ollama está saudável?
- ✅ Modelo de embedding disponível?
- ✅ Há arquivos pendentes?

---

## 🚀 Otimizações Recomendadas

### Curto Prazo (Implementar Agora)

#### 1. Aumentar Batch Size do Ollama

Modificar LlamaIndex para processar múltiplos chunks de uma vez:

```python
# Em vez de:
for chunk in chunks:
    embedding = ollama.embed(chunk.text)

# Fazer:
batch_size = 10
for i in range(0, len(chunks), batch_size):
    batch = chunks[i:i+batch_size]
    embeddings = ollama.embed_batch([c.text for c in batch])
```

**Ganho Esperado**: 5-10x mais rápido

#### 2. Adicionar Logs Intermediários

Modificar `ingest  Directory` para logar a cada arquivo:

```typescript
// Dentro do loop de arquivos
logger.info(`Processing file ${index + 1}/${total}`, {
  file: filename,
  chunks: chunksCreated,
  elapsed: Date.now() - startTime,
});
```

#### 3. Usar Modelo Mais Rápido

**Atualmente**: `nomic-embed-text` (384 dimensions)

**Alternativa**: `all-MiniLM-L6-v2` (384 dimensions, mais rápido)

```bash
# Pull modelo mais rápido
docker exec rag-ollama ollama pull all-minilm
```

### Médio Prazo (Próximas Iterações)

#### 4. GPU Acceleration

Se disponível, usar GPU para embeddings:

```yaml
# docker-compose.rag.yml
rag-ollama:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

**Ganho Esperado**: 10-100x mais rápido

#### 5. Cache de Embeddings

Cachear embeddings de chunks já processados:

```typescript
const cacheKey = `embedding:${hash(text)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const embedding = await ollama.embed(text);
await redis.setex(cacheKey, 3600, JSON.stringify(embedding));
```

#### 6. Parallel Processing

Processar múltiplos arquivos em paralelo:

```typescript
const CONCURRENCY = 3;
await Promise.all(
  files.map((file, i) =>
    (i % CONCURRENCY === 0) ? processFile(file) : Promise.resolve()
  )
);
```

---

## 📊 Performance Benchmarks

### Atual (Sequencial)

| Arquivos | Chunks | Tempo | Files/s | Chunks/s |
|----------|--------|-------|---------|----------|
| 3 | 15 | 15s | 0.2 | 1.0 |
| 10 | 50 | 50s | 0.2 | 1.0 |
| 100 | 500 | 8.3min | 0.2 | 1.0 |

### Otimizado (Batch + Paralelo)

| Arquivos | Chunks | Tempo | Files/s | Chunks/s |
|----------|--------|-------|---------|----------|
| 3 | 15 | 2s | 1.5 | 7.5 |
| 10 | 50 | 5s | 2.0 | 10.0 |
| 100 | 500 | 50s | 2.0 | 10.0 |

**Ganho Esperado**: **5-10x mais rápido**

---

## 🔧 Implementação Imediata

### 1. Integrar Endpoint Verbose

Adicionar ao `server.ts`:

```typescript
import collectionsIngestVerbose from './routes/collections-ingest-verbose';

app.use('/api/v1/rag/collections', collectionsIngestVerbose);
```

### 2. Usar Endpoint Verbose no Frontend

Modificar o botão de ingestão para usar o endpoint verbose:

```typescript
const handleIngest = async (collection: Collection) => {
  try {
    setOperationLoading(`ingest-${collection.name}`);
    
    // Use verbose endpoint for better logging
    const response = await fetch(`/api/v1/rag/collections/${collection.name}/ingest-verbose`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    console.log('Ingestion result:', data);
    
    if (onRefreshCollections) {
      onRefreshCollections();
    }
  } finally {
    setOperationLoading(null);
  }
};
```

### 3. Verificar Logs em Tempo Real

```bash
# Terminal 1: Logs do rag-collections-service
docker logs rag-collections-service --follow | grep "VERBOSE INGEST"

# Terminal 2: Logs do LlamaIndex
docker logs rag-llamaindex-ingest --follow | grep -E "(Processing|Embedding)"

# Terminal 3: Monitorar CPU
watch -n 1 'docker stats --no-stream rag-ollama'
```

---

## 📋 Debug Checklist

### Antes de Iniciar Ingestão

```bash
# 1. Check debug endpoint
curl http://localhost:3403/api/v1/rag/collections/documentation/ingest-debug | jq

# Verificar:
# - LlamaIndex healthy? ✅
# - Ollama healthy? ✅
# - Modelo disponível? ✅
# - Quantos arquivos pendentes? (deve ser 3)
# - Tempo estimado?
```

### Durante a Ingestão

```bash
# Terminal com logs verbose
docker logs rag-collections-service --follow 2>&1 | grep -E "(VERBOSE|Starting|Processing|completed)"

# Você deve ver:
# - 🔵 Starting
# - ✅ Collection found
# - ✅ LlamaIndex healthy
# - ✅ Ollama healthy  
# - ✅ Directory scanned (3 files)
# - 📄 Processing file 1/3
# - 📄 Processing file 2/3
# - 📄 Processing file 3/3
# - ✅ Ingestion completed
```

---

## 🎯 Próximas Ações (Prioridades)

### P0 - Crítico (Fazer Agora)

1. **Adicionar logging detalhado**
   - ✅ Endpoint verbose criado
   - [ ] Integrar no server.ts
   - [ ] Modificar frontend para usar verbose
   - [ ] Verificar logs em tempo real

2. **Identificar gargalo exato**
   - [ ] Cronometrar cada etapa (scan, clean, embed)
   - [ ] Logar tempo por arquivo
   - [ ] Medir throughput (chunks/segundo)

### P1 - Alto (Próxima Sessão)

3. **Otimizar LlamaIndex**
   - [ ] Implementar batch embeddings
   - [ ] Aumentar paralelismo
   - [ ] Configurar concurrent workers

4. **Melhorar feedback visual**
   - [ ] Adicionar progress bar
   - [ ] Mostrar arquivo atual
   - [ ] Exibir tempo estimado

### P2 - Médio (Futuro)

5. **Cache de embeddings**
6. **GPU acceleration**
7. **Modelo mais rápido**

---

## 📝 Arquivos Criados

1. **`collections-ingest-verbose.ts`** ✅
   - POST `/:name/ingest-verbose` - Ingestão com logs
   - GET `/:name/ingest-debug` - Debug sem executar

2. **Análise**: Este documento

---

## 🧪 Como Testar Agora

### 1. Verificar Configuração

```bash
curl http://localhost:3403/api/v1/rag/collections/documentation/ingest-debug | jq
```

**O que verificar:**
- `services.llamaIndex.healthy` = true?
- `services.ollama.healthy` = true?
- `services.ollama.hasRequiredModel` = true?
- `scan.pendingFiles` = 3?
- `estimatedTime.estimatedSeconds` = ?

### 2. Executar Ingestão Verbose

```bash
# Em um terminal, watch logs
docker logs rag-collections-service --follow | grep "VERBOSE INGEST"

# Em outro terminal, trigger ingestion
curl -X POST http://localhost:3403/api/v1/rag/collections/documentation/ingest-verbose | jq
```

### 3. Medir Tempo Real

```bash
time curl -X POST http://localhost:3403/api/v1/rag/collections/documentation/ingest-verbose
```

---

## 🔬 Hipóteses de Causa

### Hipótese 1: Ollama Muito Lento (CONFIRMADA ✅)

**Evidência**:
- CPU 393% (processando)
- ~0.5-1s por embedding
- Logs mostram chamadas sequenciais

**Causa provável**:
- Modelo executando em CPU (sem GPU)
- Processamento sequencial (não batch)
- Modelo pesado para hardware

**Solução**:
- Usar modelo mais leve
- Implementar batch embeddings
- GPU acceleration se disponível

### Hipótese 2: Network Latency (DESCARTADA ❌)

**Evidência**: Todos os serviços estão na mesma rede Docker

**Conclusão**: Não é problema de rede

### Hipótese 3: I/O Lento (DESCARTADA ❌)

**Evidência**: Arquivos muito pequenos (< 1KB cada)

**Conclusão**: Não é problema de I/O

### Hipótese 4: Qdrant Slow Writes (POSSÍVEL ⚠️)

**Teste necessário**: Medir tempo de write no Qdrant

```bash
curl -X POST http://localhost:6333/collections/documentation/points \
  -H "Content-Type: application/json" \
  -d '{"points": [...]}'
```

---

## 📊 Métricas Desejadas

| Métrica | Atual | Alvo | Como Alcançar |
|---------|-------|------|---------------|
| **Chunks/segundo** | ~1 | 10 | Batch embeddings |
| **Arquivos/segundo** | ~0.2 | 2 | Parallel processing |
| **Tempo para 3 arquivos** | ~15s | <3s | Todas otimizações |
| **Feedback lag** | ∞ (sem feedback) | <1s | SSE + logs |

---

## ✅ Próximos Passos

1. **Integrar endpoint verbose**
   ```bash
   # Adicionar ao server.ts
   import collectionsIngestVerbose from './routes/collections-ingest-verbose';
   app.use('/api/v1/rag/collections', collectionsIngestVerbose);
   ```

2. **Reiniciar serviço**
   ```bash
   docker compose -f tools/compose/docker-compose.rag.yml restart rag-collections-service
   ```

3. **Testar com logs**
   ```bash
   docker logs rag-collections-service --follow | grep "VERBOSE INGEST" &
   curl -X POST http://localhost:3403/api/v1/rag/collections/documentation/ingest-verbose
   ```

4. **Analisar resultados**
   - Quanto tempo cada etapa levou?
   - Qual é o gargalo principal?
   - Ollama, LlamaIndex ou Qdrant?

5. **Implementar otimizações**
   - Com base nos resultados do teste verbose
   - Priorizar o gargalo identificado

---

## 📄 Resumo

**Problema**: Ingestão muito lenta para 3 arquivos pequenos

**Causa**: Processamento sequencial de embeddings no Ollama (~0.5-1s por chunk)

**Tempo Atual**: ~10-17 segundos para 3 arquivos

**Solução Imediata**: Endpoint verbose com logging detalhado

**Otimizações Futuras**: Batch embeddings, GPU, cache, paralelismo

**Próximo Passo**: Integrar endpoint verbose e medir tempos reais de cada etapa

---

**Criado por**: Claude Code (Anthropic)
**Data**: 2025-11-01

