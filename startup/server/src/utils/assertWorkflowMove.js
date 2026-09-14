const allowedPermissions = require('./allowedPermissions');
const { masterKeyOf } = require('./masterKey');

/**
 * The server's half of a workflow: moving a record to another status needs the
 * permission the client's workflow offers that move under. Approving needs
 * approve_<master>; every other move (send for approval, cancel, complete...)
 * update_<master>, `masterName` being the master in words ("Sales Order" is
 * sales_order). `permissions` names one outright where that rule doesn't fit
 * ({ approve: 'update_work_order' }).
 *
 * Which moves a status allows stays with each record's own service; this only
 * refuses a user who could not have pressed the button. A save that keeps the
 * status is not a move. Throws a 403 naming the permission.
 */
const assertWorkflowMove = async ({ masterName, from, to, userId, permissions = {} }) => {
  const current = String(from || '').trim().toLowerCase();
  const next = String(to || '').trim().toLowerCase();
  if (!next || next === current) {
    return;
  }
  const verb = next === 'approved' ? 'approve' : 'update';
  const permission = permissions[verb] ?? `${verb}_${masterKeyOf(masterName)}`;
  if (await allowedPermissions(userId, [permission])) {
    return;
  }
  const error = new Error(`Moving this ${masterName} from ${current} to ${next} needs the ${permission} permission`);
  error.statusCode = 403;
  throw error;
};

module.exports = { assertWorkflowMove };
