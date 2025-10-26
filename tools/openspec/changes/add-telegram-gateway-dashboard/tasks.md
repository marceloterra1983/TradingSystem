## Phase 0 – Preparação & Alinhamento
- [ ] 0.1 Validar dependências: `apps/telegram-gateway` em execução local, porta padrão 4006, métricas disponíveis.
- [ ] 0.2 Definir payloads JSON esperados para overview/metrics/queue/session (mock files em `apps/status/tests/__fixtures__`).
- [ ] 0.3 Revisar componentes reutilizáveis (`CollapsibleCard`, `InfoBadge`, gráficos) e confirmar padrões de estilo.
- [ ] 0.4 Atualizar spec OpenSpec (este plano) no repositório e obter feedback inicial.

## Phase 1 – Persistência TimescaleDB & API CRUD
- [ ] 1.1 Definir schema `telegram_gateway` (diagramas, tipos, políticas de retenção) e gerar migrations iniciais.
- [ ] 1.2 Implementar migrations (`backend/data/migrations/telegram-gateway`) e seeds de exemplo.
- [ ] 1.3 Atualizar `apps/telegram-gateway` para persistir mensagens (`INSERT ... ON CONFLICT`) e atualizar status/metadata.
- [ ] 1.4 Criar microserviço `backend/api/telegram-gateway` com rotas CRUD (`GET /messages`, `GET /messages/:id`, `POST /messages/:id/reprocess`, `DELETE /messages/:id`).
- [ ] 1.5 Conectar microserviço ao publisher (`publishWithRetry`) para reprocessamento, garantindo autenticação via token compartilhado.
- [ ] 1.6 Implementar testes de integração (Vitest/Supertest) com banco de teste (Timescale/Postgres) cobrindo filtros, paginação, reprocessamento e exclusão.
- [ ] 1.7 Configurar pipelines de retenção/compressão (`add_retention_policy`, `add_compression_policy`) configuráveis via env.

## Phase 2 – Service Launcher & API de Telemetria
- [ ] 2.1 Incluir `telegram-gateway` em `SERVICE_TARGETS` com suporte a health check, circuit breaker e métricas, além do microserviço CRUD.
- [ ] 2.2 Adicionar variáveis no resolver (`SERVICE_LAUNCHER_TELEGRAM_GATEWAY_PORT/URL`, `SERVICE_LAUNCHER_TELEGRAM_GATEWAY_API_URL`) e defaults em `config/.env.defaults`.
- [ ] 2.3 Criar módulo `src/services/telegram-gateway.js` (health, metrics, queue, session, messages helpers + cache).
- [ ] 2.4 Implementar router `src/routes/telegram-gateway.js` com endpoints `/overview`, `/metrics`, `/queue`, `/session`, `/messages`, `/actions/reload`.
- [ ] 2.5 Conectar router ao `server.js` (`app.use('/api/telegram-gateway', ...)`) e registrar métricas Prometheus do launcher.
- [ ] 2.6 Cobrir com testes supertest + mocks de fetch/fs/db, incluindo cenários de erro/timeouts/cache.
- [ ] 2.7 Atualizar `SERVICE_START_CONFIGS` para permitir auto-start do gateway e da API CRUD pelo launcher.

## Phase 3 – Frontend (Dashboard)
- [ ] 3.1 Criar hook `useTelegramGateway` (React Query) com polling configurável, tratamento de erro, selectors e mutations (`reprocess`, `delete`).
- [ ] 3.2 Desenvolver componentes dedicados (`StatusSummary`, `MetricsOverview`, `MessagesTable`, `MessageDetailsDrawer`, `FailureQueueTable`, `SessionCard`) em `components/pages/telegram-gateway/`.
- [ ] 3.3 Montar página `TelegramGatewayPage` com `CustomizablePageLayout`, seções e estados de loading/skeleton.
- [ ] 3.4 Atualizar `NAVIGATION_DATA` (`Apps`) + lazy import para nova página.
- [ ] 3.5 Implementar botões/links de ação (refetch, abrir Prometheus, baixar fila, exportar CSV, iniciar serviço) e integrações com `useServiceAutoRecovery`.
- [ ] 3.6 Criar testes Vitest/RTL cobrindo renderização, filtros, paginação, estados de erro e interação de recarga/mutações.

## Phase 4 – Configuração, Docs e DevEx
- [ ] 4.1 Propagar novas envs para `.env.example`, `config/README.md`, `docs` de operação, `.env.template` dos serviços.
- [ ] 4.2 Atualizar README do Telegram Gateway com menção ao dashboard, persistência TimescaleDB e permissões de diretórios.
- [ ] 4.3 Documentar UI e DB em `docs/content/apps/telegram-gateway/` e `docs/content/data/warehouse/telegram-gateway/`.
- [ ] 4.4 Ajustar scripts/systemd/compose para garantir acesso ao banco e coleta de métricas sem privilégios extras.
- [ ] 4.5 Verificar integrações com `npm run validate-docs` e checklist de PR (incluir seção “Timescale migrations”).

## Phase 5 – QA, Observabilidade & Entrega
- [ ] 5.1 Executar `npm run lint`, `npm run type-check`, `npm run test`, `npm run validate-docs` no monorepo.
- [ ] 5.2 Testar manualmente fluxo completo: dashboard → overview/metrics/queue/session/mensagens, simular fila cheia, sessão expirada e banco indisponível.
- [ ] 5.3 Monitorar logs do launcher e do microserviço CRUD para garantir latência baixa e ausência de erros de parsing/SQL.
- [ ] 5.4 Atualizar release notes / changelog interno com nova página, API CRUD e persistência TimescaleDB.
- [ ] 5.5 Coletar feedback dos usuários-chave (Ops, Product) e abrir follow-ups (ex.: alertas automáticos, replicação analytics).
