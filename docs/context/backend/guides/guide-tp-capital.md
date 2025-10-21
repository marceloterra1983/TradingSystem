---
title: TP Capital API Guide
sidebar_position: 3
tags: [tp-capital, guide, questdb, telegram, ingestion]
domain: backend
type: guide
summary: Setup and integration guide for the TP Capital Telegram ingestion service
status: active
last_review: 2025-10-18
---

# TP Capital API Guide

> **Purpose**: Explain how to run, configure, and integrate the TP Capital API that ingests Telegram signals and persists them to QuestDB.

## 📋 Overview

- **Service name**: `backend/api/tp-capital`
- **Technology stack**: Node.js 20 + Express + QuestDB
- **Primary responsibility**: Normalize Telegram messages into structured trading signals and expose them via REST.
- **Default port**: `3200`

The service listens to Telegram channels configured in QuestDB, enriches incoming payloads, and writes them to time-series tables consumidas pelo Dashboard e por automações downstream.

## 📐 Architecture Diagrams

**Component Architecture - Source**

Download: [`tp-capital-component-architecture.puml`](../../shared/diagrams/tp-capital-component-architecture.puml)

**Component Architecture - Rendered**

See diagram source: [`tp-capital-component-architecture.puml`](../../shared/diagrams/tp-capital-component-architecture.puml)

Shows Telegram ingestion, QuestDB storage (ILP + HTTP), API layer, dashboard consumption, and Agno Agents integration.

**Telegram Ingestion Flow - Source**

Download: [`tp-capital-ingestion-sequence.puml`](../../shared/diagrams/tp-capital-ingestion-sequence.puml)

**Telegram Ingestion Flow - Rendered**

See diagram source: [`tp-capital-ingestion-sequence.puml`](../../shared/diagrams/tp-capital-ingestion-sequence.puml)

Documents Telegram webhook → Parser → Validation → QuestDB ILP write flow (target: `<500ms` p95).

**Signal Consumption Flow - Source**

Download: [`tp-capital-signal-consumption-sequence.puml`](../../shared/diagrams/tp-capital-signal-consumption-sequence.puml)

**Signal Consumption Flow - Rendered**

See diagram source: [`tp-capital-signal-consumption-sequence.puml`](../../shared/diagrams/tp-capital-signal-consumption-sequence.puml)

Shows dashboard and Agno Agents consuming signals in parallel with auto-refresh, filtering, and React Query caching.

## 🚀 Local Development

```bash
cd backend/api/tp-capital
npm install
npm run dev        # Starts the service on http://localhost:3200
```

### Required Environment Variables

The service expects a centralized `.env` at the repository root. Ensure the following keys are present:

| Variable | Description | Example |
|----------|-------------|---------|
| `TP_CAPITAL_API_PORT` | HTTP port (defaults to 3200 if unset) | `3200` |
| `QUESTDB_HTTP_URL` | QuestDB HTTP endpoint | `http://localhost:9000` |
| `QUESTDB_ILP_HOST` | QuestDB ILP host for time-series ingestion | `localhost` |
| `QUESTDB_ILP_PORT` | QuestDB ILP port | `9009` |
| `TELEGRAM_BOT_TOKEN` | Bot token used to pull channel messages | `123456:ABCDEF` |

> **Tip**: Run `scripts/env/validate-env.sh` after updating the root `.env` to confirm required keys are available.

## 🔌 REST Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/signals` | Paginated list of normalized TP Capital signals from QuestDB |
| `GET` | `/logs` | Operational logs collected during ingestion |
| `GET` | `/telegram/bots` | Registered Telegram bots and credentials metadata |
| `GET` | `/telegram/channels` | Channels and groups monitored by the ingestion job |

All endpoints return JSON responses designed for thin clients (dashboard UI ou outras automações downstream).

## 🗃️ Data Storage

- **QuestDB** is the source of truth for signals, bot metadata, and ingestion logs.
- The `tp_capital_signals` table schema is documented in `backend/data/schemas/trading-core/tables/tp-capital-signals.md`.
- Tables are partitioned by day to support high-volume ingestion and pruning.

## 📡 Integration Points

