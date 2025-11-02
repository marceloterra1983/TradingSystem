# Plano de Melhorias: Sistema de Ingestão e Logs

**Data**: 2025-11-01
**Status**: 🚧 Em Implementação
**Prioridade**: Alta

---

## 📋 Análise do Sistema Atual

### Logs (In-Memory)

**Arquivo**: `tools/rag-services/src/routes/ingestion-logs.ts`

**Problemas Identificados:**
1. ❌ **Não persistente** - Logs perdem-se ao reiniciar serviço
2. ❌ **Limitado** - Apenas 1000 entradas (circular buffer)
3. ❌ **Sem histórico** - Impossível analisar ingestões antigas
4. ⚠️ **Sem índices** - Busca linear em array
5. ⚠️ **Schema básico** - Faltam campos importantes

**Pontos Positivos:**
- ✅ Schema simples e funcional
- ✅ API REST implementada
- ✅ Filtros funcionais (collection, level)

### Fluxo de Ingestão

**Arquivo**: `frontend/dashboard/src/components/pages/CollectionsManagementCard.tsx`

**Fluxo Atual:**
1. Limpar órfãos (POST `/api/v1/rag/collections/${name}/clean-orphans`)
2. Ingerir pendentes (via `onIngestCollection`)
3. Refresh de stats

**Problemas:**
1. ❌ **Logs apenas no console** - Não persistidos
2. ❌ **Sem progress tracking** - Usuário não sabe o andamento
3. ❌ **Sem tratamento de erros** - Try-catch básico
4. ❌ **Sem feedback visual** - Apenas spinner genérico
5. ❌ **Sem cancelamento** - Não pode parar ingestão

---

## 🎯 Objetivos

### 1. Persistência de Logs ✅

**Solução:** SQLite + Better-SQLite3

**Justificativa:**
- ✅ Leve (sem servidor separado)
- ✅ Zero configuração
- ✅ Síncrono (better performance)
- ✅ Suporta SQL completo
- ✅ Ideal para logs

**Schema:**
```sql
CREATE TABLE ingestion_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error', 'success', 'debug')),
  message TEXT NOT NULL,
  collection TEXT,
  job_id TEXT,
  operation TEXT,
  files_processed INTEGER DEFAULT 0,
  chunks_created INTEGER DEFAULT 0,
  current_file TEXT,
  progress REAL DEFAULT 0,
  duration_ms INTEGER,
  error_details TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_logs_timestamp ON ingestion_logs(timestamp DESC);
CREATE INDEX idx_logs_collection ON ingestion_logs(collection);
CREATE INDEX idx_logs_job_id ON ingestion_logs(job_id);
CREATE INDEX idx_logs_level ON ingestion_logs(level);
```

### 2. Progress Tracking em Tempo Real ✅

**Solução:** Server-Sent Events (SSE)

**Por que SSE > WebSocket:**
- ✅ Mais simples (unidirecional)
- ✅ Reconexão automática
- ✅ Suporte nativo no browser
- ✅ Ideal para streaming de logs
- ✅ Menos overhead

**Endpoints:**
```
GET  /api/v1/rag/ingestion/stream/{jobId}  - Stream de progresso
POST /api/v1/rag/ingestion/cancel/{jobId}  - Cancelar ingestão
```

### 3. Interface de Log Dinâmico ✅

**Componentes:**
1. **IngestionProgressModal** - Modal com progress em tempo real
2. **IngestionLogStream** - Stream de logs com auto-scroll
3. **IngestionStatusBadge** - Badge animado de status

**Features:**
- ✅ Progress bar animado
- ✅ Stats em tempo real (files, chunks)
- ✅ Log stream com cores por nível
- ✅ Botão de cancelar
- ✅ Estimativa de tempo restante
- ✅ Toast notifications

### 4. Tratamento de Erros Robusto ✅

