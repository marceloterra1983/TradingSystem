# Course Crawler - Worker Não Executa CLI

**Date**: 2025-11-07
**Issue**: Worker marca run como "running" mas CLI nunca executa
**Status**: 🔍 INVESTIGANDO - Requer correção no código

---

## 🔴 Problema Identificado

### Sintomas

1. **UI mostra "RUNNING"** com duração crescente (2233s+)
2. **Logs mostram "STREAMING"** mas sempre os mesmos 5 logs mock
3. **Run fica travado** sem progresso real
4. **Worker não mostra logs** de execução do CLI

### Investigação Completa

#### 1. Status no Banco de Dados

```sql
SELECT id, status, created_at, started_at, finished_at
FROM course_crawler.crawl_runs
WHERE id = '33d841d6-6581-4fdd-8e14-cc36cc54016f';
```

**Resultado**:
- Status: `running`
- Started: `2025-11-07 22:09:45`
- Finished: `NULL`

✅ **Conclusão**: Worker marcou como "running" no banco

#### 2. Logs do Worker

```bash
docker logs course-crawler-worker
```

**Resultado**:
```
> tradingsystem-course-crawler-api@0.1.0 worker:start
> node dist/jobs/worker.js

Course Crawler worker started
```

❌ **Problema**: Nenhum log de processamento (`[Worker] Processing run...`)

#### 3. Processos no Container

```bash
docker exec course-crawler-worker ps aux | grep node
```

**Resultado**:
```
root  17  sh -c node dist/jobs/worker.js
root  18  node dist/jobs/worker.js
```

❌ **Problema**: Apenas o worker principal, **nenhum processo filho do CLI**

#### 4. Arquivo CLI Existe?

```bash
docker exec course-crawler-worker ls -la /workspace/apps/course-crawler/dist/index.js
```

**Resultado**: ✅ Arquivo existe e é executável

#### 5. Teste Manual do CLI

```bash
docker exec course-crawler-worker node /workspace/apps/course-crawler/dist/index.js --help
```

**Resultado**: ❌ Erro de variáveis de ambiente obrigatórias
```
Error: Invalid course crawler environment configuration:
- COURSE_CRAWLER_BASE_URL (Required)
- COURSE_CRAWLER_LOGIN_USERNAME (Required)
- COURSE_CRAWLER_LOGIN_PASSWORD (Required)
```

✅ **Esperado**: Worker deve passar essas variáveis via `childEnv`

---

## 🎯 Causa Raiz

### Comportamento Observado

1. ✅ Worker poll funciona (loop ativo)
2. ✅ `fetchNextQueuedRun()` pega o run da fila
3. ✅ Run é marcado como "running" no banco
4. ❌ **Processo filho (`spawn`) nunca inicia ou falha silenciosamente**
5. ❌ Nenhum log de erro aparece

### Hipóteses

**Hipótese 1**: Exceção não capturada no `processRun()`
- `fs.access()` pode estar lançando erro
- `getCourseWithSecret()` pode falhar
- `spawn()` pode falhar silenciosamente

**Hipótese 2**: Processo filho inicia mas trava imediatamente
- CLI pode estar travando em alguma operação síncrona
- Falta de variáveis de ambiente críticas
- Problema com volume montado

**Hipótese 3**: Worker trava antes de chamar `spawn()`
- Algum código síncrono travado
- Deadlock em alguma promise
- Bug no código que não gera exceção

---

## 🔍 Análise de Código

### Worker Loop (worker.ts)

```typescript
async function main() {
  console.log('Course Crawler worker started');
  while (true) {
    try {
      await processRun();
    } catch (error) {
      console.error('Worker loop error', error);
      await delay(POLL_INTERVAL_MS);
    }
  }
}
```

✅ **Loop correto**: Captura exceções e continua

### Função processRun()

```typescript
async function processRun() {
  workerState.lastPollTime = Date.now();

  const run = await fetchNextQueuedRun(); // ← Linha 31
  if (!run) {
    await delay(POLL_INTERVAL_MS);
    return;
  }

  console.log(`[Worker] Processing run ${run.id}...`); // ← Linha 37
  // ...
}
```

