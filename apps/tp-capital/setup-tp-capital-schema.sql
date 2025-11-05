-- TP Capital Database Schema Setup
-- Database: APPS-TPCAPITAL
-- Run with: docker compose -f tools/compose/docker-compose.tp-capital-stack.yml exec tp-capital-timescaledb \
--   psql -U tp_capital -d tp_capital_db -f /app/setup-tp-capital-schema.sql

-- Create schema
CREATE SCHEMA IF NOT EXISTS tp_capital;

-- Grant permissions
GRANT USAGE ON SCHEMA tp_capital TO timescale;
GRANT ALL PRIVILEGES ON SCHEMA tp_capital TO timescale;

-- Create signals table
CREATE TABLE IF NOT EXISTS tp_capital.tp_capital_signals (
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
    source TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ts BIGINT NOT NULL
);

-- Create TimescaleDB hypertable (optimized for time-series queries)
SELECT create_hypertable(
    'tp_capital.tp_capital_signals',
    'ingested_at',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_signals_asset ON tp_capital.tp_capital_signals (asset, ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_channel ON tp_capital.tp_capital_signals (channel, ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_ts ON tp_capital.tp_capital_signals (ts DESC);
-- Index for duplicate detection (raw_message + channel)
CREATE INDEX IF NOT EXISTS idx_signals_duplicate_check ON tp_capital.tp_capital_signals (raw_message, channel);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tp_capital.tp_capital_signals TO timescale;
GRANT USAGE, SELECT ON SEQUENCE tp_capital.tp_capital_signals_id_seq TO timescale;

-- Display table info
\d tp_capital.tp_capital_signals
