-- LangGraph Events Schema
-- QuestDB
-- High-performance event logging for telemetry, traces, and metrics

-- Workflow events table - telemetry and trace events
CREATE TABLE IF NOT EXISTS langgraph_events (
    timestamp TIMESTAMP,                       -- Event timestamp (designated timestamp column)
    event_id SYMBOL,                           -- Unique event ID
    run_id SYMBOL,                             -- Links to langgraph_runs
    thread_id SYMBOL,                          -- Links to checkpoints
    workflow_type SYMBOL,                      -- 'trading' | 'docs' | 'generic'
    workflow_name SYMBOL,                      -- Specific workflow
    node_name SYMBOL,                          -- Current node/step
    event_type SYMBOL,                         -- 'node_enter' | 'node_exit' | 'error' | 'decision'
    status SYMBOL,                             -- 'success' | 'error' | 'skipped'
    duration_ms DOUBLE,                        -- Node execution time
    input_data STRING,                         -- Serialized input (JSON)
    output_data STRING,                        -- Serialized output (JSON)
    error_message STRING,                      -- Error details if failed
    trace_id SYMBOL,                           -- Distributed tracing ID
    span_id SYMBOL,                            -- Span ID for nested traces
    parent_span_id SYMBOL,                     -- Parent span for hierarchy
    tags STRING,                               -- Additional metadata (JSON)
    host SYMBOL,                               -- Container/host identifier
    environment SYMBOL                         -- 'dev' | 'prod'
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- Node performance metrics - aggregated stats
CREATE TABLE IF NOT EXISTS langgraph_node_metrics (
    timestamp TIMESTAMP,                       -- Metric timestamp
    workflow_type SYMBOL,                      -- Workflow type
    workflow_name SYMBOL,                      -- Workflow name
    node_name SYMBOL,                          -- Node name
    execution_count LONG,                      -- Number of executions
    success_count LONG,                        -- Successful executions
    error_count LONG,                          -- Failed executions
    avg_duration_ms DOUBLE,                    -- Average duration
    p50_duration_ms DOUBLE,                    -- Median duration
    p95_duration_ms DOUBLE,                    -- 95th percentile
    p99_duration_ms DOUBLE,                    -- 99th percentile
    max_duration_ms DOUBLE,                    -- Maximum duration
    environment SYMBOL                         -- Environment
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- Workflow execution summary - high-level metrics
CREATE TABLE IF NOT EXISTS langgraph_workflow_metrics (
    timestamp TIMESTAMP,                       -- Metric timestamp
    workflow_type SYMBOL,                      -- Workflow type
    workflow_name SYMBOL,                      -- Workflow name
    total_runs LONG,                           -- Total executions
    completed_runs LONG,                       -- Successful completions
    failed_runs LONG,                          -- Failed executions
    cancelled_runs LONG,                       -- Cancelled executions
    avg_duration_ms DOUBLE,                    -- Average total duration
    avg_nodes_executed DOUBLE,                 -- Average nodes per run
    environment SYMBOL                         -- Environment
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- Comments
COMMENT ON TABLE langgraph_events IS 'High-frequency event stream for LangGraph workflow telemetry';
COMMENT ON TABLE langgraph_node_metrics IS 'Aggregated performance metrics per node';
COMMENT ON TABLE langgraph_workflow_metrics IS 'High-level workflow execution statistics';

