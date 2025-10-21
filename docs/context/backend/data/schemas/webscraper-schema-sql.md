---
title: WebScraper TimescaleDB Schema
sidebar_position: 40
tags: [webscraper, timescaledb, schema, sql, hypertables, compression]
domain: backend
type: reference
summary: SQL DDL para provisionar o schema TimescaleDB do WebScraper service (scrape_jobs, scrape_templates, job_schedules, export_jobs com hypertables, compression e retention policies).
status: active
last_review: 2025-10-18
---

# WebScraper TimescaleDB Schema

> ⚙️ Use este script ao provisionar TimescaleDB para o WebScraper API (`backend/api/webscraper-api`). Cria hypertables para jobs de scraping, templates reutilizáveis, agendamentos e exports, com suporte a compression, retention policies e continuous aggregates para performance.

```sql
-- =============================================================================
-- WebScraper TimescaleDB Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT set_config('search_path', :'schema_name' || ',public', false);

CREATE TABLE IF NOT EXISTS scrape_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    url_pattern TEXT,
    options JSONB NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_id UUID REFERENCES scrape_templates(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('cron', 'interval', 'one-time')),
    cron_expression TEXT,
    interval_seconds INTEGER CHECK (interval_seconds IS NULL OR interval_seconds > 0),
    scheduled_at TIMESTAMPTZ,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    options JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (schedule_type = 'cron' AND cron_expression IS NOT NULL AND interval_seconds IS NULL AND scheduled_at IS NULL)
        OR (schedule_type = 'interval' AND interval_seconds IS NOT NULL AND cron_expression IS NULL AND scheduled_at IS NULL)
        OR (schedule_type = 'one-time' AND scheduled_at IS NOT NULL AND cron_expression IS NULL AND interval_seconds IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('scrape', 'crawl')),
    url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    firecrawl_job_id TEXT,
    template_id UUID REFERENCES scrape_templates(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES job_schedules(id) ON DELETE SET NULL,
    options JSONB NOT NULL,
    results JSONB,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, started_at)
);

CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    export_type TEXT NOT NULL CHECK (export_type IN ('jobs', 'templates', 'schedules', 'results')),
    formats TEXT[] NOT NULL,
    filters JSONB,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_paths JSONB,
    row_count INTEGER,
    file_size_bytes BIGINT,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create hypertable with configurable chunk interval
SELECT create_hypertable('scrape_jobs', 'started_at', if_not_exists => TRUE);

-- Set chunk interval based on environment variable (default 7 days)
SELECT set_config('webscraper.chunk_interval_days', :'chunk_interval_days', false);
DO $$
DECLARE
  chunk_days INTEGER;
BEGIN
  chunk_days := COALESCE(current_setting('webscraper.chunk_interval_days', true)::INTEGER, 7);
  PERFORM set_chunk_time_interval('scrape_jobs', (chunk_days || ' days')::INTERVAL);
END $$;

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_type ON scrape_jobs (type);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_template ON scrape_jobs (template_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_schedule ON scrape_jobs (schedule_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_id_lookup ON scrape_jobs (id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status_type_started ON scrape_jobs (status, type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_template_created ON scrape_jobs (template_id, created_at DESC) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_url_pattern ON scrape_jobs USING gin (url gin_trgm_ops);
-- Heavy JSONB GIN index - created by init-database.sh script when WEBSCRAPER_ENABLE_JSONB_INDEX=true
-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction block, so this is handled
-- separately by the init script: idx_scrape_jobs_results_gin ON scrape_jobs USING gin (results)
CREATE INDEX IF NOT EXISTS idx_scrape_templates_name ON scrape_templates (name);
CREATE INDEX IF NOT EXISTS idx_job_schedules_enabled_next_run ON job_schedules (enabled, next_run_at);
CREATE INDEX IF NOT EXISTS idx_job_schedules_template ON job_schedules (template_id);
CREATE INDEX IF NOT EXISTS idx_job_schedules_last_run ON job_schedules (last_run_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_expires ON export_jobs (expires_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_export_jobs_type ON export_jobs (export_type);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_scrape_jobs_updated_at ON scrape_jobs;
CREATE TRIGGER set_scrape_jobs_updated_at
BEFORE UPDATE ON scrape_jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_scrape_templates_updated_at ON scrape_templates;
CREATE TRIGGER set_scrape_templates_updated_at
BEFORE UPDATE ON scrape_templates
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_job_schedules_updated_at ON job_schedules;
CREATE TRIGGER set_job_schedules_updated_at
BEFORE UPDATE ON job_schedules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_export_jobs_updated_at ON export_jobs;
CREATE TRIGGER set_export_jobs_updated_at
BEFORE UPDATE ON export_jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Compress chunks older than 7 days to save storage
ALTER TABLE scrape_jobs SET (
  timescaledb.compress = TRUE,
  timescaledb.compress_orderby = 'started_at DESC',
  timescaledb.compress_segmentby = 'template_id, schedule_id, type'
);

SELECT add_compression_policy('scrape_jobs', INTERVAL '7 days', if_not_exists => TRUE);

-- Drop chunks older than 90 days (configurable based on requirements)
SELECT add_retention_policy('scrape_jobs', INTERVAL '90 days', if_not_exists => TRUE);

-- Pre-compute daily statistics for dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS scrape_jobs_daily_stats
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', started_at) AS day,
  type,
  status,
  COUNT(*) AS job_count,
  AVG(duration_seconds) AS avg_duration,
  MAX(duration_seconds) AS max_duration,
  MIN(duration_seconds) AS min_duration
FROM scrape_jobs
WHERE started_at IS NOT NULL
GROUP BY day, type, status;

-- Refresh policy: update aggregate every hour
SELECT add_continuous_aggregate_policy('scrape_jobs_daily_stats',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE);
```

