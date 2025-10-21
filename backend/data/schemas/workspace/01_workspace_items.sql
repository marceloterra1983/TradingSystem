-- Workspace Items Table for TimescaleDB
-- Stores workspace items (ideas, documentation entries) with time-series capabilities

CREATE TABLE IF NOT EXISTS workspace_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('documentacao', 'coleta-dados', 'banco-dados', 'analise-dados', 'gestao-riscos', 'dashboard')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'review', 'in-progress', 'completed', 'rejected')),
    tags TEXT[], -- PostgreSQL array for tags
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    metadata JSONB -- Flexible metadata storage
);

-- Convert to TimescaleDB hypertable for time-series optimization
-- Partition by month for efficient historical queries
SELECT create_hypertable('workspace_items', 'created_at', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 month');

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_workspace_items_category ON workspace_items (category);
CREATE INDEX IF NOT EXISTS idx_workspace_items_priority ON workspace_items (priority);
CREATE INDEX IF NOT EXISTS idx_workspace_items_status ON workspace_items (status);
CREATE INDEX IF NOT EXISTS idx_workspace_items_created_at ON workspace_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_items_updated_at ON workspace_items (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_items_created_by ON workspace_items (created_by);
CREATE INDEX IF NOT EXISTS idx_workspace_items_tags ON workspace_items USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_workspace_items_metadata ON workspace_items USING GIN (metadata);

-- Partial indexes for common status queries
CREATE INDEX IF NOT EXISTS idx_workspace_items_active ON workspace_items (created_at DESC)
WHERE status NOT IN ('completed', 'rejected');

CREATE INDEX IF NOT EXISTS idx_workspace_items_high_priority ON workspace_items (created_at DESC)
WHERE priority IN ('high', 'critical') AND status NOT IN ('completed', 'rejected');

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_workspace_items_category_status ON workspace_items (category, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_items_priority_status ON workspace_items (priority, status, created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workspace_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_workspace_items_updated_at
    BEFORE UPDATE ON workspace_items
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_items_updated_at();