-- App-owned columns on nbnext_user_profiles.
--
-- app/server/src/models/mixins/userProfileFields.js registers these onto the
-- framework's UserProfile model via the model field registry. The registry
-- changes the model, not the table, and sequelize.sync() will not add a column
-- to a table that already exists — so on any database created before these
-- fields were registered, every UserProfile query selects columns that are not
-- there:
--   column "home_address" does not exist
-- which takes down anything that reads a profile, including SSO login
-- (getActiveCompanyForUser -> generateAccessToken).

BEGIN;

ALTER TABLE nbnext_user_profiles
  ADD COLUMN IF NOT EXISTS home_address        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS office_latitude     NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS office_longitude    NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS price_tier          JSON,
  ADD COLUMN IF NOT EXISTS default_screen_mode VARCHAR(255) DEFAULT 'location_mode',
  ADD COLUMN IF NOT EXISTS app_version         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS app_permissions     JSON,
  ADD COLUMN IF NOT EXISTS unsynced_call_count INTEGER,
  ADD COLUMN IF NOT EXISTS app_info_updated_at TIMESTAMPTZ;

COMMIT;
