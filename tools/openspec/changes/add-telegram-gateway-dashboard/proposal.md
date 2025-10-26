## Change Proposal — add-telegram-gateway-dashboard

### Why
- Telegram Gateway é um serviço crítico isolado, responsável por autenticação MTProto, ingestão e reentrega de sinais; hoje ele roda “às cegas” sem visibilidade operacional centralizada.
- O dashboard atual não possui uma visão dedicada para estado, métricas ou fila de falhas do gateway, o que obriga o time a acessar logs e arquivos manualmente em `apps/telegram-gateway`.
- Operações precisam de indicadores em tempo real (health, latência, fila, métricas Prometheus) e ações rápidas (start, reconnect, limpeza de fila) para manter os pipelines Telegram → TradingSystem saudáveis.
- Consolidar informação e comandos em uma página oficial reduz MTTR, evita perda de sinais e cria base para alertas e governança (CI, runbooks, docs).

### O que vai mudar
- Adicionar página “Telegram Gateway” no dashboard (seção Apps) com layout customizável, cards operacionais, gráficos de métricas, tabela CRUD de mensagens e visões de sessão/fila.
- Provisionar pipeline de persistência em TimescaleDB (base PostgreSQL) para armazenar mensagens coletadas, com schema versionado e APIs REST para CRUD (listar, filtrar, detalhar, excluir/reprocessar).
- Expor no Service Launcher (`apps/status`) um conjunto de endpoints agregados (`/api/telegram-gateway/*`) que consultam `/health`, `/metrics`, sessão, fila e estatísticas da base TimescaleDB, entregando JSON pronto para o frontend.
- Atualizar configuração compartilhada (`config/.env.defaults`, docs) com variáveis do gateway, credenciais TimescaleDB e URLs consumidas pelo dashboard.
- Incluir testes (Vitest + supertest), migrações, seed de dados de teste e documentação (docs/apps, runbooks) garantindo cobertura de UI, API, banco e fluxos de operação.

- **Frontend**: novo componente `TelegramGatewayPage`, hooks React Query dedicados, integração com `CollapsibleCard`, tabelas e gráficos (radar de métricas, histórico de fila, CRUD full-text das mensagens). Ajustes no `NAVIGATION_DATA` e reutilização de componentes utilitários.
- **Backend/Apps**: Service Launcher recebe descritor do serviço para health check, novos handlers para métricas/fila/sessão/banco, parsing Prometheus, permissão para leitura/escrita do diretório `apps/telegram-gateway/data` e `.session`. Gateway (ou worker dedicado) passa a persistir mensagens em TimescaleDB usando migrations versionadas.
- **Banco de Dados**: criação de schema `telegram_gateway` no TimescaleDB, hypertable para mensagens com particionamento temporal, índices em `channel_id`, `message_id`, `received_at` e políticas de retenção/configuração de compressão.
- **Configuração/DevOps**: `.env.defaults` e `.env.example` ganham `TELEGRAM_GATEWAY_PORT`, `VITE_TELEGRAM_GATEWAY_API_URL`, `SERVICE_LAUNCHER_TELEGRAM_GATEWAY_PORT/URL`, além de credenciais/Postgres DSN (`TELEGRAM_GATEWAY_DB_URL`). Systemd/service docs ajustados para carregar a conexão.
- **Documentação**: Página em `docs/` cobrindo monitoramento, troubleshooting e consultas SQL; atualização de PRDs quando aplicável; inclusão no índice Apps do dashboard.
- **Riscos**: parsing de métricas Prometheus exige sanitização para evitar quebras; accesso a arquivos `.session` precisa ser read-only; garantir que o launcher não bloqueie o serviço ao ler filas grandes; assegurar que ingestão no TimescaleDB não degrade ingestão em tempo real (considerar buffer, batch inserts e monitorar retenção).

### Timeline estimado (≈ 2,5–3 semanas)
1. **Planejamento & scaffolding (0,5 dia)**: alinhar variáveis, mockar payloads, definir layout wireframe, desenhar schema TimescaleDB.
2. **Persistência & API Gateway (4–5 dias)**: migrations TimescaleDB, camadas de ingestão/ORM, endpoints REST CRUD, testes automáticos e seeds.
3. **Launcher & Telemetria (2–3 dias)**: novos endpoints agregados, testes, ajustes de serviço systemd, validação manual com serviço rodando.
4. **Frontend (4–5 dias)**: hooks, UI responsive, charts, CRUD table (filtros, paginação, ações), estados de loading/erro, testes e preview local.
5. **Docs & validações (1–1,5 dia)**: atualizar documentação, rodar `lint`, `type-check`, `test`, `validate-docs`, preparar checklist e dados de amostra.

### Critérios de sucesso
- Página exibe health, métricas agregadas, fila e sessão com atualização automática (≤10s polling) e tratativa de falhas.
- Botões de ação (refresh, abrir métricas no Prometheus, acionar auto-start) funcionam via API e registram logs.
- `npm run lint`, `npm run type-check`, `npm run test` e `npm run validate-docs` verdes após mudança.
- Service Launcher mantém status `ok` para o gateway e prover métricas sem degradar performance (<500 ms por sondagem).
