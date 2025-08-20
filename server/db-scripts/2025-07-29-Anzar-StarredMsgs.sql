CREATE TABLE IF NOT EXISTS "StarredMsgs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  "userId" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "starredAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fk_starred_user FOREIGN KEY ("userId") REFERENCES "Users"(id) ON DELETE CASCADE,
  CONSTRAINT fk_starred_message FOREIGN KEY ("messageId") REFERENCES "Messages"(id) ON DELETE CASCADE,

  CONSTRAINT unique_user_message_star UNIQUE ("userId", "messageId")
);
