## Design Notes — add-telegram-gateway-dashboard

### Arquitetura Geral
- **Camada de dados**: Service Launcher (`apps/status`) continua como façade HTTP para o Telegram Gateway, consumindo:
  - `http://localhost:${port}/health` para estado/uptime.
  - `http://localhost:${port}/metrics` (Prometheus) para counters/gauges.
  - Arquivos locais (`data/failure-queue.jsonl`, `.session/telegram-gateway.session`) para fila e sessão.
- **Persistência de mensagens**: TimescaleDB (PostgreSQL + extensão) armazenando todas as mensagens capturadas, permitindo consultas históricas, filtros analíticos e reprocessamento.
- **API agregada**: novos endpoints REST (JSON) expostos pelo Service Launcher em `/api/telegram-gateway`:
  1. `GET /overview` — consolida health, versão (package.json), tempos, config relevante (`process.env` whitelisted).
  2. `GET /metrics` — retorna counters/gauges normalizados (totais, delta desde boot, taxa por minuto).
  3. `GET /queue` — status da fila (tamanho, 10 itens recentes, tamanho do arquivo).
  4. `GET /session` — metadados da sessão (existência, mtime, idade, hash truncado).
  5. `GET /messages` — lista paginada das mensagens persistidas com filtros (canal, status, full-text, intervalo de datas) e agregados.
  6. `POST /messages/:id/reprocess` — reencaminha mensagem específica via `publishWithRetry`.
  7. `DELETE /messages/:id` — soft-delete (flag `deleted_at`) preservando trilha de auditoria.
  8. `POST /actions/reload` — invalida cache e reexecuta coleta (sem side effects).
- **Frontend**: página `TelegramGatewayPage` consome os endpoints via `@tanstack/react-query` com polling configurável (default 10s) e estados de skeleton/erro. Layout usa `CustomizablePageLayout` + `CollapsibleCard`.

### Persistência de Mensagens (TimescaleDB)
1. **Schema**
   - Criar schema `telegram_gateway`.
   - Hypertable `messages` com colunas:
     - `id` UUID (PK) com default `gen_random_uuid()`.
     - `channel_id` text.
     - `message_id` bigint.
     - `thread_id` bigint null.
     - `text` text, `caption` text.
     - `media_type` text, `media_refs` jsonb.
     - `status` enum (`received`, `published`, `queued`, `failed`, `reprocessed`, `deleted`).
     - `received_at`, `published_at`, `failed_at`, `reprocessed_at` timestamptz.
     - `metadata` jsonb (endpoint alvo, latência, tentativas).
     - `created_at` timestamptz default `now()` (coluna de particionamento Timescale).
     - `updated_at` timestamptz default `now()` com trigger de atualização.
     - `deleted_at` timestamptz null.
   - Índices: `UNIQUE(channel_id, message_id)`, GIN em `metadata`, idx por `status`, `received_at`.
   - Política: `select create_hypertable('telegram_gateway.messages', 'created_at', chunk_time_interval => interval '1 day');`
   - Retenção configurável (`TELEGRAM_GATEWAY_RETENTION_DAYS`, default 90) + compressão após 14 dias (`add_compression_policy`).
2. **Ingestão**
   - `apps/telegram-gateway` grava/atualiza registros: na recepção (`status = 'received'`), após publicação (`status = 'published'` + `published_at`), ao falhar (`status = 'failed'`). Persistência idempotente (`ON CONFLICT DO UPDATE`).
   - Worker opcional para processar fila JSONL → tabela (tarefa em background, cron).
3. **API CRUD**
   - Novo microserviço `backend/api/telegram-gateway` (Express + `pg`) com rotas:
     - `GET /messages` (paginação, filtros, ordenação).
     - `GET /messages/:id` (detalhes completos).
     - `POST /messages/:id/reprocess` (chama script HTTP publisher).
     - `DELETE /messages/:id` (marca `deleted_at`).
     - `POST /messages/:id/notes` (opcional para comentários operacionais).
   - Reutilizar `backend/shared/db` para pool PostgreSQL e migrations em `backend/data/migrations/telegram-gateway`.
   - Autenticação via token compartilhado (`API_SECRET_TOKEN`) ou cabeçalho específico.
   - Service Launcher consome esse serviço para montar dados agregados (evita múltiplas queries diretamente no DB).

### Backend / Service Launcher
1. **Configuração**
   - Adicionar `SERVICE_LAUNCHER_TELEGRAM_GATEWAY_PORT` / `_URL` ao resolver (`createServiceTarget`) com default 4006.
   - Incluir `TELEGRAM_GATEWAY_API_URL` (novo serviço CRUD) em `.env.defaults` e `apiConfig`.
   - Expandir `SERVICE_TARGETS` para incluir `telegram-gateway` (health do serviço principal e do CRUD).
   - Incluir `telegram-gateway` em `SERVICE_START_CONFIGS` (script `npm run dev` em `apps/telegram-gateway`) e novo item `telegram-gateway-api` se criarmos API dedicada.
2. **Novos módulos**
   - `src/services/telegram-gateway.js`: funções puras para:
     - `fetchHealth(baseUrl)` — wrapper `fetch` com timeout.
     - `fetchMetrics(baseUrl)` — parsing Prometheus (usar lib `prometheus-text-format` ou parser utilitário).
     - `readFailureQueue(queuePath, limit)` — ler `JSONL` com limite e redigir `tooLarge` quando necessário.
     - `inspectSession(sessionFile)` — presença, tamanho, mtime, hash truncado.
     - `fetchMessages(apiUrl, params)` — delegar ao microserviço CRUD.
   - `src/routes/telegram-gateway.js`: Express router com handlers descritos acima, caching em memória (TTL 5s) e métricas de latência (`launcher_telegram_gateway_fetch_seconds`).
