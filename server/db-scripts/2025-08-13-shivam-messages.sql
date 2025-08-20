-- 1️⃣ Add the new column
ALTER TABLE "Messages"
ADD COLUMN "replyToMessageId" UUID NULL;

-- 2️⃣ Add the self-referencing foreign key
ALTER TABLE "Messages"
ADD CONSTRAINT "fk_messages_reply"
FOREIGN KEY ("replyToMessageId")
REFERENCES "Messages" ("id")
ON DELETE SET NULL;
