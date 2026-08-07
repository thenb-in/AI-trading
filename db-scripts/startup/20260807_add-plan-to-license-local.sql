-- nbnext_license_local.plan — per-plan grant mirrored from the licence token.
--
-- models/License.js declares `plan` as a NOT NULL JSONB defaulting to []:
-- [{ id, name, permissions: [...] }], the plan side of what the licence allows.
-- Older databases have the table without the column, so any licence read or
-- write against them fails.

BEGIN;

ALTER TABLE nbnext_license_local
  ADD COLUMN IF NOT EXISTS plan JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
