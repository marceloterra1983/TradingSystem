-- ==============================================================================
-- WhatsApp Contacts Table
-- ==============================================================================
-- Stores contact information (individuals and groups)
-- ==============================================================================

SET search_path TO whatsapp_gateway, public;

CREATE TABLE IF NOT EXISTS contacts (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,
    
    -- WhatsApp identifiers
    whatsapp_id VARCHAR(100) NOT NULL UNIQUE,  -- phone@c.us or group@g.us
    session_name VARCHAR(100) NOT NULL,         -- Session that owns this contact
    
    -- Contact type
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('individual', 'group', 'broadcast')),
    
    -- Contact information
    name VARCHAR(255),
    push_name VARCHAR(255),                     -- Name from WhatsApp push notification
    phone_number VARCHAR(50),
    formatted_phone VARCHAR(50),
    
    -- Group-specific fields
    group_name VARCHAR(255),
    group_description TEXT,
    group_owner VARCHAR(100),                   -- WhatsApp ID of group owner
    group_participants JSONB,                   -- Array of participant IDs
    group_admins JSONB,                         -- Array of admin IDs
    
    -- Profile information
    profile_picture_url TEXT,
    profile_picture_local_path TEXT,            -- Path in MinIO
    about TEXT,                                 -- WhatsApp status/about
    
    -- Business account fields
    is_business BOOLEAN DEFAULT FALSE,
    business_category VARCHAR(100),
    business_description TEXT,
    business_email VARCHAR(255),
    business_website VARCHAR(255),
    
    -- Contact metadata
    is_blocked BOOLEAN DEFAULT FALSE,
    is_contact BOOLEAN DEFAULT FALSE,           -- Is in user's contact list
    is_group BOOLEAN DEFAULT FALSE,
    is_broadcast BOOLEAN DEFAULT FALSE,
    
    -- Sync tracking
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT contacts_whatsapp_id_session_unique UNIQUE (whatsapp_id, session_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON contacts(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_contacts_session_name ON contacts(session_name);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_is_group ON contacts(is_group) WHERE is_group = TRUE;
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_last_synced_at ON contacts(last_synced_at) WHERE last_synced_at IS NOT NULL;

-- GIN index for JSONB fields
CREATE INDEX IF NOT EXISTS idx_contacts_metadata ON contacts USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_contacts_group_participants ON contacts USING GIN(group_participants) WHERE group_participants IS NOT NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_contacts_updated_at();

-- Comments
COMMENT ON TABLE contacts IS 'WhatsApp contacts (individuals and groups)';
COMMENT ON COLUMN contacts.whatsapp_id IS 'WhatsApp identifier (phone@c.us or groupID@g.us)';
COMMENT ON COLUMN contacts.session_name IS 'Session name that owns this contact';
COMMENT ON COLUMN contacts.contact_type IS 'Type: individual, group, or broadcast';
COMMENT ON COLUMN contacts.group_participants IS 'JSON array of participant WhatsApp IDs';
COMMENT ON COLUMN contacts.metadata IS 'Additional metadata as JSON';

