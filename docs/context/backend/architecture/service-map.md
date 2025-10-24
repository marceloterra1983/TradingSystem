---
title: Backend Service Map
sidebar_position: 20
tags: [backend, architecture, services, map, reference]
domain: backend
type: reference
summary: Complete map of backend services with dependencies, ports, and communication patterns
status: active
last_review: "2025-10-17"
---

# Backend Service Map

| Service | Default Port | Stack | Status | Notes |
|---------|--------------|-------|--------|-------|
| Data Capture | 3100 | .NET 8 + ProfitDLL | MVP | Requires ProfitChart installed locally. |
| Order Manager | 3205 | .NET 8 | MVP | Risk engine (daily limits, kill switch). |
| API Gateway | 8000 | FastAPI | MVP | Routes REST calls to core services (`/docs` available). |
| Idea Bank API | 3100 | Node 20 + Express + LowDB | Production | CRUD for ideas; structured logging; Jest/Supertest coverage. |
| TP-Capital API | 3200 | Node 20 + Express + QuestDB | Production | Telegram signal ingestion and query API. |
| B3 API | 3302 | Node 20 + Express + QuestDB | Production | Serves QuestDB-backed B3 snapshots, indicators, gamma levels, DXY. Includes retry/backoff, input validation, detailed health checks. |
| Documentation API | 3400 | Node 20 + Express + LowDB + Multer | Production | Systems registry, documentation ideas, file uploads. |
| Agno Agents | 8200 | Python 3.12 + Agno + FastAPI | Production | Multi-agent trading system com 3 agentes especializados (MarketAnalysis, RiskManagement, SignalOrchestrator). Integra Workspace (3100), TP Capital (3200) e B3 (3302) via HTTP/WS. WebSocket consumer para dados em tempo real do B3. Resiliência: retry exponencial e circuit breaker. Observabilidade: Prometheus exposto em `GET /metrics` (mesma porta), logs estruturados, OpenTelemetry opcional. Health check detalhado em `GET /health?detailed=true`. API docs em http://localhost:8200/docs. Arquitetura Clean Architecture (domain/application/tools/interfaces). |
| Laucher | 3500 | Node 20 + Express | Production | Service orchestration and health monitoring. |
| Dashboard | 3101 | React 18 + Vite | Production | Consolidated UI for ideas, B3 market data, TP Capital signals. |
| Documentation Hub | 3004 | Docusaurus | Production | Context-driven documentation architecture. |
| Prometheus | 9090 | Binary | Planned | Monitoring stack (configuration pending). |
| Grafana | 3000 | Binary | Planned | Observability dashboards (latency, health). |

> Update these entries whenever ports or deployment scripts change, and mirror them in `.env` files and runbooks.
