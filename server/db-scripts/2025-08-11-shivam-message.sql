-- 1. Drop the existing foreign key constraint
ALTER TABLE "ReadBies"
DROP CONSTRAINT "ReadBies_messageId_fkey";

-- 2. Recreate it with ON DELETE CASCADE
ALTER TABLE "ReadBies"
ADD CONSTRAINT "ReadBies_messageId_fkey"
FOREIGN KEY ("messageId")
REFERENCES "Messages"("id")
ON DELETE CASCADE;
