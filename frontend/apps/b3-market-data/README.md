# B3 API

Express service that exposes consolidated B3 market data sourced from QuestDB for the TradingSystem dashboard.

## Endpoints

### Core

- `GET /health` – Returns QuestDB connectivity status. Add `?detailed=true` for per-table health checks.
- `GET /overview` – Latest snapshots (DI1, DDI, DOL), indicators, GammaLevels and DXY buckets.
- `GET /adjustments?limit=120&instrument=DI1&contract=X25&from=2025-07-20T00:00:00.000Z&to=2025-07-25T23:59:59.000Z` – Recent adjustments from `b3_adjustments`.
- `GET /vol-surface?contract=X25` – Volatility surface points.
- `GET /indicators/daily?limit=180` – Historical indicators series.
- `GET /gamma-levels` – Latest GammaLevels per instrument.
- `GET /dxy` – Latest DXY intraday buckets.
- `GET /metrics` – Prometheus metrics (query durations, system metrics).

### Query Parameters: `/adjustments`

| Param | Description | Format/Values | Required |
|-------|-------------|---------------|----------|
| `limit` | Maximum rows | Number (default: 120) | No |
| `instrument` | Filter by instrument | `DI1`, `DDI`, `DOL` | No |
| `contract` | Filter by contract month | Pattern: `[A-Z][0-9]{2}` (e.g. `X25`) | No |
| `from` | Timestamp lower bound | ISO 8601 UTC (e.g. `2025-07-20T00:00:00.000Z`) | No |
| `to` | Timestamp upper bound | ISO 8601 UTC (e.g. `2025-07-25T23:59:59.000Z`) | No |

### Query Parameters: `/vol-surface`

| Param | Description | Format/Values | Required |
|-------|-------------|---------------|----------|
| `contract` | Contract month filter | Pattern: `[A-Z][0-9]{2}` (e.g. `X25`) | No |
| `limit` | Maximum rows | Number (default: 60) | No |

## Timezone Contract

**All timestamps are in UTC (ISO 8601 format).**

- **Input**: Timestamps in query parameters must be UTC (e.g., `2025-07-20T00:00:00.000Z`)
- **Output**: All `ts`, `timestamp`, `updated_at` fields are returned as UTC ISO strings
- **QuestDB**: Data is stored with `ts TIMESTAMP` columns in UTC
- **Server**: Runs with `TZ=UTC` environment variable to ensure consistent log timestamps

**Example payloads:**

```json
{
  "data": {
    "snapshots": [
      {
        "instrument": "DI1",
        "contractMonth": "X25",
        "priceSettlement": 100.5,
        "timestamp": "2025-10-14T12:00:00.000Z"
      }
    ]
  }
}
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `3302` |
| `QUESTDB_HTTP_URL` | QuestDB HTTP endpoint | `http://localhost:9000` |
| `QUESTDB_HTTP_TIMEOUT` | Request timeout in ms | `10000` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `http://localhost:3101,http://localhost:3030,http://b3.localhost` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX` | Max requests per window | `120` |
| `LOG_LEVEL` | Pino log level | `info` |
| `TZ` | Timezone | `UTC` |

### Extending CORS Origins

To allow requests from Traefik-proxied domains or alternative dev ports:

1. Update `.env`:
   ```
   CORS_ORIGIN=http://localhost:3101,http://localhost:3030,http://b3.localhost,https://trading.example.com
   ```

## Development

```bash
cd frontend/apps/b3-market-data
npm install
npm run dev  # Runs on port 3302
```

**Prerequisites:**
- QuestDB running on port 9000
- Tables created (see `infrastructure/scripts/questdb-restore-tables.sql`)
- B3 ingestion system populating data

## Observability

### Structured Logging

All logs include:
- `service`: `b3-market-data`
- `correlationId`: Unique request ID (pass via `x-correlation-id` header or auto-generated)
- `timestamp`: ISO UTC timestamp
- `level`: `info`, `warn`, `error`

### Metrics

Prometheus metrics available at `GET /metrics`:
- `questdb_query_duration_seconds{endpoint, status}` – Histogram of query times
- Default Node.js metrics (memory, CPU, event loop)

### Health Checks

**Basic:** `GET /health`
```json
{ "status": "ok", "questdb": true }
```

**Detailed:** `GET /health?detailed=true`
```json
{
  "status": "ok",
  "questdb": true,
  "tables": {
    "b3_snapshots": { "ok": true, "count": 150, "lastTs": "2025-10-14T12:00:00.000Z" },
    "b3_indicators": { "ok": true, "count": 25, "lastTs": "2025-10-14T12:00:00.000Z" }
  }
}
```

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| B3 API | 3302 | http://localhost:3302 |
| QuestDB HTTP | 9000 | http://localhost:9000 |
| Dashboard | 3101 | http://localhost:3101 |
| Docusaurus | 3004 | http://localhost:3004 |
