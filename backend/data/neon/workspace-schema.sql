-- ============================================
-- Neon Workspace Schema
-- ============================================
-- 
-- Optimized schema for Workspace app on Neon PostgreSQL
-- 
-- Features:
-- - Clean schema separation (workspace.*)
-- - JSONB for flexible metadata
-- - GIN indexes for array/JSON searches
-- - Constraints for data integrity
-- - Timestamp tracking (created_at, updated_at)
-- - Audit fields (created_by, updated_by)
--
-- Version: 1.0.0
-- Created: 2025-11-03
-- ============================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS workspace;

-- ============================================
-- Tables
-- ============================================

-- Workspace Items Table
-- Stores ideas, tasks, and feature requests
CREATE TABLE workspace.workspace_items (
    -- Primary Key
    id SERIAL PRIMARY KEY,
    
    -- Core Fields
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    
    -- Status Management
    priority VARCHAR(20) NOT NULL 
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL 
        CHECK (status IN ('new', 'review', 'in-progress', 'completed', 'rejected')),
    
    -- Flexible Data
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    
    -- Audit Fields
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Foreign Key (will be enforced after categories table creation)
    CONSTRAINT fk_category FOREIGN KEY (category) 
        REFERENCES workspace.workspace_categories(name)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Workspace Categories Table
-- Predefined categories for organizing items
CREATE TABLE workspace.workspace_categories (
    -- Primary Key
    name VARCHAR(50) PRIMARY KEY,
    
    -- Display Information
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_display_name UNIQUE (display_name)
);

-- ============================================
-- Indexes
-- ============================================

-- Indexes for workspace_items
CREATE INDEX idx_items_category 
    ON workspace.workspace_items(category);

CREATE INDEX idx_items_status 
    ON workspace.workspace_items(status);

CREATE INDEX idx_items_priority 
    ON workspace.workspace_items(priority);

CREATE INDEX idx_items_created_at 
    ON workspace.workspace_items(created_at DESC);

-- GIN indexes for array and JSONB searches
CREATE INDEX idx_items_tags 
    ON workspace.workspace_items USING GIN(tags);

CREATE INDEX idx_items_metadata 
    ON workspace.workspace_items USING GIN(metadata);

-- Full-text search index (optional, for future use)
-- CREATE INDEX idx_items_fulltext 
--     ON workspace.workspace_items USING GIN(
--         to_tsvector('english', title || ' ' || description)
--     );

-- Indexes for workspace_categories
CREATE INDEX idx_categories_active 
    ON workspace.workspace_categories(is_active) 
    WHERE is_active = true;

CREATE INDEX idx_categories_sort_order 
    ON workspace.workspace_categories(sort_order);

-- ============================================
-- Initial Data (Seed)
-- ============================================

INSERT INTO workspace.workspace_categories (name, display_name, description, sort_order) VALUES
    ('documentacao', 'Documentação', 'Documentação técnica e arquitetural do sistema', 1),
    ('coleta-dados', 'Coleta de Dados', 'Sistemas de captura e ingestão de dados de mercado', 2),
    ('banco-dados', 'Banco de Dados', 'Schemas, migrations e otimizações de banco', 3),
    ('analise-dados', 'Análise de Dados', 'Pipelines de análise, ML e processamento', 4),
    ('gestao-riscos', 'Gestão de Riscos', 'Risk management, compliance e auditoria', 5),
    ('dashboard', 'Dashboard', 'Interface de usuário e visualizações', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Functions & Triggers
-- ============================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION workspace.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on workspace_items
CREATE TRIGGER trigger_items_updated_at
    BEFORE UPDATE ON workspace.workspace_items
    FOR EACH ROW
    EXECUTE FUNCTION workspace.update_updated_at_column();

-- Trigger: Auto-update updated_at on workspace_categories
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON workspace.workspace_categories
    FOR EACH ROW
    EXECUTE FUNCTION workspace.update_updated_at_column();

-- ============================================
-- Views (Optional - for convenience)
-- ============================================

-- View: Active items by category
CREATE OR REPLACE VIEW workspace.v_active_items_by_category AS
SELECT 
    c.name AS category_name,
    c.display_name AS category_display_name,
    COUNT(i.id) AS item_count,
    COUNT(i.id) FILTER (WHERE i.status = 'new') AS new_count,
    COUNT(i.id) FILTER (WHERE i.status = 'in-progress') AS in_progress_count,
    COUNT(i.id) FILTER (WHERE i.status = 'completed') AS completed_count
FROM workspace.workspace_categories c
LEFT JOIN workspace.workspace_items i ON c.name = i.category
WHERE c.is_active = true
GROUP BY c.name, c.display_name, c.sort_order
ORDER BY c.sort_order;

-- View: High priority items
CREATE OR REPLACE VIEW workspace.v_high_priority_items AS
SELECT 
    id,
    title,
    category,
    priority,
    status,
    created_at,
    EXTRACT(DAY FROM (NOW() - created_at)) AS days_old
FROM workspace.workspace_items
WHERE priority IN ('high', 'critical')
  AND status NOT IN ('completed', 'rejected')
ORDER BY 
    CASE priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
    END,
    created_at ASC;

-- ============================================
-- Permissions
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA workspace TO postgres;

-- Grant all privileges on tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA workspace TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA workspace TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA workspace TO postgres;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA workspace 
    GRANT ALL PRIVILEGES ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA workspace 
    GRANT ALL PRIVILEGES ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA workspace 
    GRANT ALL PRIVILEGES ON FUNCTIONS TO postgres;

-- ============================================
-- Comments (Documentation)
-- ============================================

COMMENT ON SCHEMA workspace IS 'Workspace application schema for idea and task management';

COMMENT ON TABLE workspace.workspace_items IS 'Main table storing workspace items (ideas, tasks, features)';
COMMENT ON TABLE workspace.workspace_categories IS 'Categories for organizing workspace items';

COMMENT ON COLUMN workspace.workspace_items.priority IS 'Priority level: low, medium, high, critical';
COMMENT ON COLUMN workspace.workspace_items.status IS 'Current status: new, review, in-progress, completed, rejected';
COMMENT ON COLUMN workspace.workspace_items.tags IS 'Array of tags for filtering and grouping';
COMMENT ON COLUMN workspace.workspace_items.metadata IS 'Flexible JSONB field for additional data';

-- ============================================
-- Statistics (for query optimization)
-- ============================================

-- Analyze tables for better query planning
ANALYZE workspace.workspace_items;
ANALYZE workspace.workspace_categories;

-- ============================================
-- Schema Information
-- ============================================

SELECT 
    'workspace schema created successfully' AS status,
    COUNT(*) AS categories_count
FROM workspace.workspace_categories;

-- ============================================
-- END OF SCHEMA
-- ============================================

