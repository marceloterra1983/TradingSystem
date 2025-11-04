-- ============================================================================
-- RAG Services - Embedding Models Table
-- ============================================================================
-- Description: Catalog of available embedding models
-- Database: TimescaleDB (PostgreSQL + time-series extensions)
-- Schema: rag
-- Version: 1.0.0
-- Last Updated: 2025-11-02
-- ============================================================================

-- ============================================================================
-- Table: rag.embedding_models
-- ============================================================================
-- Purpose: Track available embedding models and their characteristics
-- Notes:
--   - Stores model metadata (dimensions, size, provider)
--   - Enables model comparison and selection
--   - Tracks model availability and performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag.embedding_models (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Model Identity
    name VARCHAR(100) NOT NULL UNIQUE,              -- Model identifier (e.g., "nomic-embed-text")
    display_name VARCHAR(200) NOT NULL,             -- Human-readable name
    description TEXT,                               -- Model description
    
    -- Model Characteristics
    provider VARCHAR(100) NOT NULL,                 -- Provider (e.g., "Ollama", "OpenAI", "HuggingFace")
    dimensions INTEGER NOT NULL,                    -- Vector dimensions (e.g., 768, 384)
    max_tokens INTEGER,                             -- Maximum input tokens
    model_size_mb INTEGER,                          -- Model size in megabytes
    
    -- Performance Characteristics
    avg_inference_time_ms INTEGER,                  -- Average inference time (ms)
    tokens_per_second INTEGER,                      -- Throughput (tokens/sec)
    
    -- Availability
    available BOOLEAN NOT NULL DEFAULT TRUE,        -- Model is available for use
    requires_gpu BOOLEAN DEFAULT FALSE,             -- Requires GPU acceleration
    
    -- Use Cases
    optimized_for TEXT[],                           -- Use cases (e.g., ['semantic search', 'retrieval'])
    language_support TEXT[],                        -- Supported languages
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,                       -- Last time model was used
    
    -- Statistics
    usage_count BIGINT DEFAULT 0,                   -- Number of times model was used
    error_count BIGINT DEFAULT 0,                   -- Number of errors encountered
    
    -- Configuration
    config JSONB DEFAULT '{}'::jsonb,               -- Model-specific configuration
    metadata JSONB DEFAULT '{}'::jsonb,             -- Additional metadata
    
    -- Constraints
    CONSTRAINT positive_dimensions CHECK (dimensions > 0),
    CONSTRAINT positive_max_tokens CHECK (max_tokens IS NULL OR max_tokens > 0)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for filtering by provider
CREATE INDEX idx_rag_embedding_models_provider 
ON rag.embedding_models(provider);

-- Index for filtering by availability
CREATE INDEX idx_rag_embedding_models_available 
ON rag.embedding_models(available) 
WHERE available = TRUE;

-- Index for dimensions filtering
CREATE INDEX idx_rag_embedding_models_dimensions 
ON rag.embedding_models(dimensions);

-- Index for sorting by usage
CREATE INDEX idx_rag_embedding_models_usage 
ON rag.embedding_models(usage_count DESC);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at on modification
CREATE OR REPLACE FUNCTION rag.update_embedding_models_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_embedding_models_timestamp
BEFORE UPDATE ON rag.embedding_models
FOR EACH ROW
EXECUTE FUNCTION rag.update_embedding_models_timestamp();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE rag.embedding_models IS 'Catalog of available embedding models with characteristics';
COMMENT ON COLUMN rag.embedding_models.name IS 'Unique model identifier (e.g., nomic-embed-text)';
COMMENT ON COLUMN rag.embedding_models.dimensions IS 'Embedding vector dimensions (e.g., 768, 384)';
COMMENT ON COLUMN rag.embedding_models.provider IS 'Model provider (Ollama, OpenAI, HuggingFace, etc.)';
COMMENT ON COLUMN rag.embedding_models.available IS 'Model is available for use (not deprecated)';
COMMENT ON COLUMN rag.embedding_models.usage_count IS 'Total number of times model was used';

-- ============================================================================
-- Sample Data
-- ============================================================================

-- Insert default embedding models
INSERT INTO rag.embedding_models (
    name,
    display_name,
    description,
    provider,
    dimensions,
    max_tokens,
    model_size_mb,
    available,
    requires_gpu,
    optimized_for,
    language_support,
    metadata
) VALUES 
(
    'nomic-embed-text',
    'Nomic Embed Text',
    'General-purpose embedding model optimized for semantic search and retrieval',
    'Ollama',
    768,
    8192,
    274,
    TRUE,
    FALSE,
    ARRAY['semantic search', 'retrieval', 'general purpose'],
    ARRAY['en', 'multilingual'],
    '{"model_type": "dense", "architecture": "BERT", "training_data": "nomic-ai/nomic-embed-text-v1"}'::jsonb
),
(
    'mxbai-embed-large',
    'MXBAI Embed Large',
    'Fast retrieval-optimized embedding model with lower dimensionality',
    'Ollama',
    384,
    8192,
    669,
    TRUE,
    FALSE,
    ARRAY['fast retrieval', 'low latency', 'semantic search'],
    ARRAY['en', 'multilingual'],
    '{"model_type": "dense", "architecture": "BERT", "training_data": "mixedbread-ai/mxbai-embed-large-v1"}'::jsonb
),
(
    'embeddinggemma',
    'Embedding Gemma',
    'High-quality embedding model from Google with strong contextual understanding',
    'Ollama',
    768,
    8192,
    621,
    TRUE,
    TRUE,
    ARRAY['contextual understanding', 'multilingual', 'high quality'],
    ARRAY['en', 'multilingual'],
    '{"model_type": "dense", "architecture": "Gemma", "training_data": "google/embedding-gemma"}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    dimensions = EXCLUDED.dimensions,
    model_size_mb = EXCLUDED.model_size_mb,
    updated_at = NOW();

-- ============================================================================
-- Views
-- ============================================================================

-- View: Available models sorted by usage
CREATE OR REPLACE VIEW rag.v_available_embedding_models AS
SELECT 
    name,
    display_name,
    provider,
    dimensions,
    model_size_mb,
    optimized_for,
    language_support,
    usage_count,
    avg_inference_time_ms,
    available,
    requires_gpu
FROM rag.embedding_models
WHERE available = TRUE
ORDER BY usage_count DESC;

COMMENT ON VIEW rag.v_available_embedding_models IS 'Available embedding models sorted by usage';

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Increment model usage count
CREATE OR REPLACE FUNCTION rag.increment_model_usage(
    p_model_name VARCHAR(100)
)
RETURNS VOID AS $$
BEGIN
    UPDATE rag.embedding_models
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE name = p_model_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rag.increment_model_usage IS 'Increment usage count for an embedding model';

-- ============================================================================
-- Sample Queries
-- ============================================================================

/*
-- Get all available models
SELECT * FROM rag.v_available_embedding_models;

-- Compare models by dimensions
SELECT 
    name,
    dimensions,
    model_size_mb,
    optimized_for
FROM rag.embedding_models
WHERE available = TRUE
ORDER BY dimensions DESC;

-- Find models optimized for specific use case
SELECT 
    name,
    display_name,
    optimized_for
FROM rag.embedding_models
WHERE 'semantic search' = ANY(optimized_for)
AND available = TRUE;
*/

