-- Geography: the tree of places (country > state > city > site) every address,
-- filter and report in an app reads from.
--
-- A place points at the one that contains it and nothing else — no stored path,
-- no stored depth — so moving a branch is one row changing, and the server
-- walks the tree on read.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS nbnext_geography (
  id          SERIAL PRIMARY KEY,
  company_id  UUID NOT NULL REFERENCES nbnext_company (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  parent_id   INTEGER NULL REFERENCES nbnext_geography (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(64) NULL,
  level       VARCHAR(64) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID NULL REFERENCES nbnext_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN nbnext_geography.parent_id IS
  'The place that contains this one; NULL for a top level place. ON DELETE RESTRICT so a branch cannot be orphaned by deleting what holds it';
COMMENT ON COLUMN nbnext_geography.level IS
  'What this place is called at its depth (Country, State, City...). A label, not a rule -- nothing in the framework reads it back';
COMMENT ON COLUMN nbnext_geography.code IS
  'What other systems call this place -- an ISO code, a plant code';

CREATE INDEX IF NOT EXISTS nbnext_geography_company_parent
  ON nbnext_geography (company_id, parent_id);

-- Two places with the same name under the same parent are the same place typed
-- twice. Postgres treats NULLs as distinct in a unique index, so top level
-- places are guarded by their own partial index.
CREATE UNIQUE INDEX IF NOT EXISTS nbnext_geography_company_parent_name
  ON nbnext_geography (company_id, parent_id, name)
  WHERE parent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS nbnext_geography_company_root_name
  ON nbnext_geography (company_id, name)
  WHERE parent_id IS NULL;

INSERT INTO nbnext_permissions (name, display_name, description, type, created_at, updated_at)
VALUES
  ('read_geography', 'Read Geography', 'Permission to read Geography', 'master', NOW(), NOW()),
  ('create_geography', 'Create Geography', 'Permission to create Geography', 'master', NOW(), NOW()),
  ('update_geography', 'Update Geography', 'Permission to update Geography', 'master', NOW(), NOW()),
  ('delete_geography', 'Delete Geography', 'Permission to delete Geography', 'master', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO nbnext_subscription_permission_mapping (subscription_id, permission_id, status, created_at, updated_at)
SELECT s.id, p.id, 'subscribed', NOW(), NOW()
FROM nbnext_subscriptions s
CROSS JOIN nbnext_permissions p
WHERE s.name = 'All'
  AND s.company_id IS NULL
  AND p.name IN ('read_geography', 'create_geography', 'update_geography', 'delete_geography')
  AND NOT EXISTS (
    SELECT 1 FROM nbnext_subscription_permission_mapping m
    WHERE m.subscription_id = s.id AND m.permission_id = p.id
  );
