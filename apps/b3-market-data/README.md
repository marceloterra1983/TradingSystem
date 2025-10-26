---
title: B3 API
sidebar_position: 1
tags: [documentation]
domain: shared
type: index
summary: Express service that exposes consolidated B3 market data sourced from QuestDB for the TradingSystem dashboard.
status: active
last_review: "2025-10-23"
---

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

### Environment Variables

⚙️ **All configuration is centralized in the project root `.env` file.**

The service uses variables with the `B3_API_` prefix for service-specific configuration:

| Variable | Description | Default | Location |
|----------|-------------|---------|----------|
| `B3_API_PORT` | HTTP server port | `3302` | `config/.env.defaults` |
| `B3_API_QUESTDB_HTTP_URL` | QuestDB HTTP endpoint | `http://localhost:9002` | `config/.env.defaults` |
| `B3_API_QUESTDB_TIMEOUT` | QuestDB request timeout (ms) | `10000` | `config/.env.defaults` |
| `B3_API_CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:3103,http://localhost:3205` | `config/.env.defaults` |
| `B3_API_RATE_LIMIT_WINDOW_MS` | Rate limit time window (ms) | `60000` | `config/.env.defaults` |
| `B3_API_RATE_LIMIT_MAX` | Max requests per window | `120` | `config/.env.defaults` |
| `B3_API_LOG_LEVEL` | Pino log level | `info` | `config/.env.defaults` |

#### Backward Compatibility

For backward compatibility, the service also accepts unprefixed variables as fallback:
- `PORT` → falls back to `B3_API_PORT`
- `QUESTDB_HTTP_URL` → falls back to `B3_API_QUESTDB_HTTP_URL`
- `CORS_ORIGIN` → falls back to `B3_API_CORS_ORIGIN`
- etc.

**Recommendation:** Use the prefixed `B3_API_*` variables to avoid conflicts with other services.

### Configuration Loading

The service loads environment variables in this order:

```
1. config/.env.defaults     (Default values)
         ↓
2. .env (root)               (Environment-specific values)
         ↓
3. .env.local (root)         (Local overrides, gitignored)
         ↓
4. Environment Variables     (Runtime, highest priority)
```

Configuration is loaded automatically via:
```javascript
import '../../../../backend/shared/config/load-env.js';
```

### Customizing Configuration

#### Local Development

Edit `.env.local` (gitignored) in the project root:
```bash
# Override for local development
B3_API_PORT=3333
B3_API_QUESTDB_HTTP_URL=http://remote-questdb:9002
B3_API_LOG_LEVEL=debug
```

#### Production

Update `.env` (root) or set environment variables:
```bash
export B3_API_PORT=3302
export B3_API_QUESTDB_HTTP_URL=http://questdb-production:9002
```

### Extending CORS Origins

To allow requests from additional domains:

1. Edit `config/.env.defaults` or root `.env`:
   ```bash
   B3_API_CORS_ORIGIN=http://localhost:3103,http://localhost:3205,https://trading.example.com
   ```

2. Restart the service for changes to take effect

### Related Documentation

- 📖 [Environment Configuration Rules](../../../config/ENV-CONFIGURATION-RULES.md)
- 📖 [Config Directory README](../../../config/README.md)
- 📖 [Consolidation Guide](../../../CONSOLIDACAO-ENV-COMPLETA.md)

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
| Docusaurus | 3205 | http://localhost:3205 |
