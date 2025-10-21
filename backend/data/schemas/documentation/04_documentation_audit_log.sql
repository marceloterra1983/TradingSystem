-- Documentation Audit Log Table
-- Tracks all changes to documentation data for auditing and analytics

CREATE TABLE IF NOT EXISTS documentation_audit_log (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL, -- 'systems', 'ideas', 'files'
    record_id UUID NOT NULL, -- ID of the affected record
    action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    old_data VARCHAR(2000), -- JSON object of previous state
    new_data VARCHAR(2000), -- JSON object of new state
    changed_fields VARCHAR(500), -- JSON array of changed field names
    changed_by VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT now(),

    -- QuestDB-specific: designated timestamp for time series
    designated_timestamp TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_documentation_audit_log_table_name ON documentation_audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_documentation_audit_log_record_id ON documentation_audit_log (record_id);
CREATE INDEX IF NOT EXISTS idx_documentation_audit_log_action ON documentation_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_documentation_audit_log_changed_by ON documentation_audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_documentation_audit_log_designated_timestamp ON documentation_audit_log (designated_timestamp);