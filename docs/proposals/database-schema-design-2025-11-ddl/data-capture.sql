-- =============================================================================
-- TradingSystem - Data Capture Schema
-- Database: APPS-DATA-CAPTURE
-- Schema: data_capture
-- Technology: TimescaleDB (PostgreSQL 14+)
-- Created: 2025-11-01
-- =============================================================================

-- Create database (run as superuser)
-- CREATE DATABASE "APPS-DATA-CAPTURE" WITH OWNER timescale ENCODING 'UTF8';

-- Connect to database
\c APPS-DATA-CAPTURE

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Create schema
CREATE SCHEMA IF NOT EXISTS data_capture;

-- Set search path
SET search_path TO data_capture, public;

-- =============================================================================
-- TABLE: instruments
-- Purpose: Instrument master data
-- =============================================================================

CREATE TABLE data_capture.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Instrument Identity
  symbol VARCHAR(50) UNIQUE NOT NULL,
  exchange VARCHAR(20) NOT NULL,
  asset_class VARCHAR(20) NOT NULL CHECK (
    asset_class IN ('stock', 'future', 'fx', 'crypto', 'option')
  ),
  
  -- Details
  name VARCHAR(255) NOT NULL,
  isin VARCHAR(12) NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  lot_size DECIMAL(18,8) DEFAULT 1,
  tick_size DECIMAL(18,8) NOT NULL,
  
  -- Trading Hours
  trading_hours JSONB NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'INACTIVE', 'DELISTED', 'HALTED')
  ),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE data_capture.instruments IS 'Instrument master data with trading specifications';

CREATE INDEX idx_instruments_exchange ON data_capture.instruments (exchange);
CREATE INDEX idx_instruments_asset_class ON data_capture.instruments (asset_class);
CREATE INDEX idx_instruments_status ON data_capture.instruments (status);

-- =============================================================================
-- TABLE: market_ticks (Hypertable)
-- Purpose: Ultra-high-frequency tick data
-- =============================================================================

CREATE TABLE data_capture.market_ticks (
  -- Identity
  id BIGSERIAL,
  
  -- Instrument
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20) NOT NULL,
  
  -- Tick Data
  price DECIMAL(18,8) NOT NULL,
  volume DECIMAL(18,8) NOT NULL,
  aggressor VARCHAR(10) NOT NULL CHECK (aggressor IN ('BUY', 'SELL', 'NEUTRAL')),
  
  -- Timing (nanosecond precision)
  tick_time TIMESTAMPTZ NOT NULL,
  received_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Source
  source VARCHAR(50) NOT NULL DEFAULT 'ProfitDLL',
  
  -- Primary key
  PRIMARY KEY (tick_time, symbol, id)
);

COMMENT ON TABLE data_capture.market_ticks IS 'High-frequency market data with 5-minute partitions';

-- Convert to hypertable with 5-minute partitioning (ultra-high frequency)
SELECT create_hypertable('data_capture.market_ticks', 'tick_time',
  chunk_time_interval => INTERVAL '5 minutes');

-- Indexes
CREATE INDEX idx_market_ticks_symbol ON data_capture.market_ticks (symbol, tick_time DESC);

-- Compression policy (compress after 1 hour)
ALTER TABLE data_capture.market_ticks SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol',
  timescaledb.compress_orderby = 'tick_time DESC'
);

SELECT add_compression_policy('data_capture.market_ticks', INTERVAL '1 hour');

-- Retention policy (keep 30 days online, export to Parquet)
SELECT add_retention_policy('data_capture.market_ticks', INTERVAL '30 days');

-- =============================================================================
-- TABLE: order_book_snapshots (Hypertable)
-- Purpose: Order book depth snapshots (L2 data)
-- =============================================================================

CREATE TABLE data_capture.order_book_snapshots (
  -- Identity
  id BIGSERIAL,
  
  -- Instrument
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20) NOT NULL,
  
  -- Snapshot Data (JSONB for flexibility)
  bids JSONB NOT NULL,
  asks JSONB NOT NULL,
  
  -- Aggregated Stats
  best_bid DECIMAL(18,8) NOT NULL,
  best_ask DECIMAL(18,8) NOT NULL,
  spread DECIMAL(18,8) NOT NULL,
  total_bid_volume DECIMAL(18,2) NOT NULL,
  total_ask_volume DECIMAL(18,2) NOT NULL,
  
  -- Timing
  snapshot_time TIMESTAMPTZ NOT NULL,
  received_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (snapshot_time, symbol, id)
);

COMMENT ON TABLE data_capture.order_book_snapshots IS 'Order book L2 data with 15-minute partitions';

SELECT create_hypertable('data_capture.order_book_snapshots', 'snapshot_time',
  chunk_time_interval => INTERVAL '15 minutes');

CREATE INDEX idx_order_book_symbol ON data_capture.order_book_snapshots 
  (symbol, snapshot_time DESC);

-- Compression
ALTER TABLE data_capture.order_book_snapshots SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol',
  timescaledb.compress_orderby = 'snapshot_time DESC'
);

