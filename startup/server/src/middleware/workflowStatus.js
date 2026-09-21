const requirePermission = require('./requirePermission');
const { createActivityLogMiddleware } = require('./activityLogMiddleware');
const { transitionFor, permissionForStatus, workflowOf } = require('../workflow');
const { HTTP_STATUS_BAD_REQUEST } = require('../constants/http');
const { sendError } = require('../utils/response');

/**
 * A status route serves every decision the workflow allows, so the grant it
 * needs is the one that workflow puts on the transition being asked for: on
 * Gatepass a change to APPR asks for approve_gatepass, to REJ reject_gatepass.
 * The master says what its statuses are called; the framework asks its
 * workflow rather than knowing any of them.
 */
const requireStatusPermission = (masterName, statusField) => (req, res, next) => {
  const to = req.body?.[statusField];
  if (!transitionFor(masterName, to)) {
    return sendError(res, { statusCode: HTTP_STATUS_BAD_REQUEST, message: `${to} is not a status ${masterName} can be moved to.` });
  }
  const permission = permissionForStatus(masterName, to);
  return permission ? requirePermission(permission)(req, res, next) : next();
};

/**
 * The audit row the decision leaves. The workflow already names the change —
 * approve is what reaches APPR, reject what reaches REJ — so the trail is
 * written from the same declaration that gates it, and a master cannot end up
 * deciding records with no record of who decided them.
 *
 * The gate above has already refused anything the workflow does not allow, so
 * by here there is a transition and it has a name.
 */
const logStatusChange = (masterName, statusField) => (req, res, next) =>
  createActivityLogMiddleware(
    workflowOf(masterName).object,
    transitionFor(masterName, req.body?.[statusField]).verb.toUpperCase()
  )(req, res, next);

/**
 * Everything a status route needs behind its validator: the permission the
 * decision asks for, then the audit row it leaves.
 *
 *   router.put('/:id/status', protect, validation, statusChange(MASTERS.GATEPASS), controller);
 */
const statusChange = (masterName, statusField = 'status') => [
  requireStatusPermission(masterName, statusField),
  logStatusChange(masterName, statusField)
];

module.exports = statusChange;