**Estratégias:**
1. **Retry Logic** - Até 3 tentativas com backoff exponencial
2. **Partial Success** - Continua mesmo com erros em arquivos individuais
3. **Error Aggregation** - Agrupa erros similares
4. **Graceful Degradation** - Fallback para polling se SSE falhar

---

## 🏗️ Arquitetura Proposta

```
┌─────────────────────────────────────────────┐
│          Frontend (Dashboard)               │
├─────────────────────────────────────────────┤
│  IngestionButton                            │
│    ↓                                        │
│  IngestionProgressModal (SSE connection)    │
│    - Progress Bar                           │
│    - Real-time Stats                        │
│    - Log Stream                             │
│    - Cancel Button                          │
└─────────────────┬───────────────────────────┘
                  │
                  │ POST /api/v1/rag/ingest
                  │ GET  /api/v1/rag/ingestion/stream/{jobId}
                  │
                  ↓
┌─────────────────────────────────────────────┐
│      RAG Collections Service (3403)         │
├─────────────────────────────────────────────┤
│  IngestionController                        │
│    ↓                                        │
│  IngestionOrchestrator                      │
│    1. Clean Orphans                         │
│    2. Scan Directory                        │
│    3. Process Files (batches)               │
│    4. Log Progress → SQLite                 │
│    5. Emit Events → SSE                     │
│    ↓                                        │
│  IngestionLogger (SQLite)                   │
│    - Persist logs                           │
│    - Query logs                             │
│    - Stream logs                            │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│        LlamaIndex Services (8201/8202)      │
│         + Qdrant (6333)                     │
└─────────────────────────────────────────────┘
```

---

## 📝 Implementação

### Fase 1: Backend - Persistência de Logs ✅

**Arquivos:**
```
tools/rag-services/
├── src/
│   ├── db/
│   │   ├── ingestion-logs.db       (novo - SQLite database)
│   │   ├── schema.sql              (novo - SQL schema)
│   │   └── logsDatabase.ts         (novo - DB wrapper)
│   ├── services/
│   │   ├── ingestionLogger.ts      (novo - Logger service)
│   │   └── ingestionOrchestrator.ts(novo - Orchestrator)
│   └── routes/
│       └── ingestion-logs.ts       (modificar - usar SQLite)
```

**Tarefas:**
- [x] Criar schema SQL
- [ ] Implementar `logsDatabase.ts` com Better-SQLite3
- [ ] Implementar `ingestionLogger.ts`
- [ ] Migrar rotas para usar SQLite
- [ ] Testes unitários

### Fase 2: Backend - Orchestrator e SSE ✅

**Arquivos:**
```
tools/rag-services/
├── src/
│   ├── services/
│   │   └── ingestionOrchestrator.ts
│   └── routes/
│       ├── ingestion.ts            (modificar - adicionar SSE)
│       └── ingestion-stream.ts     (novo - SSE endpoint)
```

**Tarefas:**
- [ ] Implementar `IngestionOrchestrator`
  - Clean orphans
  - Scan directory
  - Process files em batches
  - Log progress
  - Emit SSE events
- [ ] Implementar SSE endpoint
- [ ] Implementar cancel endpoint
- [ ] Testes de integração

### Fase 3: Frontend - Componentes de Progress ✅

**Arquivos:**
```
frontend/dashboard/src/
├── components/
│   └── pages/
│       └── collections/
│           ├── IngestionProgressModal.tsx  (novo)
│           ├── IngestionLogStream.tsx      (novo)
│           └── IngestionStatusBadge.tsx    (novo)
├── hooks/
│   └── useIngestionProgress.ts             (novo)
└── services/
    └── ingestionService.ts                 (novo - SSE client)
```

**Tarefas:**
- [ ] Criar `IngestionProgressModal`
- [ ] Criar `IngestionLogStream`
- [ ] Criar `useIngestionProgress` hook
- [ ] Implementar SSE client
- [ ] Integrar com botão de ingestão
- [ ] Testes de componentes

### Fase 4: Tratamento de Erros e Retry ✅

