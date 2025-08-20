-- Step 1: Drop column
ALTER TABLE "Companies"
DROP COLUMN IF EXISTS "disappearingMessages";

-- Step 2: Add new column
ALTER TABLE "Companies"
ADD COLUMN IF NOT EXISTS "deleteOnSeen" BOOLEAN DEFAULT FALSE;