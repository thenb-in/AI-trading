-- Announcements: the banner the whole company reads, for the roles it names,
-- between the dates it runs.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS nbnext_announcement (
  id          SERIAL PRIMARY KEY,
  company_id  UUID NOT NULL REFERENCES nbnext_company (id) ON UPDATE CASCADE ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  severity    VARCHAR(32) NOT NULL DEFAULT 'info',
  role_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
  starts_at   TIMESTAMPTZ NULL,
  ends_at     TIMESTAMPTZ NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID NULL REFERENCES nbnext_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN nbnext_announcement.severity IS
  'info | warning | critical -- how loudly the banner is drawn';
COMMENT ON COLUMN nbnext_announcement.role_ids IS
  'Role ids this is for; an empty list means everyone in the company';
COMMENT ON COLUMN nbnext_announcement.starts_at IS
  'NULL means "from the moment it was saved"; ends_at NULL means "until someone stops it"';

CREATE INDEX IF NOT EXISTS nbnext_announcement_company_active
  ON nbnext_announcement (company_id, is_active);

INSERT INTO nbnext_permissions (name, display_name, description, type, created_at, updated_at)
VALUES
  ('read_announcement', 'Read Announcement', 'Permission to read Announcement', 'master', NOW(), NOW()),
  ('create_announcement', 'Create Announcement', 'Permission to create Announcement', 'master', NOW(), NOW()),
  ('update_announcement', 'Update Announcement', 'Permission to update Announcement', 'master', NOW(), NOW()),
  ('delete_announcement', 'Delete Announcement', 'Permission to delete Announcement', 'master', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO nbnext_subscription_permission_mapping (subscription_id, permission_id, status, created_at, updated_at)
SELECT s.id, p.id, 'subscribed', NOW(), NOW()
FROM nbnext_subscriptions s
CROSS JOIN nbnext_permissions p
WHERE s.name = 'All'
  AND s.company_id IS NULL
  AND p.name IN ('read_announcement', 'create_announcement', 'update_announcement', 'delete_announcement')
  AND NOT EXISTS (
    SELECT 1 FROM nbnext_subscription_permission_mapping m
    WHERE m.subscription_id = s.id AND m.permission_id = p.id
  );
