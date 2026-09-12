ALTER TABLE nbnext_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

COMMENT ON COLUMN nbnext_users.email IS
  'Where notification rules write to this person. Falls back to username while it is unset';

