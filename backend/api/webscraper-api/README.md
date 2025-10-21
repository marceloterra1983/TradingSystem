# WebScraper API

Express service that orchestrates Firecrawl jobs, templates, and TimescaleDB persistence for the WebScraper frontend (`frontend/apps/WebScraper`). It mirrors the conventions used by other TradingSystem APIs (Pino logging, Prometheus metrics, Prisma ORM, centralized `.env`).

## ⚙️ Capabilities

- CRUD for scraping jobs (`/api/v1/jobs`)
- Template library management (`/api/v1/templates`)
- Aggregated statistics and dashboards (`/api/v1/statistics`)
- Firecrawl proxy integration for job re-runs
- Prometheus metrics (`/metrics`) + health checks (`/health`)

## 📦 Stack

- Node.js 20+
- Express 4
- Prisma ORM (TimescaleDB / PostgreSQL)
- Pino / pino-http logging
- prom-client metrics
- express-validator for request validation

## 🚀 Getting Started

```bash
cd backend/api/webscraper-api
npm install
npm run dev  # http://localhost:3700
```

Ensure the root `.env` contains the variables listed in `.env.example`, notably:

```ini
WEBSCRAPER_API_PORT=3700
WEBSCRAPER_DATABASE_URL=postgresql://app_webscraper:app_webscraper_dev_password@localhost:5444/frontend_apps?schema=webscraper
WEBSCRAPER_FIRECRAWL_PROXY_URL=http://localhost:3600
```

### Prisma

Generate the Prisma client whenever the schema changes:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## 🔌 Endpoints

| Method | Endpoint                  | Description                              |
| ------ | ------------------------- | ---------------------------------------- |
| GET    | `/`                       | Service metadata                         |
| GET    | `/health`                 | DB + service health                      |
| GET    | `/metrics`                | Prometheus metrics registry              |
| GET    | `/api/v1/jobs`            | Paginated job list (filterable)          |
| POST   | `/api/v1/jobs`            | Persist job result payload               |
| GET    | `/api/v1/jobs/:id`        | Fetch single job with results            |
| DELETE | `/api/v1/jobs/:id`        | Remove job                               |
| POST   | `/api/v1/jobs/:id/rerun`  | Trigger Firecrawl rerun                  |
| GET    | `/api/v1/templates`       | List all templates                       |
| POST   | `/api/v1/templates`       | Create template                          |
| PUT    | `/api/v1/templates/:id`   | Update template                          |
| DELETE | `/api/v1/templates/:id`   | Delete template                          |
| POST   | `/api/v1/templates/import`| Bulk import (JSON array)                 |
| GET    | `/api/v1/templates/export`| Export templates as JSON                 |
| GET    | `/api/v1/schedules`       | List schedules with filters              |
| GET    | `/api/v1/schedules/:id`   | Get schedule details                     |
| GET    | `/api/v1/schedules/:id/history` | Jobs created by a schedule          |
| POST   | `/api/v1/schedules`       | Create schedule                          |
| PUT    | `/api/v1/schedules/:id`   | Update schedule                          |
| PATCH  | `/api/v1/schedules/:id/toggle` | Enable/disable schedule             |
| DELETE | `/api/v1/schedules/:id`   | Delete schedule                          |
| GET    | `/api/v1/statistics`      | Aggregated stats + charts data           |

## ⏱️ Scheduler Service

The WebScraper API ships with an integrated scheduler that automates recurring scraping jobs.

### Features

- Cron, interval, and one-time schedules with template reuse
- Exponential backoff retry strategy (default: 3 attempts)
- Concurrency guard with configurable parallelism
- Automatic disable after repeated failures
- Prometheus instrumentation for executions and latency
- Graceful shutdown on `SIGINT`/`SIGTERM`

### Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `WEBSCRAPER_SCHEDULER_ENABLED` | Toggle scheduler | `false` |
| `WEBSCRAPER_SCHEDULER_MAX_CONCURRENT_JOBS` | Parallel executions | `5` |
| `WEBSCRAPER_SCHEDULER_RETRY_ATTEMPTS` | Retry attempts | `3` |
| `WEBSCRAPER_SCHEDULER_RETRY_DELAY_MS` | Initial retry delay | `1000` |
| `WEBSCRAPER_SCHEDULER_MAX_FAILURES` | Auto-disable threshold | `10` |
| `WEBSCRAPER_SCHEDULER_TIMEZONE` | Cron timezone | `America/Sao_Paulo` |

### Execution Flow

