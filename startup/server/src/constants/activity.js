/**
 * Activity type stored in Activity model (type column).
 * Used for encoding (action string -> number) and decoding (number -> action for client).
 */
const ACTIVITY_TYPE = {
  UPDATE: 0,
  CREATE: 1,
  DELETE: -1,
  EXPORT: 2,
  IMPORT: 3,
  ACTIVATE: 4,
  DEACTIVATE: 5,
  APPROVE: 6,
  REJECT: 7
};

/** Decode numeric type to action label for client display */
const ACTIVITY_TYPE_TO_ACTION = {
  [ACTIVITY_TYPE.UPDATE]: 'UPDATE',
  [ACTIVITY_TYPE.CREATE]: 'CREATE',
  [ACTIVITY_TYPE.DELETE]: 'DELETE',
  [ACTIVITY_TYPE.EXPORT]: 'EXPORT',
  [ACTIVITY_TYPE.IMPORT]: 'IMPORT',
  [ACTIVITY_TYPE.ACTIVATE]: 'ACTIVATE',
  [ACTIVITY_TYPE.DEACTIVATE]: 'DEACTIVATE',
  [ACTIVITY_TYPE.APPROVE]: 'APPROVE',
  [ACTIVITY_TYPE.REJECT]: 'REJECT'
};

/** Action string -> numeric type (for encoding) */
const ACTION_TO_ACTIVITY_TYPE = {
  UPDATE: ACTIVITY_TYPE.UPDATE,
  CREATE: ACTIVITY_TYPE.CREATE,
  DELETE: ACTIVITY_TYPE.DELETE,
  EXPORT: ACTIVITY_TYPE.EXPORT,
  IMPORT: ACTIVITY_TYPE.IMPORT,
  ACTIVATE: ACTIVITY_TYPE.ACTIVATE,
  DEACTIVATE: ACTIVITY_TYPE.DEACTIVATE,
  APPROVE: ACTIVITY_TYPE.APPROVE,
  REJECT: ACTIVITY_TYPE.REJECT
};

/** Professional message label per action (e.g. "Employee was updated"). */
const ACTION_TO_MESSAGE_LABEL = {
  CREATE: 'was created',
  UPDATE: 'was updated',
  DELETE: 'was deleted',
  EXPORT: 'was exported',
  IMPORT: 'was imported',
  ACTIVATE: 'was activated',
  DEACTIVATE: 'was deactivated',
  APPROVE: 'was approved',
  REJECT: 'was rejected'
};

/**
 * Register app-owned activity types into the framework maps (in place).
 * Call from the app's registerAppData bootstrap at process start.
 */
function registerActivityTypes(defs) {
  for (const { action, type, messageLabel } of defs) {
    ACTIVITY_TYPE[action] = type;
    ACTIVITY_TYPE_TO_ACTION[type] = action;
    ACTION_TO_ACTIVITY_TYPE[action] = type;
    if (messageLabel) {
      ACTION_TO_MESSAGE_LABEL[action] = messageLabel;
    }
  }
}

module.exports = {
  ACTIVITY_TYPE,
  ACTIVITY_TYPE_TO_ACTION,
  ACTION_TO_ACTIVITY_TYPE,
  ACTION_TO_MESSAGE_LABEL,
  registerActivityTypes
};
