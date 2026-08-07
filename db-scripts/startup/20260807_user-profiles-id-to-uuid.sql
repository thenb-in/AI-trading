-- nbnext_user_profiles.id: integer sequence -> UUID
--
-- models/UserProfile.js declares `id` as DataTypes.UUID with a UUIDV4 default,
-- but the table was created when it was a serial. sequelize.sync() never alters
-- an existing column, so the drift stayed invisible until something inserted:
-- SSO provisioning (createSsoUser) does User.create + UserProfile.create in one
-- transaction, and the profile insert died with
--   invalid input syntax for type integer: "<uuid>"
-- taking the whole SSO login down with it.
--
-- Existing rows get fresh UUIDs. Nothing references this column (no inbound FKs),
-- so re-keying is safe.

-- Guarded on the current column type so a re-run is a no-op: the conversion
-- mints fresh UUIDs, and running it twice would silently re-key every row.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nbnext_user_profiles'
      AND column_name = 'id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE nbnext_user_profiles ALTER COLUMN id DROP DEFAULT;
    DROP SEQUENCE IF EXISTS nbnext_user_profiles_id_seq CASCADE;
    ALTER TABLE nbnext_user_profiles ALTER COLUMN id TYPE uuid USING gen_random_uuid();
    ALTER TABLE nbnext_user_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

COMMIT;
