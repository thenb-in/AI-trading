-- Step 1: Drop column
ALTER TABLE "Messages"
DROP COLUMN IF EXISTS "disappearingMessages";

-- Step 2: Add new column
ALTER TABLE "Messages"
ADD COLUMN IF NOT EXISTS"deleteOnSeen" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "isKept" BOOLEAN DEFAULT FALSE;