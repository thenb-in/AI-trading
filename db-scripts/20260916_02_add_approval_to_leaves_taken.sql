BEGIN;

ALTER TABLE nbnext_leaves_taken
  ADD COLUMN IF NOT EXISTS status INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by_id_node UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

COMMENT ON COLUMN nbnext_leaves_taken.status IS
  'Approval state of the leave 0: Pending, 1: Approved, 2: Rejected';
COMMENT ON COLUMN nbnext_leaves_taken.approved_by_id_node IS
  'User who approved or rejected this leave (no FK - survives user delete)';
COMMENT ON COLUMN nbnext_leaves_taken.approved_at IS
  'Timestamp when the leave was approved or rejected';

-- Everything that existed before approval did: already in force, so approved.
UPDATE nbnext_leaves_taken
SET status = 1
WHERE status = 0
  AND approved_at IS NULL;

CREATE INDEX IF NOT EXISTS leaves_taken_status ON nbnext_leaves_taken (status);

COMMIT;