**Tarefas:**
- [ ] Implementar retry logic (3x com backoff)
- [ ] Implementar error aggregation
- [ ] Implementar graceful degradation (SSE → polling)
- [ ] Error notifications (toast)

---

## 🧪 Testes

### Testes Unitários
- [ ] `logsDatabase.ts` - CRUD operations
- [ ] `ingestionLogger.ts` - Logging logic
- [ ] `ingestionOrchestrator.ts` - Orchestration flow
- [ ] Frontend hooks - SSE connection

### Testes de Integração
- [ ] End-to-end ingestion flow
- [ ] SSE streaming
- [ ] Error recovery
- [ ] Cancel operation

### Testes de Performance
- [ ] 1000+ logs in database
- [ ] Multiple concurrent ingestions
- [ ] SSE with 100+ events/sec

---

## 📊 Métricas de Sucesso

### Performance
- ✅ **Latência de logs**: < 100ms (write to SQLite)
- ✅ **SSE latency**: < 50ms (event to client)
- ✅ **DB size**: < 50MB (para 10K logs)

### UX
- ✅ **Progress visibility**: Usuário vê progresso em < 1s
- ✅ **Responsividade**: UI não trava durante ingestão
- ✅ **Feedback**: Toast em < 500ms após ação

### Reliability
- ✅ **Error rate**: < 1% de ingestões falhadas
- ✅ **Recovery**: 100% de erros tratados gracefully
- ✅ **Data integrity**: Zero perda de logs

---

## 🚀 Cronograma

| Fase | Estimativa | Status |
|------|-----------|--------|
| Fase 1: Persistência | 2h | 🚧 Em progresso |
| Fase 2: Orchestrator | 3h | ⏳ Pendente |
| Fase 3: Frontend | 3h | ⏳ Pendente |
| Fase 4: Erros/Retry | 2h | ⏳ Pendente |
| **Total** | **10h** | **🚧 20% completo** |

---

## 📄 Exemplos de Uso

### Backend API

```typescript
// Iniciar ingestão
POST /api/v1/rag/collections/documentation/ingest
Response: {
  "success": true,
  "data": {
    "jobId": "uuid-here",
    "status": "PENDING"
  }
}

// Stream de progresso (SSE)
GET /api/v1/rag/ingestion/stream/uuid-here
Events:
  event: progress
  data: {"filesProcessed": 10, "progress": 0.45}
  
  event: log
  data: {"level": "info", "message": "Processing file.md"}
  
  event: complete
  data: {"filesProcessed": 22, "chunksCreated": 150}

// Cancelar
POST /api/v1/rag/ingestion/cancel/uuid-here
Response: {"success": true, "message": "Cancelled"}
```

### Frontend Component

```tsx
function CollectionsManagement() {
  const [ingestionModal, setIngestionModal] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  const { progress, logs, isComplete, error } = useIngestionProgress(activeJobId);
  
  const handleIngest = async (collection: string) => {
    const { jobId } = await startIngestion(collection);
    setActiveJobId(jobId);
    setIngestionModal(true);
  };
  
  return (
    <>
      <Button onClick={() => handleIngest('documentation')}>
        Iniciar Ingestão
      </Button>
      
      <IngestionProgressModal
        open={ingestionModal}
        onClose={() => setIngestionModal(false)}
        jobId={activeJobId}
        progress={progress}
        logs={logs}
        isComplete={isComplete}
        error={error}
      />
    </>
  );
}
```

---

## ✅ Próximos Passos

1. ✅ **Criar schema SQL**
2. **Implementar logsDatabase.ts**
3. **Implementar ingestionLogger.ts**
4. **Implementar ingestionOrchestrator.ts**
5. **Criar SSE endpoint**
6. **Criar componentes frontend**
7. **Testes end-to-end**
8. **Documentação**

---

**Autor**: Claude Code (Anthropic)
**Data**: 2025-11-01
**Versão**: 1.0.0

