-- ==============================================================================
-- WhatsApp Messages Table (TimescaleDB Hypertable)
-- ==============================================================================
-- Stores all WhatsApp messages with full metadata
-- ==============================================================================

SET search_path TO whatsapp_gateway, public;

CREATE TABLE IF NOT EXISTS messages (
    -- Primary key
    id BIGSERIAL,
    
    -- WhatsApp message identifiers
    message_id VARCHAR(100) NOT NULL,           -- WhatsApp message ID (unique per session)
    session_name VARCHAR(100) NOT NULL,         -- Session that received/sent this message
    
    -- Chat/Contact identifiers
    chat_id VARCHAR(100) NOT NULL,              -- WhatsApp chat ID (phone@c.us or group@g.us)
    from_whatsapp_id VARCHAR(100) NOT NULL,     -- Sender WhatsApp ID
    to_whatsapp_id VARCHAR(100),                -- Recipient WhatsApp ID (for DMs)
    
    -- Message type and content
    message_type VARCHAR(50) NOT NULL,          -- text, image, video, audio, document, location, etc.
    body TEXT,                                  -- Message text content
    caption TEXT,                               -- Caption for media messages
    
    -- Media information
    has_media BOOLEAN DEFAULT FALSE,
    media_type VARCHAR(50),                     -- image, video, audio, document, sticker, etc.
    media_url TEXT,                             -- URL from WhatsApp
    media_mime_type VARCHAR(100),
    media_size_bytes BIGINT,
    media_filename VARCHAR(255),
    media_local_path TEXT,                      -- Path in MinIO (bucket/key)
    media_thumbnail_path TEXT,                  -- Thumbnail path in MinIO
    media_download_status VARCHAR(20) DEFAULT 'pending', -- pending, downloading, completed, failed
    
    -- Message metadata
    is_from_me BOOLEAN DEFAULT FALSE,
    is_forwarded BOOLEAN DEFAULT FALSE,
    is_broadcast BOOLEAN DEFAULT FALSE,
    is_status BOOLEAN DEFAULT FALSE,            -- WhatsApp status update
    is_group BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Quoted/Reply information
    quoted_message_id VARCHAR(100),             -- ID of quoted/replied message
    quoted_participant VARCHAR(100),            -- WhatsApp ID of quoted message author
    
    -- Reactions
    reactions JSONB DEFAULT '[]'::jsonb,        -- Array of reactions [{emoji, fromId, timestamp}]
    
    -- Location data (for location messages)
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    location_name VARCHAR(255),
    location_address TEXT,
    location_url TEXT,
    
    -- Contact card data (for contact messages)
    contact_vcard TEXT,
    contact_name VARCHAR(255),
    
    -- Link preview
    link_preview JSONB,                         -- {title, description, canonicalUrl, thumbnail}
    
    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL,             -- Message timestamp from WhatsApp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- ACK status (message delivery/read status)
    ack_status VARCHAR(20) DEFAULT 'pending',   -- pending, server, delivered, read, played
    ack_timestamp TIMESTAMPTZ,
    
    -- Sync tracking
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_source VARCHAR(50) DEFAULT 'webhook',  -- webhook, sync_service, manual
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    raw_data JSONB,                             -- Full raw message data from WhatsApp
    
    -- Constraints
    PRIMARY KEY (id, timestamp),
    CONSTRAINT messages_message_id_session_unique UNIQUE (message_id, session_name)
);

-- Convert to TimescaleDB hypertable (partitioned by timestamp)
SELECT create_hypertable(
    'messages',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create indexes (after hypertable conversion)
CREATE INDEX IF NOT EXISTS idx_messages_session_name ON messages(session_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from_whatsapp_id ON messages(from_whatsapp_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_has_media ON messages(has_media) WHERE has_media = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_media_download_status ON messages(media_download_status) WHERE media_download_status != 'completed';
CREATE INDEX IF NOT EXISTS idx_messages_is_from_me ON messages(is_from_me);
CREATE INDEX IF NOT EXISTS idx_messages_is_group ON messages(is_group) WHERE is_group = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_quoted_message_id ON messages(quoted_message_id) WHERE quoted_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sync_source ON messages(sync_source);

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING GIN(reactions);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_messages_body_fts ON messages USING GIN(to_tsvector('portuguese', COALESCE(body, '')));

-- Foreign key to contacts (soft reference, no CASCADE)
-- Note: We don't enforce FK constraint to allow messages to arrive before contact sync
CREATE INDEX IF NOT EXISTS idx_messages_fk_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_fk_from ON messages(from_whatsapp_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- Retention policy: keep 1 year of messages (configurable)
SELECT add_retention_policy('messages', INTERVAL '365 days', if_not_exists => TRUE);

-- Continuous aggregates for message statistics (hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS messages_hourly_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS hour,
    session_name,
    chat_id,
    message_type,
    COUNT(*) AS message_count,
    COUNT(*) FILTER (WHERE has_media = TRUE) AS media_count,
    COUNT(*) FILTER (WHERE is_from_me = TRUE) AS sent_count,
    COUNT(*) FILTER (WHERE is_from_me = FALSE) AS received_count
FROM messages
GROUP BY hour, session_name, chat_id, message_type
WITH NO DATA;

-- Refresh policy for continuous aggregate (every 1 hour)
SELECT add_continuous_aggregate_policy('messages_hourly_stats',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Comments
COMMENT ON TABLE messages IS 'WhatsApp messages (TimescaleDB hypertable, partitioned by timestamp)';
COMMENT ON COLUMN messages.message_id IS 'WhatsApp message ID (unique per session)';
COMMENT ON COLUMN messages.session_name IS 'Session name that received/sent this message';
COMMENT ON COLUMN messages.chat_id IS 'WhatsApp chat ID (phone@c.us or group@g.us)';
COMMENT ON COLUMN messages.media_local_path IS 'Path to media file in MinIO (bucket/key)';
COMMENT ON COLUMN messages.ack_status IS 'Message delivery status (pending, server, delivered, read, played)';
COMMENT ON COLUMN messages.sync_source IS 'How this message was obtained (webhook, sync_service, manual)';

