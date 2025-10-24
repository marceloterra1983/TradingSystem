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
