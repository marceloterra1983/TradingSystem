-- ============================================================================
-- RAG Services - Chunks Table
-- ============================================================================
-- Description: Stores metadata for document chunks and their vector mappings
-- Database: TimescaleDB (PostgreSQL + time-series extensions)
-- Schema: rag
-- Version: 1.0.0
-- Last Updated: 2025-11-02
-- ============================================================================

-- ============================================================================
-- Table: rag.chunks
-- ============================================================================
-- Purpose: Track individual text chunks and their Qdrant vector IDs
-- Notes:
--   - Each chunk represents a portion of a document (512 tokens default)
--   - Stores mapping between PostgreSQL and Qdrant (vector DB)
--   - Enables orphan detection (chunks without source documents)
--   - Tracks chunk metadata (length, position, overlap)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.chunks (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    document_id UUID NOT NULL REFERENCES rag.documents(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES rag.collections(id) ON DELETE CASCADE,
    
    -- Qdrant Integration
    qdrant_point_id UUID NOT NULL,                  -- Point ID in Qdrant vector database
    qdrant_collection VARCHAR(100) NOT NULL,        -- Qdrant collection name
    
    -- Chunk Content
    content TEXT NOT NULL,                          -- Actual chunk text (for debugging/preview)
    content_hash VARCHAR(64),                       -- SHA-256 hash of content
    
    -- Chunk Position
    chunk_index INTEGER NOT NULL,                   -- Position within document (0-based)
    chunk_size INTEGER NOT NULL,                    -- Actual chunk size (characters/tokens)
    chunk_overlap INTEGER,                          -- Overlap with previous chunk
    
    -- Source Location
    start_position INTEGER,                         -- Start position in source document
    end_position INTEGER,                           -- End position in source document
    
    -- Metadata
    embedding_model VARCHAR(100) NOT NULL,          -- Embedding model used
    vector_dimensions INTEGER NOT NULL,             -- Embedding vector dimensions
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional Metadata
    metadata JSONB DEFAULT '{}'::jsonb,             -- Flexible metadata storage
    
    -- Constraints
    UNIQUE (document_id, chunk_index),              -- One chunk per position per document
    UNIQUE (qdrant_point_id, qdrant_collection),    -- One-to-one mapping with Qdrant
    CONSTRAINT chunk_size_positive CHECK (chunk_size > 0),
    CONSTRAINT chunk_index_nonnegative CHECK (chunk_index >= 0),
    CONSTRAINT position_order CHECK (end_position > start_position OR (start_position IS NULL AND end_position IS NULL))
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for document queries
CREATE INDEX idx_rag_chunks_document_id 
ON rag.chunks(document_id);

-- Index for collection queries
CREATE INDEX idx_rag_chunks_collection_id 
ON rag.chunks(collection_id);

-- Index for Qdrant mapping lookups
CREATE INDEX idx_rag_chunks_qdrant_point 
ON rag.chunks(qdrant_point_id, qdrant_collection);

-- Index for chunk position within document
CREATE INDEX idx_rag_chunks_document_index 
ON rag.chunks(document_id, chunk_index);

-- Index for embedding model filtering
CREATE INDEX idx_rag_chunks_embedding_model 
ON rag.chunks(embedding_model);

-- GIN index for metadata searches
CREATE INDEX idx_rag_chunks_metadata_gin 
ON rag.chunks USING GIN (metadata);

-- Index for content hash (detect duplicate chunks)
CREATE INDEX idx_rag_chunks_content_hash 
ON rag.chunks(content_hash) 
WHERE content_hash IS NOT NULL;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at on modification
CREATE OR REPLACE FUNCTION rag.update_chunks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chunks_timestamp
BEFORE UPDATE ON rag.chunks
FOR EACH ROW
EXECUTE FUNCTION rag.update_chunks_timestamp();

-- Trigger: Update document chunks_count on insert/delete
CREATE OR REPLACE FUNCTION rag.update_document_chunks_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update document chunks_count
    UPDATE rag.documents
    SET 
        chunks_count = (
            SELECT COUNT(*) 
            FROM rag.chunks 
            WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
        ),
        vectors_count = (
            SELECT COUNT(*) 
            FROM rag.chunks 
            WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.document_id, OLD.document_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_chunks_count
AFTER INSERT OR DELETE ON rag.chunks
FOR EACH ROW
EXECUTE FUNCTION rag.update_document_chunks_count();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE rag.chunks IS 'Text chunks and their vector mappings in Qdrant';
COMMENT ON COLUMN rag.chunks.id IS 'Unique chunk identifier (UUID)';
COMMENT ON COLUMN rag.chunks.document_id IS 'Parent document foreign key';
COMMENT ON COLUMN rag.chunks.qdrant_point_id IS 'Corresponding point ID in Qdrant vector database';
COMMENT ON COLUMN rag.chunks.content IS 'Actual chunk text (for debugging and previews)';
COMMENT ON COLUMN rag.chunks.chunk_index IS 'Position within document (0-based sequence)';
COMMENT ON COLUMN rag.chunks.embedding_model IS 'Embedding model used to generate vector';
COMMENT ON COLUMN rag.chunks.vector_dimensions IS 'Embedding vector dimensions (e.g., 768, 384)';

-- ============================================================================
-- Views
-- ============================================================================

-- View: Chunks with document and collection details
CREATE OR REPLACE VIEW rag.v_chunks_with_documents AS
SELECT 
    c.id,
    c.document_id,
    d.file_path,
    d.filename,
    c.collection_id,
    col.name AS collection_name,
    c.qdrant_point_id,
    c.qdrant_collection,
    c.chunk_index,
    c.chunk_size,
    c.content_hash,
    c.embedding_model,
    c.vector_dimensions,
    c.created_at,
    c.updated_at,
    c.metadata
FROM rag.chunks c
INNER JOIN rag.documents d ON c.document_id = d.id
INNER JOIN rag.collections col ON c.collection_id = col.id;

COMMENT ON VIEW rag.v_chunks_with_documents IS 'Chunks with document and collection context (denormalized)';

-- View: Orphaned chunks (chunks without parent document)
CREATE OR REPLACE VIEW rag.v_orphaned_chunks AS
SELECT 
    c.*
FROM rag.chunks c
LEFT JOIN rag.documents d ON c.document_id = d.id
WHERE d.id IS NULL;

COMMENT ON VIEW rag.v_orphaned_chunks IS 'Chunks without parent documents (orphans, should be cleaned up)';

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Get chunks for a document
CREATE OR REPLACE FUNCTION rag.get_document_chunks(
    p_document_id UUID
)
RETURNS TABLE (
    chunk_id UUID,
    chunk_index INTEGER,
    content TEXT,
    qdrant_point_id UUID,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.chunk_index,
        c.content,
        c.qdrant_point_id,
        c.created_at
    FROM rag.chunks c
    WHERE c.document_id = p_document_id
    ORDER BY c.chunk_index;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rag.get_document_chunks IS 'Get all chunks for a specific document, ordered by position';

-- Function: Find orphaned chunks
CREATE OR REPLACE FUNCTION rag.find_orphaned_chunks()
RETURNS TABLE (
    chunk_id UUID,
    qdrant_point_id UUID,
    collection_id UUID,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.qdrant_point_id,
        c.collection_id,
        c.created_at
    FROM rag.chunks c
    LEFT JOIN rag.documents d ON c.document_id = d.id
    WHERE d.id IS NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rag.find_orphaned_chunks IS 'Find chunks without parent documents (data integrity check)';

-- ============================================================================
-- Sample Queries
-- ============================================================================

/*
-- Get all chunks for a document
SELECT * FROM rag.get_document_chunks(
    (SELECT id FROM rag.documents WHERE file_path = 'docs/content/api/workspace.mdx' LIMIT 1)
);

-- Find orphaned chunks
SELECT * FROM rag.find_orphaned_chunks();

-- Get chunk statistics by collection
SELECT 
    col.name AS collection_name,
    COUNT(c.id) AS total_chunks,
    AVG(c.chunk_size)::INTEGER AS avg_chunk_size,
    MIN(c.chunk_size) AS min_chunk_size,
    MAX(c.chunk_size) AS max_chunk_size
FROM rag.chunks c
INNER JOIN rag.collections col ON c.collection_id = col.id
GROUP BY col.name
ORDER BY total_chunks DESC;

-- Get duplicate chunks (same content_hash)
SELECT 
    content_hash,
    COUNT(*) AS duplicate_count,
    array_agg(id) AS chunk_ids
FROM rag.chunks
WHERE content_hash IS NOT NULL
GROUP BY content_hash
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
*/

