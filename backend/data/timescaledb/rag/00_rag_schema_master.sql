-- ============================================================================
-- RAG Services - Master Schema Import
-- ============================================================================
-- Description: Master file that imports all RAG schema components in correct order
-- Database: TimescaleDB (PostgreSQL + time-series extensions)
-- Schema: rag
-- Version: 1.0.0
-- Last Updated: 2025-11-02
--
-- Usage:
--   psql -h localhost -p 5432 -U postgres -d tradingsystem -f 00_rag_schema_master.sql
--
-- Or within psql:
--   \i backend/data/timescaledb/rag/00_rag_schema_master.sql
--
-- ============================================================================

-- ============================================================================
-- Schema Creation
-- ============================================================================

-- Create RAG schema
CREATE SCHEMA IF NOT EXISTS rag;

COMMENT ON SCHEMA rag IS 'RAG (Retrieval-Augmented Generation) Services schema for document collections, embeddings, and query logs';

-- Set search_path to include rag schema
SET search_path TO rag, public;

-- ============================================================================
-- Extension Dependencies
-- ============================================================================

-- Ensure required extensions are installed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "timescaledb";    -- Time-series database features

-- ============================================================================
-- Import Schema Components (In Dependency Order)
-- ============================================================================

-- NOTE: Adjust file paths based on your deployment directory structure
-- For local development: \i <file>.sql
-- For production: Use full paths or ensure current directory is correct

\echo ''
\echo '========================================='
\echo 'RAG Services Schema Installation'
\echo '========================================='
\echo ''

-- 1. Collections (base table)
\echo '[1/6] Creating rag.collections table...'
\i 01_rag_collections.sql

-- 2. Documents (depends on collections)
\echo '[2/6] Creating rag.documents table...'
\i 02_rag_documents.sql

-- 3. Chunks (depends on documents and collections)
\echo '[3/6] Creating rag.chunks table...'
\i 03_rag_chunks.sql

-- 4. Ingestion Jobs (hypertable, depends on collections)
\echo '[4/6] Creating rag.ingestion_jobs hypertable...'
\i 04_rag_ingestion_jobs.sql

-- 5. Query Logs (hypertable, depends on collections)
\echo '[5/6] Creating rag.query_logs hypertable...'
\i 05_rag_query_logs.sql

-- 6. Embedding Models (independent table)
\echo '[6/6] Creating rag.embedding_models table...'
\i 06_rag_embedding_models.sql

-- ============================================================================
-- Post-Installation Verification
-- ============================================================================

\echo ''
\echo '========================================='
\echo 'Installation Complete - Running Verification'
\echo '========================================='
\echo ''

-- Verify all tables exist
DO $$
DECLARE
    v_table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'rag'
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Tables created: % (expected: 6)', v_table_count;
    
    IF v_table_count < 6 THEN
        RAISE WARNING 'Expected 6 tables, found %. Check for errors above.', v_table_count;
    END IF;
END $$;

-- List all created tables
\echo ''
\echo 'Created Tables:'
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'rag'
ORDER BY tablename;

-- List all created views
\echo ''
\echo 'Created Views:'
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'rag'
ORDER BY viewname;

-- List all created functions
\echo ''
\echo 'Created Functions:'
SELECT 
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'rag'
ORDER BY p.proname;

-- Verify hypertables
\echo ''
\echo 'Hypertables:'
SELECT 
    hypertable_schema,
    hypertable_name,
    num_dimensions,
    num_chunks
FROM timescaledb_information.hypertables
WHERE hypertable_schema = 'rag';

-- Verify continuous aggregates
\echo ''
\echo 'Continuous Aggregates:'
SELECT 
    view_schema,
    view_name,
    materialized_only
FROM timescaledb_information.continuous_aggregates
WHERE view_schema = 'rag';

-- ============================================================================
-- Sample Data Verification
-- ============================================================================

\echo ''
\echo '========================================='
\echo 'Sample Data Verification'
\echo '========================================='
\echo ''

-- Show installed collections
\echo 'Installed Collections:'
SELECT 
    name,
    display_name,
    embedding_model,
    enabled,
    status
FROM rag.collections
ORDER BY name;

-- Show installed embedding models
\echo ''
\echo 'Installed Embedding Models:'
SELECT 
    name,
    display_name,
    dimensions,
    model_size_mb,
    available
FROM rag.embedding_models
ORDER BY name;

-- ============================================================================
-- Database Statistics
-- ============================================================================

\echo ''
\echo '========================================='
\echo 'Schema Statistics'
\echo '========================================='
\echo ''

SELECT 
    'Collections' AS entity_type,
    COUNT(*) AS total_count,
    SUM(CASE WHEN enabled THEN 1 ELSE 0 END) AS enabled_count
FROM rag.collections
UNION ALL
SELECT 
    'Documents' AS entity_type,
    COUNT(*) AS total_count,
    SUM(CASE WHEN indexed THEN 1 ELSE 0 END) AS enabled_count
FROM rag.documents
UNION ALL
SELECT 
    'Chunks' AS entity_type,
    COUNT(*) AS total_count,
    NULL AS enabled_count
FROM rag.chunks
UNION ALL
SELECT 
    'Embedding Models' AS entity_type,
    COUNT(*) AS total_count,
    SUM(CASE WHEN available THEN 1 ELSE 0 END) AS enabled_count
FROM rag.embedding_models;

-- ============================================================================
-- Completion Message
-- ============================================================================

\echo ''
\echo '========================================='
\echo '✅ RAG Services Schema Installation Complete!'
\echo '========================================='
\echo ''
\echo 'Next Steps:'
\echo '  1. Review sample data in rag.collections and rag.embedding_models'
\echo '  2. Configure collection directories in your application'
\echo '  3. Run initial document ingestion'
\echo '  4. Monitor ingestion progress in rag.ingestion_jobs'
\echo '  5. Query logs will be automatically collected in rag.query_logs'
\echo ''
\echo 'Documentation:'
\echo '  - Schema documentation: docs/content/database/rag-schema.mdx'
\echo '  - ER Diagram: docs/content/diagrams/rag-services-er-diagram.puml'
\echo '  - API Documentation: docs/content/api/rag-services.mdx'
\echo ''
\echo 'For questions or issues, consult the RAG Services documentation.'
\echo ''

-- Reset search_path
RESET search_path;

