-- ============================================================================
-- TP Capital Forwarded Messages Table
-- ============================================================================
-- Description: Stores Telegram messages forwarded from source channels
--              with idempotency checks to prevent duplicates
-- Schema: tp_capital
-- Hypertable: Yes (partitioned by original_timestamp)
-- ============================================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS tp_capital.forwarded_messages (
  id SERIAL,
  channel_id TEXT NOT NULL,
  message_id BIGINT NOT NULL,
  message_text TEXT,
  original_timestamp TIMESTAMPTZ NOT NULL,
  photos TEXT,  -- JSON array stored as TEXT
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, original_timestamp),
  -- Unique constraint for idempotency
  UNIQUE (channel_id, message_id, original_timestamp)
);

-- Create hypertable (TimescaleDB)
SELECT create_hypertable(
  'tp_capital.forwarded_messages',
  'original_timestamp',
  if_not_exists => TRUE,
  migrate_data => TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forwarded_messages_channel_id
  ON tp_capital.forwarded_messages (channel_id, original_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_forwarded_messages_received_at
  ON tp_capital.forwarded_messages (received_at DESC);

-- Add comment
COMMENT ON TABLE tp_capital.forwarded_messages IS
  'Stores Telegram messages forwarded from source channels with idempotency checks';

COMMENT ON COLUMN tp_capital.forwarded_messages.channel_id IS
  'Telegram channel ID (e.g., -1001234567890)';

COMMENT ON COLUMN tp_capital.forwarded_messages.message_id IS
  'Unique message ID within the channel';

COMMENT ON COLUMN tp_capital.forwarded_messages.original_timestamp IS
  'Original timestamp from Telegram message';

COMMENT ON COLUMN tp_capital.forwarded_messages.photos IS
  'JSON array of photo URLs and metadata';

COMMENT ON COLUMN tp_capital.forwarded_messages.received_at IS
  'Timestamp when message was received by TP Capital service';
