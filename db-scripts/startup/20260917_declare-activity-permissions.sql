-- read_activity and create_activity: rows for installs that predate them.
--
-- The client's Activity Logs master has always asked for these two names, but
-- nothing on the server declared them, so nothing seeded them. Now that
-- base_permissions declares them and /activity requires them, an install whose
-- database has no such rows answers 403 to everyone — so create them, and put
-- them on the global "All" plan the way every other framework permission is
-- seeded.
--
-- Which roles hold them stays an administrator's decision, on the role screen.
-- Safe to re-run: existing rows and links are left as they are.

INSERT INTO nbnext_permissions (name, display_name, description, type, created_at, updated_at)
VALUES
  ('read_activity', 'Read Activity', 'Permission to read activity logs', 'master', NOW(), NOW()),
  ('create_activity', 'Create Activity', 'Permission to write an activity log entry', 'master', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO nbnext_subscription_permission_mapping (subscription_id, permission_id, status, created_at, updated_at)
SELECT s.id, p.id, 'subscribed', NOW(), NOW()
FROM nbnext_subscriptions s
CROSS JOIN nbnext_permissions p
WHERE s.name = 'All'
  AND s.company_id IS NULL
  AND p.name IN ('read_activity', 'create_activity')
  AND NOT EXISTS (
    SELECT 1 FROM nbnext_subscription_permission_mapping m
    WHERE m.subscription_id = s.id AND m.permission_id = p.id
  );
