-- Migration 005: Remove hardcoded category constraint
-- Removes the old CHECK constraint that validates against a fixed list of categories
-- The validation is now done dynamically in the API layer against workspace_categories table

-- Remove the old constraint (must use schema-qualified table name for TimescaleDB hypertables)
ALTER TABLE workspace.workspace_items DROP CONSTRAINT IF EXISTS workspace_items_category_check;

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspace_items_category_check'
  ) THEN
    RAISE NOTICE '❌ Failed to remove constraint';
  ELSE
    RAISE NOTICE '✅ Category constraint removed successfully';
  END IF;
END
$$;

-- Note: Category validation is now handled by the API layer via validateCategory()
-- which queries workspace_categories table for active categories only
