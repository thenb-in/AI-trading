-- Up Migration: Add "lastAllReadAt" column to "Messages" table
ALTER TABLE "Messages"
ADD COLUMN IF NOT EXISTS "lastAllReadAt" TIMESTAMP;

-- Down Migration: Remove "lastAllReadAt" column from "Messages" table
-- (Use only if rolling back the migration)
-- ALTER TABLE "Messages"
-- DROP COLUMN "lastAllReadAt";