- **Dashboard** (`http://localhost:3103`) consumes `/signals` for the TP Capital table page.
- **Agno Agents** rely on the REST interface to combine Telegram signals with Workspace ideas and B3 market data.

## 🔍 Monitoring & Observability

- Structured logs emitted to stdout using the shared logger (`logger.js`).
- QuestDB acts as an audit log; use `SELECT` queries to inspect ingestion history.
- When deployed alongside Prometheus, expose metrics by enabling the shared metrics middleware (issue #248 tracks integration).

## 🧪 Testing

```bash
npm test          # Unit tests (if configured)
npm run lint      # ESLint checks
```

> For local QA, run the seed script `scripts/seed-sample-data.js` to populate QuestDB with synthetic signals.

## 🔧 Integration Examples

### Example 1: Fetching Signals with Filters

```typescript
interface Signal {
  id: string;
  asset: string;
  signal_type: 'COMPRA' | 'VENDA';
  buy_min?: number;
  buy_max?: number;
  targets: number[];
  stop?: number;
  channel: string;
  ts: string;
}

async function fetchSignals(filters: {
  channel?: string;
  signal_type?: string;
  limit?: number;
  offset?: number;
}): Promise<Signal[]> {
  const params = new URLSearchParams();
  if (filters.channel) params.append('channel', filters.channel);
  if (filters.signal_type) params.append('type', filters.signal_type);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const response = await fetch(`http://localhost:3200/signals?${params}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  const data = await response.json();
  return data.data || [];
}
```

### Example 2: React Query Hook

```typescript
import { useQuery } from '@tanstack/react-query';

function useTPCapitalSignals(filters: SignalFilters) {
  return useQuery<Signal[], Error>({
    queryKey: ['tp-capital-signals', filters],
    queryFn: () => fetchSignals(filters),
    staleTime: 10000, // 10 seconds
    refetchInterval: 15000, // Auto-refresh every 15 seconds
    keepPreviousData: true,
  });
}
```

### Example 3: QuestDB Direct Queries

```sql
-- Query recent signals
SELECT * FROM tp_capital_signals
WHERE ts > now() - 7d
ORDER BY ts DESC
LIMIT 100;

-- Filter by channel
SELECT * FROM tp_capital_signals
WHERE channel = 'TP_Capital'
AND ts > now() - 1d
ORDER BY ts DESC;

-- Aggregations
SELECT 
  signal_type,
  COUNT(*) as count,
  AVG(targets[1]) as avg_first_target
FROM tp_capital_signals
WHERE ts > now() - 7d
GROUP BY signal_type;
```

### Example 4: WebSocket Integration (Future)

> **Status**: Planned feature - not yet implemented. Current polling implementation (15s interval) works well for most use cases.

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

function useTPCapitalWebSocket(config: WebSocketConfig) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(config.url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        
        // Subscribe to signal updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'tp-capital-signals',
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'signal-created') {
          // Update React Query cache with new signal
          queryClient.setQueryData<Signal[]>(
            ['tp-capital-signals'],
            (oldData) => {
              if (!oldData) return [data.signal];
              return [data.signal, ...oldData];
            }
          );
          
          // Show notification
          console.log('New signal received:', data.signal.asset);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        
        // Attempt reconnection with exponential backoff
        if (
          reconnectAttempts.current < (config.maxReconnectAttempts || 5)
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          
          console.log(`Reconnecting in ${delay}ms...`);
          setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [config.url, config.maxReconnectAttempts, queryClient]);

  return wsRef;
}

// Usage in component
function TPCapitalPage() {
  // Initialize WebSocket connection
  useTPCapitalWebSocket({
    url: 'ws://localhost:3200/ws',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  // Use regular query hook - cache will be updated via WebSocket
  const { data: signals } = useTPCapitalSignals({});

  return (
    <div>
      <h1>TP Capital Signals (Real-Time)</h1>
      {signals?.map(signal => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  );
}
```

**Benefits of WebSocket over Polling:**
- **Instant delivery**: `<100ms` latency vs 15s polling interval
- **Reduced server load**: No repeated HTTP requests
- **Better UX**: Real-time updates without page refresh
- **Efficient**: Server pushes only when data changes

