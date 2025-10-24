-- Documentation Files Table
-- Manages file attachments for documentation ideas and systems

CREATE TABLE IF NOT EXISTS documentation_files (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    description TEXT,
    idea_id UUID, -- Reference to documentation_ideas
    system_id UUID, -- Reference to documentation_systems
    uploaded_by VARCHAR(100) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    -- QuestDB-specific: designated timestamp for time series
    designated_timestamp TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_documentation_files_idea_id ON documentation_files (idea_id);
CREATE INDEX IF NOT EXISTS idx_documentation_files_system_id ON documentation_files (system_id);
CREATE INDEX IF NOT EXISTS idx_documentation_files_uploaded_by ON documentation_files (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documentation_files_mime_type ON documentation_files (mime_type);
CREATE INDEX IF NOT EXISTS idx_documentation_files_designated_timestamp ON documentation_files (designated_timestamp);