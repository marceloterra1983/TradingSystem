-- ============================================================================
-- RAG Services - Complete Schema for Neon Database
-- ============================================================================
-- Description: Complete RAG schema optimized for Neon self-hosted
-- Database: Neon (PostgreSQL 15 + pgvector)
-- Schema: rag
-- Version: 2.0.0 (Migrated from TimescaleDB)
-- Created: 2025-11-03
-- ============================================================================

-- Connect to RAG database
\c rag

-- ============================================================================
-- Schema Creation
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS rag;

COMMENT ON SCHEMA rag IS 'RAG (Retrieval-Augmented Generation) Services - v2.0 with Neon + Qdrant Cluster + Kong Gateway';

SET search_path TO rag, public;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION rag.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rag.update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp';

-- ============================================================================
-- TABLE: rag.collections
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.collections (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Collection Identity
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200),
    description TEXT,
    
    -- Configuration
    directory TEXT NOT NULL,
    embedding_model VARCHAR(100) NOT NULL,
    chunk_size INTEGER NOT NULL DEFAULT 512,
    chunk_overlap INTEGER NOT NULL DEFAULT 50,
    file_types TEXT[] NOT NULL DEFAULT '{md,mdx}',
    recursive BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- State Management
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_update BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Vector DB Integration (flexible for multiple backends)
    vector_db_type VARCHAR(50) NOT NULL DEFAULT 'qdrant',
    vector_db_collection_name VARCHAR(100),
    vector_dimensions INTEGER,
    
    -- Statistics (cached from vector DB + filesystem)
    total_documents INTEGER DEFAULT 0,
    indexed_documents INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT chunk_size_range CHECK (chunk_size BETWEEN 128 AND 2048),
    CONSTRAINT chunk_overlap_range CHECK (chunk_overlap BETWEEN 0 AND chunk_size),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'indexing', 'ready', 'error', 'disabled')),
    CONSTRAINT valid_vector_db_type CHECK (vector_db_type IN ('qdrant', 'pgvector', 'pinecone', 'weaviate'))
);

COMMENT ON TABLE rag.collections IS 'RAG collection configurations and metadata';
COMMENT ON COLUMN rag.collections.vector_db_type IS 'Vector database backend: qdrant (default), pgvector, pinecone, weaviate';

