---
title: "Feature: TP-Capital Table"
sidebar_position: 30
tags: [frontend, features, questdb, signals]
domain: frontend
type: reference
summary: Technical specification for the TP CAPITAL | OPCOES page that reads QuestDB signals and service logs via the TP-Capital API
status: active
last_review: 2025-10-17
---

# Feature: TP-Capital Table

## Overview

The **TP CAPITAL | OPCOES** page provides a live view of TP Capital Telegram signals stored in QuestDB and exposes ingestion logs for operators. It consumes the TP-Capital API and renders data inside the Banco de Dados hub.

- **Location**: `frontend/apps/dashboard/src/components/pages/TPCapitalOpcoesPage.tsx`
- **Route**: `/banco-dados/tp-capital-opcoes`
- **Backend**: `frontend/apps/tp-capital` (port `4005`)
- **QuestDB Tables**: `tp_capital_signals`, `tp_capital_signals_deleted`

## Component Structure

```
TPCapitalOpcoesPage
└─ CustomizablePageLayout (pageId="tp-capital-opcoes")
   ├─ SignalTableCard
   │  ├─ Filters (limit, channel, signal type, search)
   │  ├─ Actions (refresh, CSV export placeholder, delete)
   │  └─ Data table (QuestDB rows)
   └─ LogsCard
      ├─ Filters (limit, level)
      └─ Log table (API /logs)
```

## Data Flow

```mermaid
graph TD
    Filters -->|state| QueryParams
    QueryParams -->|buildQuery| FetchSignals
    FetchSignals -->|HTTP GET /signals| API
    API -->|QuestDB /exec| QuestDB
    API -->|JSON { data }| ReactQueryCache
    ReactQueryCache --> Table
    FetchLogs -->|HTTP GET /logs| API
    API --> LogsData
    LogsData --> LogsTable
```

## React Query Hooks

```typescript
const signalsQuery = useQuery({
  queryKey: ['tp-capital-signals', params],
  queryFn: () => fetchSignals(params),
  refetchInterval: 15_000,
});

const logsQuery = useQuery({
  queryKey: ['tp-capital-logs', { limit, level }],
  queryFn: () => fetchLogs({ limit, level }),
  refetchInterval: 30_000,
});
```

- `buildQuery(params)` constructs `/signals?limit=...&channel=...&type=...&search=...`.
- UI state managed via `useState`; selection persisted per session (no localStorage).
- Errors surface inline with fallback messaging.

## API Contracts

| Endpoint | Purpose | Notes |
|----------|---------|-------|
| `GET /signals` | Fetch recent QuestDB rows. Supports `limit`, `channel`, `type`, `search`, `from`, `to`. | Returns `{ data: SignalRow[] }`. |
| `DELETE /signals` | Soft delete by `ingestedAt`. | Called by admin tooling (UI stubbed for future). |
| `GET /logs` | Fetch in-memory ingestion logs with `limit` and `level` filters. | Returns `{ data: LogEntry[] }`. |

### SignalRow Type

```typescript
type SignalRow = {
  ts: string;
  channel: string;
  signal_type: string;
  asset: string;
  buy_min: number | null;
  buy_max: number | null;
  target_1: number | null;
  target_2: number | null;
  target_final: number | null;
  stop: number | null;
  raw_message?: string;
  source?: string;
  ingested_at: string;
};
```

### LogEntry Type

```typescript
type LogEntry = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: unknown;
};
```

## UI Behaviour

- **Filters**
  - `limit`: 100, 250, 500, 1000.
  - `channel`: Derived from data (option `all`).
  - `signal type`: Derived from data (option `all`).
  - `search`: Case-insensitive match on `asset` and `raw_message`.
- **Table Formatting**
  - Numeric values formatted `pt-BR` with two decimals.
  - Timestamp displayed in local time with date+time.
  - `raw_message` truncated in list view (tooltip/open detail planned).
- **Logs Card**
  - `limit` filter (50, 100, 200).
  - `level` filter (all, error, warn, info, debug).
  - Displays JSON `context` as prettified `<pre>` block.
- **Actions**
  - Manual refresh button triggers `signalsQuery.refetch()` or `logsQuery.refetch()`.
  - CSV/Excel export buttons present but disabled until backend endpoint is ready.

## Error Handling

- When queries fail, the component shows inline red messages and keeps previous data.
- Empty states differentiate between `isLoading`, `isError`, and `no records`.
- Logs card warns when zero entries are returned to highlight ingestion downtime.

## Dependencies

- `CustomizablePageLayout` for layout persistence.
- `CollapsibleCard` and `Select` components from shadcn/ui.
- React Query for data fetching and caching.
- `import.meta.env.VITE_TP_CAPITAL_API_URL` to locate API.

## Testing Backlog

- Unit tests for `buildQuery`, `buildLogsQuery`, `formatNumber`, and `formatTimestamp`.
- React Testing Library tests mocking fetch responses (success, empty, error).
- Playwright scenario verifying filters update query string and table results.
- Snapshot tests for the collapsible cards (light/dark mode).

## Future Enhancements

1. CSV export of filtered signals.
2. Inline diff when a signal is deleted (read from `tp_capital_signals_deleted`).
3. Real-time updates via WebSocket (remove polling).
4. Drill-down modal showing full `raw_message` with formatting.
5. Alerts integration showing ingestion health from `/metrics`.

Keep this document aligned with QuestDB schema changes (`tp_capital_signals.md`) and backend API updates to ensure the UI remains consistent with data contracts.