### Example 5: Dashboard Component Integration

```typescript
import { useState } from 'react';
import { useTPCapitalSignals } from '../hooks/useTPCapitalSignals';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardContent,
} from '../ui/collapsible-card';

interface FilterState {
  channel: string;
  signal_type: 'COMPRA' | 'VENDA' | 'all';
  dateRange: 'today' | '7d' | '30d';
}

export function TPCapitalSignalsTable() {
  const [filters, setFilters] = useState<FilterState>({
    channel: 'all',
    signal_type: 'all',
    dateRange: '7d',
  });

  const { data: signals, isLoading, isError, error } = useTPCapitalSignals({
    channel: filters.channel !== 'all' ? filters.channel : undefined,
    signal_type: filters.signal_type !== 'all' ? filters.signal_type : undefined,
    limit: 100,
  });

  return (
    <CollapsibleCard cardId="tp-capital-signals" defaultCollapsed={false}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>TP Capital Signals</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <select
            value={filters.channel}
            onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All Channels</option>
            <option value="TP_Capital">TP Capital</option>
            <option value="TP_Premium">TP Premium</option>
          </select>

          <select
            value={filters.signal_type}
            onChange={(e) => setFilters({ ...filters, signal_type: e.target.value as any })}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All Types</option>
            <option value="COMPRA">Compra</option>
            <option value="VENDA">Venda</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
            className="px-4 py-2 border rounded"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="p-4 text-center text-gray-600">
            Loading signals...
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
            Error loading signals: {error.message}
          </div>
        )}

        {/* Table */}
        {signals && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="px-4 py-2 text-left">Timestamp</th>
                  <th className="px-4 py-2 text-left">Asset</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Entry Range</th>
                  <th className="px-4 py-2 text-left">Targets</th>
                  <th className="px-4 py-2 text-left">Stop</th>
                  <th className="px-4 py-2 text-left">Channel</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal) => (
                  <tr
                    key={signal.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-2 text-sm">
                      {new Date(signal.ts).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-semibold">{signal.asset}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          signal.signal_type === 'COMPRA'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {signal.signal_type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {signal.buy_min && signal.buy_max
                        ? `${signal.buy_min} - ${signal.buy_max}`
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {signal.targets?.join(', ') || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">{signal.stop || '-'}</td>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">
                      {signal.channel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {signals.length === 0 && (
              <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                No signals found for the selected filters.
              </div>
            )}
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
```

**Integration in Page Component:**

```typescript
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { TPCapitalSignalsTable } from './TPCapitalSignalsTable';
import { TPCapitalStats } from './TPCapitalStats';
import { TPCapitalChannels } from './TPCapitalChannels';

export function TPCapitalPage() {
  const sections = [
    {
      id: 'signals',
      content: <TPCapitalSignalsTable />,
    },
    {
      id: 'stats',
      content: <TPCapitalStats />,
    },
    {
      id: 'channels',
      content: <TPCapitalChannels />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="tp-capital"
      title="TP Capital Signals"
      subtitle="Real-time trading signals from Telegram channels"
      sections={sections}
      defaultColumns={2}
    />
  );
}
```

## ✅ Operational Checklist

1. Confirm Telegram credentials are stored in a secure vault (no hardcoding).
2. Ensure QuestDB is reachable on ports `9000` (HTTP) and `9009` (ILP).
3. Validate ingestion by calling `GET /signals` and checking latest timestamps.
4. Keep documentation in sync; update this guide whenever endpoints or schema change.

## 📚 References

- [Component Architecture Diagram](../../shared/diagrams/tp-capital-component-architecture.puml)
- [Ingestion Sequence Diagram](../../shared/diagrams/tp-capital-ingestion-sequence.puml)
- [Consumption Sequence Diagram](../../shared/diagrams/tp-capital-signal-consumption-sequence.puml)
- [Frontend Feature Specification](../../frontend/features/feature-tp-capital-signals.md)
- [Schema Documentation](../data/schemas/trading-core/tables/tp-capital-signals.md)
- [Product Requirements Document](../../shared/product/prd/en/tp-capital-signal-table-prd.md)
