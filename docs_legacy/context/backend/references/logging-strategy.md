---
title: Logging Strategy
sidebar_position: 10
tags: [logging, backend, reference]
domain: backend
type: reference
summary: Logging conventions for backend services
status: active
last_review: "2025-10-17"
---

# Logging Strategy

## Node.js services

- Library: pino (JSON logs, low overhead).
- Levels:
  - debug: HTTP request info (method, url).
  - info: domain events (Idea created, Documentation file uploaded).
  - error: errors with stack traces (`logger.error({ err })`).
- Controlled via `LOG_LEVEL` env var.
- On SIGINT, flush LowDB and log shutdown completion.

## .NET services

- Use Serilog (planned) with JSON sinks (file + console).
- Include fields like Service, CorrelationId, OrderId, Strategy.

## Python / FastAPI

- Adopt structlog or loguru with JSON format.
- Expose latency metrics via middleware.

## Observability pipeline

1. Write logs to rolling files (one per service/day).
2. Collect via fluent-bit or similar to central store (Elastic, Loki).
3. Inject correlation/trace IDs from the API Gateway when event bus arrives.

## Checklist

- [ ] Standardise JSON field names (camelCase).
- [ ] Include requestId for cross-service tracing.
- [ ] Document sinks and retention in operations docs.