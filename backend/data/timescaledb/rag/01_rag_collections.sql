-- ============================================================================
-- RAG Services - Collections Table
-- ============================================================================
-- Description: Stores metadata for RAG collections (document collections)
-- Database: TimescaleDB (PostgreSQL + time-series extensions)
-- Schema: rag
-- Version: 1.0.0
-- Last Updated: 2025-11-02
-- ============================================================================

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS rag;

-- ============================================================================
-- Table: rag.collections
-- ============================================================================
-- Purpose: Manage RAG collection configurations and metadata
-- Notes:
--   - Each collection represents a group of documents with specific embedding model
--   - Supports multiple collections with different embedding models
--   - Tracks collection lifecycle (created, updated, last_indexed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.collections (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Collection Identity
    name VARCHAR(100) NOT NULL UNIQUE,              -- Unique collection name (e.g., "documentation__nomic")
    display_name VARCHAR(200),                      -- Human-readable name
    description TEXT,                               -- Collection description
    
    -- Configuration
    directory TEXT NOT NULL,                        -- Source directory path (absolute)
    embedding_model VARCHAR(100) NOT NULL,          -- Embedding model name (e.g., "nomic-embed-text")
    chunk_size INTEGER NOT NULL DEFAULT 512,        -- Chunk size for text splitting
    chunk_overlap INTEGER NOT NULL DEFAULT 50,      -- Overlap between chunks
    file_types TEXT[] NOT NULL DEFAULT '{md,mdx}',  -- Allowed file extensions
    recursive BOOLEAN NOT NULL DEFAULT TRUE,        -- Recurse into subdirectories
    
    -- State Management
    enabled BOOLEAN NOT NULL DEFAULT TRUE,          -- Collection is active
    auto_update BOOLEAN NOT NULL DEFAULT FALSE,     -- File watcher enabled
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- Status: pending, indexing, ready, error
    
    -- Qdrant Integration
    qdrant_collection_name VARCHAR(100),            -- Actual collection name in Qdrant (may differ from 'name')
    vector_dimensions INTEGER,                      -- Embedding vector dimensions (e.g., 768, 384)
    
    -- Statistics (cached from Qdrant + filesystem)
    total_documents INTEGER DEFAULT 0,              -- Total documents in source directory
    indexed_documents INTEGER DEFAULT 0,            -- Documents successfully indexed
    total_chunks INTEGER DEFAULT 0,                 -- Total chunks/vectors in Qdrant
    total_size_bytes BIGINT DEFAULT 0,              -- Total size of source documents
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_indexed_at TIMESTAMPTZ,                    -- Last successful indexing
    last_sync_at TIMESTAMPTZ,                       -- Last sync with filesystem
    
    -- Metadata (flexible JSON storage)
    metadata JSONB DEFAULT '{}'::jsonb,             -- Additional metadata
    
    -- Audit
    created_by VARCHAR(100),                        -- User/service that created collection
    updated_by VARCHAR(100),                        -- User/service that last updated
    
    -- Constraints
    CONSTRAINT chunk_size_range CHECK (chunk_size BETWEEN 128 AND 2048),
    CONSTRAINT chunk_overlap_range CHECK (chunk_overlap >= 0 AND chunk_overlap <= chunk_size),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'indexing', 'ready', 'error', 'disabled')),
    CONSTRAINT valid_embedding_model CHECK (embedding_model IN ('nomic-embed-text', 'mxbai-embed-large', 'embeddinggemma'))
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for filtering by status and enabled state
CREATE INDEX idx_rag_collections_status_enabled 
ON rag.collections(status, enabled) 
WHERE enabled = TRUE;

-- Index for filtering by embedding model
CREATE INDEX idx_rag_collections_embedding_model 
ON rag.collections(embedding_model);

-- Index for sorting by last_indexed_at
CREATE INDEX idx_rag_collections_last_indexed 
ON rag.collections(last_indexed_at DESC NULLS LAST);

-- GIN index for JSONB metadata searches
CREATE INDEX idx_rag_collections_metadata_gin 
ON rag.collections USING GIN (metadata);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at on modification
CREATE OR REPLACE FUNCTION rag.update_collections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collections_timestamp
BEFORE UPDATE ON rag.collections
FOR EACH ROW
EXECUTE FUNCTION rag.update_collections_timestamp();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE rag.collections IS 'RAG collection configurations and metadata';
COMMENT ON COLUMN rag.collections.id IS 'Unique collection identifier (UUID)';
COMMENT ON COLUMN rag.collections.name IS 'Unique collection name (URL-safe, lowercase)';
COMMENT ON COLUMN rag.collections.embedding_model IS 'Embedding model used for this collection';
COMMENT ON COLUMN rag.collections.chunk_size IS 'Text chunk size for splitting (tokens/characters)';
COMMENT ON COLUMN rag.collections.chunk_overlap IS 'Overlap between consecutive chunks';
COMMENT ON COLUMN rag.collections.status IS 'Current collection status (pending, indexing, ready, error, disabled)';
COMMENT ON COLUMN rag.collections.total_chunks IS 'Total vectors stored in Qdrant for this collection';
COMMENT ON COLUMN rag.collections.metadata IS 'Flexible JSON storage for additional collection metadata';

-- ============================================================================
-- Sample Data (for development)
-- ============================================================================

-- Insert default collections
INSERT INTO rag.collections (
    name, 
    display_name, 
    description, 
    directory, 
    embedding_model, 
    chunk_size, 
    chunk_overlap,
    file_types,
    enabled,
    auto_update,
    status,
    qdrant_collection_name,
    vector_dimensions,
    created_by
) VALUES 
(
    'documentation__nomic',
    'Documentation (Nomic Embed)',
    'Complete TradingSystem documentation using Nomic Embed Text model (768 dimensions)',
    '/data/docs/content',
    'nomic-embed-text',
    512,
    50,
    ARRAY['md', 'mdx'],
    TRUE,
    TRUE,
    'ready',
    'documentation__nomic',
    768,
    'system'
),
(
    'documentation__mxbai',
    'Documentation (MXBAI Embed)',
    'TradingSystem documentation using MXBAI Embed Large model (384 dimensions, optimized for speed)',
    '/data/docs/content',
    'mxbai-embed-large',
    512,
    50,
    ARRAY['md', 'mdx'],
    TRUE,
    FALSE,
    'pending',
    'documentation__mxbai',
    384,
    'system'
),
(
    'tradingsystem_v2',
    'TradingSystem Codebase',
    'Complete TradingSystem codebase and documentation',
    '/data/tradingsystem',
    'nomic-embed-text',
    512,
    50,
    ARRAY['md', 'mdx', 'py', 'ts', 'tsx', 'js', 'json'],
    TRUE,
    FALSE,
    'pending',
    'tradingsystem_v2',
    768,
    'system'
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Grants (Production Security)
-- ============================================================================

-- Grant read-only access to rag_reader role
-- GRANT SELECT ON rag.collections TO rag_reader;

-- Grant read-write access to rag_writer role
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rag.collections TO rag_writer;

-- Grant usage on schema
-- GRANT USAGE ON SCHEMA rag TO rag_reader, rag_writer;

