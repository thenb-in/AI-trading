DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_device_access') THEN
        CREATE TYPE enum_device_access AS ENUM ('web', 'mobile', 'both');
    END IF;
END$$;

-- 2. Add column to company table
ALTER TABLE "Companies"
ADD COLUMN IF NOT EXISTS "deviceAccess" enum_device_access DEFAULT 'web';
