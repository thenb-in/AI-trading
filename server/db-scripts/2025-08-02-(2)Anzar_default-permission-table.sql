-- Step 1: Create Permissions table
CREATE TABLE "Permissions" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "description" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 2: Insert all permission entries
INSERT INTO "Permissions" ("name", "description", "createdAt", "updatedAt") VALUES
  ('Create Group', 'Permission to create a group', NOW(), NOW()),
  ('Keep Message', 'Permission to keep messages permanently', NOW(), NOW()),
  ('Delete Group(Group Admin)', 'Permission for group admin to delete group', NOW(), NOW()),
  ('Remove Participants', 'Permission to remove group participants', NOW(), NOW()),
  ('Approve User', 'Permission to approve new users', NOW(), NOW()),
  ('Deactivate User', 'Permission to deactivate users', NOW(), NOW()),
  ('Delete Group(Owner)', 'Permission for owner to delete group', NOW(), NOW()),
  ('Get Company Settings', 'Permission to view company settings', NOW(), NOW()),
  ('Update Group', 'Permission to update group details', NOW(), NOW()),
  ('Update Company Settings', 'Permission to update company settings', NOW(), NOW()),
  ('Get Rooms', 'Permission to access list of rooms', NOW(), NOW()),
  ('Delete Group Messages', 'Permission to delete all messages in a group', NOW(), NOW()),
  ('Delete Particular Message', 'Permission to delete a specific message', NOW(), NOW()),
  ('Add Role', 'Permission to add a new role', NOW(), NOW()),
  ('Link Role Permission', 'Permission to map permissions to roles', NOW(), NOW()),
  ('isAdmin', 'Flag for admin-level access', NOW(), NOW()),
  ('View Company Settings', 'Permission to view company settings', NOW(), NOW()),
  ('View AdminLayout', 'Permission to access admin layout view', NOW(), NOW()),
  ('Pin Message', 'Permission to pin important messages', NOW(), NOW()),
  ('Save Message', 'Permission to save messages for later', NOW(), NOW()),
  ('Add Participants', 'Permission to add participants to a group', NOW(), NOW());
