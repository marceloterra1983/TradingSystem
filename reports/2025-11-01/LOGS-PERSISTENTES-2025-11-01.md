# ✅ Logs de Ingestão Persistentes - 2025-11-02

## 🎯 Objetivo

> "observei que os logs sao constantemente limpos, manter o historico"

Implementar armazenamento persistente para logs de ingestão, permitindo:
- ✅ Histórico completo de ingestões
- ✅ Logs sobrevivem a restarts do container
- ✅ Capacidade de arquivamento (não deleção)
- ✅ Até 10,000 logs em memória (vs. 1,000 anteriormente)

---

## 🔄 Mudanças Implementadas

### 1. **Armazenamento Persistente em Disco** (`ingestion-logs.ts`)

#### Antes (Somente Memória)
```typescript
// ❌ Circular buffer limitado a 1,000 logs
const MAX_LOGS = 1000;
const ingestionLogs: IngestionLogEntry[] = [];

// ❌ Logs perdidos ao reiniciar container
```

#### Depois (Memória + Disco)
```typescript
// ✅ Capacidade aumentada para 10,000 logs em memória
const MAX_LOGS_IN_MEMORY = 10000;

// ✅ Armazenamento persistente em JSONL
const LOGS_DIR = process.env.LOGS_DIR || '/app/data/logs';
const LOGS_FILE = path.join(LOGS_DIR, 'ingestion-logs.jsonl');

// ✅ Logs carregados do disco na inicialização
async function loadLogsFromDisk(): Promise<void> {
  const fileContent = await fs.readFile(LOGS_FILE, 'utf-8');
  const lines = fileContent.trim().split('\n');
  
  for (const line of lines) {
    const log = JSON.parse(line);
    parsedLogs.push(log);
  }
  
  // Carregar últimos 10,000 logs em memória
  ingestionLogs.push(...parsedLogs.slice(-MAX_LOGS_IN_MEMORY));
}
```

---

### 2. **Persistência Automática ao Adicionar Logs**

```typescript
export function addIngestionLog(entry: Omit<IngestionLogEntry, 'timestamp'>): void {
  const logEntry: IngestionLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  // ✅ Adiciona em memória
  ingestionLogs.unshift(logEntry);

  // ✅ Persiste no disco (async, non-blocking)
  appendLogToDisk(logEntry).catch((error) => {
    logger.warn('Failed to persist log', { error });
  });
}
```

**Formato JSONL (JSON Lines):**
```jsonl
{"timestamp":"2025-11-02T00:35:18.432Z","level":"success","message":"Teste 1","collection":"docs"}
{"timestamp":"2025-11-02T00:36:22.111Z","level":"info","message":"Teste 2","collection":"workspace"}
```

---

### 3. **Arquivamento ao Invés de Deleção**

#### Antes
```typescript
// ❌ DELETE /api/v1/rag/ingestion/logs - Deletava permanentemente
router.delete('/', (_req, res) => {
  ingestionLogs.length = 0; // Perda total de histórico
});
```

#### Depois
```typescript
// ✅ DELETE /api/v1/rag/ingestion/logs - Arquiva ao invés de deletar
router.delete('/', async (_req, res) => {
  const archivePath = path.join(
    LOGS_DIR,
    `ingestion-logs-archive-${new Date().toISOString().replace(/:/g, '-')}.jsonl`
  );

  // Move para arquivo com timestamp
  await fs.rename(LOGS_FILE, archivePath);
  
  // Limpa memória, mas preserva histórico em disco
  ingestionLogs.length = 0;
});
```

**Arquivos Gerados:**
```
/app/data/logs/
├── ingestion-logs.jsonl                        # Logs ativos
├── ingestion-logs-archive-2025-11-01T15-30-00.jsonl  # Histórico 1
└── ingestion-logs-archive-2025-11-02T10-15-00.jsonl  # Histórico 2
```

---

### 4. **Volume Mount para Persistência**

**Docker Compose** (`docker-compose.rag.yml`):
```yaml
rag-collections-service:
  volumes:
    - ../rag-services/collections-config.json:/app/collections-config.json
    - ../../data/logs/rag-ingestion:/app/data/logs  # ✅ Novo volume
  environment:
    - LOGS_DIR=/app/data/logs  # ✅ Variável de ambiente
```

**Estrutura no HOST:**
```
/home/marce/Projetos/TradingSystem/
└── data/
    └── logs/
        └── rag-ingestion/
            ├── ingestion-logs.jsonl
            └── ingestion-logs-archive-*.jsonl
```

---

## 🧪 Testes de Validação

### Teste 1: Persistência no Disco
```bash
# Adicionar log via API
curl -X POST "http://localhost:3403/api/v1/rag/ingestion/logs" \
  -d '{"level":"info","message":"Teste de persistência"}'

# Verificar arquivo no HOST
cat data/logs/rag-ingestion/ingestion-logs.jsonl
# ✅ Log presente no arquivo
```

