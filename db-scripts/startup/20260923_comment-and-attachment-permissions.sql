-- delete_comment, and the comment and attachment rights every master built by
-- create_master_permission now declares: rows for installs that predate them.
--
-- Until now a record's discussion and its files were governed by the record
-- itself — anyone who could open it could comment and attach, and only a
-- comment's author could take it back. Both are rights of their own now:
-- comment_<master> says who may join a discussion, attachment_<master> who may
-- work with a record's files, and the module-level delete_comment overrides the
-- author rule on any record of any master.
--
-- Three parts: create the rows, put them on the global "All" plan the way every
-- framework permission is seeded, then hand each role what it could already do
-- — whoever may read a master's records could comment on them and attach to
-- them, so that is who keeps both. Nobody is given delete_comment: taking down
-- someone else's words is a new right, so it starts with no one and an
-- administrator grants it on the role screen.
--
-- Safe to re-run: existing rows and links are left as they are.

INSERT INTO nbnext_permissions (name, display_name, description, type, created_at, updated_at)
VALUES
  ('comment_role', 'Comment Role', 'Permission to comment on Role', 'master', NOW(), NOW()),
  ('attachment_role', 'Attachment Role', 'Permission to manage attachments on Role', 'master', NOW(), NOW()),
  ('comment_permission', 'Comment Permission', 'Permission to comment on Permission', 'master', NOW(), NOW()),
  ('attachment_permission', 'Attachment Permission', 'Permission to manage attachments on Permission', 'master', NOW(), NOW()),
  ('comment_notification_rule', 'Comment Notification Rule', 'Permission to comment on Notification Rule', 'master', NOW(), NOW()),
  ('attachment_notification_rule', 'Attachment Notification Rule', 'Permission to manage attachments on Notification Rule', 'master', NOW(), NOW()),
  ('comment_naming_series', 'Comment Naming Series', 'Permission to comment on Naming Series', 'master', NOW(), NOW()),
  ('attachment_naming_series', 'Attachment Naming Series', 'Permission to manage attachments on Naming Series', 'master', NOW(), NOW()),
  ('comment_announcement', 'Comment Announcement', 'Permission to comment on Announcement', 'master', NOW(), NOW()),
  ('attachment_announcement', 'Attachment Announcement', 'Permission to manage attachments on Announcement', 'master', NOW(), NOW()),
  ('comment_geography', 'Comment Geography', 'Permission to comment on Geography', 'master', NOW(), NOW()),
  ('attachment_geography', 'Attachment Geography', 'Permission to manage attachments on Geography', 'master', NOW(), NOW()),
  ('comment_nbnext_drive', 'Comment Nbnext Drive', 'Permission to comment on Nbnext Drive', 'master', NOW(), NOW()),
  ('attachment_nbnext_drive', 'Attachment Nbnext Drive', 'Permission to manage attachments on Nbnext Drive', 'master', NOW(), NOW()),
  ('delete_comment', 'Delete Comment', 'Permission to delete a comment written by someone else, on any record', 'module', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- On the global plan, or no company sees them at all.
INSERT INTO nbnext_subscription_permission_mapping (subscription_id, permission_id, status, created_at, updated_at)
SELECT s.id, p.id, 'subscribed', NOW(), NOW()
FROM nbnext_subscriptions s
CROSS JOIN nbnext_permissions p
WHERE s.name = 'All'
  AND s.company_id IS NULL
  AND (p.name LIKE 'comment\_%' OR p.name LIKE 'attachment\_%' OR p.name = 'delete_comment')
  AND NOT EXISTS (
    SELECT 1 FROM nbnext_subscription_permission_mapping m
    WHERE m.subscription_id = s.id AND m.permission_id = p.id
  );

-- Whoever may read a master's records could comment on them and work with their
-- files, so that is who keeps both: read_geography earns comment_geography and
-- attachment_geography.
INSERT INTO nbnext_role_permission_mapping (role_id, permission_id, created_at, updated_at)
SELECT rp.role_id, carried.id, NOW(), NOW()
FROM nbnext_role_permission_mapping rp
JOIN nbnext_permissions master ON master.id = rp.permission_id
JOIN nbnext_permissions carried
  ON carried.name IN ('comment_' || SUBSTR(master.name, 6), 'attachment_' || SUBSTR(master.name, 6))
WHERE master.name LIKE 'read\_%'
  AND NOT EXISTS (
    SELECT 1 FROM nbnext_role_permission_mapping existing
    WHERE existing.role_id = rp.role_id AND existing.permission_id = carried.id
  );
