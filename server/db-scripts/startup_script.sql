BEGIN;

-- Insert roles: sadmin, admin, user
INSERT INTO "roles" (name, description, "createdAt", "updatedAt")
VALUES 
  ('sadmin', 'Super Administrator with full system access', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('admin', 'Administrator with elevated permissions', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user', 'Standard user with basic access', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

  -- Insert a company with name 'default'
INSERT INTO "companies" (name, "mobileApp", "desktopWeb", "mobileWeb", "roleId", "createdAt", "updatedAt")
VALUES ('default', false, true, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);


-- Insert permissions
INSERT INTO "permissions" (name, description, "createdAt", "updatedAt")
VALUES 
  ('Approve User', 'Permission to approve new users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Deactivate User', 'Permission to deactivate users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Get Company Settings', 'Permission to view company settings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Update Company Settings', 'Permission to update company settings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Add Role', 'Permission to add a new role', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Link Role Permission', 'Permission to map permissions to roles', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('isAdmin', 'Flag for admin-level access', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('View Company Settings', 'Permission to view company settings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('View AdminLayout', 'Permission to access admin layout view', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Assign all permissions to the sadmin role (assumed roleId = 1)
INSERT INTO "role_permission_mapping" ("roleId", "permissionId", "createdAt", "updatedAt")
VALUES 
  (1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Commit the transaction
COMMIT;