-- Documentation Systems Table
-- Stores information about all documentation systems in the TradingSystem

CREATE TABLE IF NOT EXISTS documentation_systems (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'api', 'webapp', 'docs', 'tool'
    url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'unknown', -- 'online', 'offline', 'error', 'unknown'
    last_checked TIMESTAMP DEFAULT now(),
    response_time_ms INTEGER,
    version VARCHAR(50),
    owner VARCHAR(100),
    tags VARCHAR(500), -- JSON array of tags
    metadata VARCHAR(1000), -- JSON object for additional data
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    -- QuestDB-specific: designated timestamp for time series
    designated_timestamp TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_documentation_systems_status ON documentation_systems (status);
CREATE INDEX IF NOT EXISTS idx_documentation_systems_type ON documentation_systems (type);
CREATE INDEX IF NOT EXISTS idx_documentation_systems_last_checked ON documentation_systems (last_checked);
CREATE INDEX IF NOT EXISTS idx_documentation_systems_designated_timestamp ON documentation_systems (designated_timestamp);