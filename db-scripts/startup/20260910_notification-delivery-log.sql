ALTER TABLE nbnext_notifications
  ADD COLUMN IF NOT EXISTS channel VARCHAR(20),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS log TEXT;

UPDATE nbnext_notifications
SET channel = 'in_app',
    status = 'sent'
WHERE channel IS NULL OR status IS NULL;

ALTER TABLE nbnext_notifications
  ALTER COLUMN channel SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

COMMENT ON COLUMN nbnext_notifications.channel IS
  'How it was sent: in_app, email or whatsapp';
COMMENT ON COLUMN nbnext_notifications.status IS
  'How it went: sent, skipped or failed';
COMMENT ON COLUMN nbnext_notifications.log IS
  'Why it failed or was skipped, or what was sent where when it went through';

CREATE INDEX IF NOT EXISTS nbnext_notifications_bell_idx
  ON nbnext_notifications (user_id, company_id, channel, status, created_at DESC);
