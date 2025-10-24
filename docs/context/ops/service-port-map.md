---
title: Local Service Port Map
sidebar_position: 30
tags: [ops, ports, infrastructure, reference]
domain: ops
type: reference
summary: Tabela rápida com as portas expostas localmente após a remoção do Traefik
status: active
last_review: "2025-10-18"
---

Após a remoção do Traefik, cada serviço expõe sua própria porta diretamente no host. Use a tabela abaixo como referência ao subir os stacks com `start-all-services.sh` ou `start-all-stacks.sh`.

## Serviços de Aplicação

| Serviço | Container | URL | Descrição |
|---------|-----------|-----|-----------|
| Dashboard | - (npm dev server) | http://localhost:3103 | Interface principal do TradingSystem |
| Documentation API | `docs-api` | http://localhost:3400 | API de documentação (Express + FlexSearch) |
| Documentação (Docusaurus) | `docs-docusaurus` | http://localhost:3004 | Hub de documentação |
| API Viewer | `docs-api-viewer` | http://localhost:3101 | Visualização de OpenAPI/AsyncAPI |
| Library API | - (npm dev server) | http://localhost:3100 | Workspace/ideias |
| TP Capital | - (npm dev server) | http://localhost:3200 | Ingestão de sinais Telegram |
| B3 Market Data | - (npm dev server) | http://localhost:3302 | Dados de mercado B3 |
| Service Launcher | - (npm dev server) | http://localhost:3500 | Orquestração de serviços |
| Firecrawl Proxy | - (npm dev server) | http://localhost:3600 | Proxy Express para Firecrawl |
| Firecrawl API | `firecrawl-api` | http://localhost:3002 | Upstream Firecrawl auto-hospedado |
| LangGraph | `infra-langgraph` | http://localhost:8111 | Orquestração de agentes LangGraph |
| LangGraph Dev | `infra-langgraph-dev` | http://localhost:8112 | Ambiente de desenvolvimento LangGraph |

## Dados e Monitoramento

| Serviço | Container | URL/Porta | Descrição |
|---------|-----------|-----------|-----------|
| QuestDB | `data-questdb` | http://localhost:9002 | Telemetria de workflows (QuestDB 8.2.1) |
| TimescaleDB | `data-timescaledb` | localhost:5433 | Banco TimescaleDB (host → container 5432) |
| TimescaleDB Exporter | `data-timescaledb-exporter` | http://localhost:9187 | Métricas Prometheus |
| TimescaleDB pgAdmin | `data-timescaledb-pgadmin` | http://localhost:5050 | Administração PostgreSQL |
| TimescaleDB pgWeb | `data-timescaledb-pgweb` | http://localhost:8081 | Cliente web leve |
| Prometheus | `mon-prometheus` | http://localhost:9090 | Console de métricas |
| Alertmanager | `mon-alertmanager` | http://localhost:9093 | Pipeline de alertas |
| Grafana | `mon-grafana` | http://localhost:3000 | Dashboards pré-provisionados |
| Qdrant | `data-qdrant` | http://localhost:6333 | Vetor DB para embeddings |
| Infra PostgreSQL | `data-postgress-langgraph` | postgres://localhost:5432 | Checkpoints LangGraph |
| Infra Redis Dev | `infra-redis-dev` | redis://localhost:6380 | Cache para LangGraph dev |

## Convenção de Nomenclatura

As convenções de prefixo (`data-*`, `infra-*`, `mon-*`, `docs-*`, `firecrawl-*`, `individual-*`) estão documentadas em [Container Naming Convention](tools/container-naming.md). Consulte o guia antes de adicionar novos serviços ou atualizar compose files.

> Necessita publicar um serviço externamente? Utilize um proxy reverso dedicado (nginx, Caddy, etc.) ou configure um load balancer na borda. O repositório não inclui mais Traefik por padrão.

## Referências
-
- `docker-compose.simple.yml`
- `start-all-stacks.sh`
- `start-all-services.sh`
