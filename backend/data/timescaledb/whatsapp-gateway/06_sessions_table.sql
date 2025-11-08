-- ==============================================================================
-- WhatsApp Sessions Table
-- ==============================================================================
-- Tracks active WhatsApp sessions and their status
-- ==============================================================================

SET search_path TO whatsapp_gateway, public;

CREATE TABLE IF NOT EXISTS sessions (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,
    
    -- Session identifiers
    session_name VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(50),
    whatsapp_id VARCHAR(100),                   -- phone@c.us
    
    -- Session status
    status VARCHAR(20) NOT NULL DEFAULT 'disconnected',  -- disconnected, connecting, connected, failed
    qr_code TEXT,                               -- QR code for authentication
    qr_code_generated_at TIMESTAMPTZ,
    
    -- Connection info
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    
    -- Profile information
    profile_name VARCHAR(255),
    profile_picture_url TEXT,
    profile_about TEXT,
    
    -- Session configuration
    auto_reconnect BOOLEAN DEFAULT TRUE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    webhook_enabled BOOLEAN DEFAULT TRUE,
    
    -- Statistics
    total_messages_sent BIGINT DEFAULT 0,
    total_messages_received BIGINT DEFAULT 0,
    total_chats_count INT DEFAULT 0,
    total_contacts_count INT DEFAULT 0,
    
    -- Health checks
    health_status VARCHAR(20) DEFAULT 'unknown',  -- healthy, degraded, unhealthy, unknown
    last_health_check_at TIMESTAMPTZ,
    health_check_error TEXT,
    
    -- Rate limiting
    rate_limit_window_start TIMESTAMPTZ,
    rate_limit_messages_sent INT DEFAULT 0,
    rate_limit_exceeded BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    engine_data JSONB DEFAULT '{}'::jsonb       -- Engine-specific data (WAHA, Evolution, etc.)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_phone_number ON sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_sessions_whatsapp_id ON sessions(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_sessions_health_status ON sessions(health_status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_heartbeat ON sessions(last_heartbeat_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_sessions_metadata ON sessions USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_sessions_engine_data ON sessions USING GIN(engine_data);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_sessions_updated_at();

-- Function to update session heartbeat
CREATE OR REPLACE FUNCTION update_session_heartbeat(
    p_session_name VARCHAR(100)
)
RETURNS VOID AS $$
BEGIN
    UPDATE sessions
    SET last_heartbeat_at = NOW(),
        health_status = 'healthy',
        updated_at = NOW()
    WHERE session_name = p_session_name;
END;
$$ LANGUAGE plpgsql;

-- Function to mark session as connected
CREATE OR REPLACE FUNCTION connect_session(
    p_session_name VARCHAR(100),
    p_whatsapp_id VARCHAR(100) DEFAULT NULL,
    p_phone_number VARCHAR(50) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE sessions
    SET status = 'connected',
        connected_at = NOW(),
        disconnected_at = NULL,
        last_heartbeat_at = NOW(),
        health_status = 'healthy',
        whatsapp_id = COALESCE(p_whatsapp_id, whatsapp_id),
        phone_number = COALESCE(p_phone_number, phone_number),
        qr_code = NULL,
        qr_code_generated_at = NULL,
        updated_at = NOW()
    WHERE session_name = p_session_name;
END;
$$ LANGUAGE plpgsql;

-- Function to mark session as disconnected
CREATE OR REPLACE FUNCTION disconnect_session(
    p_session_name VARCHAR(100),
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE sessions
    SET status = 'disconnected',
        disconnected_at = NOW(),
        health_status = 'unhealthy',
        health_check_error = p_reason,
        updated_at = NOW()
    WHERE session_name = p_session_name;
END;
$$ LANGUAGE plpgsql;

-- Function to increment message counters
CREATE OR REPLACE FUNCTION increment_message_counter(
    p_session_name VARCHAR(100),
    p_is_sent BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    IF p_is_sent THEN
        UPDATE sessions
        SET total_messages_sent = total_messages_sent + 1,
            updated_at = NOW()
        WHERE session_name = p_session_name;
    ELSE
        UPDATE sessions
        SET total_messages_received = total_messages_received + 1,
            updated_at = NOW()
        WHERE session_name = p_session_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- View for active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT
    session_name,
    phone_number,
    whatsapp_id,
    status,
    health_status,
    connected_at,
    last_heartbeat_at,
    total_messages_sent,
    total_messages_received,
    total_chats_count,
    total_contacts_count,
    sync_enabled,
    webhook_enabled
FROM sessions
WHERE status = 'connected'
  AND health_status IN ('healthy', 'degraded')
ORDER BY last_heartbeat_at DESC;

-- Comments
COMMENT ON TABLE sessions IS 'WhatsApp sessions tracking and status';
COMMENT ON COLUMN sessions.status IS 'Session status: disconnected, connecting, connected, failed';
COMMENT ON COLUMN sessions.health_status IS 'Health status: healthy, degraded, unhealthy, unknown';
COMMENT ON FUNCTION update_session_heartbeat IS 'Update session heartbeat timestamp';
COMMENT ON FUNCTION connect_session IS 'Mark session as connected';
COMMENT ON FUNCTION disconnect_session IS 'Mark session as disconnected';
COMMENT ON FUNCTION increment_message_counter IS 'Increment sent/received message counter';
COMMENT ON VIEW active_sessions IS 'Currently active and healthy sessions';

