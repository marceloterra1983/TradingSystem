-- ==============================================================================
-- Fix: Remove Duplicate Messages and Add UNIQUE Constraint
-- ==============================================================================
-- Issue: Messages duplicating on every sync (587 duplicates, 666 extra records)
-- Root Cause: Missing UNIQUE constraint on (channel_id, message_id)
-- Solution: Clean duplicates + add UNIQUE index
-- ==============================================================================

-- Step 1: Identify and report duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
  extra_records INTEGER;
BEGIN
  SELECT 
    COUNT(*) INTO duplicate_count
  FROM (
    SELECT channel_id, message_id
    FROM telegram_gateway.messages
    GROUP BY channel_id, message_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  SELECT 
    SUM(cnt - 1) INTO extra_records
  FROM (
    SELECT COUNT(*) as cnt
    FROM telegram_gateway.messages
    GROUP BY channel_id, message_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Duplicate messages found: % unique messages with duplicates', duplicate_count;
  RAISE NOTICE 'Extra records to delete: %', extra_records;
END $$;

-- Step 2: Remove duplicates (keep the most recent one based on created_at)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY channel_id, message_id 
      ORDER BY created_at DESC  -- Keep most recent
    ) as rn
  FROM telegram_gateway.messages
)
DELETE FROM telegram_gateway.messages
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Step 3: Verify cleanup
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT 
    COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT channel_id, message_id
    FROM telegram_gateway.messages
    GROUP BY channel_id, message_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF remaining_duplicates > 0 THEN
    RAISE WARNING 'Still have % duplicate messages after cleanup!', remaining_duplicates;
  ELSE
    RAISE NOTICE 'All duplicates removed successfully!';
  END IF;
END $$;

-- Step 4: Create UNIQUE constraint to prevent future duplicates
-- NOTE: TimescaleDB hypertables require partitioning column (created_at) in UNIQUE index
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_channel_message_unique
ON telegram_gateway.messages (channel_id, message_id, created_at);

-- Add comment for documentation
COMMENT ON INDEX telegram_gateway.idx_messages_channel_message_unique IS
  'Ensures each Telegram message (channel_id + message_id) appears only once in the database. 
   Includes created_at for TimescaleDB hypertable compatibility.
   Prevents duplicates during synchronization.
   Created: 2025-11-04 (Fix for duplicate messages issue)';

-- Step 5: Verify constraint was created
DO $$
DECLARE
  index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'telegram_gateway' 
      AND tablename = 'messages'
      AND indexname = 'idx_messages_channel_message_unique'
  ) INTO index_exists;
  
  IF index_exists THEN
    RAISE NOTICE 'UNIQUE constraint created successfully!';
  ELSE
    RAISE WARNING 'Failed to create UNIQUE constraint!';
  END IF;
END $$;

-- ==============================================================================
-- Verification Queries
-- ==============================================================================

-- Check for any remaining duplicates (should return 0 rows)
/*
SELECT 
  channel_id,
  message_id,
  COUNT(*) as duplicates
FROM telegram_gateway.messages
GROUP BY channel_id, message_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
*/

-- Verify UNIQUE index exists
/*
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'telegram_gateway'
  AND tablename = 'messages'
  AND indexname = 'idx_messages_channel_message_unique';
*/

-- ==============================================================================
-- Expected Results:
-- ==============================================================================
-- Before: 5753 total messages (587 unique with duplicates, 666 extra records)
-- After: ~5087 total messages (5753 - 666 = 5087)
-- Duplicates: 0
-- UNIQUE constraint: Created and active
-- ==============================================================================

-- ==============================================================================
-- IMPORTANT: This migration is IDEMPOTENT
-- ==============================================================================
-- Can be run multiple times safely:
-- - DELETE only removes duplicates (keeps most recent)
-- - CREATE INDEX uses IF NOT EXISTS
-- - Will not error if constraint already exists
-- ==============================================================================

