BEGIN;

CREATE TABLE IF NOT EXISTS nbnext_user_session (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES nbnext_users (id) ON UPDATE CASCADE ON DELETE CASCADE,
  refresh_token          TEXT NOT NULL,
  previous_refresh_token TEXT,
  rotated_at             TIMESTAMPTZ,
  revoked_at             TIMESTAMPTZ,
  device_label           VARCHAR(255),
  ip                     VARCHAR(64),
  user_agent             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE nbnext_user_session IS
  'One row per active login (device). Replaces the single nbnext_users.refresh_token so a user can be signed in on many devices, each refreshed and revoked independently.';
COMMENT ON COLUMN nbnext_user_session.previous_refresh_token IS
  'Token just superseded by rotation; accepted within the grace window so parallel requests converge instead of being falsely logged out.';
COMMENT ON COLUMN nbnext_user_session.rotated_at IS
  'When refresh_token was last minted; used with the grace window.';
COMMENT ON COLUMN nbnext_user_session.revoked_at IS
  'Set on logout or reuse detection; a revoked session can no longer refresh.';

CREATE INDEX IF NOT EXISTS user_session_user_id ON nbnext_user_session (user_id);
CREATE INDEX IF NOT EXISTS user_session_refresh_token ON nbnext_user_session (refresh_token);
CREATE INDEX IF NOT EXISTS user_session_previous_refresh_token ON nbnext_user_session (previous_refresh_token);


INSERT INTO nbnext_user_session (user_id, refresh_token, created_at, last_active)
SELECT u.id, u.refresh_token, NOW(), COALESCE(u.last_active, NOW())
FROM nbnext_users u
WHERE u.refresh_token IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM nbnext_user_session s WHERE s.user_id = u.id);

COMMIT;