1. Scheduler boots after the service starts (if enabled).
2. Enabled schedules load from TimescaleDB and register timers (cron, interval, timeout).
3. When a schedule triggers, the service merges template + schedule options and invokes Firecrawl.
4. Results persist to `scrape_jobs` with schedule metadata (`scheduleId`).
5. Metrics update (`webscraper_schedule_executions_total`, etc.) and next run is calculated.
6. Consecutive failures increment `failureCount`; once the threshold is reached the schedule is disabled automatically.

Metrics exposed via `/metrics`:

- `webscraper_schedules_total{type,enabled}`
- `webscraper_schedule_executions_total{schedule_type,status}`
- `webscraper_schedule_execution_duration_seconds{schedule_type}`

Start with scheduler enabled:

```bash
WEBSCRAPER_SCHEDULER_ENABLED=true npm run dev
```

## 📤 Exports API

Generate CSV, JSON, or Parquet files from jobs, templates, or schedules. Files are stored temporarily on disk (`WEBSCRAPER_EXPORT_DIR`) and automatically cleaned after `WEBSCRAPER_EXPORT_TTL_HOURS`.

### Endpoints

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/v1/exports` | Paginated export list (`status`, `exportType`, `dateFrom`, `dateTo`) |
| `POST` | `/api/v1/exports` | Create export job (async). Body: `{ name, exportType, formats: ['csv','json','parquet'], filters }` |
| `GET` | `/api/v1/exports/:id` | Fetch export metadata (status, file paths, row counts) |
| `GET` | `/api/v1/exports/:id/download/:format` | Stream export file (`csv`, `json`, `parquet`, `zip`) |
| `DELETE` | `/api/v1/exports/:id` | Remove export and delete files |

### Formats

- **CSV** — streaming via `@json2csv/node`, flattened objects + UTF-8 with BOM
- **JSON** — full payload with indentation
- **Parquet** — SNAPPY compression via `@dsnp/parquetjs` for downstream data pipelines
- **ZIP** — automatically produced when multiple formats are requested (using `archiver`)

### Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `WEBSCRAPER_EXPORT_ENABLED` | `true` | Toggle export endpoints/cleanup |
| `WEBSCRAPER_EXPORT_DIR` | `/tmp/webscraper-exports` | Directory for generated files |
| `WEBSCRAPER_EXPORT_TTL_HOURS` | `24` | Download availability window |
| `WEBSCRAPER_EXPORT_CLEANUP_INTERVAL_HOURS` | `6` | Cleanup scheduler cadence |
| `WEBSCRAPER_EXPORT_MAX_ROWS` | `100000` | Hard cap on records per export |
| `WEBSCRAPER_EXPORT_MAX_FILE_SIZE_MB` | `500` | Abort exports that exceed this estimate |

### Metrics

- `webscraper_exports_total{status,export_type}`
- `webscraper_export_executions_total{export_type,status}`
- `webscraper_export_duration_seconds{export_type,format}`
- `webscraper_export_file_size_bytes{export_type,format}`

### Cleanup

`initializeExportCleanup()` schedules a job that deletes expired exports and purges their directories. You can also run `backend/api/webscraper-api/scripts/cleanup-exports.sh` manually or from cron.

## 🧠 Job Workflow

1. Frontend calls Firecrawl proxy (`/api/firecrawl`) for scraping/crawling.
2. Upon completion the frontend persists the job by calling `POST /api/v1/jobs` with options, results and metadata.
3. Jobs become available in `/api/v1/jobs` with template relation when provided.
4. `POST /api/v1/jobs/:id/rerun` reuses the stored options to trigger a new Firecrawl run.

## 📊 Metrics

- `webscraper_http_requests_total` (method, route, status)
- `webscraper_http_request_duration_seconds`
- `webscraper_jobs_total` (type, status)
- `webscraper_templates_total`
- `webscraper_active_jobs`
- `webscraper_schedules_total`
- `webscraper_schedule_executions_total`
- `webscraper_schedule_execution_duration_seconds`

Expose them at `GET /metrics` for scraping by Prometheus / Grafana.

## 🧪 Testing

Vitest is wired for future integration tests:

```bash
npm run test
npm run test:watch
npm run test:integration
```

## 🛡️ Validation & Error Handling

- `express-validator` guards query/body parameters.
- Central error handler returns structured JSON (`{ success, error, statusCode }`).
- Rate limiting defaults to 100 req/min (configurable via `.env`).

## 🔁 Firecrawl Integration

- Proxy base URL taken from `WEBSCRAPER_FIRECRAWL_PROXY_URL` (default `http://localhost:3600`)
- Re-run route forwards original options back to Firecrawl for a new result set.

---

Companion frontend: `frontend/apps/WebScraper/`. Architecture & data flow documentation: `docs/context/backend/api/webscraper-api.md`.
