-- activity.batch_id — groups the rows written by one user gesture.
--
-- models/Activity.js gained `batchId` (field batch_id) plus two indexes for the
-- undo feature: one gesture can be many requests (a 200-row import is 200
-- activity rows), and the batch id is what lets "undo the last thing" mean the
-- import rather than its 200th row.
--
-- sequelize.sync() adds neither the column nor the indexes to an existing
-- table, so every boot against an older database logs
--   column "batch_id" does not exist
-- from Activity.sync()'s addIndex, and any undo would target a column that
-- isn't there.

BEGIN;

ALTER TABLE activity ADD COLUMN IF NOT EXISTS batch_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS activity_batch_id      ON activity (batch_id);
-- "my recent actions" reads by author, newest first.
CREATE INDEX IF NOT EXISTS activity_created_by_ts ON activity (created_by, "timestamp");

COMMIT;
