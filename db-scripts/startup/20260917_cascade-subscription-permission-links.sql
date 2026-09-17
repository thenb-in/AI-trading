-- Deleting a permission must take its subscription links with it.
--
-- The role screen now offers a delete button on any permission the constants
-- no longer declare. Role links already cascade, but the subscription mapping
-- carries no foreign keys on installs whose table predates the model — the
-- model declares onDelete CASCADE on both columns, so a fresh sync creates
-- them and only an existing database is missing them. Without the constraint,
-- deleting a permission leaves a subscription row pointing at nothing, and
-- the next permission to take that id inherits its plan.
--
-- Orphans are cleared first, or the constraint cannot be added.
-- Safe to re-run: the constraints are dropped by name before being created.

DELETE FROM nbnext_subscription_permission_mapping m
WHERE NOT EXISTS (SELECT 1 FROM nbnext_permissions p WHERE p.id = m.permission_id);

DELETE FROM nbnext_subscription_permission_mapping m
WHERE NOT EXISTS (SELECT 1 FROM nbnext_subscriptions s WHERE s.id = m.subscription_id);

ALTER TABLE nbnext_subscription_permission_mapping
  DROP CONSTRAINT IF EXISTS nbnext_subscription_permission_mapping_permission_id_fkey;

ALTER TABLE nbnext_subscription_permission_mapping
  ADD CONSTRAINT nbnext_subscription_permission_mapping_permission_id_fkey
  FOREIGN KEY (permission_id) REFERENCES nbnext_permissions (id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE nbnext_subscription_permission_mapping
  DROP CONSTRAINT IF EXISTS nbnext_subscription_permission_mapping_subscription_id_fkey;

ALTER TABLE nbnext_subscription_permission_mapping
  ADD CONSTRAINT nbnext_subscription_permission_mapping_subscription_id_fkey
  FOREIGN KEY (subscription_id) REFERENCES nbnext_subscriptions (id)
  ON UPDATE CASCADE ON DELETE CASCADE;
