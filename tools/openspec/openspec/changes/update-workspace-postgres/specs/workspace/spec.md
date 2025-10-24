# workspace Specification (Delta)

## ADDED Requirements
### Requirement: Persist Workspace Data in PostgreSQL
O serviço Workspace MUST utilizar PostgreSQL (TimescaleDB) como armazenamento padrão via Prisma, com fallback LowDB apenas em testes automatizados.

#### Scenario: API connects to PostgreSQL
- GIVEN o serviço é iniciado em ambiente de desenvolvimento ou produção
- WHEN `WORKSPACE_DATABASE_URL` aponta para `postgresql://workspace:workspace@localhost:5433/workspace?schema=public`
- THEN o healthcheck `/health` responde `200` indicando estratégia `postgres`
- AND logs de inicialização confirmam conexão estabelecida sem dependências de QuestDB

### Requirement: Enforce Prisma Schema and Migrations
O serviço MUST aplicar migrations Prisma para garantir que a tabela `ideas` exista no schema configurado antes de atender requisições.

#### Scenario: Migrations executed on startup
- GIVEN uma versão nova do schema é entregue
- WHEN `npm run prisma:migrate deploy` é executado (CI/CD ou startup)
- THEN a tabela `ideas` contém colunas `title`, `description`, `category`, `priority`, `status`, `tags`, `created_at`, `updated_at`
- AND a aplicação responde CRUD de ideias com sucesso usando o schema atualizado

### Requirement: Provide PostgreSQL Observability and Recovery
O serviço MUST expor métricas Prometheus específicas de PostgreSQL (latência, sucesso/erro) e disponibilizar scripts de backup/restore alinhados ao cluster Timescale.

#### Scenario: Metrics endpoint queried
- GIVEN o serviço está em execução
- WHEN `GET /metrics` é chamado
- THEN o payload inclui `tradingsystem_postgres_queries_total` e `tradingsystem_postgres_query_duration_seconds`
- AND inexistem métricas legadas `questdb_*`

#### Scenario: Backup documentation followed
- GIVEN um operador acessa os scripts/documentação do Workspace
- WHEN precisa realizar backup ou restore
- THEN encontra instruções usando `pg_dump`/`psql` (não scripts QuestDB)
- AND consegue restaurar dados em ambiente de teste sem perdas

### Requirement: Document Workspace Operations Post-Migration
A documentação MUST explicar configuração de ambiente (`WORKSPACE_DATABASE_URL`, pooling, SSL), passos de migração LowDB→PostgreSQL e plano de rollback.

#### Scenario: Contributor reads README
- GIVEN um novo contribuidor abre `frontend/apps/workspace/README.md`
- WHEN procura por “PostgreSQL” ou “Timescale”
- THEN encontra instruções de setup, migração e troubleshooting atualizadas
- AND nenhuma seção incentiva uso de QuestDB em produção
