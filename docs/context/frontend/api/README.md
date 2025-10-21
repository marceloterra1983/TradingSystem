---
title: Frontend API Integrations
sidebar_position: 1
tags: [frontend, api, integrations, index]
domain: frontend
type: index
summary: REST contracts consumed by the dashboard (QuestDB + Idea Bank) with roadmap for realtime streams
status: active
last_review: 2025-10-17
---

# Frontend API Integrations

## REST endpoints

| Service | Endpoint(s) | Purpose | Method |
|---------|-------------|---------|--------|
| Idea Bank API (port 3200) | `GET /api/items` | List ideas (cards, filters). | GET |
|  | `POST /api/items` | Create idea. | POST |
|  | `PUT /api/items/:id` | Update idea (status, edit). | PUT |
|  | `DELETE /api/items/:id` | Delete idea. | DELETE |
|  | `GET /health` | Health check for Connections page. | GET |
| TP-Capital API (port 4005) | `GET /signals?limit=&channel=&type=&search=` | Fetch QuestDB-backed signals for `TP CAPITAL | OPCOES`. | GET |
|  | `DELETE /signals` | Soft delete a signal by `ingestedAt`. | DELETE |
|  | `GET /logs?limit=&level=` | Retrieve ingestion logs for operators. | GET |
|  | `GET /bots` | Summarise active ingestion bot (mode/configured/running). | GET |
|  | `GET /telegram/bots` | List Telegram bot records. | GET |
|  | `POST /telegram/bots` | Create bot record. | POST |
|  | `PUT /telegram/bots/:id` | Update bot record. | PUT |
|  | `DELETE /telegram/bots/:id` | Soft delete bot record. | DELETE |
|  | `GET /telegram/channels` | List Telegram channels. | GET |
|  | `POST /telegram/channels` | Create Telegram channel record. | POST |
|  | `PUT /telegram/channels/:id` | Update Telegram channel record. | PUT |
|  | `DELETE /telegram/channels/:id` | Soft delete channel record. | DELETE |
| Documentation API (planned) | `/api/systems`, `/api/items`, `/api/files` | Dynamic documentation and uploads (TBD). | GET/POST |

## Configuration

- Idea Bank base URL: `http://localhost:3200/api` (hard-coded in `services/ideaBankService.ts`).
- TP-Capital base URL: `import.meta.env.VITE_TP_CAPITAL_API_URL || 'http://localhost:4005'` (used in Connections/Signals pages).
- React Query handles caching, error states, and polling (10s for Telegram CRUD, 15s/30s for signals/logs).
- TODO: centralise REST clients (axios + interceptors) once authentication lands.

- `services/ideaBankService.ts` still uses the Fetch API; consider migrating to axios for shared error handling when auth is introduced.
- Mutations trigger `queryClient.invalidateQueries` (Connections/Signals pages use React Query hooks).

## WebSockets / SSE (future)

- `ConnectionsPage` still ships with a mocked `WebSocketProvider`. When the backend exposes a stream:
  1. Provide `wss://` endpoint (signals status, questdb lag, etc.).
  2. Replace the mock provider with a real subscription handler.
  3. Document payload formats and reconnection policy here.
  4. Update telemetry to surface latency/throughput in the dashboard.

## Security

- No authentication yet (local environment only).
- Once auth is added, document token flow and required headers.
- Update the Idea Bank API guide with security requirements.

## Testing

- Add Vitest coverage for `ideaBankService` and TP Capital fetchers (`fetchSignals`, `fetchLogs`).
- Add Playwright end-to-end flows covering:
  - Idea Bank CRUD + filters.
  - Telegram bot/channel CRUD (QuestDB-backed).
  - TP Capital signals filtering and logs viewer.