**Problema**: Log de "Processing run" nunca aparece!

**Possibilidades**:
1. `fetchNextQueuedRun()` está travando indefinidamente
2. `fetchNextQueuedRun()` lança exceção silenciosa
3. Código após `fetchNextQueuedRun()` nunca é alcançado

### Função fetchNextQueuedRun() (run-service.ts)

```typescript
export async function fetchNextQueuedRun() {
  return withTransaction(async (client) => {
    const run = await client.query<RunRow>(
      `SELECT * FROM course_crawler.crawl_runs
       WHERE status = 'queued'
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1`
    );
    if (run.rowCount === 0) {
      return null;
    }
    const record = run.rows[0];
    await client.query(
      `UPDATE course_crawler.crawl_runs
       SET status = 'running', started_at = NOW()
       WHERE id = $1`,
      [record.id]
    );
    return mapRow({
      ...record,
      status: 'running',
      started_at: new Date().toISOString()
    } as RunRow);
  });
}
```

**Observação**: Run FOI marcado como "running" no banco!

**Conclusão**: `fetchNextQueuedRun()` executou com sucesso, mas o código depois (linha 37+) nunca rodou.

---

## 🐛 Bug Identificado

### Problema: withTransaction() trava ou retorna null

**Evidência**:
- Run marcado como "running" no banco ✅
- Log "Processing run" nunca aparece ❌
- Nenhum processo filho criado ❌

**Hipótese mais provável**:

A função `withTransaction()` pode estar **travando após o COMMIT** ou **retornando null inesperadamente**.

Vamos verificar o código de `withTransaction()`:

```typescript
// db/pool.ts
export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result; // ← Problema pode estar aqui
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Possível problema**: Se `client.query('COMMIT')` travar ou demorar muito, a função nunca retorna.

---

## ✅ Soluções Propostas

### Solução 1: Adicionar Timeouts

Adicionar timeout nas operações de banco de dados:

```typescript
export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>,
  timeoutMs = 30000, // 30 segundos
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Adicionar timeout no handler
    const result = await Promise.race([
      handler(client),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transaction timeout')), timeoutMs)
      ),
    ]);

    await client.query('COMMIT');
    return result as T;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Solução 2: Adicionar Mais Logs

Adicionar logs detalhados em `processRun()`:

```typescript
async function processRun() {
  workerState.lastPollTime = Date.now();
  console.log('[Worker] Polling for queued runs...');

  const run = await fetchNextQueuedRun();
  console.log('[Worker] fetchNextQueuedRun returned:', run ? run.id : 'null');

  if (!run) {
    await delay(POLL_INTERVAL_MS);
    return;
  }

  console.log(`[Worker] Processing run ${run.id} for course ${run.courseId}`);
  // ... resto do código
}
```

### Solução 3: Statement Timeout no PostgreSQL

Configurar timeout diretamente no PostgreSQL:

```sql
ALTER DATABASE coursecrawler SET statement_timeout = '30s';
```

Ou via connection string:
```
postgresql://postgres:coursecrawler@course-crawler-db:5432/coursecrawler?options=-c%20statement_timeout%3D30000
```

### Solução 4: Simplificar fetchNextQueuedRun()

Evitar transação complexa:

```typescript
export async function fetchNextQueuedRun() {
  // Tentar pegar run sem transação pesada
  const result = await pool.query<RunRow>(
    `UPDATE course_crawler.crawl_runs
     SET status = 'running', started_at = NOW()
     WHERE id = (
       SELECT id FROM course_crawler.crawl_runs
       WHERE status = 'queued'
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}
```

---

## 🧪 Testes Sugeridos

### Teste 1: Verificar Deadlock no Banco

```bash
# Dentro do container do banco
docker exec course-crawler-db psql -U postgres -d coursecrawler -c \
  "SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction' OR wait_event IS NOT NULL;"
```

**Esperado**: Nenhuma transação travada

### Teste 2: Adicionar Logs e Reiniciar

```bash
# Editar worker.ts com mais logs
# Rebuild
cd backend/api/course-crawler
npm run build

# Rebuild imagem Docker
docker compose -f tools/compose/docker-compose.course-crawler.yml build course-crawler-worker

