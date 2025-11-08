-- ==============================================================================
-- WhatsApp Media Downloads Tracking
-- ==============================================================================
-- Tracks media download status and retries
-- ==============================================================================

SET search_path TO whatsapp_gateway, public;

CREATE TABLE IF NOT EXISTS media_downloads (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,
    
    -- Message reference
    message_id VARCHAR(100) NOT NULL,
    session_name VARCHAR(100) NOT NULL,
    chat_id VARCHAR(100) NOT NULL,
    
    -- Media information
    media_url TEXT NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    media_mime_type VARCHAR(100),
    media_size_bytes BIGINT,
    media_filename VARCHAR(255),
    
    -- Storage information
    minio_bucket VARCHAR(100),
    minio_key TEXT,                             -- Object key in MinIO
    minio_url TEXT,                             -- Full MinIO URL
    thumbnail_minio_key TEXT,
    
    -- Download status
    download_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, downloading, completed, failed
    download_started_at TIMESTAMPTZ,
    download_completed_at TIMESTAMPTZ,
    download_error TEXT,
    
    -- Retry tracking
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    last_retry_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    
    -- File validation
    file_hash VARCHAR(64),                      -- SHA256 hash
    file_size_bytes BIGINT,
    file_validated BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT media_downloads_message_session_unique UNIQUE (message_id, session_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_downloads_status ON media_downloads(download_status);
CREATE INDEX IF NOT EXISTS idx_media_downloads_pending ON media_downloads(created_at) 
    WHERE download_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_media_downloads_failed ON media_downloads(retry_count, next_retry_at) 
    WHERE download_status = 'failed' AND retry_count < max_retries;
CREATE INDEX IF NOT EXISTS idx_media_downloads_session ON media_downloads(session_name);
CREATE INDEX IF NOT EXISTS idx_media_downloads_chat ON media_downloads(chat_id);
CREATE INDEX IF NOT EXISTS idx_media_downloads_created_at ON media_downloads(created_at DESC);

-- GIN index for metadata
CREATE INDEX IF NOT EXISTS idx_media_downloads_metadata ON media_downloads USING GIN(metadata);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_media_downloads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_media_downloads_updated_at
    BEFORE UPDATE ON media_downloads
    FOR EACH ROW
    EXECUTE FUNCTION update_media_downloads_updated_at();

-- Function to schedule retry
CREATE OR REPLACE FUNCTION schedule_media_download_retry(
    p_id BIGINT,
    p_error TEXT
)
RETURNS VOID AS $$
DECLARE
    v_retry_count INT;
    v_max_retries INT;
    v_next_retry TIMESTAMPTZ;
BEGIN
    SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
    FROM media_downloads
    WHERE id = p_id;
    
    IF v_retry_count < v_max_retries THEN
        -- Exponential backoff: 1min, 5min, 15min
        v_next_retry := NOW() + (INTERVAL '1 minute' * POWER(5, v_retry_count));
        
        UPDATE media_downloads
        SET download_status = 'failed',
            download_error = p_error,
            retry_count = retry_count + 1,
            last_retry_at = NOW(),
            next_retry_at = v_next_retry
        WHERE id = p_id;
    ELSE
        -- Max retries reached
        UPDATE media_downloads
        SET download_status = 'failed',
            download_error = p_error || ' (max retries reached)'
        WHERE id = p_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE media_downloads IS 'Media download tracking with retry logic';
COMMENT ON COLUMN media_downloads.download_status IS 'Status: pending, downloading, completed, failed';
COMMENT ON COLUMN media_downloads.minio_key IS 'Object key in MinIO bucket';
COMMENT ON COLUMN media_downloads.retry_count IS 'Number of retry attempts';
COMMENT ON FUNCTION schedule_media_download_retry IS 'Schedule media download retry with exponential backoff';

