const { diff } = require('deep-diff');
const logger = require('../../logger');
const {
  ACTIVITY_TYPE_TO_ACTION,
  ACTION_TO_ACTIVITY_TYPE,
  ACTION_TO_MESSAGE_LABEL,
  BATCH_ID_PATTERN
} = require('../constants/activity');

/**
 * Compare two objects and return only changed fields with before/after values.
 * Uses deep-diff and collapses nested changes to top-level keys for readability.
 */
const computeChanges = (before, after) => {
  const beforeObj = before && typeof before === 'object' ? before : {};
  const afterObj = after && typeof after === 'object' ? after : {};

  const differences = diff(beforeObj, afterObj) || [];
  const changes = {};

  if (!differences.length) {
    const beforeKeys = Object.keys(beforeObj);
    const afterKeys = Object.keys(afterObj);
    logger.info(
      `[ActivityLog] No raw differences detected between before/after for UPDATE beforeKeys=${beforeKeys.join(
        ','
      )} afterKeys=${afterKeys.join(',')}`
    );
  }

  differences.forEach(change => {
    // Only care about edits (E) and new values (N) for updates
    if (change.kind !== 'E' && change.kind !== 'N') {
      return;
    }

    if (!Array.isArray(change.path) || change.path.length === 0) {
      return;
    }

    const topLevelKey = change.path[0];
    const beforeVal = change.lhs;
    const afterVal = change.rhs;

    // If the new value is null/undefined, skip logging this field
    if (afterVal === null || afterVal === undefined) {
      return;
    }

    changes[topLevelKey] = {
      before: beforeVal,
      after: afterVal
    };
  });

  if (!Object.keys(changes).length) {
    logger.info(
      `[ActivityLog] Differences found but all filtered out (likely null/undefined or unsupported paths) diffCount=${differences.length}`
    );
  }

  return changes;
};

/**
 * Normalize a possible Sequelize instance to a plain object.
 */
const normalizeRecord = record => {
  if (!record) {
    return record;
  }
  if (typeof record.toJSON === 'function') {
    return record.toJSON();
  }
  return record;
};

/**
 * Extract ids from a single record or an array of records.
 */
const extractIds = (data) => {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data
      .map(item => {
        const normalized = normalizeRecord(item);
        return normalized && typeof normalized === 'object' && Object.prototype.hasOwnProperty.call(normalized, 'id')
          ? normalized.id
          : null;
      })
      .filter(id => id !== null && id !== undefined);
  }

  const normalized = normalizeRecord(data);
  if (normalized && typeof normalized === 'object' && Object.prototype.hasOwnProperty.call(normalized, 'id')) {
    return [normalized.id];
  }

  return [];
};

/**
 * Map high-level action names to the numeric type stored in the Activity model.
 */
const getActivityType = (action) => {
  if (action === null || action === undefined || typeof action !== 'string') {
    return null;
  }
  return ACTION_TO_ACTIVITY_TYPE[action] ?? null;
};

/**
 * Decode numeric type to action string for client (e.g. 0 -> 'UPDATE').
 */
const decodeActivityType = (type) => {
  if (type === null || type === undefined) {
    return null;
  }
  return ACTIVITY_TYPE_TO_ACTION[type] ?? null;
};

/**
 * Build professional activity message (e.g. "Record was updated").
 */
const getActivityMessage = (objectName, action) => {
  const label = ACTION_TO_MESSAGE_LABEL[action] ?? (action || '');
  return `${objectName || 'Record'} ${label}`.trim();
};

/**
 * Derive record id from response data or route params (generic: any route with :id, :emp_code, etc.).
 * Stored in Activity.object_id.
 */
const getObjectId = (afterData, req) => {
  let objectId = null;

  if (afterData && typeof afterData === 'object') {
    if (
      Array.isArray(afterData) &&
      afterData.length > 0 &&
      afterData[0] &&
      afterData[0].id !== null &&
      afterData[0].id !== undefined
    ) {
      objectId = String(afterData[0].id);
    } else if (afterData.id !== null && afterData.id !== undefined) {
      objectId = String(afterData.id);
    }
  }

  if (objectId === null && req.params && typeof req.params === 'object') {
    const params = Object.keys(req.params);
    if (params.length === 1 && req.params[params[0]] !== null && req.params[params[0]] !== undefined) {
      objectId = String(req.params[params[0]]);
    } else if (req.params.id !== null && req.params.id !== undefined) {
      objectId = String(req.params.id);
    }
  }

  return objectId;
};

/**
 * Read the client-supplied batch id off the request.
 *
 * One user gesture can be many requests — a monthly-attendance import POSTs
 * once per row — and the client tags every request in a gesture with the same
 * `x-batch-id`. That tag is what makes "undo the last thing" mean the import
 * rather than its 200th row. Untagged requests get no batch and simply aren't
 * offered as undoable.
 */
const getBatchId = (req) => {
  const raw = req && req.headers ? req.headers['x-batch-id'] : null;
  if (typeof raw !== 'string' || !BATCH_ID_PATTERN.test(raw)) {
    return null;
  }
  return raw;
};

/**
 * Build the minimal payload we store in the Activity.log field.
 * - UPDATE: { action, changes }
 * - CREATE: { action, createdIds }
 * - DELETE: { action, deletedIds }
 */
const buildLogPayloadForAction = ({
  action,
  objectName: _objectName,
  beforeData,
  afterData,
  buildLogPayload,
  req,
  user,
  // The id the activity row itself is filed under. Used when the response body
  // nests its record (e.g. `{ success, record: { id } }`) so `extractIds` finds
  // nothing — without it the log would say "created" but list nothing to undo.
  objectId = null
}) => {
  const idsOrFallback = (ids) => {
    if (ids.length > 0) {
      return ids;
    }
    return objectId === null || objectId === undefined ? [] : [objectId];
  };

  if (action === 'UPDATE') {
    const changes = computeChanges(beforeData, afterData);

    if (typeof buildLogPayload === 'function') {
      return buildLogPayload({
        req,
        user,
        action,
        changes
      });
    }

    return {
      action,
      changes
    };
  }

  if (action === 'CREATE') {
    const createdIds = idsOrFallback(extractIds(afterData));

    if (typeof buildLogPayload === 'function') {
      return buildLogPayload({
        req,
        user,
        action,
        createdIds
      });
    }

    return {
      action,
      createdIds
    };
  }

  if (action === 'DELETE') {
    const deletedIds = idsOrFallback(extractIds(beforeData));

    if (typeof buildLogPayload === 'function') {
      return buildLogPayload({
        req,
        user,
        action,
        deletedIds
      });
    }

    return {
      action,
      deletedIds
    };
  }

  // Fallback for any other actions
  return {
    action
  };
};

module.exports = {
  computeChanges,
  normalizeRecord,
  extractIds,
  getActivityType,
  decodeActivityType,
  getActivityMessage,
  getObjectId,
  getBatchId,
  buildLogPayloadForAction
};

