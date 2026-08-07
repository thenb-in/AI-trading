/**
 * How long after an action it can still be taken back.
 *
 * The window is what authorises undo. Delete permission deliberately isn't
 * required — it is usually withheld, and demanding it would mean the people who
 * make marking mistakes are exactly the ones who can't fix them. What undo
 * grants instead is narrow: you may remove a record *you* just wrote, while it
 * is still pending, once. Outside the window it is no longer a slip being
 * corrected, it is a deletion — and that needs the Delete button and its
 * permission.
 *
 * Long enough to notice a wrong date on the screen in front of you; short
 * enough that a leaked token can't mine it later.
 */
const UNDO_WINDOW_MINUTES = 15;

const UNDO_WINDOW_MS = UNDO_WINDOW_MINUTES * 60 * 1000;

const UNDO_EXPIRED_MESSAGE =
  `This action is older than ${UNDO_WINDOW_MINUTES} minutes and can no longer be undone. Delete the records from their master instead.`;

/**
 * Ceiling on how many activity rows one batch can replay. A gesture bigger than
 * this is a bulk job, not something to unwind one delete at a time.
 */
const MAX_BATCH_SIZE = 1000;

module.exports = {
  UNDO_WINDOW_MINUTES,
  UNDO_WINDOW_MS,
  UNDO_EXPIRED_MESSAGE,
  MAX_BATCH_SIZE
};
