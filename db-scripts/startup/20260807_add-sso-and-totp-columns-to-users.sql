-- nbnext_users: SSO identity, session invalidation and TOTP columns.
--
-- models/User.js carries these; the table predates them and sync() will not add
-- a column to an existing table. Without them:
--   tokens_valid_after -> every login 500s with
--                         'column User.tokens_valid_after does not exist'
--                         (it is selected on the login path and stamped by
--                         invalidateSessions to cut every live session)
--   wallet_user_id     -> SSO provisioning cannot record which wallet account
--                         a local user mirrors, so it can never match one again
--   totp_secret /
--   is_totp_enabled    -> two-factor enrolment has nowhere to store state

BEGIN;

ALTER TABLE nbnext_users
  ADD COLUMN IF NOT EXISTS tokens_valid_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_user_id     UUID,
  ADD COLUMN IF NOT EXISTS totp_secret        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_totp_enabled    BOOLEAN NOT NULL DEFAULT false;

-- One local user per wallet account. NULLs are exempt, so password users are
-- unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS nbnext_users_wallet_user_id
  ON nbnext_users (wallet_user_id);

COMMIT;
