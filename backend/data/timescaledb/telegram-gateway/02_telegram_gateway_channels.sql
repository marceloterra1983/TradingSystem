-- Telegram Gateway Channels Registry
-- Stores the list of Telegram channels allowed for ingestion

CREATE TABLE IF NOT EXISTS telegram_gateway.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id BIGINT NOT NULL UNIQUE,
    label TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_gateway_channels_active
    ON telegram_gateway.channels (is_active, channel_id);

CREATE OR REPLACE FUNCTION telegram_gateway.update_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_telegram_gateway_channels_updated_at
    BEFORE UPDATE ON telegram_gateway.channels
    FOR EACH ROW
    EXECUTE FUNCTION telegram_gateway.update_channels_updated_at();
