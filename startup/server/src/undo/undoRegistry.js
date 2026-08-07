const logger = require('../../logger');

/**
 * Which objects can be undone, and how.
 *
 * Undo is not a new capability — it is the delete a master already has, aimed
 * at the rows the user's own last action wrote. A master opts in by handing
 * over the same delete it wires into its DELETE route; nothing here
 * reimplements deletion.
 *
 * Note what is NOT required: the delete permission. Undo is authorised by
 * *who* and *when* instead (your own action, inside the undo window, still
 * pending, once) — see constants/undo.js. Requiring delete would put mistake
 * recovery out of reach of the people who make the mistakes.
 *
 * Register next to the routes (see app/server/src/undo/registerUndoables.js):
 *
 *   registerUndoable('ManualAttendance', { remove: deleteManualAttendance });
 */
const registry = new Map();

/**
 * @param {string} objectName Activity `head` for this object (e.g. 'ManualAttendance').
 * @param {object} handler
 * @param {(id, companyId, userId) => Promise<any>} handler.remove The master's existing delete.
 * @param {boolean} [handler.undoUpdateByDelete] Opt in to undoing UPDATEs by deleting
 *   the record. Lossy on purpose: the record goes away rather than reverting to its
 *   previous values. Only set it where "gone" is a sane state — an attendance day
 *   with no manual mark falls back to what the punches say, which is exactly what
 *   the user wants back. Never set it where the record must exist.
 * @param {(id, companyId) => Promise<{ok: boolean, reason?: string}>} [handler.canRemove]
 *   Per-record gate checked before deleting. Undo can run minutes after the action,
 *   and the record may have moved on — approved, locked, built into payroll.
 */
const registerUndoable = (objectName, { remove, undoUpdateByDelete = false, canRemove = null } = {}) => {
  if (!objectName || typeof remove !== 'function') {
    logger.error(`Ignoring undoable registration for ${objectName}: a remove function is required`);
    return;
  }
  registry.set(objectName, { remove, undoUpdateByDelete, canRemove });
};

const getUndoable = (objectName) => registry.get(objectName) || null;

const isUndoable = (objectName) => registry.has(objectName);

module.exports = { registerUndoable, getUndoable, isUndoable };
