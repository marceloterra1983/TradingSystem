-- LangGraph Checkpoints Schema
-- PostgreSQL/TimescaleDB
-- Stores workflow state and checkpoints for recovery/replay

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Checkpoints table - stores workflow state snapshots
CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id VARCHAR(255) NOT NULL,           -- Workflow instance ID
    checkpoint_ns VARCHAR(255) DEFAULT '',     -- Namespace for partitioning
    checkpoint_id VARCHAR(255) NOT NULL,       -- Checkpoint identifier
    parent_checkpoint_id VARCHAR(255),         -- Parent checkpoint for lineage
    type VARCHAR(50) NOT NULL,                 -- 'trading' | 'docs' | 'generic'
    checkpoint JSONB NOT NULL,                 -- Full state snapshot
    metadata JSONB DEFAULT '{}',               -- Workflow metadata (tags, env, etc)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(thread_id, checkpoint_ns, checkpoint_id)
);

-- Workflow runs table - tracks execution lifecycle
CREATE TABLE IF NOT EXISTS langgraph_runs (
    run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_type VARCHAR(50) NOT NULL,        -- 'trading' | 'docs' | 'generic'
    workflow_name VARCHAR(255) NOT NULL,       -- Specific workflow identifier
    thread_id VARCHAR(255) NOT NULL,           -- Links to checkpoints
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running' | 'completed' | 'failed' | 'cancelled'
    input JSONB NOT NULL,                      -- Input payload
    output JSONB,                              -- Final output
    error_message TEXT,                        -- Error details if failed
    tags JSONB DEFAULT '{}',                   -- Searchable tags (env, strategy, etc)
    idempotency_key VARCHAR(255),             -- For idempotent retries
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- Create unique partial index for idempotency_key (PostgreSQL 16 compatible)
CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_idempotency_key
    ON langgraph_runs(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id ON langgraph_checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_type ON langgraph_checkpoints(type);
CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at ON langgraph_checkpoints(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runs_workflow_type ON langgraph_runs(workflow_type);
CREATE INDEX IF NOT EXISTS idx_runs_status ON langgraph_runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON langgraph_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_tags ON langgraph_runs USING GIN(tags);

-- TimescaleDB hypertable (if available)
-- Uncomment if using TimescaleDB for time-series optimization
-- SELECT create_hypertable('langgraph_checkpoints', 'created_at', if_not_exists => TRUE);
-- SELECT create_hypertable('langgraph_runs', 'started_at', if_not_exists => TRUE);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_checkpoints_updated_at BEFORE UPDATE ON langgraph_checkpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE langgraph_checkpoints IS 'LangGraph workflow state checkpoints for recovery and replay';
COMMENT ON TABLE langgraph_runs IS 'LangGraph workflow execution tracking with idempotency support';
COMMENT ON COLUMN langgraph_runs.idempotency_key IS 'Unique key for preventing duplicate executions (e.g., request header)';
COMMENT ON COLUMN langgraph_runs.tags IS 'Searchable metadata: {"env":"prod","strategy":"momentum","symbol":"WINZ25"}';

