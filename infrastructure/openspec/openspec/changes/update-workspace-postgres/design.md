# Workspace → PostgreSQL Migration Notes

## Current State Inventory (2025-10-18)

### Service Layout
- **Entry point:** `frontend/apps/workspace/src/server.js`
- **Repository factory:** `frontend/apps/workspace/src/repositories/index.js`
  - Estratégias disponíveis: `postgres` (default), `lowdb`, `questdb` (legacy somente para rollback).
  - Implementação PostgreSQL usa Prisma + métricas Prometheus; QuestDB permanece em módulo separado.
- **Environment config:** `frontend/apps/workspace/src/config.js`
  - Carrega `.env` raiz e normaliza `WORKSPACE_DB_STRATEGY` (fallback para `postgres`).
  - Variáveis legadas `LIBRARY_DB_STRATEGY`/`IDEA_BANK_DB_STRATEGY` ainda suportadas para compatibilidade.

### Data Sources & Tooling
- **PostgreSQL/TimescaleDB** em produção (`workspace` @ 5433) com migrations Prisma aplicadas.
- **LowDB** apenas para testes automatizados (`tests/ideas.test.js`).
- **QuestDB**: scripts de backup/migração ainda presentes como legado e precisam ser sinalizados/arquivados.

### Documentation & Config
- `.env.example` e README atualizados para destacar PostgreSQL como padrão (QuestDB marcado como legado).
- Métricas `tradingsystem_postgres_*` expostas em `/metrics`; healthcheck já informa detalhes de conexão PostgreSQL.
- Scripts de backup e guias ainda citam ferramentas QuestDB (precisam de revisão completa).

### Consumers
- Dashboard (`frontend/apps/dashboard/src/services/libraryService.ts`) consome `/api/items`.
- Agno Agents (`infrastructure/agno-agents/src/infrastructure/adapters/workspace_client.py`) configurado para `http://localhost:3100`.
- Scripts `scripts/services/start-all.sh` e `scripts/startup/start-trading-system-dev.sh` iniciam serviço via `npm run dev`.

## Gaps Identificados (pós-refactor)
1. Scripts de backup/restore/documentação operacional ainda descrevem fluxo QuestDB (precisa de atualização para pg_dump + processos Timescale).
2. Consumidores (Dashboard, Agno Agents) precisam de smoke test apontando para o novo backend PostgreSQL.
3. Necessário definir plano de rollback documentado e checklist pós-deploy (migração LowDB → PostgreSQL, backups finais QuestDB).

## Próximas Ações (Relacionadas aos passos do plano)
- **Plano Passo 2:** refatorar config, limpar scripts QuestDB, ajustar métricas para `tradingsystem_postgres_*`, atualizar migrations/init flow.
- **Plano Passo 3:** revisar dashboard/agents e documentação (README, docs/context/shared/integrations, env guides).
- **Plano Passo 4:** construir smoke test Postgres + rodar `openspec validate`.

## Progress Log (2025-10-18)
- Configuração (`src/config.js`) agora define `postgres` como estratégia padrão e aceita envs `WORKSPACE_DB_STRATEGY` / `WORKSPACE_DATABASE_URL`.
- Repositório Prisma atualizado com instrumentação Prometheus (`tradingsystem_postgres_*`) e sanitização de tags.
- Healthcheck `/health` e logs de start expõem destino PostgreSQL; métricas HTTP mantidas.
- Testes automatizados setam explicitamente `WORKSPACE_DB_STRATEGY=lowdb`; suíte `npm test` validada.
- Scripts de migração LowDB→PostgreSQL atualizados para nomenclatura “Workspace”; scripts QuestDB marcados como legados (próxima etapa remove/substitui).
- Banco PostgreSQL `workspace` validado no TimescaleDB (porta 5433); migrations Prisma aplicadas (`0001_init`) e tabela `ideas` criada em `public`.
- Rotas `/api/items` agora apontam para a mesma lógica de `/api/items`, preservando compatibilidade com Dashboard e automações existentes.
- README, `.env.example` (raiz e serviço) e hub de integrações atualizados para refletir PostgreSQL + variáveis `WORKSPACE_*`.
