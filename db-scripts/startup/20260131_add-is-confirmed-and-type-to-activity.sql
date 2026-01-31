-- Migration script to add is_confirmed and type columns to activity table
-- 
-- is_confirmed: BOOLEAN field to track confirmation status (default: false)
-- type: SMALLINT field to track activity type:
--   - 1 for create
--   - 0 for update
--   - -1 for delete
--
-- If you see "current transaction is aborted" error, run: ROLLBACK; first

-- ============================================
-- STEP 1: Rollback any existing transaction
-- ============================================
ROLLBACK;

-- ============================================
-- STEP 2: Add is_confirmed column
-- ============================================
ALTER TABLE activity 
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN NULL DEFAULT false;

-- ============================================
-- STEP 3: Add type column
-- ============================================
ALTER TABLE activity 
ADD COLUMN IF NOT EXISTS type SMALLINT NULL;

-- Add comment to explain type values
COMMENT ON COLUMN activity.type IS 'Activity type: 1 for create, 0 for update, -1 for delete';

-- ============================================
-- STEP 4: Add index for is_confirmed column
-- ============================================
CREATE INDEX IF NOT EXISTS activity_is_confirmed_idx 
ON activity(is_confirmed);

-- ============================================
-- STEP 5: Add index for type column
-- ============================================
CREATE INDEX IF NOT EXISTS activity_type_idx 
ON activity(type);

-- ============================================
-- Verification queries (optional - run separately)
-- ============================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'activity' 
-- AND column_name IN ('is_confirmed', 'type');
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'activity' 
-- AND indexname IN ('activity_is_confirmed_idx', 'activity_type_idx');

