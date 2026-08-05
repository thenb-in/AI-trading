const { decodeActivityType } = require('../activitylogs/activityLogUtils');
const activityColumns = require('../constants/columns/activityColumns');
const { formatResponse } = require('./formatResponse');
const { getUndoable } = require('../undo/undoRegistry');
const { ACTIVITY_TYPE } = require('../constants/activity');
const { UNDO_WINDOW_MS } = require('../constants/undo');


function mapActivityRow(data) {
  return {
    id: data.id,
    head: data.head,
    log: data.log,
    type: decodeActivityType(data.type) || null,
    objectName: data.objectName || null,
    objectId: data.objectId ?? null,
    createdByName: data.createdByUser?.name || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null
  };
}

function formatActivityResponse(activities) {
  return formatResponse(activities, activityColumns, mapActivityRow);
}

/**
 * One row per user gesture for the "recent actions" menu. `canUndo` is the
 * question the UI actually asks: is this a creation, is it still un-undone, and
 * does the object have a delete registered to undo it with?
 */
function formatRecentActions(batches) {
  return batches.map((batch) => {
    const handler = getUndoable(batch.head);
    const isCreate = batch.type === ACTIVITY_TYPE.CREATE;
    const isUndoableUpdate = batch.type === ACTIVITY_TYPE.UPDATE && Boolean(handler?.undoUpdateByDelete);
    const timestamp = Number(batch.lastTimestamp) || null;
    const expiresAt = timestamp === null ? null : timestamp + UNDO_WINDOW_MS;
    const withinWindow = expiresAt !== null && expiresAt > Date.now();

    return {
      batchId: batch.batchId,
      head: batch.head,
      label: handler ? handler.label : batch.head,
      action: decodeActivityType(batch.type) || null,
      recordCount: Number(batch.recordCount) || 0,
      timestamp,
      // When the offer lapses — the UI hides its Undo at the same moment the
      // server would start refusing, instead of showing a button that fails.
      expiresAt,
      isUndone: Boolean(batch.isUndone),
      canUndo: Boolean(handler) && (isCreate || isUndoableUpdate) && !batch.isUndone && withinWindow,
      // Undoing a change deletes the record instead of restoring what it held
      // before. The UI has to say so — "undo" otherwise implies a revert.
      undoRemovesRecord: isUndoableUpdate
    };
  });
}

module.exports = {
  formatActivityResponse,
  formatRecentActions
};
