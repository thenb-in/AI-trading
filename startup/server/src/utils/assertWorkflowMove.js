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
 * One move is refused for every kind of record: a draft is never cancelled, it
 * is deleted instead (400). Draft means the maker is still editing; cancel only
 * undoes what the maker confirmed by sending it for approval. `draftStatuses`
 * lists a record's editing statuses where it has more than `draft` (amendment).
 * Which other moves a status allows stays with each record's own service; this
 * only refuses a user who could not have pressed the button. A save that keeps
 * the status is not a move. Throws a 403 naming the permission.
 */
const assertWorkflowMove = async ({ masterName, from, to, userId, permissions = {}, draftStatuses = ['draft'] }) => {
  const current = String(from || '').trim().toLowerCase();
  const next = String(to || '').trim().toLowerCase();
  if (!next || next === current) {
    return;
  }
  if (next === 'cancelled' && draftStatuses.includes(current)) {
    const error = new Error(`${masterName} in ${current} cannot be cancelled; delete it instead`);
    error.statusCode = 400;
    throw error;
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
