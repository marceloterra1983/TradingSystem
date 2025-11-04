-- ==============================================================================
-- TP Capital Database Initialization (Neon PostgreSQL)
-- ==============================================================================
-- Database: tp_capital_db (dedicated)
-- Description: Signal ingestion from Telegram via Gateway
-- Engine: Neon PostgreSQL (serverless, no TimescaleDB extensions)
-- ==============================================================================

-- Create schemas
CREATE SCHEMA IF NOT EXISTS signals;
CREATE SCHEMA IF NOT EXISTS forwarded_messages;
CREATE SCHEMA IF NOT EXISTS metrics;

-- Grant permissions
GRANT USAGE ON SCHEMA signals TO postgres;
GRANT USAGE ON SCHEMA forwarded_messages TO postgres;
GRANT USAGE ON SCHEMA metrics TO postgres;

GRANT ALL PRIVILEGES ON SCHEMA signals TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA forwarded_messages TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA metrics TO postgres;

-- ==============================================================================
-- Schema: signals
-- ==============================================================================

-- Table: tp_capital_signals
CREATE TABLE IF NOT EXISTS signals.tp_capital_signals (
    id SERIAL PRIMARY KEY,
    channel TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    asset TEXT NOT NULL,
    buy_min DECIMAL(12, 2),
    buy_max DECIMAL(12, 2),
    target_1 DECIMAL(12, 2),
    target_2 DECIMAL(12, 2),
    target_final DECIMAL(12, 2),
    stop DECIMAL(12, 2),
    raw_message TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'telegram',
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ts BIGINT NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns (optimized for Neon)
CREATE INDEX IF NOT EXISTS idx_signals_ingested_at 
    ON signals.tp_capital_signals (ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_asset 
    ON signals.tp_capital_signals (asset, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_channel 
    ON signals.tp_capital_signals (channel, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_ts 
    ON signals.tp_capital_signals (ts DESC);

-- Index for duplicate detection (raw_message + channel)
CREATE INDEX IF NOT EXISTS idx_signals_duplicate_check 
    ON signals.tp_capital_signals (raw_message, channel);

-- Composite index for dashboard queries (most recent signals)
CREATE INDEX IF NOT EXISTS idx_signals_dashboard 
    ON signals.tp_capital_signals (ingested_at DESC, asset, channel)
    WHERE ingested_at >= NOW() - INTERVAL '7 days';

-- Partial index for recent data (last 30 days)
CREATE INDEX IF NOT EXISTS idx_signals_recent_partial 
    ON signals.tp_capital_signals (ingested_at DESC)
    WHERE ingested_at >= NOW() - INTERVAL '30 days';

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE signals.tp_capital_signals TO postgres;
GRANT USAGE, SELECT ON SEQUENCE signals.tp_capital_signals_id_seq TO postgres;

-- ==============================================================================
-- Schema: forwarded_messages
-- ==============================================================================

-- Table: forwarded_messages
CREATE TABLE IF NOT EXISTS forwarded_messages.messages (
    id SERIAL PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id BIGINT NOT NULL,
    text TEXT,
    photo_id TEXT,
    video_id TEXT,
    file_id TEXT,
    media_type TEXT,
    original_timestamp TIMESTAMPTZ NOT NULL,
    forwarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT unique_forwarded_message UNIQUE (channel_id, message_id, original_timestamp)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forwarded_forwarded_at 
    ON forwarded_messages.messages (forwarded_at DESC);

CREATE INDEX IF NOT EXISTS idx_forwarded_channel 
    ON forwarded_messages.messages (channel_id, forwarded_at DESC);

CREATE INDEX IF NOT EXISTS idx_forwarded_message_id 
    ON forwarded_messages.messages (message_id, channel_id);

CREATE INDEX IF NOT EXISTS idx_forwarded_timestamp 
    ON forwarded_messages.messages (original_timestamp DESC);

-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_forwarded_metadata 
    ON forwarded_messages.messages USING GIN (metadata);

-- Partial index for recent data
CREATE INDEX IF NOT EXISTS idx_forwarded_recent 
    ON forwarded_messages.messages (forwarded_at DESC)
    WHERE forwarded_at >= NOW() - INTERVAL '30 days';

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE forwarded_messages.messages TO postgres;
GRANT USAGE, SELECT ON SEQUENCE forwarded_messages.messages_id_seq TO postgres;

-- ==============================================================================
-- Schema: metrics
-- ==============================================================================

-- Table: processing_stats
CREATE TABLE IF NOT EXISTS metrics.processing_stats (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Counts
    messages_fetched INTEGER NOT NULL DEFAULT 0,
    signals_parsed INTEGER NOT NULL DEFAULT 0,
    signals_inserted INTEGER NOT NULL DEFAULT 0,
    errors_count INTEGER NOT NULL DEFAULT 0,
    
    -- Latencies (milliseconds)
    fetch_duration_ms INTEGER,
    parse_duration_ms INTEGER,
    insert_duration_ms INTEGER,
    
    -- Batch info
    batch_size INTEGER,
    batch_id TEXT,
    
    -- Metadata
    worker_id TEXT,
    metadata JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp 
    ON metrics.processing_stats (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_worker 
    ON metrics.processing_stats (worker_id, timestamp DESC);

-- Partial index for recent metrics (last 7 days)
CREATE INDEX IF NOT EXISTS idx_metrics_recent 
    ON metrics.processing_stats (timestamp DESC)
    WHERE timestamp >= NOW() - INTERVAL '7 days';

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE metrics.processing_stats TO postgres;
GRANT USAGE, SELECT ON SEQUENCE metrics.processing_stats_id_seq TO postgres;

-- ==============================================================================
-- Data Retention (Manual cleanup via cron - Neon doesn't have native policies)
-- ==============================================================================

-- Function: Delete old signals (> 90 days)
CREATE OR REPLACE FUNCTION signals.cleanup_old_signals()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM signals.tp_capital_signals
    WHERE ingested_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Delete old forwarded messages (> 30 days)
CREATE OR REPLACE FUNCTION forwarded_messages.cleanup_old_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM forwarded_messages.messages
    WHERE forwarded_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Delete old metrics (> 30 days)
CREATE OR REPLACE FUNCTION metrics.cleanup_old_stats()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM metrics.processing_stats
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Schedule these functions via application cron or pg_cron extension
-- Example (if pg_cron is available):
-- SELECT cron.schedule('cleanup-signals', '0 2 * * *', 'SELECT signals.cleanup_old_signals()');
-- SELECT cron.schedule('cleanup-messages', '0 2 * * *', 'SELECT forwarded_messages.cleanup_old_messages()');
-- SELECT cron.schedule('cleanup-metrics', '0 2 * * *', 'SELECT metrics.cleanup_old_stats()');

-- ==============================================================================
-- Materialized Views (for performance - refreshed manually or via cron)
-- ==============================================================================

-- Hourly signal counts by asset (last 7 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics.signals_hourly AS
SELECT
    DATE_TRUNC('hour', ingested_at) AS hour,
    asset,
    channel,
    COUNT(*) AS signal_count,
    AVG(buy_max - buy_min) AS avg_range,
    AVG(target_final - buy_max) AS avg_upside,
    AVG(buy_min - stop) AS avg_downside
FROM signals.tp_capital_signals
WHERE ingested_at >= NOW() - INTERVAL '7 days'
GROUP BY hour, asset, channel
ORDER BY hour DESC;

-- Create unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_hourly_unique
    ON metrics.signals_hourly (hour, asset, channel);

-- Grant permissions
GRANT SELECT ON metrics.signals_hourly TO postgres;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION metrics.refresh_hourly_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY metrics.signals_hourly;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Schedule refresh via application cron
-- Example: SELECT metrics.refresh_hourly_stats() every 15 minutes

-- ==============================================================================
-- Functions & Triggers
-- ==============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on signals
CREATE TRIGGER update_signals_updated_at
    BEFORE UPDATE ON signals.tp_capital_signals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Views (for convenience)
-- ==============================================================================

-- View: Recent signals (last 24 hours)
CREATE OR REPLACE VIEW signals.recent_signals AS
SELECT
    id,
    asset,
    channel,
    signal_type,
    buy_min,
    buy_max,
    target_1,
    target_2,
    target_final,
    stop,
    ingested_at,
    CASE 
        WHEN buy_max > 0 THEN (target_final - buy_max) / buy_max * 100
        ELSE NULL
    END AS upside_pct,
    CASE 
        WHEN buy_min > 0 THEN (buy_min - stop) / buy_min * 100
        ELSE NULL
    END AS downside_pct
FROM signals.tp_capital_signals
WHERE ingested_at >= NOW() - INTERVAL '24 hours'
ORDER BY ingested_at DESC;

-- View: Signal statistics by asset (last 30 days)
CREATE OR REPLACE VIEW metrics.signal_stats_by_asset AS
SELECT
    asset,
    COUNT(*) AS total_signals,
    AVG(buy_max - buy_min) AS avg_range,
    AVG(target_final - buy_max) AS avg_upside,
    AVG(buy_min - stop) AS avg_downside,
    MIN(ingested_at) AS first_signal,
    MAX(ingested_at) AS last_signal
FROM signals.tp_capital_signals
WHERE ingested_at >= NOW() - INTERVAL '30 days'
GROUP BY asset
ORDER BY total_signals DESC;

-- View: Daily signal counts (last 30 days)
CREATE OR REPLACE VIEW metrics.daily_signal_counts AS
SELECT
    DATE(ingested_at) AS date,
    asset,
    COUNT(*) AS signal_count
FROM signals.tp_capital_signals
WHERE ingested_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(ingested_at), asset
ORDER BY date DESC, asset;

-- Grant view permissions
GRANT SELECT ON signals.recent_signals TO postgres;
GRANT SELECT ON metrics.signal_stats_by_asset TO postgres;
GRANT SELECT ON metrics.daily_signal_counts TO postgres;

-- ==============================================================================
-- Performance Extensions (Neon-compatible)
-- ==============================================================================

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable pg_trgm for text search (optional)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Reset stats
SELECT pg_stat_statements_reset();

-- ==============================================================================
-- Verification Queries
-- ==============================================================================

\echo '========================================';
\echo 'TP Capital Database (Neon PostgreSQL)';
\echo '========================================';
\echo '';

\echo 'Schema: signals';
\echo '----------------------------------------';
\d signals.tp_capital_signals;
\echo '';

\echo 'Schema: forwarded_messages';
\echo '----------------------------------------';
\d forwarded_messages.messages;
\echo '';

\echo 'Schema: metrics';
\echo '----------------------------------------';
\d metrics.processing_stats;
\echo '';

\echo 'Materialized Views:';
\echo '----------------------------------------';
SELECT schemaname, matviewname, hasindexes 
FROM pg_matviews 
WHERE schemaname IN ('signals', 'metrics');
\echo '';

\echo 'Indexes:';
\echo '----------------------------------------';
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname IN ('signals', 'forwarded_messages', 'metrics')
ORDER BY schemaname, tablename, indexname;
\echo '';

\echo '========================================';
\echo 'TP Capital Database Initialized Successfully';
\echo '========================================';
\echo '';
\echo 'Neon PostgreSQL Features:';
\echo '  ✓ Serverless compute (auto-scaling)';
\echo '  ✓ Separation of storage and compute';
\echo '  ✓ Fast startup (< 10s)';
\echo '  ✓ PostgreSQL standard (no vendor lock-in)';
\echo '';
\echo 'Next Steps:';
\echo '  1. Schedule cleanup functions via cron';
\echo '  2. Schedule materialized view refresh';
\echo '  3. Monitor query performance with pg_stat_statements';
\echo '========================================';

