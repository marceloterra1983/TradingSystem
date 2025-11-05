# Feature: Order Latency Guard

Pilot enhancement following the `code-enhancement` workflow. Objective: surface automated alerts when order placement latency exceeds 400 ms, with integration hooks for risk controls.

## 1. Requirements & Acceptance Criteria
- Detect latency > 400 ms between `OrderRequested` and confirmation events in Workspace API.
- Persist breach events to TimescaleDB (`latency_alerts` table) and expose via `/api/workspace/latency-alerts`.
- Notify frontend dashboard via WebSocket channel `latency-alerts`.
- Toggle-able via feature flag `workspace.latencyGuard`.

## 2. Task Breakdown
| Task | Owner | Notes |
| --- | --- | --- |
| Create feature branch `feat/order-latency-guard` | Dev | `git checkout -b feat/order-latency-guard` |
| Define DB schema + migration | Backend | New table with indexes on `order_id`, `breach_ts` |
| Implement latency measurement middleware | Backend | Hook into existing order pipeline |
| Expose REST endpoint + DTOs | Backend | `/api/workspace/latency-alerts?since=` |
| Broadcast WebSocket event | Backend | Reuse existing gateway utilities |
| Frontend panel component | Frontend | Table + filters + severity badges |
| Notification banner + kill switch | Frontend | Connect to feature flag service |
| Update docs + diagrams | Docs | Architecture & runbooks |

## 3. Architecture Notes
- **Service boundary:** Workspace API handles detection + persistence. Dashboard subscribes via WebSocket.
- **Data flow:** DB migration -> repository -> use case -> controller -> WebSocket broadcaster.
- **Feature flag:** Extend shared config service; default `false`.
- **Dependencies:** TimescaleDB migration, existing `eventBus`, `wsNotifier`.

## 4. Implementation Strategy
1. Generate migration `backend/api/workspace/prisma/migrations/20250130_latency_guard`.
2. Add `LatencyAlert` entity + repository.
3. Extend `OrderOrchestrator` to measure timestamps, emit domain event on breach.
4. Add REST controller + DTO validation (zod).
5. Wire WebSocket broadcaster with throttling (max 1 alert/sec per symbol).
6. Frontend: add Zustand slice, WebSocket listener, `LatencyAlertsPanel` component.
7. Feature flag wiring + UI switch in settings page.

## 5. Testing Plan
- Unit tests for latency calculator (edge cases: retries, partial fills).
- Integration tests covering repository + REST endpoint (`supertest`).
- WebSocket integration test (Vitest + ws mock server).
- Frontend component tests (React Testing Library) for render + filters.
- E2E test validating alert pipeline (Playwright stub backend).

## 6. Quality Gates
- Run `/lint backend`, `/lint frontend --fix`.
- `/write-tests backend/api/workspace/src/core/latency` and frontend components.
- `/code-review backend/api/workspace frontend/dashboard`.
- `/optimize-api-performance --rest` focusing on new endpoint.

## 7. Documentation & Release
- Update `docs/content/reference/adrs/` with new ADR for latency guard.
- Add troubleshooting entry for false positives.
- Append `CHANGELOG.md` under `Added`.
- Release via `/prepare-release patch` once merged.
