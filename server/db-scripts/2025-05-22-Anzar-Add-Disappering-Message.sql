

-- Add "disappearingMessages" column to "Users" table
ALTER TABLE "Users"
ADD COLUMN IF NOT EXISTS "disappearingMessages" BOOLEAN DEFAULT FALSE;

-- Add "messageTimer" column to "Users" table
ALTER TABLE "Users"
ADD COLUMN IF NOT EXISTS "messageTimer" INTEGER;

-- Add "disappearingMessages" column to "Rooms" table
ALTER TABLE "Rooms"
ADD COLUMN IF NOT EXISTS "disappearingMessages" BOOLEAN DEFAULT FALSE;

-- Add "messageTimer" column to "Rooms" table
ALTER TABLE "Rooms"
ADD COLUMN IF NOT EXISTS "messageTimer" INTEGER;

-- Add "disappearingMessages" column to "Users" table
ALTER TABLE "Messages"
ADD COLUMN IF NOT EXISTS "disappearingMessages" BOOLEAN DEFAULT FALSE;

-- Add "messageTimer" column to "Users" table
ALTER TABLE "Messages"
ADD COLUMN IF NOT EXISTS "messageTimer" INTEGER;

-- Add admin column to Rooms table

ALTER TABLE "Rooms"
ADD COLUMN IF NOT EXISTS "adminId" UUID;

ALTER TABLE "Rooms"
ADD CONSTRAINT "fk_rooms_admin"
FOREIGN KEY ("adminId")
REFERENCES "Users" ("id")
ON DELETE SET NULL;
