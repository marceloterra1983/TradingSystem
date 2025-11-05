# Feature: RAG Collection Latency Guard

Objective: Detect and alert when RAG ingestion or retrieval operations exceed the SLO (400 ms) to protect realtime assistants and dashboards.

## Scope
- **Service**: `tools/rag-services`
- **API surface**: `/api/v1/rag/collections/:name/ingest` and `/api/v1/rag/query`
- **Data plane**: Adds latency metrics persisted via Prometheus-style exporter and a lightweight SQLite (or Timescale) buffer for historical analysis.
- **Alerting**: Emits WebSocket + webhook notifications when 95th percentile latency exceeds thresholds for any collection.

## Milestones
1. **Instrumentation**
   - Add middleware measuring end-to-end latency per route.
   - Emit metrics to `/metrics` endpoint (Prometheus).
   - Persist key samples (collection, path, duration, payload size).
2. **Alert Engine**
   - Schedule evaluation job (per minute) that inspects last 100 calls per collection.
   - Trigger `LatencyBreachEvent` when more than 5% exceed 400 ms.
   - Push to existing notification bus (Redis pub/sub) + RAG admin dashboard.
3. **API & Docs**
   - New endpoint `GET /api/v1/rag/latency-alerts?collection=` returning breaches.
   - Update OpenAPI + README + Postman collection.
4. **Frontend hooks**
   - If necessary, add docs or pointers for Dashboard to subscribe to events.

## Work Breakdown
| Task | Owner | Notes |
| --- | --- | --- |
| Create branch `feat/rag-latency-guard` | Dev | `git checkout -b feat/rag-latency-guard` |
| Instrument express routes | Backend | Use middleware + histogram buckets |
| Implement evaluation job | Backend | Reuse `node-cron` or custom scheduler |
| Add persistence (Timescale or JSONL) | Backend | Start with JSONL under `data/latency-alerts` |
| Add REST endpoint + validation | Backend | Use zod + cached repository |
| Update OpenAPI + Postman | Docs | `/api/v1/rag/latency-alerts` |
| Extend tests | QA | Unit tests for middleware/job + integration for endpoint |
| Documentation updates | Docs | README, API docs, troubleshooting |

## Test Strategy
- Unit: middleware timer, percentile calculator, alert job.
- Integration: simulate workload via Supertest, confirm alerts stored + endpoint responses.
- Performance: stress test ingestion path >200 req/min verifying alert throttle.
- Monitoring: ensure `/metrics` exposes new histograms.

## Risks / Mitigations
- **High cardinality metrics**: limit labels to `collection` + `route`.
- **File storage growth**: rotate JSONL files daily, optionally ship to Timescale.
- **False positives**: require consecutive breaches before alerts, make threshold configurable via env `RAG_LATENCY_GUARD_MS`.

## Definition of Done
- Tests (unit + integration) updated with latency cases.
- `npm run lint`, `npm run type-check`, `npm run test:unit`, `npm run build` all green.
- OpenAPI + docs + CHANGELOG updated.
- Feature flag `rag.latencyGuard` default `false`.
