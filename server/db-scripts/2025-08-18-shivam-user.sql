-- 1. Create ENUM type (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deviceaccess_enum') THEN
        CREATE TYPE deviceaccess_enum AS ENUM ('web', 'mobile', 'both');
    END IF;
END$$;

-- 2. Add column to Users table
ALTER TABLE "Users"
ADD COLUMN IF NOT EXISTS "deviceAccess" deviceaccess_enum NULL;
