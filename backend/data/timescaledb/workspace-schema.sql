-- ==============================================================================
-- Workspace Schema for TimescaleDB
-- ==============================================================================
-- Description: Schema for workspace items (ideas, feature requests, documentation)
-- Database: frontend_apps
-- Schema: workspace
-- Tables: workspace_items, workspace_audit_log
-- ==============================================================================

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS workspace;

-- Set search path
SET search_path TO workspace, public;

-- ==============================================================================
-- Table: workspace_items
-- ==============================================================================
-- Stores workspace items with time-series capabilities
CREATE TABLE IF NOT EXISTS workspace.workspace_items (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'documentacao', 
        'coleta-dados', 
        'banco-dados', 
        'analise-dados', 
        'gestao-riscos', 
        'dashboard'
    )),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN (
        'low', 
        'medium', 
        'high', 
        'critical'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN (
        'new', 
        'review', 
        'in-progress', 
        'completed', 
        'rejected'
    )),
    tags TEXT[] DEFAULT '{}', -- PostgreSQL array for tags
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    metadata JSONB DEFAULT '{}', -- Flexible metadata storage
    PRIMARY KEY (id, created_at)
);

-- Convert to TimescaleDB hypertable for time-series optimization
-- Partition by month for efficient historical queries
SELECT create_hypertable(
    'workspace.workspace_items', 
    'created_at', 
    if_not_exists => TRUE, 
    chunk_time_interval => INTERVAL '1 month'
);

-- ==============================================================================
-- Indexes for workspace_items
-- ==============================================================================

-- Single column indexes
CREATE INDEX IF NOT EXISTS idx_workspace_items_category 
    ON workspace.workspace_items (category);

CREATE INDEX IF NOT EXISTS idx_workspace_items_priority 
    ON workspace.workspace_items (priority);

CREATE INDEX IF NOT EXISTS idx_workspace_items_status 
    ON workspace.workspace_items (status);

CREATE INDEX IF NOT EXISTS idx_workspace_items_created_at 
    ON workspace.workspace_items (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_items_updated_at 
    ON workspace.workspace_items (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_items_created_by 
    ON workspace.workspace_items (created_by);

-- GIN indexes for arrays and JSONB
CREATE INDEX IF NOT EXISTS idx_workspace_items_tags 
    ON workspace.workspace_items USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_workspace_items_metadata 
    ON workspace.workspace_items USING GIN (metadata);

-- Partial indexes for common status queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_workspace_items_active 
    ON workspace.workspace_items (created_at DESC)
    WHERE status NOT IN ('completed', 'rejected');

CREATE INDEX IF NOT EXISTS idx_workspace_items_high_priority 
    ON workspace.workspace_items (created_at DESC)
    WHERE priority IN ('high', 'critical') 
    AND status NOT IN ('completed', 'rejected');

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_workspace_items_category_status 
    ON workspace.workspace_items (category, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_items_priority_status 
    ON workspace.workspace_items (priority, status, created_at DESC);

-- ==============================================================================
-- Table: workspace_audit_log
-- ==============================================================================
-- Audit log for tracking changes to workspace items
CREATE TABLE IF NOT EXISTS workspace.workspace_audit_log (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    item_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    changed_by VARCHAR(100),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    old_data JSONB,
    new_data JSONB,
    changes JSONB,
    metadata JSONB DEFAULT '{}',
    PRIMARY KEY (id, changed_at)
);

-- Convert audit log to hypertable
SELECT create_hypertable(
    'workspace.workspace_audit_log', 
    'changed_at', 
    if_not_exists => TRUE, 
    chunk_time_interval => INTERVAL '1 month'
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_workspace_audit_item_id 
    ON workspace.workspace_audit_log (item_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_audit_action 
    ON workspace.workspace_audit_log (action, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_audit_changed_by 
    ON workspace.workspace_audit_log (changed_by, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_audit_changed_at 
    ON workspace.workspace_audit_log (changed_at DESC);

-- ==============================================================================
-- Functions and Triggers
-- ==============================================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION workspace.update_workspace_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_workspace_items_updated_at ON workspace.workspace_items;
CREATE TRIGGER trigger_workspace_items_updated_at
    BEFORE UPDATE ON workspace.workspace_items
    FOR EACH ROW
    EXECUTE FUNCTION workspace.update_workspace_items_updated_at();

-- Function to log changes to audit table
CREATE OR REPLACE FUNCTION workspace.log_workspace_item_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(20);
    old_data_json JSONB;
    new_data_json JSONB;
    changes_json JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data_json := row_to_json(OLD)::JSONB;
        new_data_json := NULL;
        changes_json := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
        old_data_json := NULL;
        new_data_json := row_to_json(NEW)::JSONB;
        changes_json := NULL;
    ELSE -- UPDATE
        action_type := 'UPDATE';
        old_data_json := row_to_json(OLD)::JSONB;
        new_data_json := row_to_json(NEW)::JSONB;
        -- Calculate changes (simplified - could be enhanced)
        changes_json := jsonb_build_object(
            'updated_fields', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(new_data_json)
                WHERE new_data_json->key IS DISTINCT FROM old_data_json->key
            )
        );
    END IF;

    -- Insert audit log entry
    INSERT INTO workspace.workspace_audit_log (
        item_id,
        action,
        changed_by,
        old_data,
        new_data,
        changes
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        action_type,
        COALESCE(NEW.updated_by, OLD.updated_by, CURRENT_USER),
        old_data_json,
        new_data_json,
        changes_json
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit logging
DROP TRIGGER IF EXISTS trigger_workspace_item_audit ON workspace.workspace_items;
CREATE TRIGGER trigger_workspace_item_audit
    AFTER INSERT OR UPDATE OR DELETE ON workspace.workspace_items
    FOR EACH ROW
    EXECUTE FUNCTION workspace.log_workspace_item_changes();

-- ==============================================================================
-- Grants and Permissions
-- ==============================================================================

-- Ensure application role exists for local/dev usage
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_workspace') THEN
        CREATE ROLE app_workspace;
    END IF;
END;
$$;

-- Grant usage on schema
GRANT USAGE ON SCHEMA workspace TO app_workspace;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace.workspace_items TO app_workspace;
GRANT SELECT, INSERT ON workspace.workspace_audit_log TO app_workspace;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA workspace TO app_workspace;

-- ==============================================================================
-- Comments
-- ==============================================================================

COMMENT ON SCHEMA workspace IS 'Workspace schema for idea management and feature tracking';
COMMENT ON TABLE workspace.workspace_items IS 'Main table for workspace items with time-series capabilities';
COMMENT ON TABLE workspace.workspace_audit_log IS 'Audit log tracking all changes to workspace items';
COMMENT ON COLUMN workspace.workspace_items.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN workspace.workspace_items.metadata IS 'Flexible JSONB field for additional data';

-- ==============================================================================
-- Schema Version
-- ==============================================================================

CREATE TABLE IF NOT EXISTS workspace.schema_version (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT
);

INSERT INTO workspace.schema_version (version, description)
VALUES ('1.0.0', 'Initial workspace schema with items and audit log')
ON CONFLICT (version) DO NOTHING;

-- ==============================================================================
-- Success Message
-- ==============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Workspace schema created successfully!';
    RAISE NOTICE '   - Schema: workspace';
    RAISE NOTICE '   - Tables: workspace_items, workspace_audit_log';
    RAISE NOTICE '   - Hypertables: Enabled with 1-month partitioning';
    RAISE NOTICE '   - Indexes: Created for optimal query performance';
    RAISE NOTICE '   - Triggers: Auto-update timestamps and audit logging';
END $$;
