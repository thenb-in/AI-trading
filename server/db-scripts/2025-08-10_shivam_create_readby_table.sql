-- Create ReadBy table for PostgreSQL
CREATE TABLE IF NOT EXISTS "ReadBies" (
  "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomId" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "seenAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT "fk_readby_room" FOREIGN KEY ("roomId") REFERENCES "Rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_readby_message" FOREIGN KEY ("messageId") REFERENCES "Messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_readby_user" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS "readby_message_user_unique" ON "ReadBies" ("messageId", "userId");
CREATE INDEX IF NOT EXISTS "readby_room_id" ON "ReadBies" ("roomId");
CREATE INDEX IF NOT EXISTS "readby_message_id" ON "ReadBies" ("messageId");
CREATE INDEX IF NOT EXISTS "readby_user_id" ON "ReadBies" ("userId");

-- Create trigger to update updatedAt timestamp (PostgreSQL)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_readbies_updated_at BEFORE UPDATE ON "ReadBies" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();