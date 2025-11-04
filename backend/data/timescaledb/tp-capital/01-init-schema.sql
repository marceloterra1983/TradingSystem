-- ==============================================================================
-- TP Capital Database Initialization
-- ==============================================================================
-- Database: tp_capital_db (dedicated)
-- Description: Signal ingestion from Telegram via Gateway
-- Migration from: tradingsystem.tp_capital schema (shared database)
-- ==============================================================================

-- Enable TimescaleDB extension (MUST be first!)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS signals;
CREATE SCHEMA IF NOT EXISTS forwarded_messages;
CREATE SCHEMA IF NOT EXISTS metrics;

-- Grant permissions
GRANT USAGE ON SCHEMA signals TO tp_capital;
GRANT USAGE ON SCHEMA forwarded_messages TO tp_capital;
GRANT USAGE ON SCHEMA metrics TO tp_capital;

GRANT ALL PRIVILEGES ON SCHEMA signals TO tp_capital;
GRANT ALL PRIVILEGES ON SCHEMA forwarded_messages TO tp_capital;
GRANT ALL PRIVILEGES ON SCHEMA metrics TO tp_capital;

-- ==============================================================================
-- Schema: signals
-- ==============================================================================

-- Table: tp_capital_signals
CREATE TABLE IF NOT EXISTS signals.tp_capital_signals (
    id SERIAL,
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

-- Create TimescaleDB hypertable (optimized for time-series queries)
SELECT create_hypertable(
    'signals.tp_capital_signals',
    'ingested_at',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_signals_asset 
    ON signals.tp_capital_signals (asset, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_channel 
    ON signals.tp_capital_signals (channel, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_ts 
    ON signals.tp_capital_signals (ts DESC);

-- Index for duplicate detection (raw_message + channel)
CREATE INDEX IF NOT EXISTS idx_signals_duplicate_check 
    ON signals.tp_capital_signals (raw_message, channel);

-- Index for dashboard queries (most recent signals)
CREATE INDEX IF NOT EXISTS idx_signals_recent 
    ON signals.tp_capital_signals (ingested_at DESC, asset, channel);

-- Composite index for filtered queries
CREATE INDEX IF NOT EXISTS idx_signals_composite 
    ON signals.tp_capital_signals (channel, asset, ingested_at DESC);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE signals.tp_capital_signals TO tp_capital;
GRANT USAGE, SELECT ON SEQUENCE signals.tp_capital_signals_id_seq TO tp_capital;

-- ==============================================================================
-- Schema: forwarded_messages
-- ==============================================================================

-- Table: forwarded_messages
CREATE TABLE IF NOT EXISTS forwarded_messages.messages (
    id SERIAL,
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
    
    -- Constraints (must include partitioning column for hypertable)
    CONSTRAINT unique_forwarded_message UNIQUE (channel_id, message_id, original_timestamp, forwarded_at)
);

-- Create TimescaleDB hypertable
SELECT create_hypertable(
    'forwarded_messages.messages',
    'forwarded_at',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '7 days'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forwarded_channel 
    ON forwarded_messages.messages (channel_id, forwarded_at DESC);

CREATE INDEX IF NOT EXISTS idx_forwarded_message_id 
    ON forwarded_messages.messages (message_id, channel_id);

CREATE INDEX IF NOT EXISTS idx_forwarded_timestamp 
    ON forwarded_messages.messages (original_timestamp DESC);

-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_forwarded_metadata 
    ON forwarded_messages.messages USING GIN (metadata);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE forwarded_messages.messages TO tp_capital;
GRANT USAGE, SELECT ON SEQUENCE forwarded_messages.messages_id_seq TO tp_capital;

-- ==============================================================================
-- Schema: metrics
-- ==============================================================================

-- Table: processing_stats
CREATE TABLE IF NOT EXISTS metrics.processing_stats (
    id SERIAL,
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

-- Create TimescaleDB hypertable
SELECT create_hypertable(
    'metrics.processing_stats',
    'timestamp',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp 
    ON metrics.processing_stats (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_worker 
    ON metrics.processing_stats (worker_id, timestamp DESC);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE metrics.processing_stats TO tp_capital;
GRANT USAGE, SELECT ON SEQUENCE metrics.processing_stats_id_seq TO tp_capital;

-- ==============================================================================
-- Data Retention Policies
-- ==============================================================================

-- Signals: Keep 90 days of data
SELECT add_retention_policy(
    'signals.tp_capital_signals',
    INTERVAL '90 days',
    if_not_exists => TRUE
);

-- Forwarded messages: Keep 30 days of data
SELECT add_retention_policy(
    'forwarded_messages.messages',
    INTERVAL '30 days',
    if_not_exists => TRUE
);

-- Metrics: Keep 30 days of data
SELECT add_retention_policy(
    'metrics.processing_stats',
    INTERVAL '30 days',
    if_not_exists => TRUE
);

-- ==============================================================================
-- Continuous Aggregates (for performance)
-- ==============================================================================

-- Hourly signal counts by asset
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics.signals_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', ingested_at) AS hour,
    asset,
    channel,
    COUNT(*) AS signal_count,
    AVG(buy_max - buy_min) AS avg_range,
    AVG(target_final - buy_max) AS avg_upside,
    AVG(buy_min - stop) AS avg_downside
FROM signals.tp_capital_signals
GROUP BY hour, asset, channel
WITH NO DATA;

-- Refresh policy (every 15 minutes)
SELECT add_continuous_aggregate_policy(
    'metrics.signals_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE
);

-- Grant permissions
GRANT SELECT ON metrics.signals_hourly TO tp_capital;

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
    (target_final - buy_max) / NULLIF(buy_max, 0) * 100 AS upside_pct,
    (buy_min - stop) / NULLIF(buy_min, 0) * 100 AS downside_pct
FROM signals.tp_capital_signals
WHERE ingested_at >= NOW() - INTERVAL '24 hours'
ORDER BY ingested_at DESC;

-- View: Signal statistics by asset
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
GROUP BY asset
ORDER BY total_signals DESC;

-- Grant view permissions
GRANT SELECT ON signals.recent_signals TO tp_capital;
GRANT SELECT ON metrics.signal_stats_by_asset TO tp_capital;

-- ==============================================================================
-- Performance Extensions
-- ==============================================================================

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Reset stats
SELECT pg_stat_statements_reset();

-- ==============================================================================
-- Verification Queries
-- ==============================================================================

-- Display table info
\echo '========================================';
\echo 'Schema: signals';
\echo '========================================';
\d signals.tp_capital_signals;

\echo '========================================';
\echo 'Schema: forwarded_messages';
\echo '========================================';
\d forwarded_messages.messages;

\echo '========================================';
\echo 'Schema: metrics';
\echo '========================================';
\d metrics.processing_stats;

\echo '========================================';
\echo 'Hypertables:';
\echo '========================================';
SELECT * FROM timescaledb_information.hypertables;

\echo '========================================';
\echo 'Continuous Aggregates:';
\echo '========================================';
SELECT * FROM timescaledb_information.continuous_aggregates;

\echo '========================================';
\echo 'Retention Policies:';
\echo '========================================';
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';

\echo '========================================';
\echo 'TP Capital Database Initialized Successfully';
\echo '========================================';

