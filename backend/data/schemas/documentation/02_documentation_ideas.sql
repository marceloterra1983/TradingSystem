-- Documentation Ideas Table
-- Kanban-style management of documentation improvement ideas

CREATE TABLE IF NOT EXISTS documentation_ideas (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'backlog', -- 'backlog', 'todo', 'in_progress', 'review', 'done'
    category VARCHAR(50) NOT NULL, -- 'new_feature', 'improvement', 'bug_fix', 'content', 'structure'
    priority VARCHAR(10) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    assigned_to VARCHAR(100),
    created_by VARCHAR(100) NOT NULL,
    system_id UUID, -- Reference to documentation_systems if idea is specific to a system
    tags VARCHAR(500), -- JSON array of tags
    estimated_hours INTEGER,
    actual_hours INTEGER,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    completed_at TIMESTAMP,

    -- QuestDB-specific: designated timestamp for time series
    designated_timestamp TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_documentation_ideas_status ON documentation_ideas (status);
CREATE INDEX IF NOT EXISTS idx_documentation_ideas_category ON documentation_ideas (category);
CREATE INDEX IF NOT EXISTS idx_documentation_ideas_priority ON documentation_ideas (priority);
CREATE INDEX IF NOT EXISTS idx_documentation_ideas_assigned_to ON documentation_ideas (assigned_to);
CREATE INDEX IF NOT EXISTS idx_documentation_ideas_system_id ON documentation_ideas (system_id);
CREATE INDEX IF NOT EXISTS idx_documentation_ideas_designated_timestamp ON documentation_ideas (designated_timestamp);