
ALTER TABLE "Users" 
DROP COLUMN IF EXISTS "deviceAccess";

-- 2. Add the three new boolean columns with default values
ALTER TABLE "Users"
ADD COLUMN "mobileApp" BOOLEAN,
ADD COLUMN "desktopWeb" BOOLEAN,
ADD COLUMN "mobileWeb" BOOLEAN;
