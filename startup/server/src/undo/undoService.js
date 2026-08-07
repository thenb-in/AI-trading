const logger = require('../../logger');
const activityService = require('../services/activityService');
const { undoBatchIdFor } = require('../services/activityService');
const { ACTIVITY_TYPE } = require('../constants/activity');
const { UNDO_WINDOW_MS, UNDO_EXPIRED_MESSAGE } = require('../constants/undo');
const { getUndoable, isUndoable } = require('./undoRegistry');

/**
 * Undo = delete what the last action wrote.
 *
 * The activity log already records, per batch, which record each request
 * touched. Undo reads those ids back and runs the master's own delete over
 * them, so there is exactly one deletion path in the system and undo inherits
 * its validations, side effects and permission.
 *
 * CREATE always undoes: deleting the record leaves exactly the state that
 * preceded it.
 *
 * UPDATE undoes only where the object opted in with `undoUpdateByDelete`, and
 * it deletes rather than reverts — the log's diff can't faithfully rebuild
 * prior state. For attendance that is the right trade: a day with no manual
 * mark falls back to what the punches say, so removing a wrong mark is the
 * recovery. Each record still passes the object's `canRemove` gate first, since
 * it may have been approved or locked since the action ran.
 *
 * DELETE never undoes — there is nothing to delete.
 *
 * What authorises it is not the delete permission (see undoRegistry) but the
 * combination that makes this a retraction rather than a deletion: your own
 * action, inside the undo window, on a record still pending, once, logged.
 */

const parseCreatedIds = (activity) => {
  try {
    const parsed = typeof activity.log === 'string' ? JSON.parse(activity.log) : activity.log;
    const ids = parsed && Array.isArray(parsed.createdIds) ? parsed.createdIds : [];
    return ids.filter(id => id !== null && id !== undefined);
  } catch {
    logger.warn(`Undo: unreadable activity log for activity ${activity.id}`);
    return [];
  }
};

/** True when this activity row describes something undo can act on. */
const isUndoableActivity = (activity) => {
  if (activity.type === ACTIVITY_TYPE.CREATE) {
    return true;
  }
  if (activity.type !== ACTIVITY_TYPE.UPDATE) {
    return false;
  }
  const handler = getUndoable(activity.head);
  return Boolean(handler && handler.undoUpdateByDelete);
};

/**
 * Ids this batch touched, grouped by the object they belong to.
 *
 * A CREATE names its ids in the log payload; an UPDATE doesn't, but the
 * activity row is filed under the id it changed, which is the same record.
 */
const collectAffectedIdsByObject = (activities, userId) => {
  const byObject = new Map();
  const seen = new Set();

  activities
    // Undoing someone else's action from your own "recent actions" list would
    // be a surprise at best; the listing is per-user, so enforce it here too.
    .filter(activity => String(activity.createdBy) === String(userId))
    .filter(isUndoableActivity)
    .forEach(activity => {
      const ids = activity.type === ACTIVITY_TYPE.CREATE
        ? parseCreatedIds(activity)
        : (activity.objectId === null || activity.objectId === undefined ? [] : [activity.objectId]);

      ids.forEach(id => {
        // A bulk edit can touch the same record twice (two cells, one row);
        // deleting it once is enough and the second attempt would just fail.
        const key = `${activity.head}:${id}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        const existing = byObject.get(activity.head) || [];
        byObject.set(activity.head, existing.concat([id]));
      });
    });

  return byObject;
};

const describeBatch = (activities) => {
  const first = activities.find(activity => activity.head) || {};
  return first.head || 'record';
};

/** Newest write in the batch — the clock for the undo window runs from there. */
const lastWrittenAt = (activities) => activities.reduce(
  (latest, activity) => Math.max(latest, Number(activity.timestamp) || 0),
  0
);

/**
 * Remove every id the batch created, using each object's registered delete.
 * Returns per-object counts rather than throwing on the first failure — a row
 * someone already deleted by hand shouldn't strand the other 199.
 */
const removeAffectedIds = async (byObject, companyId, userId) => {
  let undone = 0;
  let failed = 0;
  let blocked = 0;
  const blockedReasons = [];
  const deletedIdsByObject = new Map();

  for (const [objectName, ids] of byObject.entries()) {
    const handler = getUndoable(objectName);
    const deleted = [];

    for (const id of ids) {
      try {
        // Time passes between the action and the undo. A record that has since
        // been approved or locked is no longer the user's to take back.
        if (typeof handler.canRemove === 'function') {
          const gate = await handler.canRemove(id, companyId);
          if (!gate?.ok) {
            blocked += 1;
            if (gate?.reason && !blockedReasons.includes(gate.reason)) {
              blockedReasons.push(gate.reason);
            }
            continue;
          }
        }

        await handler.remove(id, companyId, userId);
        deleted.push(id);
        undone += 1;
      } catch (error) {
        failed += 1;
        logger.warn(`Undo: could not delete ${objectName} ${id}. ${error.message}`);
      }
    }

    deletedIdsByObject.set(objectName, deleted);
  }

  return { undone, failed, blocked, blockedReasons, deletedIdsByObject };
};

const recordUndoActivities = async (deletedIdsByObject, batchId, userId, companyId) => {
  for (const [objectName, deletedIds] of deletedIdsByObject.entries()) {
    if (deletedIds.length === 0) {
      continue;
    }
    await activityService.createActivity({
      head: objectName,
      log: JSON.stringify({ action: 'UNDO', undoneBatchId: batchId, deletedIds }),
      objectName: `${objectName} was undone`,
      objectId: String(deletedIds[0]),
      createdBy: userId,
      companyId,
      type: ACTIVITY_TYPE.DELETE,
      batchId: undoBatchIdFor(batchId)
    });
  }
};

const undoService = {
  /**
   * @returns {{ok: boolean, reason?: string, undone?: number, failed?: number, objectName?: string}}
   */
  async undoBatch(batchId, user) {
    const companyId = user.company_id;

    const alreadyUndone = await activityService.getActivitiesByBatchId(undoBatchIdFor(batchId), companyId);
    if (alreadyUndone.length > 0) {
      return { ok: false, reason: 'This action has already been undone.' };
    }

    const activities = await activityService.getActivitiesByBatchId(batchId, companyId);
    if (activities.length === 0) {
      return { ok: false, reason: 'Nothing found to undo.' };
    }

    const objectName = describeBatch(activities);
    const byObject = collectAffectedIdsByObject(activities, user.id);

    if (byObject.size === 0) {
      return { ok: false, reason: 'This action cannot be undone.', objectName };
    }

    const unsupported = [...byObject.keys()].filter(name => !isUndoable(name));
    if (unsupported.length > 0) {
      return { ok: false, reason: `Undo is not available for ${unsupported.join(', ')}.`, objectName };
    }

    // The window is the authorisation. Checked against the logged timestamp,
    // never against anything the caller sends, so a replayed or hand-made
    // request can't reach back past it.
    if (Date.now() - lastWrittenAt(activities) > UNDO_WINDOW_MS) {
      return { ok: false, reason: UNDO_EXPIRED_MESSAGE, expired: true, objectName };
    }

    const { undone, failed, blocked, blockedReasons, deletedIdsByObject } =
      await removeAffectedIds(byObject, companyId, user.id);
    await recordUndoActivities(deletedIdsByObject, batchId, user.id, companyId);

    logger.info(
      `Undo batch ${batchId} by user ${user.id}: ${undone} deleted, ${blocked} blocked, ${failed} failed`
    );
    return { ok: true, undone, failed, blocked, blockedReasons, objectName };
  }
};

module.exports = undoService;