-- Indexes
CREATE INDEX idx_collections_enabled ON rag.collections(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_collections_status ON rag.collections(status);
CREATE INDEX idx_collections_embedding_model ON rag.collections(embedding_model);
CREATE INDEX idx_collections_vector_db_type ON rag.collections(vector_db_type);

-- Trigger
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON rag.collections
FOR EACH ROW
EXECUTE FUNCTION rag.update_updated_at_column();

-- ============================================================================
-- TABLE: rag.documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.documents (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    collection_id UUID NOT NULL REFERENCES rag.collections(id) ON DELETE CASCADE,
    
    -- Document Identity
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_extension VARCHAR(10),
    file_hash VARCHAR(64),
    
    -- File Metadata
    file_size_bytes BIGINT,
    file_modified_at TIMESTAMPTZ,
    
    -- Indexing Status
    indexed BOOLEAN NOT NULL DEFAULT FALSE,
    index_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    index_error_message TEXT,
    
    -- Statistics
    chunk_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    indexed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_document_per_collection UNIQUE(collection_id, file_path),
    CONSTRAINT valid_index_status CHECK (index_status IN ('pending', 'processing', 'indexed', 'error', 'skipped'))
);

COMMENT ON TABLE rag.documents IS 'Document metadata and indexing status tracking';

-- Indexes
CREATE INDEX idx_documents_collection_id ON rag.documents(collection_id);
CREATE INDEX idx_documents_indexed ON rag.documents(indexed);
CREATE INDEX idx_documents_index_status ON rag.documents(index_status);
CREATE INDEX idx_documents_file_hash ON rag.documents(file_hash);
CREATE INDEX idx_documents_updated_at ON rag.documents(updated_at DESC);

-- Trigger
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON rag.documents
FOR EACH ROW
EXECUTE FUNCTION rag.update_updated_at_column();

-- ============================================================================
-- TABLE: rag.chunks
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.chunks (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    document_id UUID NOT NULL REFERENCES rag.documents(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES rag.collections(id) ON DELETE CASCADE,
    
    -- Chunk Identity
    chunk_index INTEGER NOT NULL,
    chunk_hash VARCHAR(64),
    
    -- Vector DB Mapping
    vector_db_point_id UUID,
    vector_db_point_id_str VARCHAR(255),
    
    -- Content (optional - can be stored only in vector DB)
    content TEXT,
    content_preview VARCHAR(200),
    
    -- Metadata
    start_char INTEGER,
    end_char INTEGER,
    token_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_chunk_per_document UNIQUE(document_id, chunk_index),
    CONSTRAINT unique_vector_db_point UNIQUE(vector_db_point_id) WHERE vector_db_point_id IS NOT NULL
);

COMMENT ON TABLE rag.chunks IS 'Text chunks and vector DB point mappings';

-- Indexes
CREATE INDEX idx_chunks_document_id ON rag.chunks(document_id);
CREATE INDEX idx_chunks_collection_id ON rag.chunks(collection_id);
CREATE INDEX idx_chunks_vector_db_point_id ON rag.chunks(vector_db_point_id);
CREATE INDEX idx_chunks_chunk_hash ON rag.chunks(chunk_hash);

-- Full-text search index
CREATE INDEX idx_chunks_content_fts ON rag.chunks 
USING gin(to_tsvector('english', content)) 
WHERE content IS NOT NULL;

-- ============================================================================
-- TABLE: rag.ingestion_jobs (Time-series with native partitioning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.ingestion_jobs (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES rag.collections(id) ON DELETE CASCADE,
    
    -- Job Details
    job_type VARCHAR(50) NOT NULL,
    job_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    source_path TEXT NOT NULL,
    
    -- Statistics
    files_processed INTEGER DEFAULT 0,
    chunks_created INTEGER DEFAULT 0,
    chunks_updated INTEGER DEFAULT 0,
    chunks_deleted INTEGER DEFAULT 0,
    
    -- Performance Metrics
    duration_ms INTEGER,
    embedding_time_ms INTEGER,
    vector_db_time_ms INTEGER,
    
    -- Error Handling
    error_message TEXT,
    error_stack TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_job_type CHECK (job_type IN ('file', 'directory', 'full_sync', 'incremental')),
    CONSTRAINT valid_job_status CHECK (job_status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Primary key includes partition key
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE rag.ingestion_jobs IS 'Ingestion job history with monthly partitioning (time-series data)';

-- Create initial partitions (last 3 months + next 3 months)
CREATE TABLE IF NOT EXISTS rag.ingestion_jobs_2025_10 PARTITION OF rag.ingestion_jobs
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE IF NOT EXISTS rag.ingestion_jobs_2025_11 PARTITION OF rag.ingestion_jobs
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE IF NOT EXISTS rag.ingestion_jobs_2025_12 PARTITION OF rag.ingestion_jobs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS rag.ingestion_jobs_2026_01 PARTITION OF rag.ingestion_jobs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Indexes on partitioned table
CREATE INDEX idx_ingestion_jobs_collection_created 
    ON rag.ingestion_jobs(collection_id, created_at DESC);
CREATE INDEX idx_ingestion_jobs_status_created 
    ON rag.ingestion_jobs(job_status, created_at DESC);
CREATE INDEX idx_ingestion_jobs_created_at 
    ON rag.ingestion_jobs(created_at DESC);

-- ============================================================================
-- TABLE: rag.query_logs (Time-series with native partitioning)
-- ============================================================================================================================

CREATE TABLE IF NOT EXISTS rag.query_logs (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES rag.collections(id) ON DELETE SET NULL,
    
    -- Query Details
    query_text TEXT NOT NULL,
    query_type VARCHAR(50) NOT NULL DEFAULT 'semantic',
    query_hash VARCHAR(64),
    
    -- Results
    results_count INTEGER,
    top_result_score FLOAT,
    
    -- Performance
    duration_ms INTEGER NOT NULL,
    cache_hit BOOLEAN DEFAULT FALSE,
    cache_tier VARCHAR(20),
    
    -- Metadata
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_query_type CHECK (query_type IN ('semantic', 'keyword', 'hybrid', 'qa')),
    CONSTRAINT valid_cache_tier CHECK (cache_tier IN ('L1', 'L2', 'L3', 'miss')),
    
    -- Primary key includes partition key
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE rag.query_logs IS 'Query analytics with monthly partitioning (time-series data)';

-- Create initial partitions
CREATE TABLE IF NOT EXISTS rag.query_logs_2025_10 PARTITION OF rag.query_logs
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE IF NOT EXISTS rag.query_logs_2025_11 PARTITION OF rag.query_logs
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE IF NOT EXISTS rag.query_logs_2025_12 PARTITION OF rag.query_logs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS rag.query_logs_2026_01 PARTITION OF rag.query_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Indexes
CREATE INDEX idx_query_logs_collection_created 
    ON rag.query_logs(collection_id, created_at DESC);
CREATE INDEX idx_query_logs_query_hash_created 
    ON rag.query_logs(query_hash, created_at DESC);
CREATE INDEX idx_query_logs_created_at 
    ON rag.query_logs(created_at DESC);

-- ============================================================================
-- TABLE: rag.embedding_models
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.embedding_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Model Identity
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    
    -- Model Specifications
    dimensions INTEGER NOT NULL,
    max_tokens INTEGER NOT NULL DEFAULT 512,
    model_size_mb INTEGER,
    
    -- Configuration
    ollama_model_name VARCHAR(100),
    api_endpoint TEXT,
    requires_api_key BOOLEAN DEFAULT FALSE,
    
    -- Status
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    available BOOLEAN DEFAULT TRUE,
    default_model BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    description TEXT,
    documentation_url TEXT,
    
    -- Performance Benchmarks
    avg_embedding_time_ms INTEGER,
    benchmark_date DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_provider CHECK (provider IN ('ollama', 'openai', 'cohere', 'huggingface', 'custom')),
    CONSTRAINT unique_default_model UNIQUE(default_model) WHERE default_model = TRUE
);

COMMENT ON TABLE rag.embedding_models IS 'Catalog of available embedding models';

-- Trigger
CREATE TRIGGER update_embedding_models_updated_at
BEFORE UPDATE ON rag.embedding_models
FOR EACH ROW
EXECUTE FUNCTION rag.update_updated_at_column();

-- ============================================================================
-- MATERIALIZED VIEWS (Replaces TimescaleDB Continuous Aggregates)
-- ============================================================================

-- Daily query statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS rag.query_stats_daily AS
SELECT
    DATE_TRUNC('day', created_at) AS day,
    collection_id,
    query_type,
    COUNT(*) AS total_queries,
    AVG(duration_ms) AS avg_duration_ms,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms,
    AVG(results_count) AS avg_results_count,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS cache_hit_rate
FROM rag.query_logs
GROUP BY day, collection_id, query_type;

COMMENT ON MATERIALIZED VIEW rag.query_stats_daily IS 'Daily aggregated query statistics (refreshed hourly)';

-- Index for fast lookups
CREATE INDEX idx_query_stats_daily_day ON rag.query_stats_daily(day DESC);
CREATE INDEX idx_query_stats_daily_collection ON rag.query_stats_daily(collection_id, day DESC);

-- Hourly ingestion statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS rag.ingestion_stats_hourly AS
SELECT
    DATE_TRUNC('hour', created_at) AS hour,
    collection_id,
    job_type,
    COUNT(*) AS total_jobs,
    SUM(CASE WHEN job_status = 'completed' THEN 1 ELSE 0 END) AS completed_jobs,
    SUM(CASE WHEN job_status = 'failed' THEN 1 ELSE 0 END) AS failed_jobs,
    AVG(duration_ms) AS avg_duration_ms,
    SUM(chunks_created) AS total_chunks_created
FROM rag.ingestion_jobs
GROUP BY hour, collection_id, job_type;

COMMENT ON MATERIALIZED VIEW rag.ingestion_stats_hourly IS 'Hourly aggregated ingestion statistics (refreshed every 15 min)';

-- Index
CREATE INDEX idx_ingestion_stats_hourly_hour ON rag.ingestion_stats_hourly(hour DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to refresh materialized views (call via cron or manually)
CREATE OR REPLACE FUNCTION rag.refresh_all_aggregates()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY rag.query_stats_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY rag.ingestion_stats_hourly;
    RAISE NOTICE 'All materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rag.refresh_all_aggregates() IS 'Refresh all materialized views (run hourly via cron)';

-- Function to get collection statistics
CREATE OR REPLACE FUNCTION rag.get_collection_stats(p_collection_id UUID)
RETURNS TABLE (
    collection_name VARCHAR,
    total_documents INTEGER,
    indexed_documents INTEGER,
    total_chunks INTEGER,
    avg_chunks_per_document NUMERIC,
    total_size_mb NUMERIC,
    last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.name,
        c.total_documents,
        c.indexed_documents,
        c.total_chunks,
        CASE
            WHEN c.indexed_documents > 0 THEN ROUND(c.total_chunks::NUMERIC / c.indexed_documents, 2)
            ELSE 0
        END,
        ROUND(c.total_size_bytes::NUMERIC / 1024 / 1024, 2),
        c.last_sync_at
    FROM rag.collections c
    WHERE c.id = p_collection_id;
END;
$$ LANGUAGE plpgsql;

-- Function to search chunks by text (full-text search)
CREATE OR REPLACE FUNCTION rag.search_chunks_by_text(
    p_query TEXT,
    p_collection_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    content_preview VARCHAR,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.document_id,
        c.content,
        c.content_preview,
        ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', p_query)) AS similarity
    FROM rag.chunks c
    WHERE
        c.content IS NOT NULL
        AND to_tsvector('english', c.content) @@ plainto_tsquery('english', p_query)
        AND (p_collection_id IS NULL OR c.collection_id = p_collection_id)
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert sample embedding models
INSERT INTO rag.embedding_models (name, display_name, provider, dimensions, max_tokens, ollama_model_name, enabled, available, default_model, model_size_mb, description)
VALUES
    ('nomic-embed-text', 'Nomic Embed Text', 'ollama', 768, 512, 'nomic-embed-text', TRUE, TRUE, FALSE, 274, 'General purpose multilingual embedding model (768 dimensions)'),
    ('mxbai-embed-large', 'MXBAI Embed Large', 'ollama', 384, 512, 'mxbai-embed-large', TRUE, TRUE, TRUE, 669, 'Fast retrieval optimized model (384 dimensions, lower latency)'),
    ('embeddinggemma', 'Embedding Gemma', 'ollama', 768, 512, 'gemma:2b', TRUE, TRUE, FALSE, 621, 'Google Gemma embedding model (768 dimensions, high quality)')
ON CONFLICT (name) DO UPDATE SET
    available = EXCLUDED.available,
    enabled = EXCLUDED.enabled,
    updated_at = NOW();

-- Insert sample collection (documentation)
INSERT INTO rag.collections (
    name, 
    display_name, 
    description, 
    directory, 
    embedding_model, 
    vector_db_type,
    vector_db_collection_name, 
    vector_dimensions, 
    status, 
    enabled,
    auto_update
)
VALUES
    (
        'documentation', 
        'Documentation (MXBAI)', 
        'TradingSystem documentation indexed with MXBAI Embed Large (384 dimensions)', 
        '/data/docs/content', 
        'mxbai-embed-large', 
        'qdrant',
        'docs_index_mxbai', 
        384, 
        'ready', 
        TRUE,
        TRUE
    )
ON CONFLICT (name) DO UPDATE SET
    status = EXCLUDED.status,
    enabled = EXCLUDED.enabled,
    updated_at = NOW();

-- ============================================================================
-- CRON JOB (requires pg_cron extension)
-- ============================================================================

-- Auto-refresh materialized views every hour
-- Note: pg_cron may not be available in Neon, use external cron instead
-- 
-- SELECT cron.schedule('refresh-rag-aggregates', '0 * * * *', 'SELECT rag.refresh_all_aggregates()');

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant permissions to application user (adjust username as needed)
-- CREATE USER rag_app_user WITH PASSWORD 'secure_password';
-- GRANT USAGE ON SCHEMA rag TO rag_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA rag TO rag_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA rag TO rag_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rag TO rag_app_user;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo ''
\echo '========================================='
\echo 'RAG Schema Installation - Verification'
\echo '========================================='
\echo ''

-- Count tables
SELECT COUNT(*) AS table_count 
FROM information_schema.tables 
WHERE table_schema = 'rag' 
AND table_type = 'BASE TABLE';

-- List tables
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'rag'
ORDER BY tablename;

-- List materialized views
SELECT 
    schemaname,
    matviewname,
    matviewowner
FROM pg_matviews
WHERE schemaname = 'rag'
ORDER BY matviewname;

-- List functions
SELECT 
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'rag'
ORDER BY p.proname;

-- Show sample data
SELECT 'Collections', COUNT(*) FROM rag.collections
UNION ALL
SELECT 'Embedding Models', COUNT(*) FROM rag.embedding_models
UNION ALL
SELECT 'Documents', COUNT(*) FROM rag.documents
UNION ALL
SELECT 'Chunks', COUNT(*) FROM rag.chunks;

\echo ''
\echo '========================================='
\echo '✅ RAG Schema Created Successfully!'
\echo '========================================='
\echo ''
\echo 'Schema: rag'
\echo 'Tables: 4 (collections, documents, chunks, embedding_models)'
\echo 'Partitioned Tables: 2 (ingestion_jobs, query_logs)'
\echo 'Materialized Views: 2 (query_stats_daily, ingestion_stats_hourly)'
\echo 'Functions: 3 (update_updated_at_column, get_collection_stats, search_chunks_by_text)'
\echo ''
\echo 'Next Steps:'
\echo '  1. Migrate data from TimescaleDB: bash scripts/migration/migrate-timescaledb-to-neon.sh'
\echo '  2. Update application .env: NEON_DATABASE_URL=postgresql://postgres:password@localhost:5435/rag'
\echo '  3. Setup cron job to refresh views: 0 * * * * psql -c "SELECT rag.refresh_all_aggregates()"'
\echo ''

-- Reset search_path
RESET search_path;


