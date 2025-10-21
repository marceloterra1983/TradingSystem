---
title: Backend Summary
sidebar_position: 10
tags: [backend, summary, shared]
domain: shared
type: reference
summary: Executive summary of backend services and data infrastructure
status: active
last_review: 2025-10-17
---

# Backend Summary

## Architecture Overview

TradingSystem backend follows **Clean Architecture + DDD + Microservices** with event-driven communication.

**Core Services**
1. **Data Capture** (.NET 8 + ProfitDLL) — Market data ingestion, tick processing.
3. **Order Manager** (.NET 8) — Order execution, risk management, position tracking.
4. **API Gateway** (FastAPI) — Unified REST API, request routing, authentication.
5. **Auxiliary APIs** (Node.js) — Idea Bank API, Documentation API.
6. **TP-Capital API** (Node.js + QuestDB) — Telegram ingestion, QuestDB access layer (`/signals`, `/telegram/*`).

## Key Requirements

- **Native Windows Execution**: Core services must run natively (ProfitDLL dependency).
- **Low Latency**: &lt;500 ms P95 from market tick to order execution.
- **High Availability**: 24/7 operation during market hours.
- **Data Integrity**: No data loss, audit trail for all orders.
- **Risk Management**: Kill switch, position limits, daily loss limits.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Core Services | .NET 8 (C#), Python 3.11, Node.js 18/20 |
| API Framework | FastAPI, Express.js |
| Communication | WebSocket (data), HTTP REST (commands) |
| Storage (Current) | LowDB (JSON), QuestDB (tp_capital_signals + telegram registries), Parquet (time-series) |
| Storage (Planned) | PostgreSQL (Idea Bank/Docs), Timescale or lakehouse for analytics exports |
| Integration | ProfitDLL (Nelogica broker) |

## Data Architecture

**Current state**
- **LowDB**: JSON files for ideas and documentation metadata.
- **QuestDB**: Time-series store for TP Capital Telegram signals plus bot/channel registries.
- **Parquet**: Market data time-series (ticks, book, quotes).
- **JSONL Logs**: Structured logs from all services.

**Planned evolution (Q1 2026)**
- **PostgreSQL**: Transactional data (ideas, users, configs) with Prisma migrations.
- **QuestDB automation**: Retention jobs (30-day window) and nightly exports to reporting tables.

**Retention policy**
- QuestDB: 30 days online + 90-day deleted archive.
- Parquet: 90-day hot storage, archive beyond.
- LowDB: Manual archival (daily snapshots).
- Logs: 30-day rotation.

## Service Communication

```
ProfitDLL -> Data Capture -> [WebSocket] -> Gateway
                                        |
                                    [ML Signal]
                                        |
                                    API Gateway
                                        |
                                    Order Manager -> ProfitDLL
```

- Data Capture → Gateway: WebSocket streaming.
- Gateway → Order Manager: HTTP POST `/api/v1/execute`.
- Dashboard → TP-Capital: HTTP REST `/signals`, `/telegram/*`.

## Observability

- **Logging**: Pino (Node.js), Python logging, Serilog (planned). Format: JSONL with correlation IDs.
- **Metrics**: Prometheus endpoints (tp-capital-signals already exposes `/metrics`; others planned).
- **Dashboards**: Grafana for latency, throughput, error rates.
- **Alerts**: ProfitDLL connection health, QuestDB availability (`/health`), ingestion latency.

## Upcoming Work

**Q4 2025**
- Harden TP-Capital (retention automation, alerting, backup).
- Complete Idea Bank API backlog.
- Deliver Documentation API parity.
- Integrate Prometheus/Grafana across services.

**Q1 2026**
- Execute LowDB → PostgreSQL migration.
- Introduce QuestDB export job feeding analytics warehouse.
- Evaluate event bus (RabbitMQ/Kafka) for decoupling.
- Unify structured logging with Serilog + central sink.

**Q2 2026**
- Add API authentication & authorization.
- Implement rate limiting & throttling.
- Extend support to multiple brokers.
- Enable historical data replay for backtesting.

## Related Documentation

- [Backend Architecture](../../backend/architecture/overview.md)
- [Backend ADRs](../../backend/architecture/decisions/README.md)
- [API Guides](../../backend/guides/README.md)
- [Data Documentation](../../backend/data/README.md)
- [System Architecture Diagram](../diagrams-overview.md#1-system-architecture)
- [Data Flow Diagram](../diagrams-overview.md#2-data-flow---trading-pipeline)
