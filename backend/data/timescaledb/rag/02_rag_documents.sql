-- ============================================================================
-- RAG Services - Documents Table
-- ============================================================================
-- Description: Stores metadata for documents indexed in RAG collections
-- Database: TimescaleDB (PostgreSQL + time-series extensions)
-- Schema: rag
-- Version: 1.0.0
-- Last Updated: 2025-11-02
-- ============================================================================

-- ============================================================================
-- Table: rag.documents
-- ============================================================================
-- Purpose: Track individual documents within RAG collections
-- Notes:
--   - Each document represents a source file (e.g., .md, .mdx, .ts)
--   - Links to parent collection via foreign key
--   - Stores file metadata (path, size, hash, modification time)
--   - Tracks indexing status and errors
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.documents (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key to Collection
    collection_id UUID NOT NULL REFERENCES rag.collections(id) ON DELETE CASCADE,
    
    -- Document Identity
    file_path TEXT NOT NULL,                        -- Relative path from collection directory
    absolute_path TEXT NOT NULL,                    -- Absolute filesystem path
    filename VARCHAR(255) NOT NULL,                 -- Just the filename (with extension)
    file_extension VARCHAR(50),                     -- File extension (without dot)
    
    -- Content Metadata
    title TEXT,                                     -- Document title (extracted from content)
    description TEXT,                               -- Document description/summary
    language VARCHAR(10) DEFAULT 'en',              -- Document language (ISO 639-1)
    
    -- File Metadata
    file_size_bytes BIGINT NOT NULL,                -- File size in bytes
    file_hash VARCHAR(64),                          -- SHA-256 hash of file content
    last_modified_at TIMESTAMPTZ,                   -- File modification time (from filesystem)
    
    -- Indexing State
    indexed BOOLEAN NOT NULL DEFAULT FALSE,         -- Document successfully indexed
    index_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- Status: pending, processing, indexed, error
    chunks_count INTEGER DEFAULT 0,                 -- Number of chunks generated
    vectors_count INTEGER DEFAULT 0,                -- Number of vectors stored in Qdrant
    
    -- Error Tracking
    last_error TEXT,                                -- Last indexing error message
    error_count INTEGER DEFAULT 0,                  -- Number of indexing failures
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    indexed_at TIMESTAMPTZ,                         -- Last successful indexing
    
    -- Extracted Metadata (from document frontmatter/headers)
    frontmatter JSONB DEFAULT '{}'::jsonb,          -- YAML frontmatter (tags, date, author, etc.)
    metadata JSONB DEFAULT '{}'::jsonb,             -- Additional document metadata
    
    -- Constraints
    UNIQUE (collection_id, file_path),              -- One entry per file per collection
    CONSTRAINT valid_index_status CHECK (index_status IN ('pending', 'processing', 'indexed', 'error', 'skipped'))
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for collection queries
CREATE INDEX idx_rag_documents_collection_id 
ON rag.documents(collection_id);

-- Composite index for filtering by collection and status
CREATE INDEX idx_rag_documents_collection_status 
ON rag.documents(collection_id, index_status);

-- Index for filtering indexed documents
CREATE INDEX idx_rag_documents_indexed 
ON rag.documents(indexed) 
WHERE indexed = TRUE;

-- Index for file_hash lookups (detect duplicates/changes)
CREATE INDEX idx_rag_documents_file_hash 
ON rag.documents(file_hash) 
WHERE file_hash IS NOT NULL;

-- Index for sorting by last_modified_at
CREATE INDEX idx_rag_documents_last_modified 
ON rag.documents(last_modified_at DESC NULLS LAST);

-- Index for file extension filtering
CREATE INDEX idx_rag_documents_file_extension 
ON rag.documents(file_extension);

-- GIN indexes for JSONB searches
CREATE INDEX idx_rag_documents_frontmatter_gin 
ON rag.documents USING GIN (frontmatter);

CREATE INDEX idx_rag_documents_metadata_gin 
ON rag.documents USING GIN (metadata);

-- Full-text search index on title and description
CREATE INDEX idx_rag_documents_title_description_fts 
ON rag.documents USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at on modification
CREATE OR REPLACE FUNCTION rag.update_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documents_timestamp
BEFORE UPDATE ON rag.documents
FOR EACH ROW
EXECUTE FUNCTION rag.update_documents_timestamp();

-- Trigger: Update collection stats when document is indexed
CREATE OR REPLACE FUNCTION rag.update_collection_stats_on_document_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update collection statistics
    UPDATE rag.collections
    SET 
        total_documents = (
            SELECT COUNT(*) 
            FROM rag.documents 
            WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id)
        ),
        indexed_documents = (
            SELECT COUNT(*) 
            FROM rag.documents 
            WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id) 
            AND indexed = TRUE
        ),
        total_chunks = (
            SELECT COALESCE(SUM(chunks_count), 0) 
            FROM rag.documents 
            WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id)
        ),
        total_size_bytes = (
            SELECT COALESCE(SUM(file_size_bytes), 0) 
            FROM rag.documents 
            WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collection_stats
AFTER INSERT OR UPDATE OR DELETE ON rag.documents
FOR EACH ROW
EXECUTE FUNCTION rag.update_collection_stats_on_document_change();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE rag.documents IS 'Metadata for documents indexed in RAG collections';
COMMENT ON COLUMN rag.documents.id IS 'Unique document identifier (UUID)';
COMMENT ON COLUMN rag.documents.collection_id IS 'Parent collection foreign key';
COMMENT ON COLUMN rag.documents.file_path IS 'Relative path from collection directory';
COMMENT ON COLUMN rag.documents.file_hash IS 'SHA-256 hash for change detection';
COMMENT ON COLUMN rag.documents.chunks_count IS 'Number of text chunks generated from document';
COMMENT ON COLUMN rag.documents.vectors_count IS 'Number of embedding vectors stored in Qdrant';
COMMENT ON COLUMN rag.documents.frontmatter IS 'Extracted YAML frontmatter (tags, metadata, etc.)';
COMMENT ON COLUMN rag.documents.index_status IS 'Indexing status (pending, processing, indexed, error, skipped)';

-- ============================================================================
-- Views
-- ============================================================================

-- View: Documents with collection details
CREATE OR REPLACE VIEW rag.v_documents_with_collections AS
SELECT 
    d.id,
    d.collection_id,
    c.name AS collection_name,
    c.display_name AS collection_display_name,
    d.file_path,
    d.filename,
    d.file_extension,
    d.title,
    d.description,
    d.file_size_bytes,
    d.file_hash,
    d.indexed,
    d.index_status,
    d.chunks_count,
    d.vectors_count,
    d.last_modified_at,
    d.indexed_at,
    d.created_at,
    d.updated_at,
    d.frontmatter,
    d.metadata
FROM rag.documents d
INNER JOIN rag.collections c ON d.collection_id = c.id;

COMMENT ON VIEW rag.v_documents_with_collections IS 'Documents with parent collection details (denormalized)';

-- ============================================================================
-- Sample Queries
-- ============================================================================

/*
-- Get all documents for a collection
SELECT * FROM rag.documents
WHERE collection_id = (SELECT id FROM rag.collections WHERE name = 'documentation__nomic');

-- Get documents that need indexing
SELECT * FROM rag.documents
WHERE indexed = FALSE AND index_status = 'pending';

-- Get documents with errors
SELECT collection_id, file_path, last_error, error_count
FROM rag.documents
WHERE index_status = 'error'
ORDER BY error_count DESC, updated_at DESC;

-- Get documents modified recently (last 7 days)
SELECT * FROM rag.documents
WHERE last_modified_at > NOW() - INTERVAL '7 days'
ORDER BY last_modified_at DESC;

-- Search documents by title/description
SELECT * FROM rag.documents
WHERE to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')) 
      @@ to_tsquery('english', 'architecture & rag');
*/

