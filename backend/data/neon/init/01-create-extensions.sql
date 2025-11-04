-- ============================================================================
-- Neon Database - Extension Installation
-- ============================================================================
-- Purpose: Install required PostgreSQL extensions for RAG services
-- Database: Neon (PostgreSQL 15)
-- Executed: On first container startup (via docker-entrypoint-initdb.d)
-- ============================================================================

-- Connect to the RAG database
\c rag

-- ============================================================================
-- CORE EXTENSIONS
-- ============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
    SCHEMA public
    VERSION '1.1';

COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions (gen_random_uuid, uuid_generate_v4)';

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto"
    SCHEMA public
    VERSION '1.3';

COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for password hashing, encryption';

-- Full-text search (trigrams)
CREATE EXTENSION IF NOT EXISTS "pg_trgm"
    SCHEMA public
    VERSION '1.6';

COMMENT ON EXTENSION "pg_trgm" IS 'Text similarity measurement and index support for full-text search';

-- ============================================================================
-- VECTOR EXTENSIONS (For hybrid search - optional)
-- ============================================================================

-- pgvector for vector embeddings (if not using external Qdrant)
CREATE EXTENSION IF NOT EXISTS "vector"
    SCHEMA public
    VERSION '0.5.1';

COMMENT ON EXTENSION "vector" IS 'Vector data type and similarity search (pgvector)';

-- ============================================================================
-- TIMESCALEDB EXTENSION (Time-series optimization)
-- ============================================================================

-- TimescaleDB for hypertables (query_logs, ingestion_jobs)
-- Note: This may not be available in all Neon deployments
-- If installation fails, we'll use native PostgreSQL partitioning instead

DO $$
BEGIN
    -- Try to create TimescaleDB extension
    CREATE EXTENSION IF NOT EXISTS timescaledb
        VERSION '2.13.0'
        CASCADE;
    
    RAISE NOTICE 'TimescaleDB extension installed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'TimescaleDB extension not available. Will use native partitioning for time-series tables.';
        RAISE WARNING 'Error: %', SQLERRM;
END
$$;

-- ============================================================================
-- STATISTICS EXTENSION
-- ============================================================================

-- pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"
    SCHEMA public
    VERSION '1.10';

COMMENT ON EXTENSION "pg_stat_statements" IS 'Track execution statistics of all SQL statements';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all installed extensions
SELECT 
    e.extname AS extension_name,
    e.extversion AS version,
    n.nspname AS schema,
    c.description
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
LEFT JOIN pg_description c ON c.objoid = e.oid
WHERE n.nspname = 'public'
ORDER BY e.extname;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant usage on extensions to application user (if exists)
-- Uncomment and adjust username as needed

-- GRANT USAGE ON SCHEMA public TO rag_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO rag_app_user;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

\echo ''
\echo '========================================='
\echo 'Neon Database - Extensions Installed'
\echo '========================================='
\echo ''
\echo 'Installed Extensions:'
\echo '  - uuid-ossp (UUID generation)'
\echo '  - pgcrypto (Cryptography)'
\echo '  - pg_trgm (Full-text search)'
\echo '  - vector (pgvector for embeddings)'
\echo '  - timescaledb (Time-series, if available)'
\echo '  - pg_stat_statements (Query monitoring)'
\echo ''
\echo 'Next Step: Run RAG schema creation'
\echo '  psql -U postgres -d rag -f backend/data/neon/init/02-create-rag-schema.sql'
\echo ''


