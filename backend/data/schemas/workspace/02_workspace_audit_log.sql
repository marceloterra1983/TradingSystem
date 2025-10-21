-- Workspace Audit Log Table for TimescaleDB
-- Tracks all changes to workspace items for auditing and analytics

CREATE TABLE IF NOT EXISTS workspace_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES workspace_items(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    old_data JSONB, -- Previous state as JSON
    new_data JSONB, -- New state as JSON
    changed_fields TEXT[], -- Array of changed field names
    changed_by VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
-- Partition by day for audit logs (higher frequency)
SELECT create_hypertable('workspace_audit_log', 'created_at', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_item_id ON workspace_audit_log (item_id);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_action ON workspace_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_changed_by ON workspace_audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_created_at ON workspace_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_changed_fields ON workspace_audit_log USING GIN (changed_fields);

-- Composite indexes for common audit queries
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_item_action ON workspace_audit_log (item_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_user_action ON workspace_audit_log (changed_by, action, created_at DESC);

-- Partial index for recent changes (last 30 days)
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_recent ON workspace_audit_log (created_at DESC)
WHERE created_at > NOW() - INTERVAL '30 days';