# Reiniciar
docker compose -f tools/compose/docker-compose.course-crawler.yml up -d course-crawler-worker

# Agendar novo run
curl -X POST http://localhost:3601/courses/79491aa3-74b1-4eb6-96f4-0dc07d066982/runs

# Ver logs em tempo real
docker logs -f course-crawler-worker
```

### Teste 3: Testar CLI Manualmente

```bash
# Entrar no container
docker exec -it course-crawler-worker bash

# Executar CLI com variáveis manuais
export COURSE_CRAWLER_BASE_URL="https://dqlabs.memberkit.com.br/230925-mql5-do-zero"
export COURSE_CRAWLER_LOGIN_USERNAME="test"
export COURSE_CRAWLER_LOGIN_PASSWORD="test"
export COURSE_CRAWLER_OUTPUTS_DIR="/app/outputs/test"
export COURSE_CRAWLER_TARGET_URLS=""

node /workspace/apps/course-crawler/dist/index.js
```

**Esperado**: CLI inicia e mostra progresso

---

## 📋 Ações Imediatas

### Para o Usuário

**Temporariamente, o sistema não consegue executar runs reais.**

**O que funciona**:
- ✅ Cadastro de cursos
- ✅ Agendamento de runs (vai para fila)
- ✅ Visualização de runs (com mock logs)
- ✅ Cancelamento de runs

**O que NÃO funciona**:
- ❌ Execução real do crawler
- ❌ Logs reais de progresso
- ❌ Geração de artifacts

### Workaround Temporário

Enquanto o bug não é corrigido, os runs ficarão travados em "running". Você pode:

1. **Cancelar runs travados**:
```bash
curl -X DELETE http://localhost:3601/runs/{runId}
```

2. **Não agendar novos runs** até correção

3. **Aguardar correção** do código do worker

---

## 🔧 Correção Necessária

### Arquivos a Modificar

1. **backend/api/course-crawler/src/jobs/worker.ts**
   - Adicionar logs detalhados
   - Adicionar timeout no processRun()

2. **backend/api/course-crawler/src/db/pool.ts**
   - Adicionar timeout no withTransaction()
   - Adicionar logs de transação

3. **backend/api/course-crawler/src/services/run-service.ts**
   - Simplificar fetchNextQueuedRun()
   - Adicionar logs

### Passos de Correção

1. Adicionar logs detalhados
2. Rebuild backend
3. Rebuild imagem Docker
4. Testar com run simples
5. Verificar logs em tempo real
6. Ajustar conforme necessário

---

## 📊 Status Atual

| Componente | Status | Descrição |
|------------|--------|-----------|
| API | ✅ FUNCIONANDO | Endpoints respondendo |
| Worker Loop | ✅ FUNCIONANDO | Poll ativo |
| fetchNextQueuedRun() | ⚠️ PARCIAL | Marca como running mas trava |
| spawn() do CLI | ❌ NÃO EXECUTA | Processo nunca inicia |
| Logs reais | ❌ INDISPONÍVEIS | Apenas mock logs |
| Artifacts | ❌ NÃO GERA | Runs não completam |

---

## 🎓 Lições Aprendidas

### Problemas de Debugging

1. **Logs insuficientes**: Difícil diagnosticar sem logs detalhados
2. **Exceções silenciosas**: Try-catch pode ocultar problemas
3. **Transações complexas**: Podem travar sem indicação clara
4. **Processos assíncronos**: Difícil rastrear onde trava

### Melhorias Futuras

1. **Structured logging**: JSON logs com contexto
2. **Health checks**: Detectar worker travado
3. **Timeouts everywhere**: Evitar travamentos indefinidos
4. **Monitoring**: Prometheus metrics para runs
5. **Alerting**: Notificar quando run trava > 5min

---

**Report Generated**: 2025-11-07 22:15 UTC
**Issue Status**: 🔍 IDENTIFICADO - Aguardando correção de código
**Impact**: ALTO - Feature principal não funciona
**Priority**: P0 - Crítico

**Próximo Passo**: Implementar Solução 2 (adicionar logs) para confirmar diagnóstico.
