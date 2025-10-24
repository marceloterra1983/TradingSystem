-- TP Capital Signals Table for TimescaleDB
-- Stores Telegram signals from TP Capital channel with time-series capabilities

CREATE TABLE IF NOT EXISTS tp_capital_signals (
    id UUID DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL,
    channel TEXT,
    signal_type TEXT,
    asset TEXT NOT NULL,
    buy_min NUMERIC(18,6),
    buy_max NUMERIC(18,6),
    target_1 NUMERIC(18,6),
    target_2 NUMERIC(18,6),
    target_final NUMERIC(18,6),
    stop NUMERIC(18,6),
    raw_message TEXT,
    source TEXT DEFAULT 'telegram',
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, ts)
);

-- Convert to TimescaleDB hypertable for time-series optimization
-- Partition by day for efficient historical queries
SELECT create_hypertable('tp_capital_signals', 'ts', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_asset ON tp_capital_signals (asset, ts DESC);
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_channel ON tp_capital_signals (channel, ts DESC);
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_signal_type ON tp_capital_signals (signal_type, ts DESC);
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_source ON tp_capital_signals (source, ts DESC);
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_ingested_at ON tp_capital_signals (ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_created_at ON tp_capital_signals (created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_channel_type ON tp_capital_signals (channel, signal_type, ts DESC);
CREATE INDEX IF NOT EXISTS idx_tp_capital_signals_asset_type ON tp_capital_signals (asset, signal_type, ts DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tp_capital_signals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_tp_capital_signals_updated_at
    BEFORE UPDATE ON tp_capital_signals
    FOR EACH ROW
    EXECUTE FUNCTION update_tp_capital_signals_updated_at();

-- Telegram Bots Table
CREATE TABLE IF NOT EXISTS telegram_bots (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    token TEXT NOT NULL,
    bot_type VARCHAR(50) NOT NULL DEFAULT 'Sender',
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_bots_status ON telegram_bots (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_bot_type ON telegram_bots (bot_type);

-- Trigger for telegram_bots updated_at
CREATE TRIGGER trigger_telegram_bots_updated_at
    BEFORE UPDATE ON telegram_bots
    FOR EACH ROW
    EXECUTE FUNCTION update_tp_capital_signals_updated_at();

-- Telegram Channels Table
CREATE TABLE IF NOT EXISTS telegram_channels (
    id VARCHAR(100) PRIMARY KEY,
    label VARCHAR(200) NOT NULL,
    channel_id BIGINT NOT NULL,
    channel_type VARCHAR(50) NOT NULL DEFAULT 'source' CHECK (channel_type IN ('source', 'destination')),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    signal_count INTEGER DEFAULT 0,
    last_signal TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_channels_status ON telegram_channels (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_type ON telegram_channels (channel_type, status);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_channel_id ON telegram_channels (channel_id);

-- Trigger for telegram_channels updated_at
CREATE TRIGGER trigger_telegram_channels_updated_at
    BEFORE UPDATE ON telegram_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_tp_capital_signals_updated_at();

