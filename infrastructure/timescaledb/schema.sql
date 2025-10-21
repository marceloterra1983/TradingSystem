CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS trading_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id TEXT NOT NULL,
    source TEXT NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL,
    confidence NUMERIC(5,2),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('trading_signals', 'created_at', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS trading_signals_symbol_idx ON trading_signals (symbol, created_at DESC);

CREATE TABLE IF NOT EXISTS executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    price NUMERIC(18,6) NOT NULL,
    quantity NUMERIC(18,6) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT create_hypertable('executions', 'created_at', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS performance_metrics (
    bucket TIMESTAMPTZ NOT NULL,
    metric TEXT NOT NULL,
    value NUMERIC NOT NULL,
    tags JSONB DEFAULT '{}'::JSONB,
    PRIMARY KEY (bucket, metric)
);
SELECT create_hypertable('performance_metrics', 'bucket', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS sync_control (
    stream TEXT PRIMARY KEY,
    last_synced TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
