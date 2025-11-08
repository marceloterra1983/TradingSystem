-- ==============================================================================
-- WhatsApp Sync State Table
-- ==============================================================================
-- Tracks synchronization state for each chat/session
-- ==============================================================================

SET search_path TO whatsapp_gateway, public;

CREATE TABLE IF NOT EXISTS sync_state (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,
    
    -- Session and chat identifiers
    session_name VARCHAR(100) NOT NULL,
    chat_id VARCHAR(100) NOT NULL,
    
    -- Sync state
    sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, syncing, completed, failed
    sync_type VARCHAR(20) NOT NULL DEFAULT 'full',       -- full, incremental, manual
    
    -- Sync progress tracking
    total_messages_count BIGINT DEFAULT 0,
    synced_messages_count BIGINT DEFAULT 0,
    failed_messages_count BIGINT DEFAULT 0,
    media_pending_count BIGINT DEFAULT 0,
    media_downloaded_count BIGINT DEFAULT 0,
    
    -- Timestamp tracking
    last_message_timestamp TIMESTAMPTZ,         -- Timestamp of last synced message
    oldest_message_timestamp TIMESTAMPTZ,       -- Timestamp of oldest message in chat
    newest_message_timestamp TIMESTAMPTZ,       -- Timestamp of newest message in chat
    
    -- Sync timing
    sync_started_at TIMESTAMPTZ,
    sync_completed_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    next_sync_scheduled_at TIMESTAMPTZ,
    
    -- Error tracking
    sync_error TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_interval_minutes INT DEFAULT 5,        -- How often to sync (minutes)
    sync_lookback_days INT DEFAULT 7,           -- How many days to look back
    
    -- Rate limiting
    last_sync_request_at TIMESTAMPTZ,
    sync_requests_count INT DEFAULT 0,
    sync_rate_limited BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT sync_state_session_chat_unique UNIQUE (session_name, chat_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_state_session ON sync_state(session_name);
CREATE INDEX IF NOT EXISTS idx_sync_state_status ON sync_state(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_state_pending ON sync_state(next_sync_scheduled_at) 
    WHERE sync_status = 'pending' AND sync_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_sync_state_failed ON sync_state(retry_count) 
    WHERE sync_status = 'failed' AND retry_count < max_retries;
CREATE INDEX IF NOT EXISTS idx_sync_state_last_sync ON sync_state(last_successful_sync_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_state_chat_id ON sync_state(chat_id);

-- GIN index for metadata
CREATE INDEX IF NOT EXISTS idx_sync_state_metadata ON sync_state USING GIN(metadata);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sync_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_state_updated_at
    BEFORE UPDATE ON sync_state
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_state_updated_at();

-- Function to initialize sync state for a chat
CREATE OR REPLACE FUNCTION initialize_sync_state(
    p_session_name VARCHAR(100),
    p_chat_id VARCHAR(100),
    p_sync_type VARCHAR(20) DEFAULT 'full'
)
RETURNS BIGINT AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO sync_state (
        session_name,
        chat_id,
        sync_status,
        sync_type,
        next_sync_scheduled_at
    ) VALUES (
        p_session_name,
        p_chat_id,
        'pending',
        p_sync_type,
        NOW()
    )
    ON CONFLICT (session_name, chat_id) DO UPDATE
    SET sync_status = 'pending',
        next_sync_scheduled_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update sync progress
CREATE OR REPLACE FUNCTION update_sync_progress(
    p_session_name VARCHAR(100),
    p_chat_id VARCHAR(100),
    p_synced_count BIGINT,
    p_total_count BIGINT,
    p_last_message_ts TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE sync_state
    SET synced_messages_count = p_synced_count,
        total_messages_count = p_total_count,
        last_message_timestamp = COALESCE(p_last_message_ts, last_message_timestamp),
        updated_at = NOW()
    WHERE session_name = p_session_name
      AND chat_id = p_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark sync as completed
CREATE OR REPLACE FUNCTION complete_sync(
    p_session_name VARCHAR(100),
    p_chat_id VARCHAR(100)
)
RETURNS VOID AS $$
DECLARE
    v_interval_minutes INT;
BEGIN
    SELECT sync_interval_minutes INTO v_interval_minutes
    FROM sync_state
    WHERE session_name = p_session_name
      AND chat_id = p_chat_id;
    
    UPDATE sync_state
    SET sync_status = 'completed',
        sync_completed_at = NOW(),
        last_successful_sync_at = NOW(),
        next_sync_scheduled_at = NOW() + (v_interval_minutes || ' minutes')::INTERVAL,
        retry_count = 0,
        sync_error = NULL,
        updated_at = NOW()
    WHERE session_name = p_session_name
      AND chat_id = p_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark sync as failed and schedule retry
CREATE OR REPLACE FUNCTION fail_sync(
    p_session_name VARCHAR(100),
    p_chat_id VARCHAR(100),
    p_error TEXT
)
RETURNS VOID AS $$
DECLARE
    v_retry_count INT;
    v_max_retries INT;
    v_next_retry TIMESTAMPTZ;
BEGIN
    SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
    FROM sync_state
    WHERE session_name = p_session_name
      AND chat_id = p_chat_id;
    
    IF v_retry_count < v_max_retries THEN
        -- Exponential backoff: 5min, 15min, 30min
        v_next_retry := NOW() + (INTERVAL '5 minutes' * POWER(3, v_retry_count));
        
        UPDATE sync_state
        SET sync_status = 'failed',
            sync_error = p_error,
            retry_count = retry_count + 1,
            next_sync_scheduled_at = v_next_retry,
            updated_at = NOW()
        WHERE session_name = p_session_name
          AND chat_id = p_chat_id;
    ELSE
        -- Max retries reached, disable auto-sync
        UPDATE sync_state
        SET sync_status = 'failed',
            sync_error = p_error || ' (max retries reached)',
            sync_enabled = FALSE,
            updated_at = NOW()
        WHERE session_name = p_session_name
          AND chat_id = p_chat_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- View for sync queue (chats ready for sync)
CREATE OR REPLACE VIEW sync_queue AS
SELECT
    ss.id,
    ss.session_name,
    ss.chat_id,
    c.name AS chat_name,
    c.contact_type AS chat_type,
    ss.sync_status,
    ss.sync_type,
    ss.synced_messages_count,
    ss.total_messages_count,
    ss.media_pending_count,
    ss.last_successful_sync_at,
    ss.next_sync_scheduled_at,
    ss.retry_count,
    ss.sync_error
FROM sync_state ss
LEFT JOIN contacts c ON ss.chat_id = c.whatsapp_id AND ss.session_name = c.session_name
WHERE ss.sync_enabled = TRUE
  AND ss.sync_status IN ('pending', 'failed')
  AND (ss.next_sync_scheduled_at IS NULL OR ss.next_sync_scheduled_at <= NOW())
  AND ss.retry_count < ss.max_retries
ORDER BY ss.next_sync_scheduled_at ASC NULLS FIRST;

-- Comments
COMMENT ON TABLE sync_state IS 'Tracks synchronization state for each chat/session';
COMMENT ON COLUMN sync_state.sync_status IS 'Status: pending, syncing, completed, failed';
COMMENT ON COLUMN sync_state.sync_type IS 'Type: full, incremental, manual';
COMMENT ON COLUMN sync_state.sync_interval_minutes IS 'How often to sync this chat (minutes)';
COMMENT ON COLUMN sync_state.sync_lookback_days IS 'How many days of history to sync';
COMMENT ON FUNCTION initialize_sync_state IS 'Initialize or reset sync state for a chat';
COMMENT ON FUNCTION update_sync_progress IS 'Update sync progress counters';
COMMENT ON FUNCTION complete_sync IS 'Mark sync as completed and schedule next sync';
COMMENT ON FUNCTION fail_sync IS 'Mark sync as failed and schedule retry with exponential backoff';
COMMENT ON VIEW sync_queue IS 'Chats ready for synchronization (ordered by priority)';

