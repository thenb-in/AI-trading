const { masterKeyOf } = require('../utils/masterKey');

/**
 * What a kind of record goes through, on the server side: its statuses and the
 * transitions between them. An app declares one per master (see the client's
 * workflow.js for the browser half) and registers it from its own bootstrap,
 * so the framework prescribes no vocabulary — a master's statuses are the
 * app's own words, stored as they read ('APPR'), not as codes nobody can read
 * in a dump.
 *
 *   registerWorkflow('Gatepass', {
 *     initial: 'PEN',
 *     statusKey: 'status',
 *     object: 'GatePass',
 *     statuses: {
 *       PEN:  { label: 'Pending', deletable: true },
 *       APPR: { label: 'Approved' },
 *       REJ:  { label: 'Rejected' },
 *     },
 *     transitions: {
 *       approve: { from: ['PEN'], to: 'APPR', permission: 'approve' },
 *       reject:  { from: ['PEN'], to: 'REJ',  permission: 'reject' },
 *     },
 *   });
 *
 * `permission` is the verb; the master's name makes the whole name, so approve
 * on Gatepass asks for approve_gatepass. A transition with no permission asks
 * for none. `object` is what the audit trail files these records under, and
 * defaults to the master's own name — an app sets it where its activity log
 * and undo handlers already know the records by another name.
 *
 * Three things read this: `assertTransition`, which a service calls instead of
 * writing its own "already approved" guard, and `permissionForStatus` and
 * `transitionFor`, which the status middleware calls so a status route asks
 * for the grant its own workflow names and records the decision its own
 * workflow calls it.
 */

const workflows = new Map();

const registerWorkflow = (masterName, workflow) =>
  workflows.set(masterName, { statusKey: 'status', object: masterName, ...workflow });

const workflowOf = (masterName) => {
  const workflow = workflows.get(masterName);
  if (!workflow) {
    throw new Error(`No workflow registered for ${masterName}. Register it where the app registers its data.`);
  }
  return workflow;
};

const labelOf = (workflow, status) => workflow.statuses[status]?.label ?? status;

// Each transition that reaches `to`, carrying the verb the workflow knows it by.
const transitionsTo = (workflow, to) =>
  Object.entries(workflow.transitions)
    .filter(([, transition]) => transition.to === to)
    .map(([verb, transition]) => ({ verb, ...transition }));

/**
 * The transition a change to `to` is, whatever the record it is applied to.
 * Where two transitions reach the same status from different places the
 * record's own status decides, so pass `from` as well.
 */
const transitionFor = (masterName, to, from) => {
  const candidates = transitionsTo(workflowOf(masterName), to);
  return from ? candidates.find((candidate) => candidate.from.includes(from)) : candidates[0];
};

/**
 * The status change `to` asks for, from the record's current status — throwing
 * the reason when the workflow does not allow it, so a service states the rule
 * once by declaring the workflow rather than by guarding each write.
 */
const assertTransition = (masterName, record, to) => {
  const workflow = workflowOf(masterName);
  const from = record[workflow.statusKey] ?? workflow.initial;
  if (!workflow.statuses[to]) {
    throw new Error(`${masterName} has no status ${to}. It is one of ${Object.keys(workflow.statuses).join(', ')}.`);
  }
  const transition = transitionFor(masterName, to, from);
  if (!transition) {
    throw new Error(`${masterName} ${record.id} is ${labelOf(workflow, from)}, so it cannot be ${labelOf(workflow, to).toLowerCase()}.`);
  }
  return transition;
};

/** The permission a change to `to` needs, or nothing where the workflow asks for none. */
const permissionForStatus = (masterName, to, from) => {
  const transition = transitionFor(masterName, to, from);
  return transition?.permission && `${transition.permission}_${masterKeyOf(masterName)}`;
};

const statusesOf = (masterName) => workflowOf(masterName).statuses;

module.exports = {
  registerWorkflow,
  workflowOf,
  transitionFor,
  assertTransition,
  permissionForStatus,
  statusesOf,
  labelOf
};