3. **Segurança & Robustez**
   - Sanitizar conteúdo textual (limitar preview), mascarar tokens.
   - Circuit breaker reutilizado para health, metrics e chamadas ao DB/API.
   - Conexões ao banco via credenciais lidas do `.env`, sem logar segredos; suportar modo read-only ao expor dados no launcher.
4. **Testes**
   - `apps/status/tests/telegram-gateway.spec.js`: supertest com mocks (`nock`) cobrindo sucesso/falha/timeout.
   - Testes de parsing de métricas com fixtures (`apps/status/tests/__fixtures__/prometheus.txt`).
   - Testes do microserviço CRUD (`backend/api/telegram-gateway/tests/messages.spec.ts`) usando banco em memória (pg + `docker-compose` test ou `pg-mem` para lógica).

### Frontend
1. **Estrutura**
   - Criar `src/hooks/useTelegramGateway.ts` com queries (`overview`, `metrics`, `queue`, `session`, `messages`) e mutations (`reprocessMessage`, `deleteMessage`).
   - Página `TelegramGatewayPage.tsx` com seções:
     1. **Visão Geral & Controles** — status badge, uptime, versão, bot/user habilitados, botões (`Atualizar`, `Abrir logs`, `Iniciar serviço`, `Abrir Prometheus`).
     2. **Métricas & Tendências** — cards (Totais recebidas/publicadas/falhas), gráfico linhas/barras (taxa por minuto), gauge da fila.
     3. **Mensagens (CRUD)** — tabela TimescaleDB com filtros (canal, status, data), busca full-text, paginação, seleção múltipla, ações (`Reprocessar`, `Excluir`, `Ver detalhes`), exportação CSV.
     4. **Fila de Falhas** — tabela curta com últimos itens, botão `Exportar JSONL`.
     5. **Sessão & Configuração** — card com idade da sessão, caminho, TTL, variáveis relevantes (port, endpoints, retries, retention).
   - `CustomizablePageLayout` com `defaultColumns={2}`, `CollapsibleCard` em todas as seções.
2. **Componentes**
   - `StatusSummary.tsx`, `MetricsOverview.tsx`, `MessagesTable.tsx`, `MessageDetailsDrawer.tsx`, `FailureQueueTable.tsx`, `SessionCard.tsx`.
   - Tabela utiliza hooks de `@tanstack/react-table` (ou componente existente) com virtualização para grandes volumes.
   - Ações `Reprocessar`/`Excluir` exibem modal de confirmação e feedback (`toast`).
3. **Integração**
   - Atualizar `NAVIGATION_DATA` (`Apps`) com lazy import da nova página.
   - Incluir badges/resumos no overview geral (opcional via `useServiceStatusBanner`).
4. **Testes UI**
   - Vitest + Testing Library:
     - Render com mocks → valida KPIs, contagens.
     - Simular erro (API down) → exibir alerta.
     - Testar filtros e paginação (mock com dados fake).
     - Testar mutations (confirm dialog, chamada `mutateAsync`).

### Configuração & DevEx
- **Variáveis**: `.env.defaults`, `.env.example`, `config/README.md` recebem:
  - `TELEGRAM_GATEWAY_PORT`, `TELEGRAM_GATEWAY_DB_URL`, `TELEGRAM_GATEWAY_RETENTION_DAYS`.
  - `VITE_TELEGRAM_GATEWAY_API_URL` (frontend).
  - `SERVICE_LAUNCHER_TELEGRAM_GATEWAY_PORT/URL`, `SERVICE_LAUNCHER_TELEGRAM_GATEWAY_API_URL`.
- **Migrations**: `backend/data/migrations/telegram-gateway` + seeds (`samples/telegram-gateway/messages.sql`).
- **Docs**:
  - `docs/content/apps/telegram-gateway/overview.mdx` — UI, fluxo operacional, screenshots.
  - `docs/content/data/warehouse/telegram-gateway.mdx` — schema, retenção, queries SQL, políticas Timescale.
  - Atualizar runbooks `tools/monitoring` e README do gateway destacando dependência TimescaleDB.
  - Documentar governança de exclusão/reprocessamento (auditoria).
- **Systemd**: garantir permissões de leitura para `.session`/`data` e acesso ao banco (variáveis de ambiente).

### Observabilidade & SRE
- Métricas no Service Launcher: `launcher_telegram_gateway_fetch_seconds`, `launcher_telegram_gateway_failures_total`, `launcher_telegram_gateway_cache_hits_total`.
- Métricas Timescale de ingestão: usar `pg_stat_statements`, `timescaledb_information.job_stats`.
- Grafana dashboards dedicados (taxa de ingestão, falhas, fila, retenção).
- Logs com correlação (adicionar `message_uuid` em logger do gateway).

### Aberto / Follow-ups
- Websocket/Server-Sent Events para alertas em tempo real (fila crescendo).
- Automatizar reprocessamento em lote com workflow (`scripts/maintenance/reprocess-telegram-queue.sh`).
- Avaliar replicação das mensagens para data lake (QuestDB/BigQuery) para analytics avançado.
