-- Create ENUM type for message status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_messages_status') THEN
    CREATE TYPE enum_messages_status AS ENUM ('sent', 'delivered', 'read');
  END IF;
END $$;

-- Add status column to Messages table
ALTER TABLE "Messages"
ADD COLUMN IF NOT EXISTS status enum_messages_status NOT NULL DEFAULT 'sent';

-- Add readBy column to Messages table
ALTER TABLE "Messages"
ADD COLUMN IF NOT EXISTS "readBy" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Update existing records to ensure compliance with new columns
UPDATE "Messages"
SET status = 'sent', "readBy" = '[]'::jsonb
WHERE status IS NULL OR "readBy" IS NULL;

-- Optional: Add comments for documentation
COMMENT ON COLUMN "Messages".status IS 'Message status: sent, delivered, or read';
COMMENT ON COLUMN "Messages"."readBy" IS 'Array of user IDs who have read the message';