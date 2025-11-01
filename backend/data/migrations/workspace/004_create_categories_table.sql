-- ============================================================================
-- Migration: 004_create_categories_table.sql
-- Database: APPS-WORKSPACE (workspace schema)
-- Purpose: Create workspace_categories table for category management
-- Expected Impact: Normalized category management with CRUD operations
-- ============================================================================

SET search_path TO workspace, public;

-- ============================================================================
-- CREATE CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6B7280', -- Hex color for UI
  icon VARCHAR(50), -- Icon identifier (e.g., 'FolderIcon', 'DocumentIcon')
  display_order INTEGER DEFAULT 0, -- Order for display in UI
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),

  -- Constraints
  CONSTRAINT workspace_categories_name_length CHECK (LENGTH(name) >= 2),
  CONSTRAINT workspace_categories_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index on name for lookups
CREATE INDEX IF NOT EXISTS idx_workspace_categories_name
ON workspace_categories(name);

-- Index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_workspace_categories_active
ON workspace_categories(is_active) WHERE is_active = TRUE;

-- Index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_workspace_categories_order
ON workspace_categories(display_order);

-- ============================================================================
-- CREATE TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION workspace_categories_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_categories_updated_at_trigger
BEFORE UPDATE ON workspace_categories
FOR EACH ROW
EXECUTE FUNCTION workspace_categories_update_timestamp();

-- ============================================================================
-- INSERT DEFAULT CATEGORIES
-- ============================================================================

INSERT INTO workspace_categories (name, description, color, icon, display_order, created_by) VALUES
  ('documentacao', 'Documentação técnica e manuais', '#3B82F6', 'DocumentTextIcon', 1, 'system'),
  ('desenvolvimento', 'Tarefas de desenvolvimento e features', '#10B981', 'CodeBracketIcon', 2, 'system'),
  ('bug', 'Correção de bugs e problemas', '#EF4444', 'BugAntIcon', 3, 'system'),
  ('infraestrutura', 'DevOps, containers e infraestrutura', '#8B5CF6', 'ServerIcon', 4, 'system'),
  ('teste', 'Testes e QA', '#F59E0B', 'BeakerIcon', 5, 'system'),
  ('performance', 'Otimizações de performance', '#EC4899', 'BoltIcon', 6, 'system'),
  ('seguranca', 'Segurança e compliance', '#DC2626', 'ShieldCheckIcon', 7, 'system'),
  ('dados', 'Análise de dados e BI', '#06B6D4', 'ChartBarIcon', 8, 'system'),
  ('produto', 'Product requirements e features', '#6366F1', 'LightBulbIcon', 9, 'system'),
  ('design', 'UI/UX e design', '#D946EF', 'PaintBrushIcon', 10, 'system')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ADD FOREIGN KEY TO workspace_items (Optional - for data integrity)
-- ============================================================================

-- Note: This is commented out to avoid breaking existing data
-- Uncomment after migrating existing category values to workspace_categories

-- ALTER TABLE workspace_items
-- ADD CONSTRAINT fk_workspace_items_category
-- FOREIGN KEY (category) REFERENCES workspace_categories(name)
-- ON UPDATE CASCADE
-- ON DELETE RESTRICT;

-- ============================================================================
-- CREATE AUDIT LOG TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION workspace_categories_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB;
  old_data JSONB;
  new_data JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    changes := to_jsonb(OLD);
    INSERT INTO workspace_audit_log (item_id, action, changes, changed_by, metadata)
    VALUES (
      OLD.id,
      'DELETE',
      changes,
      CURRENT_USER,
      jsonb_build_object('table', 'workspace_categories')
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    changes := jsonb_build_object(
      'before', old_data,
      'after', new_data
    );
    INSERT INTO workspace_audit_log (item_id, action, changes, changed_by, metadata)
    VALUES (
      NEW.id,
      'UPDATE',
      changes,
      CURRENT_USER,
      jsonb_build_object('table', 'workspace_categories')
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    changes := to_jsonb(NEW);
    INSERT INTO workspace_audit_log (item_id, action, changes, changed_by, metadata)
    VALUES (
      NEW.id,
      'CREATE',
      changes,
      CURRENT_USER,
      jsonb_build_object('table', 'workspace_categories')
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_categories_audit
AFTER INSERT OR UPDATE OR DELETE ON workspace_categories
FOR EACH ROW
EXECUTE FUNCTION workspace_categories_audit_trigger();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show created table structure
SELECT
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'workspace'
  AND table_name = 'workspace_categories'
ORDER BY ordinal_position;

-- Show default categories
SELECT
  id,
  name,
  description,
  color,
  icon,
  display_order,
  is_active
FROM workspace_categories
ORDER BY display_order;

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO workspace.schema_version (version, description)
VALUES ('004', 'Create workspace_categories table with CRUD and audit triggers')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT
  'workspace_categories table created successfully!' AS status,
  COUNT(*) AS default_categories_count
FROM workspace_categories;
