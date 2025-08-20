-- 1. Create Roles table
CREATE TABLE "Roles" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "description" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Insert predefined roles
INSERT INTO "Roles" ("name", "description", "createdAt", "updatedAt") VALUES
  ('sadmin', 'Super Admin Role', NOW(), NOW()),
  ('admin', 'Admin Role', NOW(), NOW()),
  ('user', 'User Role', NOW(), NOW());
