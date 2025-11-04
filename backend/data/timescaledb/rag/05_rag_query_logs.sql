-- ============================================================================
-- RAG Services - Query Logs Table (Hypertable)
-- ============================================================================
-- Description: Tracks user queries for analytics and monitoring
-- Database: TimescaleDB (PostgreSQL + time-series extensions)
-- Schema: rag
-- Version: 1.0.0
-- Last Updated: 2025-11-02
-- ============================================================================

-- ============================================================================
-- Table: rag.query_logs (Hypertable)
-- ============================================================================
-- Purpose: Track semantic search and Q&A queries with performance metrics
-- Notes:
--   - Hypertable partitioned by executed_at (hourly chunks)
--   - Stores query text, results, and performance metrics
--   - Enables analytics on search patterns and system performance
--   - Helps identify popular queries and slow queries
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.query_logs (
    -- Primary Key
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    collection_id UUID REFERENCES rag.collections(id) ON DELETE SET NULL,
    
    -- Query Details
    query_text TEXT NOT NULL,                       -- User's search/question query
    query_type VARCHAR(50) NOT NULL,                -- Type: search, query, hybrid
    query_hash VARCHAR(64),                         -- SHA-256 hash (for deduplication)
    
    -- Timestamps (partitioning key)
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Query execution time (PARTITIONING KEY)
    
    -- User Context
    user_id VARCHAR(100),                           -- User identifier (if authenticated)
    session_id VARCHAR(100),                        -- Session identifier
    ip_address INET,                                -- Client IP address
    user_agent TEXT,                                -- Client user agent
    
    -- Request Details
    max_results INTEGER DEFAULT 5,                  -- Requested result limit
    filters JSONB DEFAULT '{}'::jsonb,              -- Applied filters
    
    -- Results
    results_count INTEGER DEFAULT 0,                -- Number of results returned
    results_summary JSONB DEFAULT '[]'::jsonb,      -- Array of result metadata (relevance, etc.)
    
    -- Performance Metrics
    duration_ms INTEGER NOT NULL,                   -- Total query duration (ms)
    embedding_time_ms INTEGER,                      -- Time to generate embedding (ms)
    vector_search_time_ms INTEGER,                  -- Time for Qdrant search (ms)
    llm_generation_time_ms INTEGER,                 -- Time for LLM answer generation (ms)
    cache_hit BOOLEAN DEFAULT FALSE,                -- Query served from cache
    
    -- GPU Metrics (if applicable)
    gpu_wait_time_ms INTEGER,                       -- Time waiting for GPU slot
    gpu_processing_time_ms INTEGER,                 -- Time using GPU
    
    -- Quality Metrics
    top_relevance_score NUMERIC(5,4),               -- Highest relevance score
    avg_relevance_score NUMERIC(5,4),               -- Average relevance score
    
    -- Error Tracking
    success BOOLEAN NOT NULL DEFAULT TRUE,          -- Query succeeded
    error_message TEXT,                             -- Error message (if failed)
    error_type VARCHAR(100),                        -- Error type/category
    
    -- Additional Metadata
    metadata JSONB DEFAULT '{}'::jsonb,             -- Flexible metadata storage
    
    -- Constraints
    CONSTRAINT valid_query_type CHECK (query_type IN ('search', 'query', 'hybrid', 'similarity')),
    CONSTRAINT positive_duration CHECK (duration_ms >= 0),
    CONSTRAINT positive_results CHECK (results_count >= 0),
    CONSTRAINT relevance_range CHECK (
        (top_relevance_score IS NULL OR (top_relevance_score >= 0 AND top_relevance_score <= 1)) AND
        (avg_relevance_score IS NULL OR (avg_relevance_score >= 0 AND avg_relevance_score <= 1))
    )
);

-- ============================================================================
-- Convert to Hypertable (Time-Series Optimization)
-- ============================================================================

