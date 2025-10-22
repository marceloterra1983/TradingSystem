---
title: Overview
sidebar_position: 1
tags: [backend, documentation]
domain: backend
type: reference
summary: o ---
title: WebScraper Database Schema
sidebarposition: 30
tags: [backend, data, schema,...
status: active
last_review: 2025-10-22
---


o ---
title: WebScraper Database Schema
sidebar_position: 30
tags: [backend, data, schema, webscraper, timescaledb]
domain: backend
type: reference
summary: Database schema for WebScraper service including tables, indexes, and relationships
status: active
last_review: 2025-10-17

---

# Overview

The WebScraper service stores jobs, templates, and aggregated facts in TimescaleDB (PostgreSQL + Timescale extension). Data lives in its own database (`webscraper`) to isolate retention strategies from other workloads.

**Key characteristics**

-   `scrape_jobs` is a **hypertable** keyed by `started_at`, supporting time-series analytics.
-   JSONB columns (`options`, `results`) capture Firecrawl payloads without lossy flattening.
-   `scrape_templates` holds reusable scrape configurations with a usage counter maintained by the application.

Deploy schema & seed via `scripts/webscraper/init-database.sh`.

# Entity-Relationship Diagram

Source: [webscraper-erd.puml](../../shared/diagrams/webscraper-erd.puml)

```plantuml
@startuml
!include ../../shared/diagrams/webscraper-erd.puml
@enduml
```

# Tables

## `scrape_templates`

| Column                      | Type          | Notes                                       |
| --------------------------- | ------------- | ------------------------------------------- |
| `id`                        | `uuid` PK     | Generated with `gen_random_uuid()`          |
| `name`                      | `text`        | Unique identifier displayed in UI           |
| `description`               | `text`        | Optional human-friendly summary             |
| `url_pattern`               | `text`        | Regex/glob used for template auto-selection |
| `options`                   | `jsonb`       | Firecrawl-compatible options payload        |
| `usage_count`               | `integer`     | Incremented server-side when applied        |
| `created_at` / `updated_at` | `timestamptz` | Trigger-maintained                          |

Indexes:

-   `idx_scrape_templates_name` (unique + quicker lookup by name)

## `scrape_jobs`

| Column                        | Type          | Notes                                                             |
| ----------------------------- | ------------- | ----------------------------------------------------------------- |
| `id`                          | `uuid`        | Generated UUID (composite PK with `started_at`)                   |
| `type`                        | `text`        | `'scrape'` or `'crawl'`                                           |
| `url`                         | `text`        | Target URL                                                        |
| `status`                      | `text`        | `'pending'`, `'running'`, `'completed'`, `'failed'`               |
| `firecrawl_job_id`            | `text`        | Firecrawl crawl identifier (if applicable)                        |
| `template_id`                 | `uuid` FK     | References `scrape_templates.id`                                  |
| `schedule_id`                 | `uuid` FK     | References `job_schedules.id` (set when scheduler executes a job) |
| `options`                     | `jsonb`       | Copy of request payload                                           |
| `results`                     | `jsonb`       | Copy of response payload                                          |
| `error`                       | `text`        | Error message (when failed)                                       |
| `started_at` / `completed_at` | `timestamptz` | Job start/end timestamps (`started_at` in composite PK)           |
| `duration_seconds`            | `integer`     | Duration metadata                                                 |
| `created_at` / `updated_at`   | `timestamptz` | Trigger-maintained                                                |

Indexes:

-   `idx_scrape_jobs_status (status, started_at DESC)`
-   `idx_scrape_jobs_status_type_started (status, type, started_at DESC)`
-   `idx_scrape_jobs_id_lookup (id)`
-   `idx_scrape_jobs_type (type)`
-   `idx_scrape_jobs_template (template_id)`
-   `idx_scrape_jobs_schedule (schedule_id)`
-   `idx_scrape_jobs_template_created (template_id, created_at DESC) WHERE template_id IS NOT NULL`
-   `idx_scrape_jobs_created_at (created_at DESC)`
-   `idx_scrape_jobs_url_pattern USING gin (url gin_trgm_ops)`
-   `idx_scrape_jobs_results_gin USING gin (results)`

**Primary Key:**

-   Composite `(id, started_at)` — satisfies TimescaleDB hypertable rules while keeping `id` as the logical job identifier (API queries continue to filter by `id` alone).

Hypertable:

```sql
SELECT create_hypertable('scrape_jobs', 'started_at', if_not_exists => TRUE);
```

Triggers:

```sql
CREATE TRIGGER set_scrape_jobs_updated_at
BEFORE UPDATE ON scrape_jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## `job_schedules`

| Column                      | Type          | Notes                                   |
| --------------------------- | ------------- | --------------------------------------- |
| `id`                        | `uuid` PK     | Generated UUID                          |
| `name`                      | `text`        | Human-readable schedule name            |
| `description`               | `text`        | Optional description                    |
| `template_id`               | `uuid` FK     | References `scrape_templates.id`        |
| `url`                       | `text`        | Target URL to scrape                    |
| `schedule_type`             | `text`        | `'cron'`, `'interval'`, or `'one-time'` |
| `cron_expression`           | `text`        | Cron expression (e.g., `'0 9 * * *'`)   |
| `interval_seconds`          | `integer`     | Interval in seconds (for interval type) |
| `scheduled_at`              | `timestamptz` | One-time execution timestamp            |
| `enabled`                   | `boolean`     | Whether schedule is active              |
| `last_run_at`               | `timestamptz` | Last execution timestamp                |
| `next_run_at`               | `timestamptz` | Next scheduled execution                |
| `run_count`                 | `integer`     | Total executions                        |
| `failure_count`             | `integer`     | Failed executions                       |
| `options`                   | `jsonb`       | Scraping options (inherited or custom)  |
| `created_at` / `updated_at` | `timestamptz` | Trigger-maintained                      |

Indexes:

-   `idx_job_schedules_enabled_next_run (enabled, next_run_at)` - Scheduler queries
-   `idx_job_schedules_template (template_id)` - Template usage
-   `idx_job_schedules_last_run (last_run_at DESC)` - Monitoring

**Schedule Types:**

-   **cron**: Uses `cron_expression` (standard cron syntax)
-   **interval**: Uses `interval_seconds` (fixed interval)
-   **one-time**: Uses `scheduled_at` (single execution)

**Workflow:**

1. Scheduler service queries `WHERE enabled = true AND next_run_at <= NOW()`
2. Executes scrape using template options + custom options
3. Creates `scrape_job` record with results
4. Updates `last_run_at`, `next_run_at`, `run_count`
5. Increments `failure_count` on error

**Reference:** See Phase 4 implementation for scheduler service details.

## `export_jobs`

| Column                      | Type          | Notes                                                  |
| --------------------------- | ------------- | ------------------------------------------------------ |
| `id`                        | `uuid` PK     | Generated UUID                                         |
| `name`                      | `text`        | Export label surfaced in UI                            |
| `description`               | `text`        | Optional description                                   |
| `export_type`               | `text`        | `'jobs'`, `'templates'`, `'schedules'`, `'results'`    |
| `formats`                   | `text[]`      | Array of requested formats (`csv`, `json`, `parquet`)  |
| `filters`                   | `jsonb`       | Serialized filter object (jobs export only)            |
| `status`                    | `text`        | `'pending'`, `'processing'`, `'completed'`, `'failed'` |
| `file_paths`                | `jsonb`       | Map of generated files (`{ csv, json, parquet, zip }`) |
| `row_count`                 | `integer`     | Rows exported (once completed)                         |
| `file_size_bytes`           | `bigint`      | Total size of generated files                          |
| `error`                     | `text`        | Failure reason when status = failed                    |
| `started_at`                | `timestamptz` | Export job creation timestamp                          |
| `completed_at`              | `timestamptz` | Completion time (nullable)                             |
| `expires_at`                | `timestamptz` | Download expiration timestamp                          |
| `created_at` / `updated_at` | `timestamptz` | Trigger-maintained                                     |

Indexes:

-   `idx_export_jobs_status (status, created_at DESC)` — list exports by freshness
-   `idx_export_jobs_type (export_type)` — filter by export type
-   `idx_export_jobs_expires (expires_at)` — cleanup job uses this partial index

Lifecycle:

1. API inserts export record with `status = pending` and schedules async generation.
2. `ExportService` generates requested formats, updates `file_paths`, `row_count`, `file_size_bytes`, and marks status `completed`.
3. Files remain accessible until `expires_at`. Cleanup job (every `WEBSCRAPER_EXPORT_CLEANUP_INTERVAL_HOURS`) deletes expired rows and corresponding files from disk.
4. Users can manually delete exports via API/UI which removes both the DB record and file assets immediately.

Files are stored under `WEBSCRAPER_EXPORT_DIR/<exportId>/`. `cleanup-exports.sh` can be run manually to purge expired entries.

# Migrations

Schema & seed scripts live under `infrastructure/timescaledb/`:

-   [`webscraper-schema-sql.md`](./schemas/webscraper-schema-sql.md) – Documentação do script SQL completo com extensões, tabelas, índices, triggers, compression e retention policies.
-   [`webscraper-schema.sql`](../../../../infrastructure/timescaledb/webscraper-schema.sql) – Script SQL executável (fonte canônica).
-   [`webscraper-seed.sql`](../../../../infrastructure/timescaledb/webscraper-seed.sql) – Dados de exemplo (templates e jobs) para desenvolvimento e testes.

Prisma migrations can be generated via `npm run prisma:migrate` inside `backend/api/webscraper-api`.

# Queries

Common patterns:

```sql
-- Jobs for the last seven days (using continuous aggregate)
SELECT day, type, status, job_count, avg_duration
FROM scrape_jobs_daily_stats
WHERE day >= NOW() - INTERVAL '7 days'
ORDER BY day DESC;

-- Usage leaderboard (with template details)
SELECT
  t.name,
  t.usage_count AS template_usage,
  COUNT(j.id) AS actual_jobs,
  AVG(j.duration_seconds) AS avg_duration
FROM scrape_jobs j
JOIN scrape_templates t ON j.template_id = t.id
WHERE j.started_at >= NOW() - INTERVAL '30 days'
GROUP BY t.id, t.name, t.usage_count
ORDER BY actual_jobs DESC
LIMIT 5;

-- Search jobs by URL pattern
SELECT id, url, status, started_at
FROM scrape_jobs
WHERE url ILIKE '%github.com%'
ORDER BY started_at DESC
LIMIT 20;

-- Active schedules due for execution
SELECT
  s.name,
  s.schedule_type,
  s.next_run_at,
  t.name AS template_name
FROM job_schedules s
LEFT JOIN scrape_templates t ON s.template_id = t.id
WHERE s.enabled = true
  AND s.next_run_at <= NOW()
ORDER BY s.next_run_at;

-- Failed jobs with error analysis
SELECT
  DATE_TRUNC('day', started_at) AS day,
  COUNT(*) AS failures,
  ARRAY_AGG(DISTINCT error) AS error_types
FROM scrape_jobs
WHERE status = 'failed'
  AND started_at >= NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;

-- Schedule health monitoring
SELECT
  name,
  run_count,
  failure_count,
  ROUND(100.0 * failure_count / NULLIF(run_count, 0), 2) AS failure_rate,
  last_run_at,
  next_run_at
FROM job_schedules
WHERE enabled = true
ORDER BY failure_rate DESC NULLS LAST;

-- Completed exports ready for download
SELECT
  id,
  name,
  export_type,
  formats,
  row_count,
  file_size_bytes,
  expires_at
FROM export_jobs
WHERE status = 'completed'
  AND expires_at > NOW()
ORDER BY created_at DESC;

-- Expired exports scheduled for cleanup
SELECT
  id,
  name,
  expires_at,
  file_paths
FROM export_jobs
WHERE status = 'completed'
  AND expires_at < NOW();

-- Export volume per type (last 30 days)
SELECT
  export_type,
  COUNT(*) AS exports,
  SUM(row_count) AS rows_total,
  SUM(file_size_bytes) AS bytes_total
FROM export_jobs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY export_type;
```

**Query Optimization Tips:**

-   Use `scrape_jobs_daily_stats` continuous aggregate for date-range statistics (instant results)
-   URL searches benefit from `pg_trgm` GIN index (enable with `CREATE EXTENSION pg_trgm`)
-   Filter by `template_id` first when joining with templates (uses index)
-   Use `EXPLAIN ANALYZE` to verify index usage on production queries

# Performance Notes

## TimescaleDB Optimizations

**Hypertable Chunking:**

-   `scrape_jobs` is partitioned by `started_at` with automatic chunk management
-   Chunk interval configurable via `WEBSCRAPER_CHUNK_INTERVAL_DAYS` (default: 7 days)
-   Set during initialization: `set_chunk_time_interval('scrape_jobs', interval)`
-   Historical queries scan only relevant chunks (10-100x faster than full table scan)

**Compression:**

-   Chunks older than 7 days are automatically compressed (70-90% storage reduction)
-   Compressed chunks remain queryable (transparent decompression)
-   Compression policy: `add_compression_policy('scrape_jobs', INTERVAL '7 days')`

**Retention:**

-   Chunks older than 90 days are automatically dropped
-   Configurable via `add_retention_policy('scrape_jobs', INTERVAL '90 days')`
-   Adjust retention period based on compliance requirements

**Continuous Aggregates:**

-   `scrape_jobs_daily_stats` pre-computes daily statistics
-   Refreshed hourly (configurable)
-   Dashboard queries use aggregate instead of scanning raw data (instant results)

## Index Strategy

**Composite Indexes:**

-   `(status, started_at DESC)` - Optimizes filtered history queries
-   `(status, type, started_at DESC)` - Optimizes multi-filter queries
-   `(template_id, created_at DESC)` - Partial index for template analytics

**GIN Indexes:**

-   `url gin_trgm_ops` - Enables fast LIKE/ILIKE searches (requires `pg_trgm` extension)
-   `results` (optional) - Enables JSONB field queries (adds storage overhead)
    -   Creation controlled via `WEBSCRAPER_ENABLE_JSONB_INDEX` environment variable
    -   Created CONCURRENTLY by init-database.sh script to avoid transaction conflicts and write locks
    -   Cannot be created inside SQL transactions (DO blocks) due to CONCURRENT requirement
    -   Only create if JSONB querying is a primary use case (significant storage impact)

**Index Maintenance:**

-   TimescaleDB automatically manages indexes across chunks
-   Use `REINDEX` only if index bloat is detected (rare with TimescaleDB)

## JSONB Best Practices

**Storage:**

-   JSONB is stored in compressed binary format (efficient storage)
-   Avoid deeply nested structures (>3 levels) for query performance
-   Use `jsonb_strip_nulls()` to reduce storage size

**Querying:**

-   Use `->` operator for fast key access: `results->'markdown'`
-   Use `@>` operator for containment checks: `results @> '{"status": "completed"}'`
-   Add GIN index if querying JSONB fields frequently

**Monitoring:**

-   Check JSONB column sizes: `SELECT pg_size_pretty(pg_column_size(results)) FROM scrape_jobs LIMIT 100;`
-   Monitor index usage: `SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';`

## Scaling Considerations

**Write Performance:**

-   Current design supports 1000+ jobs/minute on standard hardware
-   Batch inserts via `COPY` or multi-row `INSERT` for bulk operations
-   Consider partitioning by `type` if scrape/crawl have different access patterns

**Read Performance:**

-   Use continuous aggregates for dashboard queries (pre-computed)
-   Use `LIMIT` and pagination for large result sets
-   Consider read replicas for analytics workloads

**Storage Growth:**

-   Estimate: ~5KB per job (without large JSONB results)
-   1M jobs ≈ 5GB uncompressed, ~1GB compressed
-   Monitor with: `SELECT hypertable_size('scrape_jobs'), hypertable_compressed_size('scrape_jobs');`

# References

-   API documentation: [`webscraper-api.md`](../api/webscraper-api.md)
-   Frontend feature: [`webscraper-app.md`](../../frontend/features/webscraper-app.md)
-   Schema SQL Documentation: [`webscraper-schema-sql.md`](./schemas/webscraper-schema-sql.md)
-   Schema SQL File: [`webscraper-schema.sql`](../../../../infrastructure/timescaledb/webscraper-schema.sql)