SELECT add_compression_policy('data_capture.order_book_snapshots', INTERVAL '2 hours');
SELECT add_retention_policy('data_capture.order_book_snapshots', INTERVAL '7 days');

-- =============================================================================
-- TABLE: profitdll_callbacks (Hypertable)
-- Purpose: Log all ProfitDLL callback events
-- =============================================================================

CREATE TABLE data_capture.profitdll_callbacks (
  id BIGSERIAL,
  
  -- Callback Type
  callback_type VARCHAR(50) NOT NULL CHECK (
    callback_type IN ('STATE', 'TRADE', 'OFFER_BOOK', 'PRICE_DEPTH', 'ORDER')
  ),
  
  -- Payload
  payload JSONB NOT NULL,
  
  -- Timing
  callback_time TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Processing Status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'PROCESSED', 'FAILED', 'SKIPPED')
  ),
  error_message TEXT NULL,
  
  PRIMARY KEY (callback_time, callback_type, id)
);

COMMENT ON TABLE data_capture.profitdll_callbacks IS 'ProfitDLL callback log for debugging (3-day retention)';

SELECT create_hypertable('data_capture.profitdll_callbacks', 'callback_time',
  chunk_time_interval => INTERVAL '1 hour');

CREATE INDEX idx_callbacks_type ON data_capture.profitdll_callbacks 
  (callback_type, callback_time DESC);
CREATE INDEX idx_callbacks_status ON data_capture.profitdll_callbacks 
  (status, callback_time DESC) WHERE status IN ('PENDING', 'FAILED');

-- Short retention (3 days for debugging)
SELECT add_retention_policy('data_capture.profitdll_callbacks', INTERVAL '3 days');

-- =============================================================================
-- TABLE: ohlcv_bars (Hypertable)
-- Purpose: Pre-aggregated OHLCV candles
-- =============================================================================

CREATE TABLE data_capture.ohlcv_bars (
  id BIGSERIAL,
  
  -- Instrument
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20) NOT NULL,
  
  -- Timeframe
  timeframe VARCHAR(10) NOT NULL CHECK (
    timeframe IN ('1m', '5m', '15m', '1h', '4h', '1d')
  ),
  
  -- OHLCV Data
  open DECIMAL(18,8) NOT NULL,
  high DECIMAL(18,8) NOT NULL,
  low DECIMAL(18,8) NOT NULL,
  close DECIMAL(18,8) NOT NULL,
  volume DECIMAL(18,2) NOT NULL,
  
  -- Statistics
  trade_count INTEGER DEFAULT 0,
  vwap DECIMAL(18,8) NULL,
  
  -- Timing
  bar_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (bar_time, symbol, timeframe, id),
  UNIQUE (bar_time, symbol, timeframe)
);

COMMENT ON TABLE data_capture.ohlcv_bars IS 'Pre-aggregated OHLCV candles for analytics';

SELECT create_hypertable('data_capture.ohlcv_bars', 'bar_time',
  chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_ohlcv_symbol_timeframe ON data_capture.ohlcv_bars 
  (symbol, timeframe, bar_time DESC);

-- Compression after 7 days
ALTER TABLE data_capture.ohlcv_bars SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol,timeframe',
  timescaledb.compress_orderby = 'bar_time DESC'
);

SELECT add_compression_policy('data_capture.ohlcv_bars', INTERVAL '7 days');

-- Retention: 2 years (export to Parquet for long-term storage)
SELECT add_retention_policy('data_capture.ohlcv_bars', INTERVAL '2 years');

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION data_capture.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_instruments_update_timestamp
  BEFORE UPDATE ON data_capture.instruments
  FOR EACH ROW EXECUTE FUNCTION data_capture.update_timestamp();

-- =============================================================================
-- MATERIALIZED VIEWS
-- =============================================================================

-- Real-time tick statistics (1-minute buckets)
CREATE MATERIALIZED VIEW data_capture.mv_tick_stats_1m
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 minute', tick_time) as bucket_time,
  symbol,
  COUNT(*) as tick_count,
  FIRST(price, tick_time) as open_price,
  MAX(price) as high_price,
  MIN(price) as low_price,
  LAST(price, tick_time) as close_price,
  SUM(volume) as total_volume,
  SUM(CASE WHEN aggressor = 'BUY' THEN volume ELSE 0 END) as buy_volume,
  SUM(CASE WHEN aggressor = 'SELL' THEN volume ELSE 0 END) as sell_volume
FROM data_capture.market_ticks
GROUP BY bucket_time, symbol
WITH NO DATA;

COMMENT ON MATERIALIZED VIEW data_capture.mv_tick_stats_1m IS 'Real-time 1-minute tick statistics';

-- Refresh policy: every 30 seconds
SELECT add_continuous_aggregate_policy('mv_tick_stats_1m',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '10 seconds',
  schedule_interval => INTERVAL '30 seconds');

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT USAGE ON SCHEMA data_capture TO timescale;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA data_capture TO timescale;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA data_capture TO timescale;

-- =============================================================================
-- END OF SCRIPT
-- =============================================================================