-- Create hypertable with hourly chunks (1 hour)
SELECT create_hypertable(
    'rag.query_logs',
    'executed_at',
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Add primary key after hypertable creation
ALTER TABLE rag.query_logs 
ADD PRIMARY KEY (id, executed_at);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for collection queries
CREATE INDEX idx_rag_query_logs_collection_id 
ON rag.query_logs(collection_id, executed_at DESC);

-- Index for user queries
CREATE INDEX idx_rag_query_logs_user_id 
ON rag.query_logs(user_id, executed_at DESC)
WHERE user_id IS NOT NULL;

-- Index for session tracking
CREATE INDEX idx_rag_query_logs_session_id 
ON rag.query_logs(session_id, executed_at DESC)
WHERE session_id IS NOT NULL;

-- Index for query type filtering
CREATE INDEX idx_rag_query_logs_query_type 
ON rag.query_logs(query_type, executed_at DESC);

-- Index for cache hits
CREATE INDEX idx_rag_query_logs_cache_hit 
ON rag.query_logs(cache_hit, executed_at DESC);

-- Index for failed queries
CREATE INDEX idx_rag_query_logs_failures 
ON rag.query_logs(success, executed_at DESC)
WHERE success = FALSE;

-- Index for slow queries (> 1000ms)
CREATE INDEX idx_rag_query_logs_slow_queries 
ON rag.query_logs(duration_ms DESC, executed_at DESC)
WHERE duration_ms > 1000;

-- Index for query_hash (find popular queries)
CREATE INDEX idx_rag_query_logs_query_hash 
ON rag.query_logs(query_hash, executed_at DESC)
WHERE query_hash IS NOT NULL;

-- Full-text search index on query_text
CREATE INDEX idx_rag_query_logs_query_text_fts 
ON rag.query_logs USING GIN (to_tsvector('english', query_text));

-- ============================================================================
-- Compression Policy (TimescaleDB)
-- ============================================================================

-- Compress chunks older than 7 days (save storage)
SELECT add_compression_policy(
    'rag.query_logs',
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- ============================================================================
-- Retention Policy (TimescaleDB)
-- ============================================================================

-- Drop chunks older than 90 days (adjust as needed)
SELECT add_retention_policy(
    'rag.query_logs',
    INTERVAL '90 days',
    if_not_exists => TRUE
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE rag.query_logs IS 'User query logs with performance metrics (hypertable, partitioned by executed_at)';
COMMENT ON COLUMN rag.query_logs.id IS 'Unique query log identifier (UUID)';
COMMENT ON COLUMN rag.query_logs.query_text IS 'User search/question text';
COMMENT ON COLUMN rag.query_logs.query_type IS 'Query type (search, query, hybrid, similarity)';
COMMENT ON COLUMN rag.query_logs.executed_at IS 'Query execution timestamp (partitioning key)';
COMMENT ON COLUMN rag.query_logs.duration_ms IS 'Total query duration in milliseconds';
COMMENT ON COLUMN rag.query_logs.cache_hit IS 'Query served from cache (not from Qdrant/Ollama)';
COMMENT ON COLUMN rag.query_logs.top_relevance_score IS 'Highest relevance score in results (0-1)';
COMMENT ON COLUMN rag.query_logs.gpu_wait_time_ms IS 'Time waiting for GPU availability';

-- ============================================================================
-- Views
-- ============================================================================

-- View: Recent queries (last 24 hours)
CREATE OR REPLACE VIEW rag.v_recent_queries AS
SELECT 
    q.id,
    q.collection_id,
    c.name AS collection_name,
    q.query_text,
    q.query_type,
    q.executed_at,
    q.duration_ms,
    q.results_count,
    q.cache_hit,
    q.success,
    q.user_id
FROM rag.query_logs q
LEFT JOIN rag.collections c ON q.collection_id = c.id
WHERE q.executed_at > NOW() - INTERVAL '24 hours'
ORDER BY q.executed_at DESC;

COMMENT ON VIEW rag.v_recent_queries IS 'Queries from the last 24 hours';

-- View: Slow queries (> 1000ms)
CREATE OR REPLACE VIEW rag.v_slow_queries AS
SELECT 
    q.id,
    q.collection_id,
    c.name AS collection_name,
    q.query_text,
    q.executed_at,
    q.duration_ms,
    q.embedding_time_ms,
    q.vector_search_time_ms,
    q.llm_generation_time_ms,
    q.gpu_wait_time_ms
FROM rag.query_logs q
LEFT JOIN rag.collections c ON q.collection_id = c.id
WHERE q.duration_ms > 1000
AND q.executed_at > NOW() - INTERVAL '7 days'
ORDER BY q.duration_ms DESC;

COMMENT ON VIEW rag.v_slow_queries IS 'Queries taking longer than 1 second (last 7 days)';

-- View: Failed queries
CREATE OR REPLACE VIEW rag.v_failed_queries AS
SELECT 
    q.id,
    q.collection_id,
    c.name AS collection_name,
    q.query_text,
    q.executed_at,
    q.error_message,
    q.error_type,
    q.user_id
FROM rag.query_logs q
LEFT JOIN rag.collections c ON q.collection_id = c.id
WHERE q.success = FALSE
AND q.executed_at > NOW() - INTERVAL '7 days'
ORDER BY q.executed_at DESC;

COMMENT ON VIEW rag.v_failed_queries IS 'Failed queries (last 7 days)';

-- ============================================================================
-- Continuous Aggregates (TimescaleDB - Analytics)
-- ============================================================================

-- Continuous aggregate: Hourly query statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS rag.query_logs_hourly_stats
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', executed_at) AS hour,
    collection_id,
    query_type,
    COUNT(*) AS query_count,
    AVG(duration_ms)::INTEGER AS avg_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER AS p95_duration_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms)::INTEGER AS p99_duration_ms,
    AVG(results_count)::INTEGER AS avg_results_count,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) AS cache_hits,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_queries,
    AVG(top_relevance_score) AS avg_top_relevance
FROM rag.query_logs
GROUP BY hour, collection_id, query_type
WITH NO DATA;

-- Refresh policy: Update every 15 minutes for the last 7 days
SELECT add_continuous_aggregate_policy(
    'rag.query_logs_hourly_stats',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE
);

COMMENT ON MATERIALIZED VIEW rag.query_logs_hourly_stats IS 'Hourly aggregated query statistics (continuous aggregate)';

-- Continuous aggregate: Popular queries (by query_hash)
CREATE MATERIALIZED VIEW IF NOT EXISTS rag.popular_queries_daily
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', executed_at) AS day,
    query_hash,
    query_text,
    collection_id,
    COUNT(*) AS query_count,
    AVG(duration_ms)::INTEGER AS avg_duration_ms,
    AVG(results_count)::INTEGER AS avg_results_count,
    AVG(top_relevance_score) AS avg_relevance
FROM rag.query_logs
WHERE query_hash IS NOT NULL
GROUP BY day, query_hash, query_text, collection_id
WITH NO DATA;

-- Refresh policy: Update every hour for the last 30 days
SELECT add_continuous_aggregate_policy(
    'rag.popular_queries_daily',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

COMMENT ON MATERIALIZED VIEW rag.popular_queries_daily IS 'Daily aggregated popular queries (grouped by query_hash)';

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Get query statistics for a time range
CREATE OR REPLACE FUNCTION rag.get_query_statistics(
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_collection_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_queries BIGINT,
    successful_queries BIGINT,
    failed_queries BIGINT,
    avg_duration_ms INTEGER,
    p95_duration_ms INTEGER,
    cache_hit_rate NUMERIC(5,2),
    avg_results_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_queries,
        SUM(CASE WHEN success THEN 1 ELSE 0 END)::BIGINT AS successful_queries,
        SUM(CASE WHEN NOT success THEN 1 ELSE 0 END)::BIGINT AS failed_queries,
        AVG(duration_ms)::INTEGER AS avg_duration_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER AS p95_duration_ms,
        (SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) AS cache_hit_rate,
        AVG(results_count)::INTEGER AS avg_results_count
    FROM rag.query_logs
    WHERE executed_at BETWEEN p_start_time AND p_end_time
    AND (p_collection_id IS NULL OR collection_id = p_collection_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rag.get_query_statistics IS 'Get aggregated query statistics for a time range';

-- ============================================================================
-- Sample Queries
-- ============================================================================

/*
-- Get recent queries
SELECT * FROM rag.v_recent_queries LIMIT 20;

-- Get slow queries
SELECT * FROM rag.v_slow_queries LIMIT 10;

-- Get query statistics (last 24 hours)
SELECT * FROM rag.get_query_statistics(
    NOW() - INTERVAL '24 hours',
    NOW(),
    NULL  -- All collections
);

-- Get hourly statistics (last 7 days)
SELECT * FROM rag.query_logs_hourly_stats
WHERE hour > NOW() - INTERVAL '7 days'
ORDER BY hour DESC, collection_id;

-- Find most popular queries (last 7 days)
SELECT 
    query_text,
    COUNT(*) AS query_count,
    AVG(duration_ms)::INTEGER AS avg_duration_ms,
    AVG(results_count)::INTEGER AS avg_results
FROM rag.query_logs
WHERE executed_at > NOW() - INTERVAL '7 days'
AND success = TRUE
GROUP BY query_text
ORDER BY query_count DESC
LIMIT 20;

-- Analyze cache effectiveness
SELECT 
    query_type,
    COUNT(*) AS total_queries,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) AS cache_hits,
    (SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) AS cache_hit_rate_pct
FROM rag.query_logs
WHERE executed_at > NOW() - INTERVAL '24 hours'
GROUP BY query_type
ORDER BY total_queries DESC;
*/

