-- ============================================================================
-- RAG Services - Ingestion Jobs Table (Hypertable)
-- ============================================================================
-- Description: Tracks document ingestion jobs with time-series data
-- Database: TimescaleDB (PostgreSQL + time-series extensions)
-- Schema: rag
-- Version: 1.0.0
-- Last Updated: 2025-11-02
-- ============================================================================

-- ============================================================================
-- Table: rag.ingestion_jobs (Hypertable)
-- ============================================================================
-- Purpose: Track document ingestion/re-indexing jobs
-- Notes:
--   - Hypertable partitioned by started_at (daily chunks)
--   - Tracks job lifecycle (queued, running, completed, failed)
--   - Stores performance metrics (duration, documents processed)
--   - Enables analytics on ingestion patterns
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.ingestion_jobs (
    -- Primary Key
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    collection_id UUID NOT NULL REFERENCES rag.collections(id) ON DELETE CASCADE,
    
    -- Job Identity
    job_type VARCHAR(50) NOT NULL,                  -- Type: full_index, incremental, single_document, reindex
    trigger_type VARCHAR(50) NOT NULL,              -- Trigger: manual, scheduled, file_watcher, api_request
    
    -- Job Status
    status VARCHAR(50) NOT NULL DEFAULT 'queued',   -- Status: queued, running, completed, failed, cancelled
    
    -- Timestamps (partitioning key)
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Job start time (PARTITIONING KEY)
    completed_at TIMESTAMPTZ,                       -- Job completion time
    duration_ms INTEGER,                            -- Job duration in milliseconds
    
    -- Execution Context
    triggered_by VARCHAR(100),                      -- User/service that triggered job
    trigger_metadata JSONB DEFAULT '{}'::jsonb,     -- Additional trigger context
    
    -- Processing Statistics
    documents_total INTEGER DEFAULT 0,              -- Total documents to process
    documents_processed INTEGER DEFAULT 0,          -- Documents successfully processed
    documents_failed INTEGER DEFAULT 0,             -- Documents that failed
    documents_skipped INTEGER DEFAULT 0,            -- Documents skipped (unchanged)
    
    chunks_generated INTEGER DEFAULT 0,             -- Total chunks generated
    vectors_generated INTEGER DEFAULT 0,            -- Total vectors stored
    bytes_processed BIGINT DEFAULT 0,               -- Total bytes processed
    
    -- Performance Metrics
    avg_processing_time_ms INTEGER,                 -- Average time per document (ms)
    throughput_docs_per_sec NUMERIC(10,2),          -- Documents per second
    
    -- Error Tracking
    error_message TEXT,                             -- Error message (if failed)
    error_count INTEGER DEFAULT 0,                  -- Number of errors encountered
    failed_documents JSONB DEFAULT '[]'::jsonb,     -- Array of failed document paths
    
    -- Configuration Snapshot
    config_snapshot JSONB DEFAULT '{}'::jsonb,      -- Job configuration at execution time
    
    -- Additional Metadata
    metadata JSONB DEFAULT '{}'::jsonb,             -- Flexible metadata storage
    
    -- Constraints
    CONSTRAINT valid_job_type CHECK (job_type IN ('full_index', 'incremental', 'single_document', 'reindex', 'delete')),
    CONSTRAINT valid_trigger_type CHECK (trigger_type IN ('manual', 'scheduled', 'file_watcher', 'api_request', 'system')),
    CONSTRAINT valid_status CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT documents_processed_range CHECK (documents_processed >= 0 AND documents_processed <= documents_total),
    CONSTRAINT positive_duration CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

-- ============================================================================
-- Convert to Hypertable (Time-Series Optimization)
-- ============================================================================

-- Create hypertable with daily chunks (24 hours)
SELECT create_hypertable(
    'rag.ingestion_jobs',
    'started_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Add primary key after hypertable creation
ALTER TABLE rag.ingestion_jobs 
ADD PRIMARY KEY (id, started_at);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for collection queries
CREATE INDEX idx_rag_ingestion_jobs_collection_id 
ON rag.ingestion_jobs(collection_id, started_at DESC);

-- Index for status filtering
CREATE INDEX idx_rag_ingestion_jobs_status 
ON rag.ingestion_jobs(status, started_at DESC);

-- Index for job type queries
CREATE INDEX idx_rag_ingestion_jobs_job_type 
ON rag.ingestion_jobs(job_type, started_at DESC);

-- Index for triggered_by queries
CREATE INDEX idx_rag_ingestion_jobs_triggered_by 
ON rag.ingestion_jobs(triggered_by, started_at DESC);

-- Composite index for active jobs
CREATE INDEX idx_rag_ingestion_jobs_active 
ON rag.ingestion_jobs(collection_id, status, started_at DESC)
WHERE status IN ('queued', 'running');

-- ============================================================================
-- Compression Policy (TimescaleDB)
-- ============================================================================

-- Compress chunks older than 7 days (save storage)
SELECT add_compression_policy(
    'rag.ingestion_jobs',
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- ============================================================================
-- Retention Policy (TimescaleDB)
-- ============================================================================

-- Drop chunks older than 90 days (optional, adjust as needed)
-- SELECT add_retention_policy(
--     'rag.ingestion_jobs',
--     INTERVAL '90 days',
--     if_not_exists => TRUE
-- );

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Calculate duration and metrics on completion
CREATE OR REPLACE FUNCTION rag.finalize_ingestion_job()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status != NEW.status THEN
        -- Set completion timestamp
        NEW.completed_at = NOW();
        
        -- Calculate duration
        NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
        
        -- Calculate average processing time per document
        IF NEW.documents_processed > 0 AND NEW.duration_ms > 0 THEN
            NEW.avg_processing_time_ms = NEW.duration_ms / NEW.documents_processed;
            NEW.throughput_docs_per_sec = NEW.documents_processed / (NEW.duration_ms / 1000.0);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_finalize_ingestion_job
BEFORE UPDATE ON rag.ingestion_jobs
FOR EACH ROW
EXECUTE FUNCTION rag.finalize_ingestion_job();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE rag.ingestion_jobs IS 'Document ingestion jobs (hypertable, partitioned by started_at)';
COMMENT ON COLUMN rag.ingestion_jobs.id IS 'Unique job identifier (UUID)';
COMMENT ON COLUMN rag.ingestion_jobs.job_type IS 'Job type (full_index, incremental, single_document, reindex)';
COMMENT ON COLUMN rag.ingestion_jobs.trigger_type IS 'Trigger source (manual, scheduled, file_watcher, api_request)';
COMMENT ON COLUMN rag.ingestion_jobs.status IS 'Job status (queued, running, completed, failed, cancelled)';
COMMENT ON COLUMN rag.ingestion_jobs.started_at IS 'Job start time (partitioning key for hypertable)';
COMMENT ON COLUMN rag.ingestion_jobs.duration_ms IS 'Job duration in milliseconds';
COMMENT ON COLUMN rag.ingestion_jobs.throughput_docs_per_sec IS 'Documents processed per second';

-- ============================================================================
-- Views
-- ============================================================================

-- View: Recent ingestion jobs (last 7 days)
CREATE OR REPLACE VIEW rag.v_recent_ingestion_jobs AS
SELECT 
    j.id,
    j.collection_id,
    c.name AS collection_name,
    j.job_type,
    j.trigger_type,
    j.status,
    j.started_at,
    j.completed_at,
    j.duration_ms,
    j.documents_total,
    j.documents_processed,
    j.documents_failed,
    j.throughput_docs_per_sec,
    j.error_message
FROM rag.ingestion_jobs j
INNER JOIN rag.collections c ON j.collection_id = c.id
WHERE j.started_at > NOW() - INTERVAL '7 days'
ORDER BY j.started_at DESC;

COMMENT ON VIEW rag.v_recent_ingestion_jobs IS 'Ingestion jobs from the last 7 days with collection details';

-- View: Failed ingestion jobs
CREATE OR REPLACE VIEW rag.v_failed_ingestion_jobs AS
SELECT 
    j.id,
    j.collection_id,
    c.name AS collection_name,
    j.job_type,
    j.started_at,
    j.completed_at,
    j.error_message,
    j.error_count,
    j.failed_documents
FROM rag.ingestion_jobs j
INNER JOIN rag.collections c ON j.collection_id = c.id
WHERE j.status = 'failed'
ORDER BY j.started_at DESC;

COMMENT ON VIEW rag.v_failed_ingestion_jobs IS 'Failed ingestion jobs for debugging and monitoring';

-- ============================================================================
-- Continuous Aggregates (TimescaleDB - Analytics)
-- ============================================================================

-- Continuous aggregate: Daily ingestion statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS rag.ingestion_jobs_daily_stats
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', started_at) AS day,
    collection_id,
    status,
    COUNT(*) AS job_count,
    AVG(duration_ms)::INTEGER AS avg_duration_ms,
    SUM(documents_processed) AS total_documents_processed,
    SUM(chunks_generated) AS total_chunks_generated,
    AVG(throughput_docs_per_sec) AS avg_throughput
FROM rag.ingestion_jobs
GROUP BY day, collection_id, status
WITH NO DATA;

-- Refresh policy: Update every hour for the last 7 days
SELECT add_continuous_aggregate_policy(
    'rag.ingestion_jobs_daily_stats',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

COMMENT ON MATERIALIZED VIEW rag.ingestion_jobs_daily_stats IS 'Daily aggregated statistics for ingestion jobs (continuous aggregate)';

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Get active jobs for a collection
CREATE OR REPLACE FUNCTION rag.get_active_ingestion_jobs(
    p_collection_id UUID
)
RETURNS TABLE (
    job_id UUID,
    job_type VARCHAR(50),
    status VARCHAR(50),
    started_at TIMESTAMPTZ,
    documents_processed INTEGER,
    documents_total INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.job_type,
        j.status,
        j.started_at,
        j.documents_processed,
        j.documents_total
    FROM rag.ingestion_jobs j
    WHERE j.collection_id = p_collection_id
    AND j.status IN ('queued', 'running')
    ORDER BY j.started_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rag.get_active_ingestion_jobs IS 'Get active (queued/running) ingestion jobs for a collection';

-- ============================================================================
-- Sample Queries
-- ============================================================================

/*
-- Get recent ingestion jobs
SELECT * FROM rag.v_recent_ingestion_jobs LIMIT 20;

-- Get active jobs
SELECT * FROM rag.get_active_ingestion_jobs(
    (SELECT id FROM rag.collections WHERE name = 'documentation__nomic' LIMIT 1)
);

-- Get daily statistics (last 30 days)
SELECT * FROM rag.ingestion_jobs_daily_stats
WHERE day > NOW() - INTERVAL '30 days'
ORDER BY day DESC, collection_id;

-- Get average job duration by job type (last 7 days)
SELECT 
    job_type,
    COUNT(*) AS job_count,
    AVG(duration_ms)::INTEGER AS avg_duration_ms,
    MIN(duration_ms) AS min_duration_ms,
    MAX(duration_ms) AS max_duration_ms
FROM rag.ingestion_jobs
WHERE started_at > NOW() - INTERVAL '7 days'
AND status = 'completed'
GROUP BY job_type
ORDER BY avg_duration_ms DESC;
*/

