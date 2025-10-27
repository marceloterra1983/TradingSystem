---
title: Project Context
sidebar_position: 1
tags: [documentation]
domain: ops
type: guide
summary: Local trading platform that ingests market data via Nelogica ProfitDLL, executa ordens automatizadas com controles de risco estritos e disponibiliza d...
status: active
last_review: "2025-10-23"
---

# Project Context

## Purpose
Local trading platform that ingests market data via Nelogica ProfitDLL, executa ordens automatizadas com controles de risco estritos e disponibiliza documentação/dashboards de apoio. Toda a operação acontece on-premise, com serviços auxiliares (docs, integrações, IA) rodando via Docker Compose.

## Tech Stack
- Core trading services: C# (.NET 8, x64) with direct ProfitDLL bindings.
- ML tooling (opcional): Python 3.11+ para scripts offline, experimentos e integrações futuras.
- Auxiliary APIs: Node.js/Express (Idea Bank, TP Capital ingestion, Documentation hub, Service launcher).
- Frontend: React + Vite dashboard (Zustand, Tailwind).
- Data persistence: QuestDB, Parquet on local NVMe/SSD, JSONL logs.
- Tooling/Docs: Docusaurus v2, Docker Compose stacks for non-core services.

## Project Conventions

### Code Style
- C#: PascalCase, 4-space indent, follow `.editorconfig`.
- Python: snake_case, Black 88-char format.
- TypeScript/React: camelCase, 2-space indent, ESLint preset in repo.
- Use UTC timestamps and structured logging (JSONL).

### Architecture Patterns
- Clean Architecture layers (Domain, Application, Infrastructure, Presentation).
- Domain-Driven Design aggregates (Orders, Trades, Positions) with explicit repositories and domain events.
- Microservices/event-driven: native Windows executables for trading pipeline, Node services for orchestration, WebSocket for market data.

### Testing Strategy
- Frontend: `npm run test` (Vite/Jest) + targeted component tests.
- Backend APIs: service-level tests via `npm run test`.
- Docs: `npm run test` to ensure Docusaurus links/build.
- Planned E2E/load suites (`npm run test:e2e`, `npm run test:load`) once trading simulators are available.
- Replay testing required before live ProfitDLL changes.

### Git Workflow
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:` etc.).
- Feature branches (e.g., `feat/<area>-<summary>`), PRs reviewed before merge.
- Do not revert user-created changes; maintain audit trail for trading logic.

## Domain Context
- ProfitDLL delivers real-time market data and order execution callbacks; delegates must remain rooted to avoid GC.
- Trading pipeline: data capture → WebSocket publish → gateway validation → order manager execution → dashboard updates.
- Risk management: global kill switch, daily loss limits, max position sizing, trading hours enforcement, full execution auditing.
- Documentation hub under `docs/context/` is authoritative for PRDs, ADRs, runbooks, and integration guides.

## Important Constraints
- Core trading services must run natively on Windows x64 for latency, hardware access, and ProfitDLL compatibility (<500 ms requirement).
- No cloud dependencies; all infrastructure is on-premise and containerized via Docker Compose for auxiliary workloads.
- Credentials and secrets never committed; use environment templates and encryption flags.
- Always validate connection state before issuing orders; never bypass risk checks or kill switch.

## External Dependencies
- Nelogica ProfitDLL (Win64) for market data/order routing.
- QuestDB (Ports 9000/9009) for time-series storage.
- Telegram webhook (TP Capital signals) via Express API.
- Frontend/docs services on local ports (3100-3500, 3004).
- Docker Compose orchestration for auxiliary services, plus Prometheus/Grafana stacks.
