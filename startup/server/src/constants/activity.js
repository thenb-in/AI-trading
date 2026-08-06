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
 * Shape of the client-supplied `x-batch-id` header. Anything else is treated as
 * untagged rather than rejected — a malformed tag costs the request its undo,
 * not the request itself.
 */
const BATCH_ID_PATTERN = /^[A-Za-z0-9:_-]{1,64}$/;

/**
 * Where the wallet takes machine traffic.
 *
 * Everything an application server posts sits under one prefix there, so that
 * an endpoint with no session behind it is unauthenticated by the fact of where
 * it lives rather than by nobody having noticed. Apps used to post straight to
 * `/activity/push`; that path is still served as a deprecated alias, so an
 * install running an older framework keeps working while it catches up.
 */
const WALLET_INGEST_PREFIX = '/ingest';

/**
 * How long the wallet's list of wanted heads is trusted before it is re-asked.
 * Five minutes: the list changes when somebody prices or caps a head, and the
 * cost of being late is that a newly billed head starts arriving five minutes
 * after it was priced.
 */
const TRACKED_HEADS_TTL_MS = 5 * 60 * 1000;

/**
 * The most months of history one headbase run will rebuild, and what it
 * rebuilds when asked for no particular number. The cap is a guard on a loop
 * that walks every object of every head: a typo of 300 in the months box
 * should cost a rejection, not an afternoon.
 */
const HEAD_BASE_DEFAULT_MONTHS = 3;
const HEAD_BASE_MAX_MONTHS = 36;

/**
 * How many backfilled activities travel in one request. Four thousand
 * employees is four thousand events; sent one at a time that is minutes of
 * round trips, and sent all at once it is a request body nobody wants to
 * retry. Five hundred is about 150KB, well inside the wallet's 5MB limit.
 */
const HEAD_BASE_BATCH_SIZE = 500;

/** What the log line on a backfilled activity says it is. */
const HEAD_BASE_ACTION = 'HEAD_BASE';
const HEAD_BASE_LABEL_SUFFIX = '(headbase)';

const ACTIVITY_ERRORS = {
  WALLET_NO_HEAD_LIST: 'Wallet returned no head list',
  HEAD_BASE_COMPANY_REQUIRED: 'A headbase needs a company',
  HEAD_BASE_BAD_SOURCE: 'A headbase source needs a timeline(companyId, since) function',
  HEAD_BASE_WALLET_UNREACHABLE:
    'The wallet could not be reached, so there is no telling which heads it wants'
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
  ACTIVITY_ERRORS,
  ACTIVITY_TYPE,
  BATCH_ID_PATTERN,
  HEAD_BASE_ACTION,
  HEAD_BASE_BATCH_SIZE,
  HEAD_BASE_LABEL_SUFFIX,
  HEAD_BASE_DEFAULT_MONTHS,
  HEAD_BASE_MAX_MONTHS,
  TRACKED_HEADS_TTL_MS,
  WALLET_INGEST_PREFIX,
  ACTIVITY_TYPE_TO_ACTION,
  ACTION_TO_ACTIVITY_TYPE,
  ACTION_TO_MESSAGE_LABEL,
  registerActivityTypes
};
