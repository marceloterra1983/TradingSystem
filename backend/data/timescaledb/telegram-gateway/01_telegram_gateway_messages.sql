-- Telegram Gateway Messages Hypertable
-- Stores all Telegram messages ingested by the gateway with operational metadata

CREATE SCHEMA IF NOT EXISTS telegram_gateway;
SET search_path TO telegram_gateway, public;

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS telegram_gateway.messages (
    id UUID DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL,
    message_id BIGINT NOT NULL,
    thread_id BIGINT,
    source TEXT NOT NULL DEFAULT 'unknown',
    message_type TEXT NOT NULL DEFAULT 'channel_post',
    text TEXT,
    caption TEXT,
    media_type TEXT,
    media_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'received' CHECK (
        status IN (
            'received',
            'retrying',
            'published',
            'queued',
            'failed',
            'reprocess_pending',
            'reprocessed',
            'deleted'
        )
    ),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    telegram_date TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    queued_at TIMESTAMPTZ,
    reprocess_requested_at TIMESTAMPTZ,
    reprocessed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE telegram_gateway.messages
    DROP CONSTRAINT IF EXISTS messages_pkey;

ALTER TABLE telegram_gateway.messages
    DROP CONSTRAINT IF EXISTS telegram_gateway_messages_pkey;

ALTER TABLE telegram_gateway.messages
    ADD CONSTRAINT telegram_gateway_messages_pkey PRIMARY KEY (id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_gateway_messages_unique
    ON telegram_gateway.messages (channel_id, message_id, created_at);

CREATE INDEX IF NOT EXISTS idx_telegram_gateway_messages_status
    ON telegram_gateway.messages (status);

CREATE INDEX IF NOT EXISTS idx_telegram_gateway_messages_received_at
    ON telegram_gateway.messages (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_gateway_messages_published_at
    ON telegram_gateway.messages (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_gateway_messages_source
    ON telegram_gateway.messages (source, received_at DESC);

SELECT create_hypertable(
    'telegram_gateway.messages',
    'created_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE,
    migrate_data => TRUE
);

ALTER TABLE telegram_gateway.messages
    SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'channel_id',
        timescaledb.compress_orderby = 'created_at'
    );

SELECT add_retention_policy(
    'telegram_gateway.messages',
    INTERVAL '90 days',
    if_not_exists => TRUE
);

SELECT add_compression_policy(
    'telegram_gateway.messages',
    INTERVAL '14 days',
    if_not_exists => TRUE
);

CREATE OR REPLACE FUNCTION telegram_gateway.update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_telegram_gateway_messages_updated_at ON telegram_gateway.messages;

CREATE TRIGGER trigger_telegram_gateway_messages_updated_at
    BEFORE UPDATE ON telegram_gateway.messages
    FOR EACH ROW
    EXECUTE FUNCTION telegram_gateway.update_messages_updated_at();