## Usage

### Direct Execution

```bash
psql "$TIMESCALEDB_URL" -f infrastructure/timescaledb/webscraper-schema.sql
```

### With Custom Chunk Interval

```bash
psql "$TIMESCALEDB_URL" -v chunk_interval_days=14 -f infrastructure/timescaledb/webscraper-schema.sql
```

### With Custom Schema Name

```bash
psql "$TIMESCALEDB_URL" -v schema_name=public -f infrastructure/timescaledb/webscraper-schema.sql
```

### Via Init Script

```bash
bash scripts/webscraper/init-database.sh
```

O script `init-database.sh` também cria o índice GIN opcional em `scrape_jobs.results` quando `WEBSCRAPER_ENABLE_JSONB_INDEX=true` (usando `CREATE INDEX CONCURRENTLY` fora de transação).

> 📝 Mantenha este schema sincronizado com o Prisma schema em `backend/api/webscraper-api/prisma/schema.prisma`.

## Schema Overview

### Tables

**scrape_templates**

-   Armazena configurações reutilizáveis de scraping
-   `options` (JSONB): Payload compatível com Firecrawl
-   `usage_count`: Incrementado pela aplicação quando template é usado
-   Índice único em `name` para lookup rápido

**scrape_jobs** (Hypertable)

-   Armazena histórico de jobs de scraping/crawling
-   Particionada por `started_at` (time-series)
-   Primary key composta: `(id, started_at)` para compatibilidade com TimescaleDB
-   `type`: 'scrape' (single page) ou 'crawl' (multiple pages)
-   `status`: 'pending', 'running', 'completed', 'failed'
-   `options` e `results` (JSONB): Payloads de request/response
-   Foreign keys para `scrape_templates` e `job_schedules`

**job_schedules**

-   Gerencia agendamentos de scraping
-   Suporta 3 tipos: 'cron', 'interval', 'one-time'
-   `next_run_at`: Calculado pelo scheduler service
-   `run_count` e `failure_count`: Métricas de execução
-   CHECK constraint garante que apenas campos relevantes ao tipo estejam preenchidos

**export_jobs**

-   Gerencia exports de dados (CSV, JSON, Parquet)
-   `formats`: Array de formatos solicitados
-   `file_paths` (JSONB): Mapa de arquivos gerados
-   `expires_at`: Timestamp para cleanup automático
-   Suporta filtros via `filters` (JSONB)

### TimescaleDB Features

**Hypertable Chunking:**

-   `scrape_jobs` particionada em chunks de 7 dias (configurável)
-   Queries filtradas por data escaneiam apenas chunks relevantes (10-100x mais rápido)

**Compression:**

-   Chunks com mais de 7 dias são automaticamente comprimidos (70-90% redução de storage)
-   Compressão transparente - queries funcionam normalmente
-   Segmentação por `template_id`, `schedule_id`, `type` para melhor compressão

**Retention Policy:**

-   Chunks com mais de 90 dias são automaticamente removidos
-   Configurável via `add_retention_policy` conforme requisitos de compliance

**Continuous Aggregate:**

-   `scrape_jobs_daily_stats` pré-computa estatísticas diárias
-   Atualizada a cada hora automaticamente
-   Dashboard queries usam aggregate ao invés de scan completo (resultados instantâneos)

### Indexes

**Performance Indexes:**

-   `(status, started_at DESC)`: Queries filtradas por status
-   `(status, type, started_at DESC)`: Queries com múltiplos filtros
-   `(template_id, created_at DESC)`: Analytics de uso de templates
-   `(enabled, next_run_at)`: Scheduler queries

**Search Indexes:**

-   GIN em `url` com `pg_trgm`: Busca LIKE/ILIKE rápida
-   GIN em `results` (opcional): Queries em campos JSONB (alto custo de storage)

### Triggers

Todas as tabelas têm trigger `set_updated_at` que atualiza automaticamente `updated_at` em UPDATEs.

## Related Documentation

-   **Schema Documentation**: [webscraper-schema.md](../webscraper-schema.md) - Documentação completa do schema com queries e performance notes
-   **Seed Data**: [webscraper-seed.sql](../../../../../infrastructure/timescaledb/webscraper-seed.sql) - Dados de exemplo para desenvolvimento
-   **Init Script**: [init-database.sh](../../../../../scripts/webscraper/init-database.sh) - Script de inicialização automatizada
-   **API Documentation**: [webscraper-api.md](../../api/webscraper-api.md) - Documentação da API que usa este schema
-   **Frontend Feature**: [webscraper-app.md](../../../frontend/features/webscraper-app.md) - Interface do usuário

