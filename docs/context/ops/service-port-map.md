---
title: Mapa de Portas dos Serviços
description: Fonte única para os endpoints locais do TradingSystem.
owner: OpsGuild
lastReviewed: 2025-11-05
tags:
  - networking
  - observabilidade
---

> Referência utilizada por `npm run docs:auto` para gerar `tools/ports-services/overview.mdx`.  
> Atualize esta tabela sempre que um serviço ganhar/não usar porta ou URL diferente.

## Serviços de Aplicação

| Serviço | Container | URL/Porta | Descrição |
|---------|-----------|-----------|-----------|
| Dashboard | (npm dev server) | http://localhost:3103 | Interface principal do TradingSystem. |
| Documentation API | (npm dev server) | http://localhost:3400 | API de documentação (Express + FlexSearch). |
| Documentation Hub (docs) | (npm dev server) | http://localhost:3205 | Docusaurus v3 – hub oficial de documentação. |
| Documentação (Docusaurus v2 - Legacy) | docs-docusaurus | http://localhost:3004 | Hub legado (em processo de desativação). |
| API Viewer | docs-api-viewer | http://localhost:3101 | Visualização de OpenAPI/AsyncAPI. |
| Workspace API | (npm dev server) | http://localhost:3100 | CRUD de itens do Workspace. |
| TP Capital API | (npm dev server) | http://localhost:3200 | Ingestão de sinais via Telegram. |
| Firecrawl Proxy | (npm dev server) | http://localhost:3600 | Proxy Express para Firecrawl. |
| Firecrawl API | firecrawl-api | http://localhost:3002 | Instância auto-hospedada do Firecrawl. |
| LangGraph | infra-langgraph | http://localhost:8111 | Orquestração de agentes LangGraph. |
| LangGraph Dev | infra-langgraph-dev | http://localhost:8112 | Ambiente de desenvolvimento do LangGraph. |
| Service Launcher | service-launcher | http://localhost:3500 | API para subir/parar serviços locais. |

## Dados e Monitoramento

| Serviço | Container | URL/Porta | Descrição |
|---------|-----------|-----------|-----------|
| TimescaleDB | data-timescaledb | localhost:5433 | Banco principal (host 5433 → container 5432). |
| TimescaleDB Exporter | data-timescaledb-exporter | http://localhost:9187 | Exporter Prometheus. |
| TimescaleDB pgAdmin | data-timescaledb-pgadmin | http://localhost:5050 | Administração PostgreSQL (pgAdmin). |
| TimescaleDB pgWeb | data-timescaledb-pgweb | http://localhost:8081 | Cliente web leve para TimescaleDB. |
| QuestDB HTTP/UI | data-questdb | http://localhost:9002 | Console HTTP do QuestDB (telemetria). |
| QuestDB ILP | data-questdb | localhost:9009 | Ingestion Line Protocol. |
| Qdrant | data-qdrant | http://localhost:6333 | Banco vetorial para embeddings. |
| Infra PostgreSQL (LangGraph) | data-postgress-langgraph | postgres://localhost:5432 | Checkpoints de fluxos LangGraph. |
| Infra Redis Dev | infra-redis-dev | redis://localhost:6380 | Cache usado por workloads LangGraph dev. |
| Prometheus | mon-prometheus | http://localhost:9090 | Coleta e exposição de métricas. |
| Alertmanager | mon-alertmanager | http://localhost:9093 | Roteamento de alertas. |
| Grafana | mon-grafana | http://localhost:3000 | Dashboards pré-provisionados. |

> Admin UIs permanecem bindadas a `localhost` para evitar exposição involuntária.
