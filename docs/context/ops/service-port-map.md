# Service Port Map

Este arquivo é a fonte de dados para geração automática das tabelas de portas em `docs/content/tools/ports-services/overview.mdx`.

## Serviços de Aplicação

| Serviço | Container | URL/Porta | Descrição |
|---------|-----------|-----------|-----------|
| Dashboard | - (npm dev server) | http://localhost:3103 | Interface principal do TradingSystem |
| Documentation API | - (npm dev server) | http://localhost:3401 | API de documentação (Express + FlexSearch) |
| Documentation Hub (docs) | - (npm dev server) | http://localhost:3400 | Hub de documentação (Docusaurus v3 — primário) |
| Documentação (Docusaurus v2 - Legacy) | docs-docusaurus | (retired) | Hub de documentação legado (desativação em andamento) |
| API Viewer | docs-api-viewer | http://localhost:3101 | Visualização de OpenAPI/AsyncAPI |
| Library API | - (npm dev server) | http://localhost:3100 | Workspace/ideias |
| TP Capital | - (npm dev server) | http://localhost:3200 | Ingestão de sinais Telegram |
| Firecrawl Proxy | - (npm dev server) | http://localhost:3600 | Proxy Express para Firecrawl |
| Firecrawl API | firecrawl-api | http://localhost:3002 | Upstream Firecrawl auto-hospedado |
| LangGraph | infra-langgraph | http://localhost:8111 | Orquestração de agentes LangGraph |
| LangGraph Dev | infra-langgraph-dev | http://localhost:8112 | Ambiente de desenvolvimento LangGraph |
| Kestra Orchestrator | tools-kestra | http://localhost:8180 (management: 8685) | Orquestração de pipelines (start: `tools/kestra/scripts/run.sh`) |

## Dados e Monitoramento

| Serviço | Container | URL/Porta | Descrição |
|---------|-----------|-----------|-----------|
| QuestDB | data-questdb | http://localhost:9002 | Telemetria de workflows (QuestDB 8.2.1) |
| TimescaleDB | data-timescaledb | localhost:5433 | Banco TimescaleDB (host → container 5432) |
| TimescaleDB Exporter | data-timescaledb-exporter | http://localhost:9187 | Métricas Prometheus |
| TimescaleDB pgAdmin | data-timescaledb-pgadmin | http://localhost:5050 | Administração PostgreSQL |
| TimescaleDB pgWeb | data-timescaledb-pgweb | http://localhost:8081 | Cliente web leve |
| Prometheus | mon-prometheus | http://localhost:9090 | Console de métricas |
| Alertmanager | mon-alertmanager | http://localhost:9093 | Pipeline de alertas |
| Grafana | mon-grafana | http://localhost:3000 | Dashboards pré-provisionados |
| Qdrant | data-qdrant | http://localhost:6333 | Vetor DB para embeddings |
| Infra PostgreSQL | data-postgress-langgraph | postgres://localhost:5432 | Checkpoints LangGraph |
| Infra Redis Dev | infra-redis-dev | redis://localhost:6380 | Cache para LangGraph dev |
