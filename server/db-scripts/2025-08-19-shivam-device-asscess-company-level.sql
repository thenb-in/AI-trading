-- 1. Drop the old ENUM column
ALTER TABLE "Companies" 
DROP COLUMN IF EXISTS "deviceAccess";

-- 2. Add the three new boolean columns with default values
ALTER TABLE "Companies"
ADD COLUMN "mobileApp" BOOLEAN DEFAULT FALSE,
ADD COLUMN "desktopWeb" BOOLEAN DEFAULT TRUE,
ADD COLUMN "mobileWeb" BOOLEAN DEFAULT FALSE;
