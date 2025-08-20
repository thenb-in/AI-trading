-- Step 1: Drop column
ALTER TABLE "Rooms"
DROP COLUMN IF EXISTS "disappearingMessages";

-- Step 2: Add new column
ALTER TABLE "Rooms"
ADD COLUMN IF NOT EXISTS "deleteOnSeen" BOOLEAN DEFAULT FALSE;
