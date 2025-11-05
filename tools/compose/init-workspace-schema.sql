-- ==============================================================================
-- Workspace Database - PostgreSQL Initialization
-- ==============================================================================
--
-- This script creates the schema, tables, and indexes for the Workspace app.
-- It runs automatically when the PostgreSQL container starts for the first time.
--
-- Database: workspace
-- Schema: workspace
-- Tables: workspace_items, workspace_categories
--
-- ==============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS workspace;

-- Set search path
SET search_path TO workspace, public;

-- ==============================================================================
-- TABLE: workspace_categories
-- ==============================================================================

CREATE TABLE IF NOT EXISTS workspace.workspace_categories (
    name VARCHAR(100) PRIMARY KEY,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed categories
INSERT INTO workspace.workspace_categories (name, display_name, description, sort_order)
VALUES
    ('documentacao', 'Documentação', 'Documentação, guias, tutoriais', 1),
    ('coleta-dados', 'Coleta de Dados', 'Captura de dados de mercado, ProfitDLL', 2),
    ('banco-dados', 'Banco de Dados', 'TimescaleDB, QuestDB, schemas', 3),
    ('analise-dados', 'Análise de Dados', 'ML, estatística, sinais', 4),
    ('gestao-riscos', 'Gestão de Riscos', 'Risk engine, stop loss, position sizing', 5),
    ('dashboard', 'Dashboard', 'Frontend, UI/UX, visualização', 6)
ON CONFLICT (name) DO NOTHING;

-- Index for active categories
CREATE INDEX IF NOT EXISTS idx_categories_active 
    ON workspace.workspace_categories(is_active) 
    WHERE is_active = true;

-- ==============================================================================
-- TABLE: workspace_items
-- ==============================================================================

CREATE TABLE IF NOT EXISTS workspace.workspace_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL REFERENCES workspace.workspace_categories(name) ON DELETE RESTRICT,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('new', 'review', 'in-progress', 'completed', 'rejected')),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);

-- Indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_items_category ON workspace.workspace_items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON workspace.workspace_items(status);
CREATE INDEX IF NOT EXISTS idx_items_priority ON workspace.workspace_items(priority);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON workspace.workspace_items(created_at DESC);

-- GIN indexes for array and JSONB searches
CREATE INDEX IF NOT EXISTS idx_items_tags ON workspace.workspace_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_items_metadata ON workspace.workspace_items USING GIN(metadata);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_items_category_status ON workspace.workspace_items(category, status);

-- ==============================================================================
-- FUNCTION: Update timestamp on row update
-- ==============================================================================

CREATE OR REPLACE FUNCTION workspace.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_workspace_items_updated_at
    BEFORE UPDATE ON workspace.workspace_items
    FOR EACH ROW
    EXECUTE FUNCTION workspace.update_updated_at_column();

CREATE TRIGGER update_workspace_categories_updated_at
    BEFORE UPDATE ON workspace.workspace_categories
    FOR EACH ROW
    EXECUTE FUNCTION workspace.update_updated_at_column();

-- ==============================================================================
-- GRANTS (for future multi-user setup)
-- ==============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA workspace TO postgres;

-- Grant all privileges on tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA workspace TO postgres;

-- Grant all privileges on sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA workspace TO postgres;

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

-- Verify schema
SELECT 'Schema created: workspace' AS status 
WHERE EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'workspace');

-- Verify tables
SELECT 'Tables created: ' || count(*)::TEXT AS status
FROM information_schema.tables 
WHERE table_schema = 'workspace';

-- Verify categories seeded
SELECT 'Categories seeded: ' || count(*)::TEXT AS status
FROM workspace.workspace_categories;

-- ==============================================================================
-- END OF INITIALIZATION
-- ==============================================================================

