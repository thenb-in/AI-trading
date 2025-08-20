CREATE TABLE "Reactions" (
    id SERIAL PRIMARY KEY,
    "messageId" UUID NOT NULL REFERENCES "Messages"(id) ON DELETE CASCADE,
    "senderId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);



ALTER TABLE "Reactions"
ADD CONSTRAINT fk_reaction_message
FOREIGN KEY ("messageId")
REFERENCES "Messages"(id)
ON DELETE CASCADE;


ALTER TABLE "Reactions"
ALTER COLUMN "senderId" DROP DEFAULT,
ALTER COLUMN "senderId" TYPE UUID
USING "senderId"::uuid;
