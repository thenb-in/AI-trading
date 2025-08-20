-- Step 1: Create RolePermission table
CREATE TABLE "RolePermission" (
  "roleId" INTEGER NOT NULL REFERENCES "Roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "permissionId" INTEGER NOT NULL REFERENCES "Permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("roleId", "permissionId")
);

-- Step 2: Insert permissions for sadmin (roleId = 1) → all 21 permissions
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 1, id FROM "Permissions";

-- Step 3: Insert permissions for admin (roleId = 2) → all except Add Role (14), Link Role Permission (15)
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 2, id FROM "Permissions"
WHERE id NOT IN (14, 15);

-- Step 4: Insert specific permissions for user (roleId = 3)
INSERT INTO "RolePermission" ("roleId", "permissionId")
VALUES
  (3, 1),   -- Create Group
  (3, 2),   -- Keep Message
  (3, 3),   -- Delete Group(Group Admin)
  (3, 4),   -- Remove Participants
  (3, 9),   -- Update Group
  (3, 11),  -- Get Rooms
  (3, 12),  -- Delete Group Messages
  (3, 13),  -- Delete Particular Message
  (3, 19),  -- Pin Message
  (3, 20),  -- Save Message
  (3, 21);  -- Add Participants