### Teste 2: Recuperação Após Restart
```bash
# Estado antes do restart
curl "http://localhost:3403/api/v1/rag/ingestion/logs?limit=5"
# { "totalAvailable": 42 }

# Restart do container
docker restart rag-collections-service

# Estado após restart
curl "http://localhost:3403/api/v1/rag/ingestion/logs?limit=5"
# { "totalAvailable": 42 }  ✅ Logs recuperados!
```

### Teste 3: Arquivamento
```bash
# Arquivar logs atuais
curl -X DELETE "http://localhost:3403/api/v1/rag/ingestion/logs"
# { "archivePath": "ingestion-logs-archive-2025-11-02T00-40-15.jsonl" }

# Verificar arquivos no HOST
ls data/logs/rag-ingestion/
# ingestion-logs.jsonl (vazio)
# ingestion-logs-archive-2025-11-02T00-40-15.jsonl (histórico preservado) ✅
```

---

## 📊 Capacidade e Performance

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Logs em Memória** | 1,000 | 10,000 | **10x** |
| **Persistência** | ❌ Nenhuma | ✅ Disco (JSONL) | **Infinito** |
| **Histórico** | Perdido em restart | ✅ Recuperado | **100%** |
| **Deleção** | Permanente | ✅ Arquivamento | **Reversível** |
| **Formato** | Somente JSON | ✅ JSONL (streaming) | **Eficiente** |

---

## 🚀 Funcionalidades

### 1. **API Endpoints**

#### GET /api/v1/rag/ingestion/logs
```bash
# Obter últimos 100 logs
curl "http://localhost:3403/api/v1/rag/ingestion/logs?limit=100"

# Filtrar por coleção
curl "http://localhost:3403/api/v1/rag/ingestion/logs?collection=documentation"

# Filtrar por nível
curl "http://localhost:3403/api/v1/rag/ingestion/logs?level=error"
```

#### POST /api/v1/rag/ingestion/logs
```bash
# Adicionar log manualmente
curl -X POST "http://localhost:3403/api/v1/rag/ingestion/logs" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "success",
    "message": "Indexação concluída",
    "collection": "docs",
    "details": {
      "filesProcessed": 238,
      "chunksCreated": 793
    }
  }'
```

#### DELETE /api/v1/rag/ingestion/logs
```bash
# Arquivar logs (não deleta permanentemente)
curl -X DELETE "http://localhost:3403/api/v1/rag/ingestion/logs"
# Resposta: { "archivePath": "ingestion-logs-archive-2025-11-02T10-30-00.jsonl" }
```

---

## 📁 Estrutura de Arquivos

### Arquivo JSONL (JSON Lines)
Cada linha é um objeto JSON completo:
```json
{"timestamp":"2025-11-02T00:35:18.432Z","level":"info","message":"Iniciando indexação","collection":"documentation","details":{"filesProcessed":0}}
{"timestamp":"2025-11-02T00:35:45.123Z","level":"success","message":"Indexação concluída","collection":"documentation","details":{"filesProcessed":238,"chunksCreated":793}}
```

**Vantagens do JSONL:**
- ✅ Streaming eficiente (linha por linha)
- ✅ Append-only (alta performance)
- ✅ Fácil parsing e filtering
- ✅ Compatível com ferramentas Unix (`grep`, `jq`, `tail`)

---

## 🔍 Uso Prático

### Ver últimos logs no terminal
```bash
tail -f data/logs/rag-ingestion/ingestion-logs.jsonl | jq -r '.message'
```

### Contar logs por nível
```bash
cat data/logs/rag-ingestion/ingestion-logs.jsonl | jq -r '.level' | sort | uniq -c
```

### Buscar logs de erro
```bash
grep '"level":"error"' data/logs/rag-ingestion/ingestion-logs.jsonl | jq '.'
```

### Ver logs de uma coleção específica
```bash
grep '"collection":"documentation"' data/logs/rag-ingestion/ingestion-logs.jsonl | jq -r '.message'
```

---

## ✅ Checklist de Implementação

- [x] Armazenamento persistente em JSONL
- [x] Carregamento automático de logs na inicialização
- [x] Persistência automática ao adicionar logs
- [x] Volume mount no Docker Compose
- [x] Arquivamento ao invés de deleção
- [x] Capacidade aumentada (10,000 logs em memória)
- [x] Testes de persistência após restart
- [x] Documentação completa

---

## 🎯 Status Final

✅ **IMPLEMENTADO COM SUCESSO**

**Benefícios:**
1. ✅ **Histórico completo** de ingestões preservado
2. ✅ **Logs sobrevivem** a restarts do container
3. ✅ **Capacidade 10x maior** em memória
4. ✅ **Arquivamento reversível** (não deleção)
5. ✅ **Performance otimizada** com JSONL

**Próximos Passos (Opcional):**
- [ ] Rotação automática de logs (ex: manter últimos 30 dias)
- [ ] Compressão de arquivos antigos (gzip)
- [ ] Visualização de logs arquivados no dashboard
- [ ] Exportação de logs para CSV/Excel

---

**Data:** 2025-11-02  
**Tempo de Implementação:** ~30 minutos  
**Complexidade:** Média (persistência, Docker volumes, JSONL)  
**Resultado:** ✅ Logs persistentes funcionando

